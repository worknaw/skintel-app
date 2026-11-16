"""Download three local-only ACNE04 demo images that pass the scan quality gate."""
from __future__ import annotations

import argparse
import io
import json
from pathlib import Path

import onnxruntime as ort
import requests
from PIL import Image, ImageOps

from acne_pipeline import image_quality
from face_quality import require_scan_face


def bucket(count: int):
    if count <= 3:
        return "mild"
    if count <= 10:
        return "medium"
    return "higher"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--face-model", type=Path, default=Path("scripts/skin_ai/models/face-detector-rfb-320.onnx"))
    parser.add_argument("--max-rows", type=int, default=600)
    parser.add_argument("--source-dir", type=Path, default=Path("skin-ai-data/demo-source"), help="Fallback local image directory when the public dataset API is unavailable")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    if any(args.output.iterdir()):
        raise FileExistsError("Output directory must be empty")
    session = ort.InferenceSession(str(args.face_model), providers=["CPUExecutionProvider"])
    selected = {}
    try:
        row_batches = []
        for offset in range(0, args.max_rows, 100):
            response = requests.get("https://datasets-server.huggingface.co/rows", params={
                "dataset": "Layered-Labs/ACNE04", "config": "default", "split": "train", "offset": offset, "length": 100,
            }, timeout=30)
            response.raise_for_status()
            row_batches.append(response.json()["rows"])
    except requests.RequestException:
        local_rows = []
        for path in sorted(args.source_dir.rglob("*")):
            if path.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
                continue
            label = str(path).lower()
            pseudo_count = 20 if "oily" in label else (8 if "combination" in label else 0)
            local_rows.append({"row": {"image": {"src": str(path)}, "file_name": path.name,
                                       "num_lesions_annotated": pseudo_count, "severity": "local-demo", "split": "local"}})
        row_batches = [local_rows]
    for batch in row_batches:
        for entry in batch:
            row = entry["row"]
            group = bucket(int(row["num_lesions_annotated"]))
            if group in selected:
                continue
            source = row["image"]["src"]
            try:
                image_response = requests.get(source, timeout=60) if str(source).startswith("http") else None
                image_bytes = image_response.content if image_response is not None else Path(source).read_bytes()
            except (OSError, requests.RequestException):
                continue
            if len(image_bytes) > 10 * 1024 * 1024:
                continue
            try:
                with Image.open(io.BytesIO(image_bytes)) as source_image:
                    image = ImageOps.exif_transpose(source_image).convert("RGB")
                    if not image_quality(image)["passed"]:
                        continue
                    face = require_scan_face(image, session)
            except (OSError, ValueError):
                continue
            filename = f"{len(selected) + 1:02d}-{group}-{row['num_lesions_annotated']}-reference.jpg"
            image.save(args.output / filename, format="JPEG", quality=92)
            selected[group] = {
                "file": filename, "source_file": row["file_name"], "annotated_acne_boxes": row["num_lesions_annotated"],
                "dataset_severity": row["severity"], "dataset_split": row["split"], "face_gate": face,
            }
            print(f"Selected {group}: {filename}", flush=True)
            if len(selected) == 3:
                break
        if len(selected) == 3:
            break
    if len(selected) != 3:
        raise RuntimeError(f"Only found: {sorted(selected)}")
    (args.output / "expected-results.json").write_text(json.dumps({
        "dataset": "Layered-Labs/ACNE04", "revision": "e375d8dac98b8562c5ab462d5f00ac011e8a47db",
        "purpose": "class-project demo only; annotations are references, not expected model output",
        "license_note": "academic/research use; verify source terms before redistribution",
        "images": selected,
    }, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
