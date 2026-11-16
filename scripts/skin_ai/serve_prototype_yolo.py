"""Local-only acne prototype for the SkinCycle class project.

This service loads the public Tinny-Robot/acne checkpoint and returns acne boxes.
It deliberately does not claim to classify dry/oily skin: that requires a separately
validated classifier, not an acne detector. Images are decoded and processed in memory.
"""
from __future__ import annotations

import io
import os
from contextlib import asynccontextmanager

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from PIL import Image, ImageOps, UnidentifiedImageError
from ultralytics import YOLO

HOST = "127.0.0.1"
PORT = 8766
MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 25_000_000
MODEL_PATH = os.environ.get("SKINCYCLE_ACNE_MODEL", "scripts/skin_ai/models/tinny-robot-acne.pt")


def decode_jpeg(data: bytes) -> Image.Image:
    if not data or len(data) > MAX_BYTES:
        raise ValueError("invalid_image")
    try:
        with Image.open(io.BytesIO(data), formats=["JPEG"]) as source:
            if min(source.size) < 320 or source.width * source.height > MAX_PIXELS:
                raise ValueError("invalid_dimensions")
            return ImageOps.exif_transpose(source).convert("RGB")
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError) as error:
        raise ValueError("invalid_image") from error


def normalized_boxes(image: Image.Image, prediction) -> list[dict[str, float | str]]:
    width, height = image.size
    names = prediction.names
    boxes = prediction.boxes
    if boxes is None:
        return []
    detections = []
    for xyxy, confidence, class_id in zip(boxes.xyxy.cpu().tolist(), boxes.conf.cpu().tolist(), boxes.cls.cpu().tolist()):
        x1, y1, x2, y2 = xyxy
        detections.append({
            "class": str(names.get(int(class_id), "acne")),
            "confidence": round(float(confidence), 4),
            "x": round(max(0.0, min(1.0, x1 / width)), 5),
            "y": round(max(0.0, min(1.0, y1 / height)), 5),
            "width": round(max(0.0, min(1.0, (x2 - x1) / width)), 5),
            "height": round(max(0.0, min(1.0, (y2 - y1) / height)), 5),
        })
    return detections


@asynccontextmanager
async def lifespan(app: FastAPI):
    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    if not os.path.isfile(MODEL_PATH):
        raise RuntimeError(f"Missing acne prototype model: {MODEL_PATH}")
    app.state.model = YOLO(MODEL_PATH)
    yield


app = FastAPI(title="SkinCycle acne prototype", docs_url=None, redoc_url=None, lifespan=lifespan)


def require_local_pilot(request: Request) -> None:
    if request.headers.get("host") != f"{HOST}:{PORT}" or request.headers.get("origin") or request.headers.get("x-skincycle-pilot") != "1":
        raise HTTPException(403, "local_only")


@app.get("/health")
async def health(request: Request):
    require_local_pilot(request)
    return {"mode": "prototype-yolo", "ready": True, "modelVersion": "Tinny-Robot/acne"}


@app.post("/scan")
async def scan(request: Request):
    require_local_pilot(request)
    if request.headers.get("content-type") != "image/jpeg":
        raise HTTPException(415, "invalid_image")
    data = await request.body()
    try:
        image = decode_jpeg(data)
    except ValueError as error:
        raise HTTPException(422, str(error)) from error
    try:
        prediction = app.state.model.predict(np.asarray(image), imgsz=640, conf=0.25, device="cpu", verbose=False)[0]
        detections = normalized_boxes(image, prediction)
    except Exception as error:
        raise HTTPException(500, "inference_failed") from error
    return {
        "mode": "prototype-yolo",
        "modelVersion": "Tinny-Robot/acne",
        "prototypeNotice": "ผลทดลองสำหรับโครงงาน ไม่ใช่การวินิจฉัยทางการแพทย์",
        "acne": {"count": len(detections), "detections": detections},
        "skinType": {"label": "unavailable", "reason": "ยังไม่มีโมเดลจำแนกผิวมัน/แห้งที่ผ่านการตรวจสอบ"},
    }

