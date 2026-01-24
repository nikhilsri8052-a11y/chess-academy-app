document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initializeDashboard();
    
    // Set up periodic updates
    setupPeriodicUpdates();
});

/**
 * Initialize all dashboard components
 */
function initializeDashboard() {
    // Initialize counters with animation
    initializeCounters();
    
    // Initialize progress bars
    initializeProgressBars();
    
    // Initialize batch distribution bars
    initializeBatchBars();
    
    // Add scroll animations
    setupScrollAnimations();
    
    // Update live time
    updateLiveTime();
    setInterval(updateLiveTime, 1000);
    
    // Setup hover effects
    setupHoverEffects();
    
    // Setup click interactions
    setupClickInteractions();
}

/**
 * Animate counter values
 */
function initializeCounters() {
    const counters = document.querySelectorAll('.stat-value[data-count]');
    
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        const duration = 1500; // ms
        const startTime = Date.now();
        const isCurrency = counter.textContent.includes('₹');
        
        function updateCounter() {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(easeOut * target);
            
            if (isCurrency) {
                counter.textContent = '₹' + formatNumberWithCommas(currentValue);
            } else {
                counter.textContent = formatNumberWithCommas(currentValue);
            }
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        }
        
        requestAnimationFrame(updateCounter);
    });
}

/**
 * Initialize progress bars with animation
 */
function initializeProgressBars() {
    const progressBars = document.querySelectorAll('.progress-fill');
    const percentageElements = document.querySelectorAll('.progress-percentage');
    
    progressBars.forEach(bar => {
        const paid = parseInt(bar.getAttribute('data-payments')) || 0;
        const total = parseInt(bar.getAttribute('data-total')) || 1;
        const percentage = total > 0 ? Math.round((paid / total) * 100) : 0;
        
        // Animate the progress bar
        setTimeout(() => {
            bar.style.width = percentage + '%';
        }, 300);
    });
    
    // Animate percentage numbers
    percentageElements.forEach(element => {
        const paid = parseInt(element.getAttribute('data-payments')) || 0;
        const total = parseInt(element.getAttribute('data-total')) || 1;
        const targetPercentage = total > 0 ? Math.round((paid / total) * 100) : 0;
        animatePercentage(element, targetPercentage);
    });
}

/**
 * Initialize batch distribution bars
 */
function initializeBatchBars() {
    const batchBars = document.querySelectorAll('.batch-bar-fill');
    const percentageElements = document.querySelectorAll('.batch-percentage');
    
    batchBars.forEach((bar, index) => {
        const count = parseInt(bar.getAttribute('data-count')) || 0;
        const total = parseInt(bar.getAttribute('data-total')) || 1;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        
        // Stagger the animation
        setTimeout(() => {
            bar.style.width = percentage + '%';
        }, 400 + (index * 100));
    });
    
    // Animate batch percentages
    percentageElements.forEach((element, index) => {
        const count = parseInt(element.getAttribute('data-count')) || 0;
        const total = parseInt(element.getAttribute('data-total')) || 1;
        const targetPercentage = total > 0 ? Math.round((count / total) * 100) : 0;
        
        setTimeout(() => {
            animatePercentage(element, targetPercentage);
        }, 500 + (index * 100));
    });
}

/**
 * Animate percentage counter
 */
function animatePercentage(element, target) {
    const duration = 1000;
    const startTime = Date.now();
    let current = 0;
    
    function update() {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOut = 1 - Math.pow(1 - progress, 3);
        current = Math.floor(easeOut * target);
        
        element.textContent = current + '%';
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

/**
 * Setup scroll animations
 */
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    // Observe all animated elements
    document.querySelectorAll('[data-animate]').forEach(el => {
        const delay = el.getAttribute('data-delay') || 0;
        el.style.transitionDelay = delay + 'ms';
        observer.observe(el);
    });
}

/**
 * Update live time display
 */
function updateLiveTime() {
    const now = new Date();
    const timeElement = document.getElementById('liveTime');
    
    if (timeElement) {
        const options = { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        };
        timeElement.textContent = now.toLocaleTimeString('en-US', options);
    }
    
    // Update last updated time
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        lastUpdated.textContent = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }
}

/**
 * Setup hover effects for interactive elements
 */
function setupHoverEffects() {
    // Add hover effect to stat cards
    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-4px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
    
    // Add ripple effect to action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            createRippleEffect(e, this);
        });
    });
}

/**
 * Setup click interactions
 */
function setupClickInteractions() {
    // Recent registration items click
    document.querySelectorAll('.recent-item').forEach(item => {
        item.addEventListener('click', function() {
            const name = this.querySelector('.recent-name').textContent;
            console.log('Viewing student:', name);
            // In a real app, this would navigate to student details
        });
    });
    
    // Activity items click
    document.querySelectorAll('.activity-item').forEach(item => {
        item.addEventListener('click', function() {
            const title = this.querySelector('.activity-title').textContent;
            const type = this.getAttribute('data-type');
            console.log('Viewing', type + ':', title);
            // In a real app, this would navigate to the item
        });
    });
}

/**
 * Create ripple effect on click
 */
function createRippleEffect(event, element) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    element.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

/**
 * Format number with commas
 */
function formatNumberWithCommas(number) {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Setup periodic dashboard updates
 */
function setupPeriodicUpdates() {
    // Auto-refresh every 5 minutes
    setInterval(() => {
        // Update the last updated time
        updateLiveTime();
    }, 5 * 60 * 1000);
    
    // Simulate real-time updates for demonstration
    setInterval(() => {
        updateQuickStats();
    }, 10000); // Every 10 seconds
}

/**
 * Simulate quick stats updates
 */
function updateQuickStats() {
    // This would be replaced with actual API calls in production
    const quickStats = document.querySelectorAll('.quick-stat');
    
    quickStats.forEach(stat => {
        // Add subtle animation to show live updates
        stat.style.transform = 'scale(1.05)';
        setTimeout(() => {
            stat.style.transform = 'scale(1)';
        }, 300);
    });
}

/**
 * Refresh dashboard data
 */
function refreshDashboard() {
    const refreshBtn = document.querySelector('.refresh-btn');
    
    // Show loading state
    refreshBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
            <path d="M23 4v6h-6"></path>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        <span>Refreshing...</span>
    `;
    
    // Add spin animation
    refreshBtn.querySelector('.spin').style.animation = 'spin 1s linear infinite';
    
    // Reload the page after a short delay to show the loading state
    setTimeout(() => {
        location.reload();
    }, 800);
}

// Add spin animation to CSS via JS
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .spin {
        animation: spin 1s linear infinite;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.5);
        transform: scale(0);
        animation: ripple-animation 0.6s linear;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);