// Handle smooth scrolling for anchor links, especially if we are already on the target page
document.addEventListener('DOMContentLoaded', () => {
    const scrollLinks = document.querySelectorAll('.scroll-link');
    
    scrollLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Get the href attribute
            const href = this.getAttribute('href');
            
            // Check if it's a hash link for the current page
            if (href.startsWith('/#')) {
                const targetId = href.substring(2);
                const targetElement = document.getElementById(targetId);
                
                // If the target element exists on the CURRENT page, smooth scroll to it
                if (targetElement) {
                    e.preventDefault();
                    
                    // Close mobile menu if open
                    const mobileMenu = document.getElementById('mobile-menu');
                    if (mobileMenu && mobileMenu.classList.contains('active')) {
                        mobileMenu.classList.remove('active');
                        const btn = document.getElementById('mobile-menu-btn');
                        if (btn) btn.classList.remove('active');
                    }
                    
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                    
                    // Optionally update URL without jumping
                    history.pushState(null, null, '#' + targetId);
                }
                // If it doesn't exist on the current page, let the default behavior happen 
                // (it will navigate to / and then jump to the hash)
            }
        });
    });

    // Check if we arrived with a hash in the URL and need to scroll
    if (window.location.hash) {
        // A small timeout ensures the page layout is calculated before scrolling
        setTimeout(() => {
            const targetElement = document.querySelector(window.location.hash);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        }, 100);
    }
});
