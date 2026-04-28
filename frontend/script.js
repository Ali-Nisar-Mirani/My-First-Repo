const DEFAULT_API_BASE = "http://127.0.0.1:8000";
const configuredBase = localStorage.getItem("deepfake_api_base") || DEFAULT_API_BASE;
const API_UPLOAD_URL = `${configuredBase.replace(/\/$/, "")}/upload`;

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");
const fileName = document.getElementById("fileName");
const analyzeBtn = document.getElementById("analyzeBtn");
const loading = document.getElementById("loading");
const resultCard = document.getElementById("resultCard");

let selectedFile = null;

browseBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  fileInput.click();
});

dropZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  });
});

dropZone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  handleFile(file);
});

function handleFile(file) {
  if (!file) return;
  selectedFile = file;
  fileName.textContent = `Selected: ${file.name}`;
  analyzeBtn.disabled = false;
}

function showError(message) {
  resultCard.innerHTML = `<p style="color:#f87171;">Error: ${message}</p>`;
  resultCard.classList.remove("hidden");
}

analyzeBtn.addEventListener("click", async () => {
  if (!selectedFile) return;
  loading.classList.remove("hidden");
  resultCard.classList.add("hidden");

  const formData = new FormData();
  formData.append("file", selectedFile);

  try {
    const res = await fetch(API_UPLOAD_URL, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Analysis failed");

    const badgeClass = data.result === "FAKE" ? "fake" : "real";
    resultCard.innerHTML = `
      <span class="badge ${badgeClass}">${data.result}</span>
      <h2>Confidence: ${data.confidence}%</h2>
      <p><b>Frames analyzed:</b> ${data.frames_analyzed}</p>
      <p><b>Why:</b> ${data.explanation}</p>
      <p><b>API:</b> ${configuredBase}</p>
    `;
    resultCard.classList.remove("hidden");
  } catch (err) {
    const raw = err?.message || "Unknown error";
    if (raw.toLowerCase().includes("failed to fetch")) {
      showError(
        `Cannot reach backend at ${configuredBase}. Start FastAPI with: uvicorn backend.app:app --host 0.0.0.0 --port 8000`
      );
    } else {
      showError(raw);
    }
  } finally {
    loading.classList.add("hidden");
  }
});
