/**
 * Load and inject shared nav-footer component
 * Usage: Add <script src="/global/nav-footer-loader.min.js" defer></script>
 * to your HTML file, and it will automatically load and inject the nav/footer
 */

async function loadNavFooter() {
  try {
    const response = await fetch("/global/nav-footer.html");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();

    // Get the section element (or body if section doesn't exist)
    const section = document.querySelector("section") || document.body;

    // Create a temporary container to parse the HTML
    const temp = document.createElement("div");
    temp.innerHTML = html;

    // Extract nav and footer elements
    const topNav = temp.querySelector(".nav.top");
    const bottomNav = temp.querySelector(".nav.bottom");
    const drawerOverlay = temp.querySelector(".drawer-overlay");
    const drawerMenu = temp.querySelector(".drawer-menu");
    const footerMenu = temp.querySelector("#footer-menu");

    if (topNav) {
      // Insert top nav as first child of section
      section.insertBefore(topNav.cloneNode(true), section.firstChild);
    }

    if (bottomNav) {
      // Append bottom nav at the end of section
      section.appendChild(bottomNav.cloneNode(true));
    }

    // Append drawer and footer menu to body (for fixed positioning)
    if (drawerOverlay) {
      document.body.appendChild(drawerOverlay.cloneNode(true));
    }

    if (drawerMenu) {
      document.body.appendChild(drawerMenu.cloneNode(true));
    }

    if (footerMenu) {
      document.body.appendChild(footerMenu.cloneNode(true));
    }

    // Re-initialize menus after injection
    initializeMenus();

    // Dispatch event to signal that nav-footer is loaded
    document.dispatchEvent(new CustomEvent("navFooterLoaded"));
  } catch (error) {
    console.error("Failed to load nav-footer component:", error);
  }
}

function initializeMenus() {
  const menuToggle = document.getElementById("menu-toggle");
  const footerMenu = document.getElementById("footer-menu");

  // Desktop menu toggle (for screens > 768px)
  if (menuToggle && footerMenu) {
    menuToggle.addEventListener("click", (e) => {
      e.preventDefault();
      footerMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
      if (
        !e.target.closest(".footer-menu") &&
        !e.target.closest("#menu-toggle")
      ) {
        footerMenu.classList.add("hidden");
      }
    });

    window.addEventListener(
      "scroll",
      () => {
        footerMenu.classList.add("hidden");
      },
      { passive: true },
    );
  }

  // Mobile menu handlers are now in menu-toggle.js

  // ── Share with Love: Click-to-copy button ──
  function showShareToast(message, type) {
    const existing = document.querySelector('.share-love-toast');
    if (existing) existing.remove();

    if (!document.getElementById('share-love-animations')) {
      const style = document.createElement('style');
      style.id = 'share-love-animations';
      style.textContent = `
        @keyframes shareFadeInUp { from { opacity:0; transform:translateX(-50%) translateY(10px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes shareFadeOut  { from { opacity:1; } to { opacity:0; } }
      `;
      document.head.appendChild(style);
    }

    const toast = document.createElement('div');
    toast.className = 'share-love-toast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: type === 'error' ? 'var(--color-error, hsl(345,100%,69%))' : 'var(--color-success, hsl(90,59%,66%))',
      color: '#121212',
      padding: '10px 20px',
      borderRadius: '6px',
      fontFamily: 'var(--font-main)',
      fontSize: 'var(--text-body-sm)',
      fontWeight: 'var(--weight-bold)',
      zIndex: 'var(--z-notification, 1200)',
      animation: 'shareFadeInUp 0.2s ease forwards',
      whiteSpace: 'nowrap',
    });
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'shareFadeOut 0.2s ease forwards';
      setTimeout(() => toast.remove(), 200);
    }, 5000);
  }

  const shareBtn = document.getElementById('share-love-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const canonicalLink = document.querySelector('link[rel="canonical"]');
      const pageUrl = canonicalLink ? canonicalLink.href : window.location.href;
      const text = 'Check out this SQL visualizer: ' + pageUrl;
      try {
        await navigator.clipboard.writeText(text);
        showShareToast('Link copied. Now share it with love 🩶', 'success');
      } catch {
        showShareToast('Could not copy link. Try manually.', 'error');
      }
    });
  }
}

// Load when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadNavFooter);
} else {
  loadNavFooter();
}

// Go Back button handler (CSP-safe, no inline onclick)
document.addEventListener("click", (e) => {
  const goBackBtn = e.target.closest("#go-back-btn");
  if (goBackBtn) {
    e.preventDefault();
    history.back();
  }
});

// Non-blocking Google Fonts loader (CSP-safe, replaces onload="this.media='all'")
function loadFonts() {
  const fontLinks = document.querySelectorAll(
    'link[href*="fonts.googleapis.com"][media="print"]',
  );
  fontLinks.forEach((link) => {
    link.addEventListener("load", () => {
      link.media = "all";
    });
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadFonts);
} else {
  loadFonts();
}
