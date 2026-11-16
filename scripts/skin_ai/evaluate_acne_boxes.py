"""Exploratory ACNE04 box matching; not an independent clinical benchmark."""
from __future__ import annotations
import argparse
import io
import json
import hashlib
from time import perf_counter
from pathlib import Path
from urllib.parse import urlparse

import onnxruntime as ort
import requests
from PIL import Image, ImageOps
from serve_prototype_onnx import MODEL_PATH, MODEL_VERSION, acne_detections
from acne_pipeline import ScanConfig, image_quality


def iou(a, b):
    left, top = max(a[0], b[0]), max(a[1], b[1])
    right, bottom = min(a[2], b[2]), min(a[3], b[3])
    intersection = max(0.0, right - left) * max(0.0, bottom - top)
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - intersection
    return intersection / union if union > 0 else 0.0


def match_boxes(detections, references, threshold=0.5):
    remaining = set(range(len(references)))
    matches = 0
    for item in sorted(detections, key=lambda x: x['confidence'], reverse=True):
        box = (item['x'], item['y'], item['x'] + item['width'], item['y'] + item['height'])
        choices = [(iou(box, references[index]), index) for index in remaining]
        if choices:
            overlap, index = max(choices)
            if overlap >= threshold:
                remaining.remove(index)
                matches += 1
    return matches, len(detections) - matches, len(remaining)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--limit', type=int, default=20, choices=range(1, 51))
    parser.add_argument('--compare-pipeline', action='store_true', help='Explore quality-gated full/tiled modes; do not tune on these test-labelled rows')
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError('Output exists')
    response = requests.get('https://datasets-server.huggingface.co/rows', params={'dataset': 'Layered-Labs/ACNE04', 'config': 'default', 'split': 'train', 'offset': 0, 'length': 100}, timeout=30)
    response.raise_for_status()
    rows = [entry for entry in response.json()['rows'] if entry['row'].get('split') == 'test'][:args.limit]
    if len(rows) < args.limit:
        raise ValueError('Insufficient rows in first page')
    session = ort.InferenceSession(MODEL_PATH, providers=['CPUExecutionProvider'])
    Image.MAX_IMAGE_PIXELS = 25_000_000
    totals = [0, 0, 0]
    revisions = set()
    comparison = {mode: {'accepted': 0, 'rejected': {}, 'totals': [0, 0, 0], 'count_error': 0, 'seconds': 0.0}
                  for mode in ('full', 'tiled')}
    for entry in rows:
        row = entry['row']
        url = row['image']['src']
        parsed = urlparse(url)
        if parsed.scheme != 'https' or parsed.hostname != 'datasets-server.huggingface.co' or not parsed.path.startswith('/cached-assets/Layered-Labs/ACNE04/'):
            raise ValueError('Unexpected image source')
        segments = parsed.path.split('/--/')
        if len(segments) < 3 or len(segments[1]) != 40:
            raise ValueError('Missing dataset revision')
        revisions.add(segments[1])
        data = bytearray()
        with requests.get(url, stream=True, allow_redirects=False, timeout=60) as image_response:
            image_response.raise_for_status()
            if image_response.status_code != 200:
                raise ValueError('Unexpected image response')
            for chunk in image_response.iter_content(65536):
                data.extend(chunk)
                if len(data) > 10 * 1024 * 1024:
                    raise ValueError('Image too large')
        with Image.open(io.BytesIO(data)) as source:
            if source.format not in {'JPEG', 'PNG'} or source.size != (row['image']['width'], row['image']['height']) or source.getexif().get(274, 1) != 1:
                raise ValueError('Image dimensions or orientation incompatible with labels')
            image = ImageOps.exif_transpose(source).convert('RGB')
            detections = acne_detections(image, session)
            width, height = image.size
        boxes = row['lesion_boxes']
        columns = [boxes.get(k) for k in ('xmin', 'ymin', 'xmax', 'ymax')]
        if not all(isinstance(col, list) and len(col) == row['num_lesions_annotated'] for col in columns):
            raise ValueError('Invalid labels')
        refs = []
        for x1, y1, x2, y2 in zip(*columns):
            if not (0 <= x1 < x2 <= width and 0 <= y1 < y2 <= height):
                raise ValueError('Invalid box coordinates')
            refs.append((x1 / width, y1 / height, x2 / width, y2 / height))
        totals = [a + b for a, b in zip(totals, match_boxes(detections, refs))]
        if args.compare_pipeline:
            quality = image_quality(image)
            for mode, stats in comparison.items():
                if not quality['passed']:
                    reason = quality['issues'][0]
                    stats['rejected'][reason] = stats['rejected'].get(reason, 0) + 1
                    continue
                started = perf_counter()
                predictions = acne_detections(image, session, ScanConfig(tiled=mode == 'tiled'))
                stats['seconds'] += perf_counter() - started
                stats['accepted'] += 1
                stats['totals'] = [a + b for a, b in zip(stats['totals'], match_boxes(predictions, refs))]
                stats['count_error'] += abs(len(predictions) - len(refs))
    if len(revisions) != 1:
        raise ValueError('Dataset revision changed')
    tp, fp, fn = totals
    output = {'dataset': 'Layered-Labs/ACNE04', 'revision': next(iter(revisions)), 'selection': 'first test-labelled rows from first 100',
              'images': len(rows), 'model': MODEL_VERSION, 'iou_threshold': 0.5, 'confidence_threshold': 0.25,
              'matched': tp, 'unmatched_predictions': fp, 'missed_annotations': fn,
              'precision': tp / (tp + fp) if tp + fp else None, 'recall': tp / (tp + fn) if tp + fn else None,
              'limitations': ['academic use', 'small convenience sample', 'patient overlap unknown', 'no confirmed negative images', 'not clinical validation']}
    if args.compare_pipeline:
        output['model_sha256'] = hashlib.sha256(Path(MODEL_PATH).read_bytes()).hexdigest()
        output['comparison'] = []
        for mode, stats in comparison.items():
            ctp, cfp, cfn = stats['totals']
            output['comparison'].append({
                'pipeline': ScanConfig(tiled=mode == 'tiled').metadata(),
                'accepted': stats['accepted'], 'coverage': stats['accepted'] / len(rows),
                'rejected': stats['rejected'], 'matched': ctp, 'unmatched_predictions': cfp,
                'missed_annotations': cfn,
                'precision': ctp / (ctp + cfp) if ctp + cfp else None,
                'recall': ctp / (ctp + cfn) if ctp + cfn else None,
                'count_mae': stats['count_error'] / stats['accepted'] if stats['accepted'] else None,
                'inference_seconds': round(stats['seconds'], 3),
            })
        output['limitations'] += ['comparison metrics cover accepted images only',
                                  'test-labelled convenience sample is not for threshold selection',
                                  'quality thresholds are uncalibrated; absence of rejection does not prove quality']
    with args.output.open('x', encoding='utf-8') as file:
        json.dump(output, file, indent=2, allow_nan=False)
    print(json.dumps(output, indent=2))


if __name__ == '__main__':
    main()
