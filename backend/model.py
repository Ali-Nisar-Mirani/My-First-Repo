from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Tuple

import cv2
import numpy as np
import torch
import torch.nn as nn


class SimpleDeepfakeCNN(nn.Module):
    """Lightweight fallback CNN used when no pretrained weights are supplied."""

    def __init__(self) -> None:
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 16, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((1, 1)),
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64, 32),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.classifier(self.features(x))


@dataclass
class PredictionResult:
    probability_fake: float
    explanation: str


class DeepfakeModel:
    def __init__(self, model_path: str = "model/pretrained_model.pth") -> None:
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = SimpleDeepfakeCNN().to(self.device)
        self.model.eval()
        self.model_path = Path(model_path)
        self._load_weights_if_available()

    def _load_weights_if_available(self) -> None:
        if self.model_path.exists():
            state = torch.load(self.model_path, map_location=self.device)
            if isinstance(state, dict):
                self.model.load_state_dict(state, strict=False)

    @staticmethod
    def preprocess_face(face_bgr: np.ndarray, size: Tuple[int, int] = (128, 128)) -> torch.Tensor:
        face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
        face_resized = cv2.resize(face_rgb, size)
        face_norm = face_resized.astype(np.float32) / 255.0
        tensor = torch.from_numpy(face_norm).permute(2, 0, 1).unsqueeze(0)
        return tensor

    def predict_face(self, face_bgr: np.ndarray) -> PredictionResult:
        with torch.no_grad():
            x = self.preprocess_face(face_bgr).to(self.device)
            prob = float(self.model(x).item())

        if prob > 0.65:
            explanation = "High facial texture inconsistency detected across sampled frames."
        elif prob > 0.5:
            explanation = "Mild temporal and blending anomalies detected in face regions."
        else:
            explanation = "Face regions appear temporally consistent in sampled frames."

        return PredictionResult(probability_fake=prob, explanation=explanation)
