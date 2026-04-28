const API_UPLOAD_URL =
  window.location.protocol === "file:"
    ? "http://127.0.0.1:8000/upload"
    : `${window.location.origin}/upload`;

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const browseBtn = document.getElementById("browseBtn");
const fileName = document.getElementById("fileName");
const videoPreview = document.getElementById("videoPreview");
const analyzeBtn = document.getElementById("analyzeBtn");
const loading = document.getElementById("loading");
const progressBar = document.getElementById("progressBar");
const resultCard = document.getElementById("resultCard");

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

    const badgeClass = data.result === "FAKE" ? "fake" : "real";
    resultCard.innerHTML = `
      <div class="result-top"><span class="badge ${badgeClass}">${data.result}</span></div>
      <h2>Confidence: ${data.confidence}%</h2>
      <p><b>Frames analyzed:</b> ${data.frames_analyzed}</p>
      <p><b>Average fake probability:</b> ${data.average_fake_probability}%</p>
      <p><b>Why:</b> ${data.explanation}</p>
    `;
    resultCard.classList.remove("hidden");
  } catch (err) {
    const msg = err?.message || "Unknown error";
    if (msg.toLowerCase().includes("failed to fetch")) {
      const hint = window.location.protocol === "file:"
        ? "You opened HTML directly. Start backend and open http://127.0.0.1:8000"
        : "Backend not reachable or crashed. Check terminal logs and /health endpoint.";
      showError(hint);
    } else {
      showError(msg);
    }
  } finally {
    stopProgress();
    loading.classList.add("hidden");
  }
});
