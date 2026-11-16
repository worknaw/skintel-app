"""Shared, measurable ONNX acne pipeline. Quality thresholds are pilot heuristics.

This does not verify face presence, pose, skin tone, or clinical accuracy.
"""
from __future__ import annotations

import math
import os
import hashlib
import json
from dataclasses import asdict, dataclass

import numpy as np
from PIL import Image

PIPELINE_VERSION = "acne-pipeline-v1"
MODEL_SIZE = 640


@dataclass(frozen=True)
class ScanConfig:
    confidence: float = 0.25
    nms_iou: float = 0.5
    tiled: bool = False

    def __post_init__(self):
        if not all(math.isfinite(v) and 0 < v <= 1 for v in (self.confidence, self.nms_iou)):
            raise ValueError("invalid_scan_config")

    @classmethod
    def from_environment(cls):
        tiled = os.environ.get("SKINCYCLE_ACNE_TILED", "0")
        if tiled not in {"0", "1"}:
            raise ValueError("invalid_scan_config")
        return cls(float(os.environ.get("SKINCYCLE_ACNE_CONFIDENCE", "0.25")),
                   float(os.environ.get("SKINCYCLE_ACNE_NMS_IOU", "0.5")), tiled == "1")

    def metadata(self):
        return {"version": PIPELINE_VERSION, **asdict(self)}

    def result_version(self, model_version):
        fingerprint = hashlib.sha256(json.dumps(self.metadata(), sort_keys=True).encode()).hexdigest()[:12]
        return f"{model_version}|{PIPELINE_VERSION}:{fingerprint}"


def image_quality(image: Image.Image):
    # Fixed analysis resolution makes the sharpness metric less size dependent.
    preview = image.convert("L")
    preview.thumbnail((512, 512))
    gray = np.asarray(preview, dtype=np.float32)
    mean = float(gray.mean())
    dark = float((gray < 15).mean())
    bright = float((gray > 245).mean())
    laplacian = (gray[:-2, 1:-1] + gray[2:, 1:-1] + gray[1:-1, :-2]
                 + gray[1:-1, 2:] - 4 * gray[1:-1, 1:-1])
    sharpness = float(laplacian.var()) if laplacian.size else 0.0
    issues = []
    if min(image.size) < 320:
        issues.append("invalid_dimensions")
    if mean < 35 or dark > 0.65:
        issues.append("image_too_dark")
    if mean > 225 or bright > 0.65:
        issues.append("image_too_bright")
    if sharpness < 12:
        issues.append("image_too_blurry")
    return {"version": "quality-heuristic-v1", "passed": not issues, "issues": issues,
            "meanLuminance": round(mean, 2), "sharpness": round(sharpness, 2)}


def require_image_quality(image: Image.Image):
    quality = image_quality(image)
    if quality["issues"]:
        raise ValueError(quality["issues"][0])
    return quality


def letterbox(image: Image.Image):
    width, height = image.size
    scale = min(MODEL_SIZE / width, MODEL_SIZE / height)
    size = (round(width * scale), round(height * scale))
    offset_x, offset_y = (MODEL_SIZE - size[0]) // 2, (MODEL_SIZE - size[1]) // 2
    canvas = Image.new("RGB", (MODEL_SIZE, MODEL_SIZE), (114, 114, 114))
    canvas.paste(image.resize(size, Image.Resampling.BILINEAR), (offset_x, offset_y))
    return np.asarray(canvas, dtype=np.float32).transpose(2, 0, 1)[None] / 255, scale, offset_x, offset_y


def box_iou(a, b):
    overlap = (max(0, min(a["x"] + a["width"], b["x"] + b["width"]) - max(a["x"], b["x"]))
               * max(0, min(a["y"] + a["height"], b["y"] + b["height"]) - max(a["y"], b["y"])))
    union = a["width"] * a["height"] + b["width"] * b["height"] - overlap
    return overlap / union if union > 0 else 0.0


def suppress_duplicates(detections, threshold):
    kept = []
    for item in sorted(detections, key=lambda d: d["confidence"], reverse=True):
        if all(item.get("class") != other.get("class") or box_iou(item, other) < threshold for other in kept):
            kept.append(item)
    return kept


def concern_detections(image: Image.Image, session, config: ScanConfig | None = None):
    config = config or ScanConfig()
    width, height = image.size
    regions = [(0, 0, width, height)]
    # Four overlapping crops plus full image. Coordinates always map to original.
    if config.tiled:
        crop_w, crop_h = round(width * 0.65), round(height * 0.65)
        regions += [(x, y, x + crop_w, y + crop_h)
                    for y in (0, height - crop_h) for x in (0, width - crop_w)]
    detections = []
    for rx, ry, right, bottom in regions:
        crop = image.crop((rx, ry, right, bottom))
        tensor, scale, ox, oy = letterbox(crop)
        output = np.asarray(session.run(None, {session.get_inputs()[0].name: tensor})[0])
        if output.ndim != 3 or output.shape[0] != 1 or output.shape[2] != 6:
            raise RuntimeError("unsupported_model_output")
        for x1, y1, x2, y2, confidence, class_id in output[0]:
            if not np.isfinite([x1, y1, x2, y2, confidence, class_id]).all():
                raise RuntimeError("invalid_model_output")
            class_name = {1: "acne", 2: "redness"}.get(round(float(class_id)))
            if class_name is None or not config.confidence <= confidence <= 1:
                continue
            left, top = max(0.0, (x1 - ox) / scale), max(0.0, (y1 - oy) / scale)
            end_x, end_y = min(crop.width, (x2 - ox) / scale), min(crop.height, (y2 - oy) / scale)
            if end_x <= left or end_y <= top:
                continue
            # Cast every value to a native Python float. NumPy scalar values
            # serialize poorly in FastAPI/Vercel and only fail when detections
            # exist (empty-result images therefore appeared to work).
            detections.append({"class": class_name, "confidence": float(confidence),
                               "x": float((rx + left) / width), "y": float((ry + top) / height),
                               "width": float((end_x - left) / width), "height": float((end_y - top) / height)})
    return suppress_duplicates(detections, config.nms_iou)


def acne_detections(image: Image.Image, session, config: ScanConfig | None = None):
    """Backward-compatible acne-only view used by the labelled ACNE04 benchmark."""
    return [item for item in concern_detections(image, session, config) if item["class"] == "acne"]
