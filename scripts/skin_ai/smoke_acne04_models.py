"""Research smoke test on ACNE04: no uploaded images and no accuracy claims."""
from __future__ import annotations

import argparse
import io
import json
from pathlib import Path
from urllib.parse import urlparse

import requests
import torch
from PIL import Image, ImageOps
from transformers import AutoImageProcessor, AutoModelForImageClassification

from serve_prototype_onnx import MODEL_PATH, MODEL_VERSION, acne_detections
import onnxruntime as ort

MODEL = "dima806/skin_types_image_detection"
REVISION = "5aace4f"
DATASET = "Layered-Labs/ACNE04"
LIMIT_BYTES = 10 * 1024 * 1024


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--limit", type=int, choices=range(1, 11), default=3)
    parser.add_argument("--cache-dir", type=Path, default=Path("skin-ai-data/model-cache"))
    parser.add_argument("--acne-only", action="store_true", help="Skip the skin type model")
    parser.add_argument("--local-skin-model", type=Path, help="Directory containing a downloaded model and processor")
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError("Output exists")
    response = requests.get("https://datasets-server.huggingface.co/rows", params={"dataset": DATASET, "config": "default", "split": "train", "offset": 0, "length": 100}, timeout=30)
    response.raise_for_status()
    rows = [entry for entry in response.json()["rows"] if entry["row"].get("split") == "train"][:args.limit]
    if len(rows) != args.limit:
        raise ValueError("Insufficient training rows")
    processor = model = None
    labels = {}
    if not args.acne_only:
        model_path = str(args.local_skin_model) if args.local_skin_model else MODEL
        options = {"local_files_only": True} if args.local_skin_model else {"revision": REVISION, "cache_dir": args.cache_dir}
        processor = AutoImageProcessor.from_pretrained(model_path, **options)
        model = AutoModelForImageClassification.from_pretrained(model_path, use_safetensors=True, **options)
        model.eval()
        labels = {int(key): str(value).lower() for key, value in model.config.id2label.items()}
        if set(labels.values()) != {"dry", "normal", "oily"}:
            raise ValueError("Unexpected model labels")
    session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
    Image.MAX_IMAGE_PIXELS = 25_000_000
    items = []
    revisions = set()
    for entry in rows:
        row = entry["row"]
        url = row["image"]["src"]
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.hostname != "datasets-server.huggingface.co" or not parsed.path.startswith("/cached-assets/Layered-Labs/ACNE04/"):
            raise ValueError("Unexpected image source")
        segments = parsed.path.split("/--/")
        if len(segments) < 3 or len(segments[1]) != 40:
            raise ValueError("Missing dataset revision")
        revisions.add(segments[1])
        data = bytearray()
        with requests.get(url, stream=True, allow_redirects=False, timeout=60) as image_response:
            image_response.raise_for_status()
            if image_response.status_code != 200:
                raise ValueError("Unexpected image response")
            for chunk in image_response.iter_content(65536):
                data.extend(chunk)
                if len(data) > LIMIT_BYTES:
                    raise ValueError("Image too large")
        with Image.open(io.BytesIO(data)) as source:
            if source.format not in {"JPEG", "PNG"} or source.width * source.height > Image.MAX_IMAGE_PIXELS:
                raise ValueError("Invalid image")
            image = ImageOps.exif_transpose(source).convert("RGB")
            detected = acne_detections(image, session)
            predicted = None
            if processor is not None and model is not None:
                inputs = processor(images=image, return_tensors="pt")
                with torch.inference_mode():
                    logits = model(**inputs).logits[0]
                    if not torch.isfinite(logits).all().item():
                        raise ValueError("Invalid classifier output")
                    predicted = labels[int(logits.argmax().item())]
        items.append({"row_index": entry["row_idx"], "annotated_acne_boxes": row["num_lesions_annotated"],
                      "prototype_detected": len(detected), "research_skin_type_output": predicted})
    if len(revisions) != 1:
        raise ValueError("Dataset revision changed")
    with args.output.open("x", encoding="utf-8") as output:
        json.dump({"dataset": DATASET, "dataset_revision": next(iter(revisions)), "selection": "first training rows; convenience sample",
                   "acne_model": MODEL_VERSION, "skin_type_model": None if args.acne_only else MODEL,
                   "skin_type_revision": None if args.acne_only else REVISION,
                   "limitations": ["academic research only", "not accuracy evaluation", "no skin type reference", "unknown patient overlap", "not clinical"],
                   "records": items}, output, indent=2, allow_nan=False)
    print(f"Smoke test processed {len(items)} images in memory; results are not an accuracy benchmark.")


if __name__ == "__main__":
    main()
