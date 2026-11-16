"""Validate a consented YOLO dataset and split it by person, never by image."""
from __future__ import annotations

import argparse
import json
import random
from collections import defaultdict
from pathlib import Path


def prepare(manifest: Path, image_root: Path, output: Path, seed: int = 42) -> dict:
    records = json.loads(manifest.read_text(encoding="utf-8"))
    if not isinstance(records, list) or not records:
        raise ValueError("Manifest must be a nonempty JSON array")
    grouped: dict[str, list[Path]] = defaultdict(list)
    seen: set[Path] = set()
    root = image_root.resolve(strict=True)
    for row in records:
        if not isinstance(row, dict) or not row.get("participant_id") or not row.get("consent_reference"):
            raise ValueError("Each image needs participant_id and consent_reference")
        relative = Path(row.get("image", ""))
        if relative.is_absolute() or ".." in relative.parts or relative.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
            raise ValueError("Invalid image path")
        image = (root / relative).resolve(strict=True)
        if not image.is_relative_to(root) or image in seen:
            raise ValueError("Image outside root or duplicate")
        seen.add(image)
        label = image.parent.parent / "labels" / (image.stem + ".txt") if image.parent.name == "images" else image.with_suffix(".txt")
        if not label.is_file():
            raise ValueError(f"Missing YOLO label for {relative}")
        for line in label.read_text(encoding="utf-8").splitlines():
            values = line.split()
            try:
                box = [float(value) for value in values[1:]]
            except ValueError as error:
                raise ValueError(f"Invalid YOLO box in {label}") from error
            if len(values) != 5 or values[0] != "0" or len(box) != 4 or any(not 0 <= value <= 1 for value in box):
                raise ValueError(f"Invalid YOLO box in {label}")
            x, y, width, height = box
            if width <= 0 or height <= 0 or x - width / 2 < 0 or x + width / 2 > 1 or y - height / 2 < 0 or y + height / 2 > 1:
                raise ValueError(f"Empty box in {label}")
        grouped[str(row["participant_id"])].append(image)
    people = sorted(grouped)
    if len(people) < 3:
        raise ValueError("At least three different participants are needed for train/val/test")
    random.Random(seed).shuffle(people)
    val_count = max(1, round(len(people) * 0.15))
    test_count = max(1, round(len(people) * 0.15))
    partitions = {"val": people[:val_count], "test": people[val_count:val_count + test_count], "train": people[val_count + test_count:]}
    if not partitions["train"]:
        raise ValueError("No participants left for training")
    if output.exists():
        raise FileExistsError(output)
    output.mkdir(parents=True)
    summary = {}
    for split, owners in partitions.items():
        images = sorted(str(path) for owner in owners for path in grouped[owner])
        (output / f"{split}.txt").write_text("\n".join(images) + "\n", encoding="utf-8")
        summary[split] = {"participants": len(owners), "images": len(images)}
    (output / "data.yaml").write_text("\n".join(f"{split}: {str((output / (split + '.txt')).resolve()).replace(chr(92), '/')}" for split in partitions) + "\nnames:\n  0: acne\n", encoding="utf-8")
    (output / "summary.json").write_text(json.dumps({"seed": seed, "splits": summary}, indent=2), encoding="utf-8")
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--image-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    print(json.dumps(prepare(args.manifest, args.image_root, args.output, args.seed), indent=2))
