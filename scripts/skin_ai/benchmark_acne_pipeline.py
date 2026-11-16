"""Compare full-frame/tiled inference on a local, person-separated manifest."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from time import perf_counter

import onnxruntime as ort

from acne_pipeline import ScanConfig, acne_detections, image_quality, box_iou
from serve_prototype_onnx import MODEL_PATH, decode_jpeg


def validate_manifest(rows):
    if not isinstance(rows, list) or not rows:
        raise ValueError("Manifest must contain labelled images")
    people, images = {}, set()
    for row in rows:
        person, path, split = row.get("participant_id"), row.get("image"), row.get("split")
        if not isinstance(person, str) or not person or not isinstance(path, str) or not path:
            raise ValueError("Missing participant_id or image")
        if split not in {"train", "validation", "test"} or not row.get("consent_reference"):
            raise ValueError("Missing split or consent reference")
        if person in people and people[person] != split:
            raise ValueError("Participant appears in multiple splits")
        if path in images:
            raise ValueError("Duplicate image")
        people[person] = split
        images.add(path)
        boxes = row.get("boxes")
        if not isinstance(boxes, list):
            raise ValueError("Explicit boxes required; [] means reviewed negative")
        for box in boxes:
            if (not isinstance(box, list) or len(box) != 4
                    or not all(type(v) in (int, float) for v in box)
                    or not (0 <= box[0] < box[2] <= 1 and 0 <= box[1] < box[3] <= 1)):
                raise ValueError("Boxes must be normalized [x1,y1,x2,y2]")


def match(detections, boxes):
    remaining = [{"x": x1, "y": y1, "width": x2-x1, "height": y2-y1} for x1, y1, x2, y2 in boxes]
    tp = 0
    for detection in sorted(detections, key=lambda d: d["confidence"], reverse=True):
        if not remaining:
            break
        index = max(range(len(remaining)), key=lambda i: box_iou(detection, remaining[i]))
        if box_iou(detection, remaining[index]) >= 0.5:
            remaining.pop(index)
            tp += 1
    return tp, len(detections) - tp, len(remaining)


def benchmark(rows, root, session, config):
    tp = fp = fn = accepted = count_error = 0
    rejected = {}
    start = perf_counter()
    for row in rows:
        path = (root / row["image"]).resolve()
        if not path.is_relative_to(root.resolve()):
            raise ValueError("Image must be within manifest directory")
        image = decode_jpeg(path.read_bytes())
        quality = image_quality(image)
        if not quality["passed"]:
            issue = quality["issues"][0]
            rejected[issue] = rejected.get(issue, 0) + 1
            continue
        predictions = acne_detections(image, session, config)
        a, b, c = match(predictions, row["boxes"])
        tp, fp, fn = tp+a, fp+b, fn+c
        count_error += abs(len(predictions) - len(row["boxes"]))
        accepted += 1
    return {"pipeline": config.metadata(), "images": len(rows), "accepted": accepted,
            "coverage": accepted / len(rows), "rejected": rejected,
            "matched": tp, "false_positives": fp, "missed": fn,
            "precision": tp / (tp+fp) if tp+fp else None,
            "recall": tp / (tp+fn) if tp+fn else None,
            "count_mae": count_error / accepted if accepted else None,
            "elapsed_seconds": round(perf_counter()-start, 3)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--model", type=Path, default=Path(MODEL_PATH))
    parser.add_argument("--split", choices=["validation", "test"], default="validation")
    parser.add_argument("--confidence", type=float, nargs="+", default=[0.25])
    parser.add_argument("--mode", choices=["full", "tiled", "compare"], default="full")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists():
        parser.error("Output already exists")
    if args.split == "test" and (len(args.confidence) != 1 or args.mode == "compare"):
        parser.error("Choose settings on validation; test evaluates one frozen configuration")
    configs = [ScanConfig(confidence=c, tiled=t) for c in args.confidence
               for t in ([False, True] if args.mode == "compare" else [args.mode == "tiled"])]
    rows = json.loads(args.manifest.read_text(encoding="utf-8"))
    validate_manifest(rows)
    selected = [row for row in rows if row["split"] == args.split]
    if not selected:
        parser.error("No images in requested split")
    session = ort.InferenceSession(str(args.model), providers=["CPUExecutionProvider"])
    report = {"model_sha256": hashlib.sha256(args.model.read_bytes()).hexdigest(),
              "manifest_sha256": hashlib.sha256(args.manifest.read_bytes()).hexdigest(),
              "split": args.split, "iou_threshold": 0.5,
              "limitations": ["Metrics cover accepted images only; inspect rejection coverage",
                              "Quality heuristics are uncalibrated; no clinical accuracy claim",
                              "Manifest references require independent label and consent review"],
              "runs": [benchmark(selected, args.manifest.parent, session, config) for config in configs]}
    with args.output.open("x", encoding="utf-8") as output:
        json.dump(report, output, ensure_ascii=False, indent=2, allow_nan=False)
    print(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
