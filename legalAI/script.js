// DOM elements
const fileInput = document.getElementById("fileInput");
const fileStatus = document.getElementById("fileStatus");
const chooseBtn = document.querySelector(".btn-ai"); // "Choose File" button
// Get button
const viewAnalysisBtn = document.getElementById("viewAnalysisBtn");

// when file is uploaded successfully
function showSuccessMessage() {
    alert("✅ Document successfully uploaded!");

    // show the button
    if (viewAnalysisBtn) {
        viewAnalysisBtn.style.display = "inline-block";
    }
}
if (viewAnalysisBtn) {
    viewAnalysisBtn.addEventListener("click", () => {
        window.location.href = "analysis.html";  // redirect to analysis page
    });
}



// Trigger file explorer when "Choose File" clicked
if (chooseBtn && fileInput) {
    chooseBtn.addEventListener("click", () => fileInput.click());
}

// File input change event
if (fileInput) {
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            // Show uploading first
            fileStatus.style.color = "blue";
            fileStatus.innerHTML = `📤 Uploading "${file.name}"...`;

            // ✅ Just simulate successful upload (without backend for now)
            setTimeout(() => {
                fileStatus.style.color = "green";
                fileStatus.innerHTML = `✅ Document "<b>${file.name}</b>" uploaded successfully!`;
            }, 1500); // 1.5 sec delay for effect
        }
    });
}
if (viewFullAnalysisBtn) {
    viewFullAnalysisBtn.addEventListener("click", () => {
        // Redirect with query param (for PDF name ya analysis data)
        window.location.href = `analysis.html?file=${encodeURIComponent(fileNameDisplay.textContent)}`;
    });
}
// Show info when View Full Analysis is clicked
document.getElementById("viewAnalysisBtn")?.addEventListener("click", () => {
    document.getElementById("analysisInfo").style.display = "block";
});

// Export Report
document.getElementById("exportReportBtn")?.addEventListener("click", () => {
    document.getElementById("exportStatus").style.display = "block";
});

// Download Summary
document.getElementById("downloadSummaryBtn")?.addEventListener("click", () => {
    document.getElementById("summaryStatus").style.display = "block";
});

// Risk Page
document.getElementById("viewRiskBtn")?.addEventListener("click", () => {
    window.location.href = "risk.html";
});
