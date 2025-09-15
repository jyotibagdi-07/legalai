// Initialize Lucide icons
document.addEventListener('DOMContentLoaded', function() {
    lucide.createIcons();
    
    // Initialize all functionality
    initializeMobileMenu();
    initializeFileUpload();
    initializeAnimations();
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
        // Skip file input and reset buttons
        if (this.id === 'uploadAnotherBtn' || this.type === 'file') return;
        
        e.preventDefault();
        const removeLoading = addButtonLoading(this);
        
        setTimeout(() => {
            removeLoading();
        }, 1000);
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