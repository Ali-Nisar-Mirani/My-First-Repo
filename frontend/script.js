const API_URL = "http://127.0.0.1:8000/upload";
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

analyzeBtn.addEventListener("click", async () => {
  if (!selectedFile) return;
  loading.classList.remove("hidden");
  resultCard.classList.add("hidden");

  const formData = new FormData();
  formData.append("file", selectedFile);

  try {
    const res = await fetch(API_URL, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Analysis failed");

    const badgeClass = data.result === "FAKE" ? "fake" : "real";
    resultCard.innerHTML = `
      <span class="badge ${badgeClass}">${data.result}</span>
      <h2>Confidence: ${data.confidence}%</h2>
      <p><b>Frames analyzed:</b> ${data.frames_analyzed}</p>
      <p><b>Why:</b> ${data.explanation}</p>
    `;
    resultCard.classList.remove("hidden");
  } catch (err) {
    resultCard.innerHTML = `<p style="color:#f87171;">Error: ${err.message}</p>`;
    resultCard.classList.remove("hidden");
  } finally {
    loading.classList.add("hidden");
  }
});
