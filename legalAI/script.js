// script.js

// DOM elements
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const fileStatus = document.getElementById("fileStatus");
const analysisOutput = document.getElementById("analysisOutput");

// Backend URL (FastAPI)
const BACKEND_URL = "http://127.0.0.1:8000/summarize";

// Handle file upload button click
uploadBtn.addEventListener("click", () => {
    const file = fileInput.files[0];

    if (!file) {
        fileStatus.textContent = "⚠️ Please select a file first!";
        return;
    }

    fileStatus.textContent = "📤 Uploading and analyzing...";
    handleFileUpload(file);
});

// Upload file to backend
function handleFileUpload(file) {
    const formData = new FormData();
    formData.append("file", file);

    fetch(BACKEND_URL, {
        method: "POST",
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.summary) {
            fileStatus.textContent = "✅ Analysis complete!";
            completeAnalysis(data.summary);
        } else {
            fileStatus.textContent = "❌ Failed to analyze document.";
        }
    })
    .catch(err => {
        console.error("Error:", err);
        fileStatus.textContent = "❌ Error analyzing document.";
    });
}

<<<<<<< HEAD


document.querySelector('a[href="#how-it-works"]').addEventListener('click', function(e) {
  e.preventDefault(); // stop normal anchor scroll
  const btn = document.getElementById('watch-demo');
  if (btn) {
    btn.scrollIntoView({ behavior: 'smooth', block: 'center' }); // scroll nicely
    setTimeout(() => btn.click(), 600); // auto-click after scroll (adjust delay if needed)
  }
});


// File Upload Functionality
function initializeFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const analysisView = document.getElementById('analysisView');
    const fileName = document.getElementById('fileName');
    const fileStatus = document.getElementById('fileStatus');
    const fileProgress = document.getElementById('fileProgress');
    const progressSection = document.getElementById('progressSection');
    const resultsPreview = document.getElementById('resultsPreview');
    const viewAnalysisBtn = document.getElementById('viewAnalysisBtn');
    const downloadReportBtn = document.getElementById('downloadReportBtn');
    const uploadAnotherBtn = document.getElementById('uploadAnotherBtn');
    
    let isDragging = false;
    let uploadedFile = null;
    let isAnalyzing = false;
    
    // Drag and drop handlers
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // File input handler
    fileInput.addEventListener('change', handleFileInput);
    
    // Button handlers
    uploadAnotherBtn.addEventListener('click', resetUpload);
    
    function handleDragOver(e) {
        e.preventDefault();
        isDragging = true;
        uploadArea.classList.add('dragging');
    }
    
    function handleDragLeave() {
        isDragging = false;
        uploadArea.classList.remove('dragging');
    }
    
    function handleDrop(e) {
        e.preventDefault();
        isDragging = false;
        uploadArea.classList.remove('dragging');
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    }
    
    function handleFileInput(e) {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileUpload(files[0]);
        }
    }
    
    function handleFileUpload(file) {
        uploadedFile = file.name;
        isAnalyzing = true;
        
        // Show analysis view
        uploadArea.style.display = 'none';
        analysisView.style.display = 'block';
        
        // Update file info
        fileName.textContent = uploadedFile;
        fileStatus.textContent = 'Analyzing with AI...';
        
        // Show spinner
        fileProgress.innerHTML = '<div class="spinner"></div>';
        
        // Show progress section
        progressSection.style.display = 'block';
        resultsPreview.style.display = 'none';
        viewAnalysisBtn.style.display = 'none';
        downloadReportBtn.style.display = 'none';
        
        // Simulate AI analysis
        setTimeout(() => {
            completeAnalysis();
        }, 3000);
    }
    
    function completeAnalysis() {
        isAnalyzing = false;
        
        // Update file status
        fileStatus.textContent = 'Analysis complete';
        
        // Show success icon
        fileProgress.innerHTML = '<i data-lucide="check-circle" class="success-icon"></i>';
        lucide.createIcons();
        
        // Hide progress section and show results
        progressSection.style.display = 'none';
        resultsPreview.style.display = 'grid';
        viewAnalysisBtn.style.display = 'inline-flex';
        downloadReportBtn.style.display = 'inline-flex';
    }
    
    function resetUpload() {
        uploadedFile = null;
        isAnalyzing = false;
        
        // Reset UI
        uploadArea.style.display = 'block';
        analysisView.style.display = 'none';
        fileInput.value = '';
        
        // Reset progress
        progressSection.style.display = 'none';
        resultsPreview.style.display = 'none';
        viewAnalysisBtn.style.display = 'none';
        downloadReportBtn.style.display = 'none';
    }
=======
// Show output on webpage
function completeAnalysis(summary) {
    analysisOutput.innerHTML = `
        <h3>📑 Summary</h3>
        <p>${summary}</p>
    `;
>>>>>>> 01d927d (first commit)
}
