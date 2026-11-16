"""Evaluate a research-only dry/normal/oily image classifier on local images.

Predictions are model outputs, not diagnoses or calibrated probabilities.
No image is uploaded. The model is downloaded only when explicitly enabled.
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

MODEL_ID = "dima806/skin_types_image_detection"
MODEL_LABELS = {"dry", "normal", "oily"}
REFERENCE_LABELS = MODEL_LABELS | {"combination", "unassessable"}
MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 25_000_000


def validate_manifest(data: object, image_root: Path) -> list[dict]:
    if not isinstance(data, list) or not data:
        raise ValueError("Expected a nonempty array")
    root = image_root.resolve(strict=True)
    seen: set[str] = set()
    seen_paths: set[Path] = set()
    people: dict[str, str] = {}
    parsed = []
    for row in data:
        if not isinstance(row, dict):
            raise ValueError("Invalid record")
        person, image_id, split, reference = (row.get(key) for key in ("participant_id", "image_id", "split", "reference"))
        if not all(isinstance(value, str) and value.strip() for value in (person, image_id, row.get("consent_reference"))):
            raise ValueError("Participant, image ID, and consent reference required")
        if image_id in seen or split not in {"validation", "test"} or reference not in REFERENCE_LABELS:
            raise ValueError("Invalid image ID, split or reference")
        if person in people and people[person] != split:
            raise ValueError("Participant overlaps validation and test")
        people[person] = split
        seen.add(image_id)
        path = row.get("path")
        if not isinstance(path, str) or not path or ":" in path:
            raise ValueError("Invalid image path")
        relative = Path(path)
        if relative.is_absolute() or ".." in relative.parts or relative.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
            raise ValueError("Invalid image path")
        resolved = (root / relative).resolve(strict=True)
        if not resolved.is_relative_to(root) or not resolved.is_file() or resolved.stat().st_size > MAX_BYTES or resolved in seen_paths:
            raise ValueError("Image outside root or too large")
        seen_paths.add(resolved)
        parsed.append({"participant_id": person, "image_id": image_id, "split": split, "reference": reference, "path": resolved})
    return parsed


def summarize(results: list[dict]) -> dict:
    by_split: dict[str, Counter] = {}
    for result in results:
        split = result["split"]
        counts = by_split.setdefault(split, Counter())
        counts["images"] += 1
        reference = result["reference"]
        if reference in MODEL_LABELS:
            counts["comparable"] += 1
            counts["correct"] += int(result["predicted"] == reference)
        else:
            counts[f"reference_{reference}"] += 1
        counts[f"reference_{reference}_predicted_{result['predicted']}"] += 1
    return {split: dict(counts) for split, counts in by_split.items()}


def run(records: list[dict], cache_dir: Path, revision: str, allow_download: bool) -> list[dict]:
    import torch
    from PIL import Image, ImageOps
    from transformers import AutoImageProcessor, AutoModelForImageClassification

    if not revision or revision == "main":
        raise ValueError("Specify a fixed model commit revision")
    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    options = {"revision": revision, "cache_dir": str(cache_dir), "local_files_only": not allow_download}
    processor = AutoImageProcessor.from_pretrained(MODEL_ID, **options)
    model = AutoModelForImageClassification.from_pretrained(MODEL_ID, use_safetensors=True, **options)
    model.eval()
    labels = {int(key): str(value).lower() for key, value in model.config.id2label.items()}
    if set(labels.values()) != MODEL_LABELS:
        raise ValueError("Unexpected model labels")
    results = []
    for row in records:
        with Image.open(row["path"]) as source:
            if source.format not in {"JPEG", "PNG"} or source.width * source.height > MAX_PIXELS:
                raise ValueError("Unsupported image")
            image = ImageOps.exif_transpose(source).convert("RGB")
            inputs = processor(images=image, return_tensors="pt")
            with torch.inference_mode():
                logits = model(**inputs).logits[0]
                if not torch.isfinite(logits).all().item():
                    raise ValueError("Invalid model output")
                index = int(logits.argmax().item())
        results.append({key: row[key] for key in ("participant_id", "image_id", "split", "reference")} | {"predicted": labels[index]})
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--image-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--revision", required=True, help="Fixed Hugging Face commit hash")
    parser.add_argument("--cache-dir", type=Path, default=Path("skin-ai-data/model-cache"))
    parser.add_argument("--allow-model-download", action="store_true")
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError("Output exists")
    records = validate_manifest(json.loads(args.manifest.read_text(encoding="utf-8")), args.image_root)
    results = run(records, args.cache_dir, args.revision, args.allow_model_download)
    with args.output.open("x", encoding="utf-8") as output:
        json.dump({"model": MODEL_ID, "revision": args.revision, "notice": "Research only; not validated for diagnosis", "summary": summarize(results), "records": results}, output, indent=2, allow_nan=False)
    print(f"Evaluated {len(results)} local images. No images uploaded.")


if __name__ == "__main__":
    main()
