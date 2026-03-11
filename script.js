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
            }, 300);
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

    // --- Gallery Filter (with staggered animation) ---
    const filterBtns = document.querySelectorAll('.filter-btn');
    const galleryGrid = document.getElementById('galleryGrid');
    const galleryItems = document.querySelectorAll('.gallery-item');

    // Cache for visible items — invalidated on filter change
    let cachedVisibleItems = null;

    function invalidateCache() {
        cachedVisibleItems = null;
    }

    function getVisibleItems() {
        if (cachedVisibleItems) return cachedVisibleItems;
        cachedVisibleItems = [...document.querySelectorAll('.gallery-item:not(.hidden)')].filter(
            item => item.style.display !== 'none' // also exclude error-hidden items
        );
        return cachedVisibleItems;
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            invalidateCache();

            // Batch DOM reads first, then writes
            const showItems = [];
            const hideItems = [];

            galleryItems.forEach(item => {
                const categories = item.dataset.category.split(' ');
                const match = filter === 'all' || categories.includes(filter);
                if (match) {
                    showItems.push(item);
                } else {
                    hideItems.push(item);
                }
            });

            // Batch DOM writes
            hideItems.forEach(item => {
                item.classList.add('hidden');
                item.classList.remove('show', 'filter-enter');
            });

            // Stagger animations — only animate first 20 for performance, rest appear instantly
            showItems.forEach((item, i) => {
                item.classList.remove('hidden');
                item.classList.add('show');
                if (i < 20) {
                    item.classList.remove('filter-enter');
                    // Force reflow for animation restart on just a few items
                    void item.offsetWidth;
                    item.style.animationDelay = `${i * 0.03}s`;
                    item.classList.add('filter-enter');
                } else {
                    item.classList.remove('filter-enter');
                    item.style.animationDelay = '';
                }
            });
        });
    });

    // --- Image error handling (event delegation) ---
    if (galleryGrid) {
        galleryGrid.addEventListener('error', (e) => {
            if (e.target.tagName === 'IMG') {
                const item = e.target.closest('.gallery-item');
                if (item) {
                    item.style.display = 'none';
                    invalidateCache();
                    console.warn('Image failed to load:', e.target.src);
                }
            }
        }, true); // Use capture phase to catch img errors
    }

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

    function openLightbox(index) {
        if (!lightbox || !lightboxImg) return;
        const items = getVisibleItems();
        if (index < 0 || index >= items.length) return;
        currentIndex = index;
        const item = items[index];
        const thumbImg = item.querySelector('img');
        if (!thumbImg) return;

        // Use the image source directly
        lightboxImg.style.opacity = '0.3';
        lightboxImg.src = thumbImg.src;
        lightboxImg.alt = item.dataset.title || '';

        // When loaded, reveal
        lightboxImg.onload = () => {
            lightboxImg.style.opacity = '1';
        };
        lightboxImg.onerror = () => {
            lightboxImg.style.opacity = '1';
        };

        if (lightboxTitle) lightboxTitle.textContent = item.dataset.title || '';
        if (lightboxDesc) lightboxDesc.textContent = item.dataset.desc || '';

        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Preload adjacent images for instant navigation
        preloadAdjacentImages(index, items);
    }

    function preloadAdjacentImages(index, items) {
        const preloadOffsets = [-1, 1, 2]; // prev, next, next+1
        preloadOffsets.forEach(offset => {
            const i = (index + offset + items.length) % items.length;
            const img = items[i]?.querySelector('img');
            if (img && img.src) {
                const preload = new Image();
                preload.src = img.src;
            }
        });
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

    // --- Gallery click handler (event delegation) ---
    if (galleryGrid) {
        galleryGrid.addEventListener('click', (e) => {
            const item = e.target.closest('.gallery-item');
            if (!item) return;
            e.preventDefault();
            const visibleItems = getVisibleItems();
            const index = visibleItems.indexOf(item);
            if (index !== -1) openLightbox(index);
        });
    }

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
