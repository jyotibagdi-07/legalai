// script.js

// DOM elements
const fileInput = document.getElementById("fileInput");
const fileStatus = document.getElementById("fileStatus");
const analysisOutput = document.getElementById("analysisOutput");
const uploadBtn = document.getElementById("uploadBtn");
const uploadArea = document.getElementById('uploadArea');
const analysisView = document.getElementById('analysisView');
const fileNameDisplay = document.getElementById('fileName');
const fileProgress = document.getElementById('fileProgress');
const progressSection = document.getElementById('progressSection');
const uploadAnotherBtn = document.getElementById('uploadAnotherBtn');

// Backend URL (FastAPI) - Check the port
const BACKEND_URL = "http://127.0.0.1:8010/analyze";

// Handle file input change
fileInput.addEventListener('change', handleFileSelection);

// Handle manual upload button
if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
        const file = fileInput.files[0];
        if (file) {
            startAnalysis(file);
        }
    });
}

// Upload Another button
if (uploadAnotherBtn) {
    uploadAnotherBtn.addEventListener('click', resetUI);
}

function handleFileSelection(e) {
    const file = e.target.files[0];
    if (file) {
        startAnalysis(file);
    }
}

function startAnalysis(file) {
    // Show analysis view and hide upload area
    if (uploadArea) uploadArea.style.display = 'none';
    if (analysisView) analysisView.style.display = 'block';

    // Update UI with file info
    if (fileNameDisplay) fileNameDisplay.textContent = file.name;
    if (fileStatus) fileStatus.textContent = "📤 Uploading and analyzing...";
    
    // Show spinner
    if (fileProgress) fileProgress.innerHTML = '<div class="spinner"></div>';

    uploadFileToBackend(file);
}

function uploadFileToBackend(file) {
    const formData = new FormData();
    formData.append("file", file);

    fetch(BACKEND_URL, {
        method: "POST",
        body: formData
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
    })
    .then(data => {
        if (data.summary) {
            if (fileStatus) fileStatus.textContent = "✅ Analysis complete!";
            completeAnalysis(data.summary);
        } else {
            if (fileStatus) fileStatus.textContent = "❌ Failed to analyze document.";
            if (analysisOutput) analysisOutput.innerHTML = `<p>Error: No summary received.</p>`;
        }
    })
    .catch(err => {
        console.error("Error:", err);
        if (fileStatus) fileStatus.textContent = "❌ Error analyzing document.";
        if (analysisOutput) analysisOutput.innerHTML = `<p>There was an issue with the backend. Please check the server and try again.</p>`;
    });
}

function completeAnalysis(summary) {
    // Hide spinner and show summary
    if (fileProgress) fileProgress.innerHTML = ''; // Clear spinner
    if (analysisOutput) {
        analysisOutput.innerHTML = `
            <h3>📑 Summary</h3>
            <p>${summary}</p>
        `;
    }
}

function resetUI() {
    // Reset all UI elements
    if (uploadArea) uploadArea.style.display = 'block';
    if (analysisView) analysisView.style.display = 'none';
    if (fileInput) fileInput.value = '';
    if (fileStatus) fileStatus.textContent = '';
    if (analysisOutput) analysisOutput.innerHTML = '';
    if (fileNameDisplay) fileNameDisplay.textContent = '';
}