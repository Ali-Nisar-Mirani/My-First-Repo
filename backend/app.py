from __future__ import annotations

import uuid
from pathlib import Path

import cv2
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from model import DeepfakeModel
from utils import cleanup_path, crop_largest_face, detect_faces, extract_frames

app = FastAPI(title="Deepfake Video Detector")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("backend/uploads")
FRAME_DIR = Path("backend/temp_frames")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
FRAME_DIR.mkdir(parents=True, exist_ok=True)

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
model = DeepfakeModel(model_path="model/pretrained_model.pth")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/upload")
async def upload_video(file: UploadFile = File(...)) -> dict:
    suffix = Path(file.filename or "video.mp4").suffix.lower()
    if suffix not in {".mp4", ".mov", ".avi", ".mkv", ".webm"}:
        raise HTTPException(status_code=400, detail="Unsupported video format")

    token = uuid.uuid4().hex
    video_path = UPLOAD_DIR / f"{token}{suffix}"
    frames_path = FRAME_DIR / token

    data = await file.read()
    video_path.write_bytes(data)

    frame_files = extract_frames(video_path, frames_path, frame_every_seconds=1.0)
    if not frame_files:
        cleanup_path(video_path)
        cleanup_path(frames_path)
        raise HTTPException(status_code=400, detail="Could not extract frames from video")

    probs: list[float] = []
    explanations: list[str] = []

    for frame_file in frame_files:
        frame = cv2.imread(str(frame_file))
        if frame is None:
            continue
        faces = detect_faces(frame, face_cascade)
        face = crop_largest_face(frame, faces)
        if face is None:
            continue
        pred = model.predict_face(face)
        probs.append(pred.probability_fake)
        explanations.append(pred.explanation)

    cleanup_path(video_path)
    cleanup_path(frames_path)

    if not probs:
        raise HTTPException(status_code=400, detail="No faces detected for analysis")

    avg_prob = sum(probs) / len(probs)
    threshold = 0.6
    result = "FAKE" if avg_prob >= threshold else "REAL"
    confidence = round((avg_prob if result == "FAKE" else 1 - avg_prob) * 100, 2)

    common_explanation = max(set(explanations), key=explanations.count)

    return {
        "result": result,
        "confidence": confidence,
        "frames_analyzed": len(probs),
        "average_fake_probability": round(avg_prob * 100, 2),
        "explanation": common_explanation,
    }
