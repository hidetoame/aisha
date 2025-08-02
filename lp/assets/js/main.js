// Main JavaScript for AISHA by MyGarage Landing Page

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Navigation Toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    
    navToggle.addEventListener('click', function() {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    
    // Close mobile menu when clicking a link
    const navLinks = document.querySelectorAll('.nav__link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
    
    // Header scroll effect
    const header = document.querySelector('.header');
    let lastScroll = 0;
    
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Contact form submission
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Collect form data
            const formData = {
                inquiryType: document.getElementById('inquiryType').value,
                userType: document.getElementById('userType').value,
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                message: document.getElementById('message').value
            };
            
            // Here you would normally send the data to your server
            console.log('Form submitted:', formData);
            
            // Show success message
            alert('お問い合わせありがとうございます。内容を確認次第、ご連絡いたします。');
            
            // Reset form
            contactForm.reset();
        });
    }
    
    // Lazy loading for images
    const images = document.querySelectorAll('img[loading="lazy"]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    }
    
    // Animation on scroll
    const animateOnScroll = function() {
        const elements = document.querySelectorAll('.feature, .pricing__card, .gallery__item');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, {
            threshold: 0.1
        });
        
        elements.forEach(element => {
            observer.observe(element);
        });
    };
    
    animateOnScroll();
    
    // Hero image slider
    const imageSlider = function() {
        const slides = document.querySelectorAll('.hero__slide');
        const labelOriginal = document.querySelector('.label-original');
        const labelGenerated = document.querySelector('.label-generated');
        const labelGoods = document.querySelector('.label-goods');
        
        if (!slides.length) return;
        
        let currentIndex = 0;
        const labels = [
            { type: 'original', labelText: 'AISHAスタジオ撮影' },
            { type: 'generated', labelText: 'AISHAイラスト作成' },
            { type: 'goods', labelText: 'グッズ作成' },
            { type: 'original', labelText: 'AISHAスタジオ撮影' },
            { type: 'studio', labelText: 'AISHAスタジオ撮影' }
        ];
        
        setInterval(() => {
            // Remove active from current slide
            slides[currentIndex].classList.remove('active');
            
            // Move to next slide
            currentIndex = (currentIndex + 1) % slides.length;
            
            // Add active to new slide
            slides[currentIndex].classList.add('active');
            
            // Update labels
            labelOriginal.classList.remove('active');
            labelGenerated.classList.remove('active');
            labelGoods.classList.remove('active');
            
            // Update the right label text based on current flow
            if (currentIndex < 3) {
                // First flow: 元画像 → AISHAイラスト作成 → グッズ作成
                labelGenerated.textContent = 'AISHAイラスト作成';
                if (labels[currentIndex].type === 'original') {
                    labelOriginal.classList.add('active');
                } else if (labels[currentIndex].type === 'generated') {
                    labelGenerated.classList.add('active');
                } else if (labels[currentIndex].type === 'goods') {
                    labelGoods.classList.add('active');
                }
            } else {
                // Second flow: 元画像 → AISHAスタジオ撮影
                labelGenerated.textContent = 'AISHAスタジオ撮影';
                labelGoods.style.display = 'none';
                document.querySelectorAll('.label-arrow')[1].style.display = 'none';
                
                if (labels[currentIndex].type === 'original') {
                    labelOriginal.classList.add('active');
                } else {
                    labelGenerated.classList.add('active');
                }
            }
            
            // Reset display for first flow
            if (currentIndex === 0) {
                labelGoods.style.display = '';
                document.querySelectorAll('.label-arrow')[1].style.display = '';
            }
        }, 3000); // Switch every 3 seconds
    };
    
    imageSlider();
    
    // Gallery image slider
    const gallerySlider = function() {
        const galleryOriginalImg = document.querySelector('.gallery__image-original');
        const galleryGeneratedImg = document.querySelector('.gallery__image-generated');
        const galleryLabelOriginal = document.querySelector('.gallery-label-original');
        const galleryLabelGenerated = document.querySelector('.gallery-label-generated');
        
        if (!galleryOriginalImg || !galleryGeneratedImg) return;
        
        setInterval(() => {
            // Toggle active classes
            galleryOriginalImg.classList.toggle('active');
            galleryGeneratedImg.classList.toggle('active');
            galleryLabelOriginal.classList.toggle('active');
            galleryLabelGenerated.classList.toggle('active');
        }, 3000); // Switch every 3 seconds
    };
    
    gallerySlider();
    
    // Gallery triple slider
    const galleryTripleSlider = function() {
        const tripleSlides = document.querySelectorAll('.gallery__triple-slide');
        const label1 = document.querySelector('.triple-label-1');
        const label2 = document.querySelector('.triple-label-2');
        const label3 = document.querySelector('.triple-label-3');
        
        if (!tripleSlides.length) return;
        
        let currentIndex = 0;
        
        setInterval(() => {
            // Remove active from current slide
            tripleSlides[currentIndex].classList.remove('active');
            
            // Remove active from all labels
            label1.classList.remove('active');
            label2.classList.remove('active');
            label3.classList.remove('active');
            
            // Move to next slide
            currentIndex = (currentIndex + 1) % tripleSlides.length;
            
            // Add active to new slide
            tripleSlides[currentIndex].classList.add('active');
            
            // Add active to corresponding label
            if (currentIndex === 0) {
                label1.classList.add('active');
            } else if (currentIndex === 1) {
                label2.classList.add('active');
            } else {
                label3.classList.add('active');
            }
        }, 3000); // Switch every 3 seconds
    };
    
    galleryTripleSlider();
    
    // Conversion tracking placeholder
    const ctaButtons = document.querySelectorAll('.btn--primary, .nav__cta');
    ctaButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Track conversion
            if (typeof gtag !== 'undefined') {
                gtag('event', 'conversion', {
                    'send_to': 'YOUR_CONVERSION_ID',
                    'value': 1.0,
                    'currency': 'JPY'
                });
            }
            
            if (typeof fbq !== 'undefined') {
                fbq('track', 'Lead');
            }
        });
    });
});

// Performance optimization: Debounce function
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

// Optimize scroll events
window.addEventListener('scroll', debounce(function() {
    // Any scroll-based animations or effects
}, 100));