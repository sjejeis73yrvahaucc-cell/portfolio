/* ============================================
   PORTFOLIO INTERACTIVITY
   Filters, Lightbox, Animations, Nav
   ============================================ */

// Suppress browser extension errors that are not from our code
window.addEventListener('unhandledrejection', (e) => {
    if (e.reason && e.reason.message &&
        (e.reason.message.includes('shadow host') ||
            e.reason.message.includes('ActuationOverlay') ||
            e.reason.message.includes('Extension context'))) {
        e.preventDefault();
    }
});

document.addEventListener('DOMContentLoaded', () => {

    // --- Loading Screen ---
    const loader = document.getElementById('loader');
    if (loader) {
        const hideLoader = () => {
            setTimeout(() => {
                loader.classList.add('hidden');
                // Remove from DOM after transition to free resources
                setTimeout(() => loader.remove(), 600);
            }, 400);
        };
        if (document.readyState === 'complete') {
            hideLoader();
        } else {
            window.addEventListener('load', hideLoader, { once: true });
        }
    }

    // --- Navbar scroll effect ---
    const navbar = document.getElementById('navbar');
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('section[id]');

    let scrollTicking = false;
    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            window.requestAnimationFrame(() => {
                // Shrink navbar
                if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);

                // Active nav link based on scroll position
                let current = '';
                sections.forEach(section => {
                    const top = section.offsetTop - 120;
                    if (window.scrollY >= top) current = section.getAttribute('id');
                });
                navLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
                });
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    }, { passive: true });

    // --- Mobile Nav Toggle ---
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navLinks');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('open');
        });

        // Close menu on link click
        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navToggle.classList.remove('active');
                navMenu.classList.remove('open');
            });
        });

        // Close menu on outside click (mobile)
        document.addEventListener('click', (e) => {
            if (navMenu.classList.contains('open') &&
                !navMenu.contains(e.target) &&
                !navToggle.contains(e.target)) {
                navToggle.classList.remove('active');
                navMenu.classList.remove('open');
            }
        });
    }

    // --- Gallery Filter ---
    const filterBtns = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            let visibleIndex = 0;

            galleryItems.forEach((item) => {
                const categories = item.dataset.category.split(' ');
                const match = filter === 'all' || categories.includes(filter);
                if (match) {
                    item.classList.remove('hidden');
                    item.classList.add('show');
                    item.style.animationDelay = `${visibleIndex * 0.04}s`;
                    visibleIndex++;
                } else {
                    item.classList.add('hidden');
                    item.classList.remove('show');
                }
            });
        });
    });

    // --- Image error handling ---
    // Replace broken images with a styled placeholder
    galleryItems.forEach(item => {
        const img = item.querySelector('img');
        if (img) {
            img.addEventListener('error', () => {
                // Hide items with broken images so they don't show empty boxes
                item.style.display = 'none';
                console.warn('Image failed to load:', img.src);
            });
        }
    });

    // --- Lightbox ---
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxDesc = document.getElementById('lightboxDesc');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    const lightboxContent = lightbox ? lightbox.querySelector('.lightbox-content') : null;

    let currentIndex = 0;

    function getVisibleItems() {
        return [...document.querySelectorAll('.gallery-item:not(.hidden)')].filter(
            item => item.style.display !== 'none' // also exclude error-hidden items
        );
    }

    function buildLargeUrl(thumbnailSrc) {
        // Extract file ID from any form of Google Drive thumbnail URL
        // and build a reliable large-image URL
        const idMatch = thumbnailSrc.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idMatch) {
            return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1600`;
        }
        // Fallback: just return the original
        return thumbnailSrc;
    }

    function openLightbox(index) {
        if (!lightbox || !lightboxImg) return;
        const items = getVisibleItems();
        if (index < 0 || index >= items.length) return;
        currentIndex = index;
        const item = items[index];
        const thumbImg = item.querySelector('img');
        if (!thumbImg) return;

        // Build a reliable large URL from the file ID
        const largeSrc = buildLargeUrl(thumbImg.src);

        // Show loading state
        lightboxImg.style.opacity = '0.3';
        lightboxImg.src = largeSrc;
        lightboxImg.alt = item.dataset.title || '';

        // When loaded, reveal
        lightboxImg.onload = () => {
            lightboxImg.style.opacity = '1';
        };
        lightboxImg.onerror = () => {
            // If large size fails, fallback to original thumbnail
            lightboxImg.src = thumbImg.src;
            lightboxImg.style.opacity = '1';
        };

        if (lightboxTitle) lightboxTitle.textContent = item.dataset.title || '';
        if (lightboxDesc) lightboxDesc.textContent = item.dataset.desc || '';

        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        // Clear image to stop loading
        if (lightboxImg) {
            lightboxImg.onload = null;
            lightboxImg.onerror = null;
        }
    }

    function navigateLightbox(direction) {
        const items = getVisibleItems();
        if (items.length === 0) return;
        currentIndex = (currentIndex + direction + items.length) % items.length;
        openLightbox(currentIndex);
    }

    // Attach click handlers to gallery items
    galleryItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Prevent default link navigation if any
            e.preventDefault();
            const visibleItems = getVisibleItems();
            const index = visibleItems.indexOf(item);
            if (index !== -1) openLightbox(index);
        });
    });

    // Lightbox controls
    if (lightboxClose) {
        lightboxClose.addEventListener('click', (e) => {
            e.stopPropagation();
            closeLightbox();
        });
    }
    if (lightboxPrev) {
        lightboxPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateLightbox(-1);
        });
    }
    if (lightboxNext) {
        lightboxNext.addEventListener('click', (e) => {
            e.stopPropagation();
            navigateLightbox(1);
        });
    }

    // Prevent clicks on lightbox content from closing
    if (lightboxContent) {
        lightboxContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    // Prevent clicks on lightbox-info from closing
    const lightboxInfo = lightbox ? lightbox.querySelector('.lightbox-info') : null;
    if (lightboxInfo) {
        lightboxInfo.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Close on backdrop click (only the lightbox background itself)
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    // Keyboard nav
    document.addEventListener('keydown', (e) => {
        if (!lightbox || !lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
        if (e.key === 'ArrowRight') navigateLightbox(1);
    });

    // Touch swipe support for lightbox (mobile)
    if (lightbox) {
        let touchStartX = 0;
        let touchEndX = 0;
        lightbox.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        lightbox.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 60) {
                if (diff > 0) navigateLightbox(1);  // swipe left = next
                else navigateLightbox(-1);           // swipe right = prev
            }
        }, { passive: true });
    }

    // --- Scroll Reveal Animations ---
    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
        reveals.forEach(el => observer.observe(el));
    } else {
        // Fallback: show everything immediately
        reveals.forEach(el => el.classList.add('visible'));
    }

    // --- Smooth scroll for anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (!href || href === '#') return;
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const navHeight = navbar ? navbar.offsetHeight : 0;
                const targetPos = target.getBoundingClientRect().top + window.scrollY - navHeight;
                window.scrollTo({ top: targetPos, behavior: 'smooth' });
            }
        });
    });

});
