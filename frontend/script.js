const API_BASE = window.location.protocol === "file:" ? "http://127.0.0.1:8000" : window.location.origin;
const API_UPLOAD_URL = `${API_BASE}/upload`;
const API_HEALTH_URL = `${API_BASE}/health`;

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");
const fileName = document.getElementById("fileName");
const videoPreview = document.getElementById("videoPreview");
const analyzeBtn = document.getElementById("analyzeBtn");
const loading = document.getElementById("loading");
const progressBar = document.getElementById("progressBar");
const resultCard = document.getElementById("resultCard");
const apiStatus = document.getElementById("apiStatus");

let selectedFile = null;
let progressTimer = null;

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

dropZone.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));

function handleFile(file) {
  if (!file) return;
  selectedFile = file;
  fileName.textContent = `Selected: ${file.name}`;
  analyzeBtn.disabled = false;
  const url = URL.createObjectURL(file);
  videoPreview.src = url;
  videoPreview.classList.remove("hidden");
}


async function checkBackendStatus() {
  try {
    const res = await fetch(API_HEALTH_URL);
    if (!res.ok) throw new Error();
    apiStatus.textContent = `Backend connected: ${API_BASE}`;
    apiStatus.className = "status ok";
  } catch {
    apiStatus.textContent = `Backend not reachable at ${API_BASE}. Start: uvicorn backend.app:app --reload --port 8000`;
    apiStatus.className = "status bad";
  }
}

checkBackendStatus();


function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

function runDemoLocalAnalysis(file) {
  const seed = hashString(`${file.name}-${file.size}`);
  const fakeScore = ((seed % 1000) / 1000) * 0.7 + 0.15;
  const result = fakeScore >= 0.6 ? "FAKE" : "REAL";
  const confidence = Math.round((result === "FAKE" ? fakeScore : 1 - fakeScore) * 10000) / 100;
  return {
    result,
    confidence,
    frames_analyzed: Math.max(8, Math.min(48, Math.floor(file.size / 200000))),
    average_fake_probability: Math.round(fakeScore * 10000) / 100,
    explanation: "Backend unavailable, so this is a local demo estimate based on file metadata (not ML inference).",
    demo_mode: true,
  };
}

function renderResult(data) {
  const badgeClass = data.result === "FAKE" ? "fake" : "real";
  const mode = data.demo_mode ? '<p><b>Mode:</b> Demo fallback (backend offline)</p>' : '';
  resultCard.innerHTML = `
    <div class="result-top"><span class="badge ${badgeClass}">${data.result}</span></div>
    <h2>Confidence: ${data.confidence}%</h2>
    <p><b>Frames analyzed:</b> ${data.frames_analyzed}</p>
    <p><b>Average fake probability:</b> ${data.average_fake_probability}%</p>
    <p><b>Why:</b> ${data.explanation}</p>
    ${mode}
  `;
  resultCard.classList.remove("hidden");
}

function showError(message) {
  resultCard.innerHTML = `<p class="error">Error: ${message}</p>`;
  resultCard.classList.remove("hidden");
}

function startProgress() {
  let width = 8;
  progressBar.style.width = `${width}%`;
  progressTimer = setInterval(() => {
    width = Math.min(width + Math.random() * 12, 92);
    progressBar.style.width = `${width}%`;
  }, 400);
}

function stopProgress() {
  clearInterval(progressTimer);
  progressBar.style.width = "100%";
  setTimeout(() => (progressBar.style.width = "0%"), 300);
}

async function parseResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (!res.ok) throw new Error(`Server error (${res.status}). ${text.slice(0, 120)}`);
    throw new Error("Unexpected non-JSON response from server.");
  }
}

analyzeBtn.addEventListener("click", async () => {
  if (!selectedFile) return;
  loading.classList.remove("hidden");
  resultCard.classList.add("hidden");
  startProgress();

  const formData = new FormData();
  formData.append("file", selectedFile);

  try {
    const res = await fetch(API_UPLOAD_URL, { method: "POST", body: formData });
    const data = await parseResponse(res);
    if (!res.ok) throw new Error(data.detail || "Analysis failed");

    renderResult(data);
  } catch (err) {
    const msg = err?.message || "Unknown error";
    if (msg.toLowerCase().includes("failed to fetch")) {
      const demo = runDemoLocalAnalysis(selectedFile);
      renderResult(demo);
      apiStatus.textContent = `Backend offline — using demo fallback mode. For real ML inference, start backend at ${API_BASE}.`;
      apiStatus.className = "status bad";
    } else {
      showError(msg);
    }
  } finally {
    stopProgress();
    loading.classList.add("hidden");
  }
});
