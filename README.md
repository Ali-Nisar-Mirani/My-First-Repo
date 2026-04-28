# Deepfake Video Detector (Offline)

A production-structured offline web app that detects whether a video is likely **REAL** or **FAKE**.

## Features
- Drag-and-drop video upload UI
- FastAPI backend with `/upload` inference endpoint
- OpenCV frame extraction (1 frame/second)
- Haar Cascade face detection
- Local PyTorch model inference (no paid APIs, no external keys)
- Result with label, confidence, explanation, and analyzed frame count

## Project Structure
```
project/
├── backend/
│   ├── app.py
│   ├── model.py
│   ├── utils.py
│   ├── requirements.txt
│   └── uploads/
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── model/
│   └── pretrained_model.pth   # optional user-provided weights
└── README.md
```

## Setup
### 1) Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
# (alternative) cd backend && uvicorn app:app --reload --port 8000
```

### 2) Frontend
No separate frontend server is required now. FastAPI serves the UI automatically.

Open: `http://127.0.0.1:8000`

> Important: do not open `frontend/index.html` directly via file browser for normal use. Use the FastAPI URL above.


## Run check
- Visit `http://127.0.0.1:8000/health` and confirm `{"status":"ok"}`
- Then open `http://127.0.0.1:8000` and upload a video

## Troubleshooting
- **Error: Failed to fetch** usually means the frontend cannot reach the backend.
- Start backend from repository root:
  ```bash
  uvicorn backend.app:app --host 0.0.0.0 --port 8000
  ```
- Confirm health endpoint works: `http://127.0.0.1:8000/health`
- If startup fails, ensure dependencies are installed in your active virtualenv and use one of the two startup commands above.
- If backend runs on a different host/port, set it in browser console:
  ```js
  localStorage.setItem("deepfake_api_base", "http://127.0.0.1:8000")
  location.reload()
  ```

## API
### `POST /upload`
- **Form field**: `file` (video)
- **Returns**:
```json
{
  "result": "FAKE",
  "confidence": 87.5,
  "frames_analyzed": 32,
  "average_fake_probability": 81.2,
  "explanation": "High facial texture inconsistency detected across sampled frames."
}
```

## Pipeline Explanation
1. Video is uploaded and temporarily saved.
2. Frames are extracted using OpenCV at 1 frame per second.
3. Haar Cascade detects faces in each frame.
4. Largest face is cropped and preprocessed.
5. PyTorch model predicts fake probability per face.
6. Probabilities are averaged across frames.
7. Threshold rule (`>= 0.6`) => FAKE, otherwise REAL.

## Model Notes
- By default, the app uses a lightweight fallback CNN (`SimpleDeepfakeCNN`).
- For better performance, place your open-source pretrained weights at:
  `model/pretrained_model.pth`
- The backend will auto-load those weights if available.

## Testing
- Test backend health: `GET /health`
- Upload sample videos using the web UI.
- Confirm response includes `result`, `confidence`, and `frames_analyzed`.


## Demo fallback mode
If the backend is unreachable, the frontend now shows a **demo fallback result** so the UI remains usable.
This fallback is **not real ML inference**; start backend at `http://127.0.0.1:8000` for true deepfake detection.
