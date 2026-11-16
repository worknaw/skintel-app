"""Local-only ONNX acne-detection prototype for the SkinCycle class project.

This uses a public YOLO26 ONNX model. It returns only the `acne` class. Other
classes in the checkpoint are ignored, and dry/oily skin is intentionally not
inferred because this detector was not trained for that task.
"""
from __future__ import annotations

import io
import os
from contextlib import asynccontextmanager

import onnxruntime as ort
from fastapi import FastAPI, HTTPException, Request
from PIL import Image, ImageOps, UnidentifiedImageError

if __package__:
    from .acne_pipeline import ScanConfig, concern_detections, require_image_quality
    from .face_quality import FACE_MODEL_VERSION, require_scan_face
else:
    from acne_pipeline import ScanConfig, concern_detections, require_image_quality
    from face_quality import FACE_MODEL_VERSION, require_scan_face

HOST = "127.0.0.1"
PORT = 8766
MODEL_SIZE = 640
MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 25_000_000
MODEL_PATH = os.environ.get("SKINCYCLE_ACNE_ONNX_MODEL", "scripts/skin_ai/models/skin-problem-yolo26.onnx")
FACE_MODEL_PATH = os.environ.get("SKINCYCLE_FACE_ONNX_MODEL", "scripts/skin_ai/models/face-detector-rfb-320.onnx")
MODEL_VERSION = "zikabyte/skin-problem-detection-demo@model.onnx"


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    if not os.path.isfile(MODEL_PATH):
        raise RuntimeError(f"Missing ONNX model: {MODEL_PATH}")
    if not os.path.isfile(FACE_MODEL_PATH):
        raise RuntimeError(f"Missing ONNX model: {FACE_MODEL_PATH}")
    app.state.config = ScanConfig.from_environment()
    app.state.session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
    app.state.face_session = ort.InferenceSession(FACE_MODEL_PATH, providers=["CPUExecutionProvider"])
    yield


app = FastAPI(title="SkinCycle ONNX acne prototype", docs_url=None, redoc_url=None, lifespan=lifespan)


def require_local_pilot(request: Request) -> None:
    if request.headers.get("host") != f"{HOST}:{PORT}" or request.headers.get("origin") or request.headers.get("x-skincycle-pilot") != "1":
        raise HTTPException(403, "local_only")


@app.get("/health")
async def health(request: Request):
    require_local_pilot(request)
    return {"mode": "prototype-yolo", "ready": True, "modelVersion": MODEL_VERSION}


@app.post("/scan")
async def scan(request: Request, mode: str = "full"):
    require_local_pilot(request)
    if request.headers.get("content-type") != "image/jpeg":
        raise HTTPException(415, "invalid_image")
    try:
        image = decode_jpeg(await request.body())
        quality = require_image_quality(image)
        face = require_scan_face(image, app.state.face_session)
        if mode not in {"full", "tiled"}:
            raise ValueError("invalid_scan_mode")
        config = ScanConfig(confidence=app.state.config.confidence, nms_iou=app.state.config.nms_iou, tiled=mode == "tiled")
        inference_warning = None
        try:
            detections = concern_detections(image, app.state.session, config)
        except Exception:
            detections = []
            inference_warning = "ตรวจตำแหน่งสิวไม่สำเร็จในภาพนี้"
    except ValueError as error:
        raise HTTPException(422, str(error)) from error
    except Exception as error:
        raise HTTPException(500, "inference_failed") from error
    return {
        "mode": "prototype-yolo",
        "modelVersion": config.result_version(MODEL_VERSION),
        "prototypeNotice": "ผลทดลองสำหรับโครงงาน ไม่ใช่การวินิจฉัยทางการแพทย์",
        "quality": {**quality, "face": face},
        "pipeline": config.metadata(),
        "acne": {"count": sum(item["class"] == "acne" for item in detections),
                 "detections": [item for item in detections if item["class"] == "acne"]},
        "redness": {"count": sum(item["class"] == "redness" for item in detections),
                    "detections": [item for item in detections if item["class"] == "redness"],
                    "label": "ตำแหน่งที่โมเดลจัดเป็น rosacea/redness โดยประมาณ"},
        "skinType": {"label": "unassessable", "reason": "ให้ Gemini ประเมินร่วมกับ onboarding และตอบว่ายังประเมินไม่ได้เมื่อหลักฐานไม่ชัด"},
        "inferenceWarning": inference_warning,
    }
