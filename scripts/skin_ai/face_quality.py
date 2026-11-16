"""Face-presence and framing gate for SkinCycle scan images.

UltraFace only verifies that one suitably framed face is present. It does not
identify the person, diagnose skin, or prove that every facial area is visible.
"""
from __future__ import annotations

import numpy as np
from PIL import Image

FACE_MODEL_VERSION = "Linzaer/Ultra-Light-Fast-Generic-Face-Detector-1MB@version-RFB-320"
FACE_INPUT = (320, 240)


def _iou(a, b):
    left, top = max(a[0], b[0]), max(a[1], b[1])
    right, bottom = min(a[2], b[2]), min(a[3], b[3])
    overlap = max(0.0, right - left) * max(0.0, bottom - top)
    union = max(0.0, a[2] - a[0]) * max(0.0, a[3] - a[1]) + max(0.0, b[2] - b[0]) * max(0.0, b[3] - b[1]) - overlap
    return overlap / union if union else 0.0


def detect_faces(image: Image.Image, session, confidence: float = 0.75):
    resized = image.convert("RGB").resize(FACE_INPUT, Image.Resampling.BILINEAR)
    tensor = (np.asarray(resized, dtype=np.float32) - 127.0) / 128.0
    tensor = tensor.transpose(2, 0, 1)[None]
    outputs = session.run(None, {session.get_inputs()[0].name: tensor})
    if len(outputs) != 2:
        raise RuntimeError("face_model_output_invalid")
    scores, boxes = (np.asarray(value) for value in outputs)
    if scores.shape != (1, 4420, 2) or boxes.shape != (1, 4420, 4):
        raise RuntimeError("face_model_output_invalid")
    candidates = []
    for score, box in zip(scores[0, :, 1], boxes[0]):
        if not np.isfinite([score, *box]).all() or score < confidence:
            continue
        x1, y1, x2, y2 = (float(np.clip(value, 0, 1)) for value in box)
        if x2 <= x1 or y2 <= y1:
            continue
        candidates.append({"confidence": float(score), "box": (x1, y1, x2, y2)})
    kept = []
    for item in sorted(candidates, key=lambda value: value["confidence"], reverse=True):
        if all(_iou(item["box"], other["box"]) < 0.3 for other in kept):
            kept.append(item)
    return kept


def require_scan_face(image: Image.Image, session):
    faces = detect_faces(image, session)
    if not faces:
        raise ValueError("face_not_found")
    if len(faces) != 1:
        raise ValueError("multiple_faces")
    face = faces[0]
    x1, y1, x2, y2 = face["box"]
    width, height = x2 - x1, y2 - y1
    area = width * height
    center_x, center_y = (x1 + x2) / 2, (y1 + y2) / 2
    if area < 0.12:
        raise ValueError("face_too_far")
    if area > 0.82 or min(x1, y1, 1 - x2, 1 - y2) < 0.01:
        raise ValueError("face_too_close")
    if not (0.30 <= center_x <= 0.70 and 0.28 <= center_y <= 0.67):
        raise ValueError("face_not_centered")
    return {
        "version": FACE_MODEL_VERSION,
        "confidence": round(face["confidence"], 4),
        "box": {"x": x1, "y": y1, "width": width, "height": height},
    }
