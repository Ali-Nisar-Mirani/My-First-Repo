from __future__ import annotations

import shutil
from pathlib import Path
from typing import Generator, List, Tuple

import cv2
import numpy as np


def extract_frames(video_path: Path, output_dir: Path, frame_every_seconds: float = 1.0) -> List[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(video_path))

    if not cap.isOpened():
        return []

    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    step = max(int(fps * frame_every_seconds), 1)

    frame_paths: List[Path] = []
    frame_index = 0
    saved_index = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_index % step == 0:
            frame_path = output_dir / f"frame_{saved_index:05d}.jpg"
            cv2.imwrite(str(frame_path), frame)
            frame_paths.append(frame_path)
            saved_index += 1
        frame_index += 1

    cap.release()
    return frame_paths


def detect_faces(frame_bgr: np.ndarray, cascade: cv2.CascadeClassifier) -> List[Tuple[int, int, int, int]]:
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(48, 48))
    return list(faces)


def crop_largest_face(frame_bgr: np.ndarray, faces: List[Tuple[int, int, int, int]]) -> np.ndarray | None:
    if not faces:
        return None
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    return frame_bgr[y : y + h, x : x + w]


def cleanup_path(path: Path) -> None:
    if path.is_file():
        path.unlink(missing_ok=True)
    elif path.exists():
        shutil.rmtree(path, ignore_errors=True)
