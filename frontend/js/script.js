// Safe Lucide helper
function safeCreateIcons() {
    if (typeof lucide !== 'undefined' && lucide && lucide.createIcons) {
        try {
            lucide.createIcons();
        } catch (e) {
            console.warn("Lucide icons warning:", e);
        }
    }
}

// Initialize all functionality safely
document.addEventListener('DOMContentLoaded', function() {
    try { safeCreateIcons(); } catch (e) { console.warn(e); }
    try { initializeMobileMenu(); } catch (e) { console.warn(e); }
    try { initializeFileUpload(); } catch (e) { console.warn(e); }
    try { initializeAnimations(); } catch (e) { console.warn(e); }
});

// Mobile Menu Functionality
function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const menuIcon = document.getElementById('menuIcon');
    const closeIcon = document.getElementById('closeIcon');
    
    let isMenuOpen = false;
    
    mobileMenuBtn.addEventListener('click', function() {
        isMenuOpen = !isMenuOpen;
        
        if (isMenuOpen) {
            mobileMenu.classList.add('show');
            menuIcon.style.display = 'none';
            closeIcon.style.display = 'block';
        } else {
            mobileMenu.classList.remove('show');
            menuIcon.style.display = 'block';
            closeIcon.style.display = 'none';
        }
    });
    
    // Close mobile menu when clicking on links
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', function() {
            isMenuOpen = false;
            mobileMenu.classList.remove('show');
            menuIcon.style.display = 'block';
            closeIcon.style.display = 'none';
        });
    });
}

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
    const downloadReportBtn = document.getElementById('exportReportBtn') || document.getElementById('downloadReportBtn');
    const uploadAnotherBtn = document.getElementById('uploadAnotherBtn');
    const chooseFileBtn = document.getElementById('chooseFileBtn');
    
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
    if (chooseFileBtn && fileInput) {
        chooseFileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });
    }
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', (e) => {
            if (e.target !== chooseFileBtn && !chooseFileBtn.contains(e.target)) {
                fileInput.click();
            }
        });
    }
    if (uploadAnotherBtn) uploadAnotherBtn.addEventListener('click', resetUpload);
    if (viewAnalysisBtn) {
        viewAnalysisBtn.addEventListener('click', () => {
            window.location.href = "analysis.html";
        });
    }
    document.getElementById("exportReportBtnDashboard")?.addEventListener("click", () => {
        const el = document.getElementById("exportStatusDashboard");
        if (el) el.style.display = "block";
    });
    
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
    
    async function handleFileUpload(file) {
        uploadedFile = file.name;
        isAnalyzing = true;
        
        // Show analysis view
        uploadArea.style.display = 'none';
        analysisView.style.display = 'block';
        
        // Update file info
        fileName.textContent = uploadedFile;
        fileStatus.textContent = 'Uploading and analyzing document with AI...';
        
        // Show spinner
        fileProgress.innerHTML = '<div class="spinner"></div>';
        
        // Show progress section
        if (progressSection) progressSection.style.display = 'block';
        if (resultsPreview) resultsPreview.style.display = 'none';
        if (viewAnalysisBtn) viewAnalysisBtn.style.display = 'none';
        if (downloadReportBtn) downloadReportBtn.style.display = 'none';
        
        try {
            const result = await legalAiAnalyzeFile(file);
            console.log("Analysis results:", result);
            
            // Save in session storage
            sessionStorage.setItem('analyzedFileName', file.name);
            sessionStorage.setItem('analysisResult', JSON.stringify(result));
            
            // Populate homepage dashboard elements safely
            try {
                updateHomepageDashboard(result, file.name);
            } catch (dbErr) {
                console.warn("Dashboard update warning:", dbErr);
            }
            
            completeAnalysis();
            
        } catch (error) {
            console.error("Backend connection error:", error);
            fileStatus.textContent = 'Backend failed: ' + (error.message || error) + '. Start it with: python main.py';
            fileProgress.innerHTML = '<i data-lucide="alert-triangle" class="warning-icon" style="color: #f59e0b; width: 40px; height: 40px;"></i>';
            safeCreateIcons();
            isAnalyzing = false;
        }
    }
    
    function updateHomepageDashboard(data, filename) {
        // Document Title & Meta
        const dbDocTitle = document.getElementById("dbDocTitle");
        const dbDocMeta = document.getElementById("dbDocMeta");
        const dbStatusBadge = document.getElementById("dbStatusBadge");
        
        if (dbDocTitle) dbDocTitle.textContent = filename;
        if (dbDocMeta) {
            dbDocMeta.textContent = `Uploaded just now • ${data.stats?.word_count || 0} words • PDF`;
        }
        if (dbStatusBadge) dbStatusBadge.textContent = "Analysis Complete";
        
        // Metrics
        const dbOverallScore = document.getElementById("dbOverallScore");
        const dbRiskFlags = document.getElementById("dbRiskFlags");
        const dbKeyClauses = document.getElementById("dbKeyClauses");
        const dbConfidence = document.getElementById("dbConfidence");
        
        if (dbOverallScore) {
            const scoreVal = data.risk_score ? (10 - (data.risk_score / 10)).toFixed(1) : "8.0";
            dbOverallScore.textContent = `${scoreVal}/10`;
        }
        if (dbRiskFlags) {
            dbRiskFlags.textContent = data.risks ? data.risks.length : "0";
        }
        if (dbKeyClauses) {
            dbKeyClauses.textContent = data.clauses ? data.clauses.length : "0";
        }
        if (dbConfidence) {
            dbConfidence.textContent = "95%";
        }
        
        // Plain Language Summary Content
        const dbSummaryContent = document.getElementById("dbSummaryContent");
        if (dbSummaryContent) {
            let sumHtml = `<p class="summary-paragraph">${data.summary || "Document analysis complete."}</p>`;
            if (data.obligations && data.obligations.length > 0) {
                sumHtml += `<p class="summary-paragraph"><strong>Key Obligations:</strong></p><ul>`;
                data.obligations.forEach(ob => {
                    sumHtml += `<li>${ob}</li>`;
                });
                sumHtml += `</ul>`;
            }
            dbSummaryContent.innerHTML = sumHtml;
        }
        
        // Risks List
        const dbRisksList = document.getElementById("dbRisksList");
        if (dbRisksList) {
            let riskHtml = "";
            if (data.risks && data.risks.length > 0) {
                data.risks.forEach(rk => {
                    const sevClass = ((rk && rk.severity) ? rk.severity : "Medium").toLowerCase() + "-risk";
                    const rkName = (rk && rk.name) ? rk.name : "Risk Clause";
                    const rkNote = (rk && rk.note) ? rk.note : "Potential legal exposure detected.";
                    riskHtml += `
                        <div class="risk-item ${sevClass}">
                            <i data-lucide="alert-triangle" class="risk-icon"></i>
                            <div class="risk-content">
                                <h5 class="risk-title">${rkName}</h5>
                                <p class="risk-description">${rkNote}</p>
                            </div>
                        </div>
                    `;
                });
            } else {
                riskHtml = `<div style="padding: 10px; color: green;">No major risks identified in the document!</div>`;
            }
            dbRisksList.innerHTML = riskHtml;
        }
        
        // Stats
        const dbStatProcTime = document.getElementById("dbStatProcTime");
        const dbStatWordCount = document.getElementById("dbStatWordCount");
        const dbStatComplexity = document.getElementById("dbStatComplexity");
        
        if (dbStatProcTime) dbStatProcTime.textContent = `${data.stats?.processing_time_sec || 2} seconds`;
        if (dbStatWordCount) dbStatWordCount.textContent = `${data.stats?.word_count || 0} words`;
        if (dbStatComplexity) dbStatComplexity.textContent = `${data.stats?.complexity_score || 7.0}/10`;
        
        // Re-render lucide icons
        safeCreateIcons();
    }
    
    function completeAnalysis() {
        isAnalyzing = false;
        
        // Update file status
        fileStatus.textContent = 'Analysis complete';
        
        // Show success icon
        fileProgress.innerHTML = '<i data-lucide="check-circle" class="success-icon"></i>';
        safeCreateIcons();
        
        // Hide progress section and show results cards & buttons
        if (progressSection) progressSection.style.display = 'none';
        if (resultsPreview) resultsPreview.style.display = 'grid';
        if (viewAnalysisBtn) viewAnalysisBtn.style.display = 'inline-flex';
        if (downloadReportBtn) downloadReportBtn.style.display = 'inline-flex';
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
}

