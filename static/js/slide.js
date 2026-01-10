
document.addEventListener('DOMContentLoaded', function() {
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    let currentSlide = 0;
    let slideInterval;
    const slideDuration = 5000; // 5 seconds
    
    // Function to show a specific slide
    function showSlide(n) {
        // Hide all slides
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        // Handle slide boundaries
        if (n >= slides.length) currentSlide = 0;
        else if (n < 0) currentSlide = slides.length - 1;
        else currentSlide = n;
        
        // Show current slide
        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');
    }
    
    // Next slide function
    function nextSlide() {
        showSlide(currentSlide + 1);
    }
    
    // Previous slide function
    function prevSlide() {
        showSlide(currentSlide - 1);
    }
    
    // Start automatic sliding
    function startSlider() {
        slideInterval = setInterval(nextSlide, slideDuration);
    }
    
    // Stop automatic sliding
    function stopSlider() {
        clearInterval(slideInterval);
    }
    
    // Event listeners for buttons
    nextBtn.addEventListener('click', () => {
        nextSlide();
        stopSlider();
        startSlider();
    });
    
    prevBtn.addEventListener('click', () => {
        prevSlide();
        stopSlider();
        startSlider();
    });
    
    // Event listeners for dots
    dots.forEach(dot => {
        dot.addEventListener('click', function() {
            const slideIndex = parseInt(this.getAttribute('data-slide'));
            showSlide(slideIndex);
            stopSlider();
            startSlider();
        });
    });
    
    // Pause slider on hover
    const sliderContainer = document.querySelector('.slider-container');
    sliderContainer.addEventListener('mouseenter', stopSlider);
    sliderContainer.addEventListener('mouseleave', startSlider);
    
    // Initialize slider
    showSlide(0);
    startSlider();
});