"""Exploratory evaluation on the Figshare skin type research dataset.

The dataset includes transformed images and potential cross-split leakage.
This is not an independent estimate of real-world or clinical accuracy.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import random
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

import torch
from PIL import Image, ImageOps
from transformers import AutoImageProcessor, AutoModelForImageClassification

EXPECTED_MD5 = "2663ac432ed50175ba63ee8d18e49717"
CLASSES = ("Dry", "Normal", "Oily", "Combination", "Sensitive")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", required=True, type=Path)
    parser.add_argument("--model", required=True, type=Path)
    parser.add_argument("--resnet", action="store_true", help="Use local ResNet50 weights instead of ViT")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--per-class", type=int, default=5, choices=range(1, 46))
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError("Output already exists")
    with args.archive.open("rb") as source:
        digest = hashlib.file_digest(source, "md5").hexdigest()
    if digest != EXPECTED_MD5:
        raise ValueError("Dataset checksum mismatch")
    Image.MAX_IMAGE_PIXELS = 25_000_000
    if args.resnet:
        from torchvision import models, transforms
        model = models.resnet50(weights=None)
        model.fc = torch.nn.Linear(model.fc.in_features, 2)
        state = torch.load(args.model, map_location='cpu', weights_only=True)
        if not isinstance(state, dict):
            raise ValueError('Invalid state dictionary')
        if all(key.startswith('resnet.') for key in state):
            state = {key[len('resnet.'):]: value for key, value in state.items()}
        model.load_state_dict(state, strict=True)
        processor = transforms.Compose([transforms.Resize((224, 224)), transforms.ToTensor(), transforms.Normalize([.485, .456, .406], [.229, .224, .225])])
        labels = {0: 'dry', 1: 'oily'}
        model_name = 'anismizi/skin-type-classifier@2385a75'
    else:
        processor = AutoImageProcessor.from_pretrained(str(args.model), local_files_only=True, use_fast=False)
        model = AutoModelForImageClassification.from_pretrained(str(args.model), local_files_only=True, use_safetensors=True)
        labels = {int(key): str(value).lower() for key, value in model.config.id2label.items()}
        if set(labels.values()) != {"dry", "normal", "oily"}:
            raise ValueError("Unexpected model labels")
        model_name = 'dima806/skin_types_image_detection@5aace4f'
    model.eval()
    with zipfile.ZipFile(args.archive) as archive:
        entries = [entry for entry in archive.infolist() if entry.filename.lower().endswith('.jpg')]
        groups = defaultdict(set)
        for entry in entries:
            parts = entry.filename.split('/')
            if len(parts) < 4 or parts[-3] not in {'Train', 'Validation', 'Test'} or parts[-2] not in CLASSES:
                raise ValueError("Unexpected archive structure")
            groups[parts[-1].lower().split('_resized')[0]].add(parts[-3])
        output = {"dataset": "Figshare 29634428", "dataset_md5": digest, "model": model_name,
                  "scope": "exploratory sample, not independent accuracy", "seed": args.seed,
                  "potential_original_basename_groups_across_splits": sum(len(splits) > 1 for splits in groups.values()),
                  "per_class": args.per_class, "counts": {}}
        rng = random.Random(args.seed)
        for cls in CLASSES:
            candidates = sorted((item for item in entries if item.filename.split('/')[-3:-1] == ['Test', cls]), key=lambda x: x.filename)
            if len(candidates) < args.per_class:
                raise ValueError("Insufficient test images")
            predictions = Counter()
            for entry in rng.sample(candidates, args.per_class):
                if entry.file_size > 10 * 1024 * 1024:
                    raise ValueError("Image too large")
                with Image.open(io.BytesIO(archive.read(entry))) as source:
                    image = ImageOps.exif_transpose(source).convert('RGB')
                    with torch.inference_mode():
                        if args.resnet:
                            logits = model(processor(image).unsqueeze(0))[0]
                        else:
                            logits = model(**processor(images=image, return_tensors='pt')).logits[0]
                        if not torch.isfinite(logits).all().item():
                            raise ValueError('Invalid model output')
                        predictions[labels[int(logits.argmax().item())]] += 1
            output['counts'][cls.lower()] = dict(predictions)
            print(f"Completed class {cls}", flush=True)
    with args.output.open('x', encoding='utf-8') as result:
        json.dump(output, result, indent=2)


if __name__ == '__main__':
    main()