// Animation and interaction handlers
function initializeAnimations() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Button hover effects
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            if (this.classList.contains('btn-hero') || this.classList.contains('btn-ai')) {
                this.style.transform = 'translateY(-2px)';
            }
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Card hover effects
    const cards = document.querySelectorAll('.card, .recent-item, .result-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe sections for animation
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        observer.observe(section);
    });
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Handle window resize
window.addEventListener('resize', debounce(() => {
    // Close mobile menu on resize to desktop
    if (window.innerWidth >= 768) {
        const mobileMenu = document.getElementById('mobileMenu');
        const menuIcon = document.getElementById('menuIcon');
        const closeIcon = document.getElementById('closeIcon');
        
        mobileMenu.classList.remove('show');
        menuIcon.style.display = 'block';
        closeIcon.style.display = 'none';
    }
}, 250));

// Add loading states for buttons
function addButtonLoading(button, loadingText = 'Loading...') {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;
    button.style.opacity = '0.7';
    
    return function removeLoading() {
        button.disabled = false;
        button.textContent = originalText;
        button.style.opacity = '1';
    };
}

// Example usage for demo buttons
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
        if (this.id === 'uploadAnotherBtn' || this.id === 'viewAnalysisBtn' || this.type === 'file') return;
        if (this.tagName === 'A' && this.getAttribute('href')) return;
    });
});

// Initialize tooltips and additional interactions
function initializeTooltips() {
    // Simple tooltip implementation
    const elementsWithTitle = document.querySelectorAll('[title]');
    
    elementsWithTitle.forEach(element => {
        const title = element.getAttribute('title');
        element.removeAttribute('title');
        
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = title;
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.875rem;
            white-space: nowrap;
            z-index: 1000;
            pointer-events: none;
            opacity: 0;
            transform: translateY(-5px);
            transition: opacity 0.2s, transform 0.2s;
        `;
        
        document.body.appendChild(tooltip);
        
        element.addEventListener('mouseenter', (e) => {
            const rect = element.getBoundingClientRect();
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateY(0)';
        });
        
        element.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateY(-5px)';
        });
    });
}

// Initialize additional features when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeTooltips();
    }, 100);
});