document.addEventListener('DOMContentLoaded', function() {
    loadStudentNotices();
    animateElements();
    setupEventListeners();
    loadFeeStatus(); // New: Load fee status dynamically
});

function loadStudentNotices() {
    // Show loading animation
    const container = document.querySelector('.notices-body');
    container.innerHTML = `
        <div class="loading-shimmer" style="height: 20px; margin: 15px;"></div>
        <div class="loading-shimmer" style="height: 60px; margin: 15px;"></div>
        <div class="loading-shimmer" style="height: 60px; margin: 15px;"></div>
    `;
    
    fetch('/student/notices')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                displayStudentNotices(data.notices);
            } else {
                showNoticeError();
            }
        })
        .catch(err => {
            console.error('Error loading notices:', err);
            showNoticeError();
        });
}

function displayStudentNotices(notices) {
    const container = document.querySelector('.notices-body');
    
    if (!notices || notices.length === 0) {
        container.innerHTML = `
            <div class="no-notices">
                <p style="font-size: 1rem; color: var(--text-gray); margin-bottom: 0.5rem;">✨</p>
                <p>No new announcements today.</p>
                <p style="font-size: 0.8rem; color: var(--text-light); margin-top: 0.5rem;">
                    Check back later for updates!
                </p>
            </div>
        `;
        return;
    }
    
    let html = '';
    notices.forEach((notice, index) => {
        // Determine priority class and icon
        const priority = notice.priority || 'normal';
        let priorityClass = '';
        let dotColor = '';
        let icon = '📌';
        
        // Set priority styling
        if (priority === 'urgent') {
            priorityClass = 'urgent';
            dotColor = 'var(--danger-red)';
            icon = '⚠️';
        } else if (priority === 'important') {
            priorityClass = 'important';
            dotColor = 'var(--warning-orange)';
            icon = '❗';
        } else {
            priorityClass = 'normal';
            dotColor = 'var(--info-blue)';
        }
        
        // Smart icon detection based on content
        const title = notice.title.toLowerCase();
        const content = notice.content.toLowerCase();
        
        if (title.includes('assignment') || content.includes('assignment')) icon = '📝';
        if (title.includes('test') || title.includes('exam') || content.includes('test') || content.includes('exam')) icon = '📊';
        if (title.includes('holiday') || title.includes('break') || content.includes('holiday') || content.includes('break')) icon = '🎉';
        if (title.includes('payment') || content.includes('payment')) icon = '💰';
        if (title.includes('batch') || content.includes('batch')) icon = '👥';
        if (title.includes('class') || content.includes('class')) icon = '🏫';
        
        // Format date if available
        let dateText = 'Recently';
        if (notice.created_at_str) {
            dateText = notice.created_at_str;
        }
        
        html += `
            <div class="notice-item ${priorityClass}" style="animation-delay: ${index * 0.1}s">
                <div class="notice-dot" style="background: ${dotColor}"></div>
                <div class="notice-info">
                    <h4>${icon} ${escapeHtml(notice.title)}</h4>
                    <p>${escapeHtml(notice.content)}</p>
                    <span class="notice-date">${dateText}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add entrance animation
    setTimeout(() => {
        const items = container.querySelectorAll('.notice-item');
        items.forEach(item => {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        });
    }, 100);
}

// New function to load fee status
function loadFeeStatus() {
    const feeStatusElement = document.querySelector('.fee-status-container');
    if (!feeStatusElement) return;
    
    // Add loading animation to fee status
    const feeNote = feeStatusElement.querySelector('.status-note');
    if (feeNote) {
        feeNote.innerHTML = '<div class="loading-shimmer" style="height: 14px; width: 80%;"></div>';
    }
    
    // In a real app, you would fetch fee status from an API
    // For now, we'll just simulate a small delay
    setTimeout(() => {
        if (feeNote) {
            feeNote.textContent = "Complete your payment to unlock all features including Study Materials and Assignments.";
        }
    }, 1000);
}

function showNoticeError() {
    const container = document.querySelector('.notices-body');
    container.innerHTML = `
        <div class="no-notices">
            <p style="font-size: 1rem; color: var(--danger-red); margin-bottom: 0.5rem;">⚠️</p>
            <p>Unable to load announcements</p>
            <p style="font-size: 0.8rem; color: var(--text-light); margin-top: 0.5rem;">
                Please check your connection
            </p>
            <button onclick="loadStudentNotices()" style="
                background: var(--primary-gold);
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 6px;
                font-size: 0.85rem;
                margin-top: 1rem;
                cursor: pointer;
                font-weight: 600;
            ">
                Retry
            </button>
        </div>
    `;
}

function animateElements() {
    // Animate stat cards on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all stat cards and action cards
    document.querySelectorAll('.stat-card, .action-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
}

function setupEventListeners() {
    // Add hover effects to action cards
    const actionCards = document.querySelectorAll('.action-card');
    actionCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            const icon = this.querySelector('.icon-circle');
            if (icon) {
                icon.style.transform = 'scale(1.1) rotate(5deg)';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            const icon = this.querySelector('.icon-circle');
            if (icon) {
                icon.style.transform = 'scale(1) rotate(0)';
            }
        });
    });
    
    // Auto-refresh notices every 5 minutes
    setInterval(loadStudentNotices, 5 * 60 * 1000);
    
    // Add click animation to action cards
    actionCards.forEach(card => {
        card.addEventListener('click', function(e) {
            if (this.getAttribute('href') === '#') {
                e.preventDefault();
                return;
            }
            
            // Add click feedback
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 200);
        });
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add keyboard navigation
document.addEventListener('keydown', function(e) {
    if (e.key === '1' && e.altKey) {
        // Alt+1 to focus on first action card
        const firstCard = document.querySelector('.action-card');
        if (firstCard) firstCard.focus();
    }
});

// Add this helper function for better date formatting
function formatRelativeTime(dateString) {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    // Return formatted date for older notices
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}