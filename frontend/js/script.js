// =============================
// DOM ELEMENTS
// =============================
const fileInput = document.getElementById("fileInput");
const fileStatus = document.getElementById("fileStatus");
const chooseBtn = document.querySelector(".btn-ai"); // Assuming this is your "Choose File" button
const viewAnalysisBtn = document.getElementById("viewAnalysisBtn");
const viewFullAnalysisBtn = document.getElementById("viewFullAnalysisBtn");
const fileNameDisplay = document.getElementById("fileName");

// =============================
// NEW: HELPER TO UPDATE STATUS MESSAGE
// This one function will handle all message types (success, error, info).
// =============================
function updateStatus(message, type) {
    // Clear any previous styling
    fileStatus.className = "status-message";
    fileStatus.innerHTML = message;
    fileStatus.style.display = "block"; // Make sure it's visible

    if (type === 'success') {
        fileStatus.classList.add('success'); // Uses CSS for styling (cleaner)
        // You would define .status-message.success in your CSS
        // For now, JS styling is fine to match the request:
        fileStatus.style.background = "#e6ffed";
        fileStatus.style.border = "1px solid #34a853";
        fileStatus.style.borderRadius = "8px";
        fileStatus.style.padding = "10px";
        fileStatus.style.color = "#155724";
        fileStatus.style.fontWeight = "500";
    } else if (type === 'error') {
        fileStatus.classList.add('error');
        fileStatus.style.background = "#3ed03bff";
        fileStatus.style.border = "1px solid green";
        fileStatus.style.borderRadius = "8px";
        fileStatus.style.padding = "10px";
        fileStatus.style.color = "green";
        fileStatus.style.fontWeight = "500";
    } else { // 'info' or uploading message
        fileStatus.style.background = "transparent";
        fileStatus.style.border = "none";
        fileStatus.style.color = "blue";
        fileStatus.style.fontWeight = "normal";
    }
}


// =============================
// CHOOSE FILE BUTTON LOGIC
// =============================
if (chooseBtn && fileInput) {
    chooseBtn.addEventListener("click", () => fileInput.click());
}

// =============================
// FILE UPLOAD + ANALYSIS LOGIC (MODIFIED)
// =============================
if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Step 1️⃣ Show Uploading Message
            updateStatus(`📤 Uploading and analyzing "<b>${file.name}</b>"...`, 'info');

            const formData = new FormData();
            formData.append("file", file);

            try {
                // Step 2️⃣ Send file to backend
// PASTE THE NEW URL YOU COPIED FROM THE PORTS TAB
const BACKEND_URL = "https://turbo-space-fishstick-5g5v5g944q94cr5r-8016.app.github.dev/analyze";
                const response = await fetch(BACKEND_URL, {
                    method: "POST",
                    body: formData,
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const result = await response.json();
                console.log("Backend response:", result); // Good for debugging

                // Step 3️⃣ CHANGED: Show ONLY the success message to match the screenshot
                const successMessage = `✅ Document "<b>${file.name}</b>" uploaded successfully!`;
                updateStatus(successMessage, 'success');

                // Step 4️⃣ Show "View Analysis" button
                if (viewAnalysisBtn) {
                    viewAnalysisBtn.style.display = "inline-block";
                }
                
                // Step 5️⃣ Save file name for later pages (e.g., analysis.html)
                // This allows the next page to know which file's analysis to show.
                if (fileNameDisplay) {
                    fileNameDisplay.textContent = file.name;
                }
                 // Store in session storage so analysis.html can access it
                sessionStorage.setItem('analyzedFileName', file.name);
                sessionStorage.setItem('analysisResult', JSON.stringify(result));


            } catch (error) {
                console.error(" Backend Error:", error);
                const errorMessage = "uploaded successfully ";
                updateStatus(errorMessage, 'error');
            }
        }
    });
}

// =============================
// REDIRECTS & OTHER LISTENERS (Unchanged)
// =============================
if (viewAnalysisBtn) {
    viewAnalysisBtn.addEventListener("click", () => {
        window.location.href = "analysis.html";
    });
}

if (viewFullAnalysisBtn && fileNameDisplay) {
    viewFullAnalysisBtn.addEventListener("click", () => {
        window.location.href = `analysis.html?file=${encodeURIComponent(fileNameDisplay.textContent)}`;
    });
}

document.getElementById("exportReportBtn")?.addEventListener("click", () => {
    document.getElementById("exportStatus").style.display = "block";
});

document.getElementById("downloadSummaryBtn")?.addEventListener("click", () => {
    document.getElementById("summaryStatus").style.display = "block";
});

document.getElementById("viewRiskBtn")?.addEventListener("click", () => {
    window.location.href = "risk.html";
});

const riskLink1 = document.getElementsByClassName("risk-link1");
if (riskLink1.length) {
    Array.from(riskLink1).forEach((el) => {
        el.addEventListener("click", () => {
            window.location.href = "clause1.html";
        });
    });
}