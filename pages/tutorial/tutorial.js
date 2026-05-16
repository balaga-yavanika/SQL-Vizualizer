/**
 * Tutorial Page Interactions
 * - Collapsible Table of Contents (mobile)
 * - Back to Top button visibility
 */

const MOBILE_BREAKPOINT = 768;

document.addEventListener('DOMContentLoaded', () => {
  initToCToggle();
  initBackToTop();
});

/**
 * ToC Toggle (mobile only)
 */
function initToCToggle() {
  const tocToggle = document.querySelector('.toc-toggle');
  const toc = document.getElementById('toc');
  
  if (!tocToggle || !toc) return;

  // Check if we're on mobile
  const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;

  // Update toggle visibility based on screen size
  const updateToggleVisibility = () => {
    if (isMobile()) {
      tocToggle.style.display = 'flex';
      // Close ToC when switching to mobile if it was open
      if (!toc.classList.contains('toc-open')) {
        tocToggle.setAttribute('aria-expanded', 'false');
      }
    } else {
      tocToggle.style.display = 'none';
      // Ensure ToC is always open on desktop
      toc.classList.add('toc-open');
      tocToggle.setAttribute('aria-expanded', 'true');
    }
  };

  // Toggle ToC
  tocToggle.addEventListener('click', () => {
    if (!isMobile()) return;
    
    const isExpanded = tocToggle.getAttribute('aria-expanded') === 'true';
    tocToggle.setAttribute('aria-expanded', String(!isExpanded));
    toc.classList.toggle('toc-open', !isExpanded);
  });

  // Listen for resize
  window.addEventListener('resize', updateToggleVisibility, { passive: true });

  // Initial state
  updateToggleVisibility();
}

/**
 * Back to Top Button
 */
function initBackToTop() {
  const backToTop = document.querySelector('.back-to-top');
  if (!backToTop) return;

  // Show/hide based on scroll position
  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  };

  // Initial check
  toggleVisibility();

  // Listen for scroll
  window.addEventListener('scroll', toggleVisibility, { passive: true });

  // Smooth scroll to top
  backToTop.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}
