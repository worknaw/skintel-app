"""Academic exploratory sample only: no upload, no training, no accuracy claims."""
import argparse
import io
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

import requests
from PIL import Image, ImageOps

from run_experiment import MODEL_ID, MODEL_REVISION, load_model, score_image

DATASET = "Layered-Labs/ACNE04"
API = "https://datasets-server.huggingface.co/rows"
MAX_BYTES = 10_485_760


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=10, choices=range(1, 21))
    parser.add_argument("--cache-dir", type=Path, default=Path(".venv-skin-ai/hf-cache"))
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError("Output already exists")

    # The viewer uses signed URLs; never log them or forward images to an inference provider.
    response = requests.get(API, params={"dataset": DATASET, "config": "default", "split": "train", "offset": 0, "length": 100}, timeout=30)
    response.raise_for_status()
    candidates = [row for row in response.json()["rows"] if row["row"].get("split") == "train"][:args.limit]
    if len(candidates) != args.limit:
        raise ValueError("Not enough training rows returned")

    processor, model = load_model(False, args.cache_dir)
    Image.MAX_IMAGE_PIXELS = 25_000_000
    results = []
    revisions = set()
    for entry in candidates:
        row = entry["row"]
        url = row["image"]["src"]
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.hostname != "datasets-server.huggingface.co" or not parsed.path.startswith("/cached-assets/Layered-Labs/ACNE04/"):
            raise ValueError("Unexpected image source")
        segments = parsed.path.split("/--/")
        if len(segments) < 3 or len(segments[1]) != 40:
            raise ValueError("Missing dataset revision")
        revisions.add(segments[1])
        with requests.get(url, timeout=60, stream=True, allow_redirects=False) as image_response:
            image_response.raise_for_status()
            if image_response.status_code != 200:
                raise ValueError("Unexpected image response")
            data = bytearray()
            for chunk in image_response.iter_content(64 * 1024):
                data.extend(chunk)
                if len(data) > MAX_BYTES:
                    raise ValueError("Image exceeds size limit")
        with Image.open(io.BytesIO(data)) as source:
            if source.format not in {"JPEG", "PNG"} or source.width * source.height > Image.MAX_IMAGE_PIXELS:
                raise ValueError("Invalid image")
            image = ImageOps.exif_transpose(source).convert("RGB")
            positive, negative = score_image(image, "visible_acne", processor, model)
        results.append({"rowIndex": entry["row_idx"], "datasetSeverityLevel": row["level"],
                        "annotatedLesionCount": row["num_lesions_annotated"], "margin": positive - negative})

    if len(revisions) != 1:
        raise ValueError("Dataset revision changed during download")
    report = {"dataset": DATASET, "revision": next(iter(revisions)), "datasetSource": "Hugging Face dataset viewer",
              "selection": "first training rows, convenience sample", "modelVersion": f"{MODEL_ID}@{MODEL_REVISION}",
              "promptVersion": "skin-observation-experiment-v2", "sampleCount": len(results), "records": results,
              "limitations": ["academic use only", "not an accuracy benchmark", "unknown patient overlap", "no negative group", "no independent validation", "not clinical"]}
    with args.output.open("x", encoding="utf-8") as output:
        json.dump(report, output, indent=2, allow_nan=False)
    print(f"Processed {len(results)} training images locally; images were not saved or uploaded.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Exploration failed: {type(error).__name__}. Check access, local cache and data format.", file=sys.stderr)
        raise SystemExit(1)
