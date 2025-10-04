// DOM elements
const fileInput = document.getElementById("fileInput");
const fileStatus = document.getElementById("fileStatus");
const chooseBtn = document.querySelector(".btn-ai"); // "Choose File" button
const viewAnalysisBtn = document.getElementById("viewAnalysisBtn");
const viewFullAnalysisBtn = document.getElementById("viewFullAnalysisBtn"); // optional if exists
const fileNameDisplay = document.getElementById("fileName"); // optional if exists

// Function to show success message
function showSuccessMessage() {
    alert("✅ Document successfully uploaded!");

    // show the "View Analysis" button
    if (viewAnalysisBtn) {
        viewAnalysisBtn.style.display = "inline-block";
    }
}

// Redirect to analysis page on click
if (viewAnalysisBtn) {
    viewAnalysisBtn.addEventListener("click", () => {
        window.location.href = "analysis.html";  // redirect to analysis page
    });
}

// Trigger file explorer when "Choose File" clicked
if (chooseBtn && fileInput) {
    chooseBtn.addEventListener("click", () => fileInput.click());
}

// Handle file input change (upload to backend)
if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Show uploading status
            fileStatus.style.color = "blue";
            fileStatus.innerHTML = `📤 Uploading "<b>${file.name}</b>"...`;

            const formData = new FormData();
            formData.append("file", file);

            try {
                // Send file to FastAPI backend
                const response = await fetch("http://localhost:8000/analyze", {
                    method: "POST",
                    body: formData,
                });

                const result = await response.json();

                // Display backend response
                fileStatus.style.color = "green";
                fileStatus.innerHTML = `
                    ✅ Analysis complete for <b>${file.name}</b><br>
                    <strong>Risk Level:</strong> ${result.risk_level}
                `;

                // Save file name for future use (optional)
                if (fileNameDisplay) {
                    fileNameDisplay.textContent = file.name;
                }

                showSuccessMessage();

            } catch (error) {
                console.error("❌ Backend Error:", error);
                fileStatus.style.color = "red";
                fileStatus.innerHTML = "❌ Error connecting to backend.";
            }
        }
    });
}

// Redirect with query param for full analysis (optional)
if (viewFullAnalysisBtn && fileNameDisplay) {
    viewFullAnalysisBtn.addEventListener("click", () => {
        window.location.href = `analysis.html?file=${encodeURIComponent(fileNameDisplay.textContent)}`;
    });
}

// Show analysis info when button clicked
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

// Risk Link 1
const riskLink1 = document.getElementsByClassName("risk-link1");
if (riskLink1.length) {
    Array.from(riskLink1).forEach((el) => {
        el.addEventListener("click", () => {
            window.location.href = "clause1.html";
        });
    });
}
