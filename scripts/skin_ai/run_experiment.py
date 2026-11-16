"""Research-only, local SigLIP2 experiment. Does not upload images or train a model."""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
from pathlib import Path

MODEL_ID = "google/siglip2-base-patch16-224"
MODEL_REVISION = "75de2d55ec2d0b4efc50b3e9ad70dba96a7b2fa2"
PROMPTS = {
    "visible_acne": ("a photo of a face with visible acne", "a photo of a face without visible acne"),
    "visible_redness": ("a photo of a face with visible skin redness", "a photo of a face without visible skin redness"),
}
LABELS = {"observed", "not_observed", "unassessable"}
IDENTIFIER = re.compile(r"^[A-Za-z0-9_-]{1,80}$")


def load_manifest(path: Path, image_root: Path) -> dict:
    if path.stat().st_size > 5_000_000:
        raise ValueError("Manifest too large")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or data.get("split") not in {"validation", "test"}:
        raise ValueError("Manifest split must be validation or test")
    if not isinstance(data.get("datasetVersion"), str) or not IDENTIFIER.fullmatch(data["datasetVersion"]):
        raise ValueError("Invalid dataset version")
    rows = data.get("images")
    if not isinstance(rows, list) or not rows:
        raise ValueError("Manifest must include images")
    seen = set()
    root = image_root.resolve(strict=True)
    if not root.is_dir():
        raise ValueError("Image root must be a directory")
    for row in rows:
        if not isinstance(row, dict) or not all(isinstance(row.get(k), str) and IDENTIFIER.fullmatch(row[k]) for k in ("imageId", "participantId")):
            raise ValueError("Invalid pseudonymous identifiers")
        if row["imageId"] in seen:
            raise ValueError("Duplicate image ID")
        seen.add(row["imageId"])
        if not isinstance(row.get("path"), str) or not row["path"] or ":" in row["path"]:
            raise ValueError("Image path must be relative to image root")
        relative = Path(row["path"])
        if relative.is_absolute() or ".." in relative.parts:
            raise ValueError("Invalid image path")
        resolved = (root / relative).resolve(strict=True)
        if not resolved.is_relative_to(root) or not resolved.is_file():
            raise ValueError("Image must be a file within image root")
        if resolved.stat().st_size > 10_485_760:
            raise ValueError("Image exceeds 10 MiB")
        labels = row.get("reference")
        if not isinstance(labels, dict) or any(k not in PROMPTS or v not in LABELS for k, v in labels.items()) or not labels:
            raise ValueError("Invalid reference labels")
        row["_resolved"] = resolved
    return data


def load_model(download: bool, cache_dir: Path):
    # Prevent implicit downloads unless the operator has explicitly requested them.
    os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
    os.environ["HF_HOME"] = str(cache_dir.resolve())
    if not download:
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
    from transformers import AutoModel, AutoProcessor
    processor = AutoProcessor.from_pretrained(MODEL_ID, revision=MODEL_REVISION, local_files_only=not download, cache_dir=cache_dir, use_fast=False)
    model = AutoModel.from_pretrained(MODEL_ID, revision=MODEL_REVISION, local_files_only=not download, cache_dir=cache_dir, use_safetensors=True)
    model.eval()
    return processor, model


def score_image(image, finding: str, processor, model) -> tuple[float, float]:
    import torch
    inputs = processor(text=list(PROMPTS[finding]), images=image, padding="max_length", max_length=64, truncation=True, return_tensors="pt")
    with torch.inference_mode():
        logits = model(**inputs).logits_per_image[0].tolist()
    if len(logits) != 2 or not all(math.isfinite(score) for score in logits):
        raise ValueError("Model returned invalid scores")
    return logits[0], logits[1]


def run(manifest: dict, download: bool, cache_dir: Path) -> dict:
    from PIL import Image, ImageOps
    Image.MAX_IMAGE_PIXELS = 25_000_000
    processor, model = load_model(download, cache_dir)
    results = []
    for row in manifest["images"]:
        with Image.open(row["_resolved"]) as source:
            if source.format not in {"JPEG", "PNG"}:
                raise ValueError("Only JPEG and PNG images are supported")
            if source.width * source.height > Image.MAX_IMAGE_PIXELS:
                raise ValueError("Image dimensions exceed the research limit")
            image = ImageOps.exif_transpose(source).convert("RGB")
            for finding, reference in row["reference"].items():
                positive, negative = score_image(image, finding, processor, model)
                results.append({"participantId": row["participantId"], "imageId": row["imageId"], "finding": finding,
                                "reference": reference, "positiveLogit": positive, "negativeLogit": negative,
                                "margin": positive - negative})
    return {"datasetVersion": manifest["datasetVersion"], "split": manifest["split"],
            "modelVersion": f"{MODEL_ID}@{MODEL_REVISION}", "promptVersion": "skin-observation-experiment-v2",
            "notice": "Research scores only; not probabilities or diagnoses", "records": results}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--image-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--cache-dir", type=Path, default=Path(".venv-skin-ai/hf-cache"))
    parser.add_argument("--allow-model-download", action="store_true", help="Allow downloading model and processor once; never uploads images")
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError("Output already exists; choose a new filename")
    manifest = load_manifest(args.manifest, args.image_root)
    result = run(manifest, args.allow_model_download, args.cache_dir)
    with args.output.open("x", encoding="utf-8") as output:
        json.dump(result, output, ensure_ascii=False, indent=2, allow_nan=False)
    print(f"Experiment finished: {len(result['records'])} research records. No images were uploaded.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Experiment failed: {type(error).__name__}. Check setup, manifest, files and model cache.", file=sys.stderr)
        raise SystemExit(1)
