document.addEventListener('DOMContentLoaded', () => {
    const themeToggles = document.querySelectorAll('.dark-mode-btn');
    
    // Check for saved theme preference or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set initial theme
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateIcons('dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        updateIcons('light');
    }

    // Add click listeners to all toggle buttons (desktop and mobile)
    themeToggles.forEach(btn => {
        btn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateIcons(newTheme);
        });
    });

    function updateIcons(theme) {
        themeToggles.forEach(btn => {
            const iconSpan = btn.querySelector('.dark-mode-icon');
            if (iconSpan) {
                iconSpan.textContent = theme === 'dark' ? '☀️' : '🌙';
            }
            
            // Handle mobile text if present
            if (btn.id === 'dark-mode-toggle-mobile') {
                btn.innerHTML = `<span class="dark-mode-icon">${theme === 'dark' ? '☀️' : '🌙'}</span> ${theme === 'dark' ? 'Light Mode' : 'Dark Mode'}`;
            }
        });
    }
});
