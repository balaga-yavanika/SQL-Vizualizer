/**
 * Banner Management — Dismissible "Before you start" banner
 * Handles showing/hiding banner based on localStorage with cookie clearing detection
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SETUP INSTRUCTIONS (3 steps to add to any page):
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1. In *-imports.css, add:
 *    @import url("/global/banner.css");
 *
 * 2. In content HTML, add banner div:
 *    <div class="before-start" id="before-start-banner">
 *      <button class="banner-close-btn" id="banner-close-btn" aria-label="Close banner">
 *        <i class="fa-solid fa-times"></i>
 *      </button>
 *      <h6>Title</h6>
 *      <p>Content...</p>
 *    </div>
 *
 * 3. In page JS, add & call:
 *    import { initBanner } from "../../global/banner.js";
 *    // In Boot section:
 *    initBanner();
 *
 * See BANNER_SETUP.md for full guide
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const BANNER_STORAGE_KEY = 'beforeStartBannerClosed';

/**
 * Initialize banner: check localStorage and handle close button
 */
export function initBanner() {
  const banner = document.getElementById('before-start-banner');
  if (!banner) return;

  // Check if banner was previously closed
  if (localStorage.getItem(BANNER_STORAGE_KEY)) {
    banner.classList.add('hidden');
  }

  // Setup close button listener
  const closeBtn = document.getElementById('banner-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      banner.classList.add('hidden');
      localStorage.setItem(BANNER_STORAGE_KEY, 'true');
    });
  }

  // Listen for storage changes (e.g., when cookies/localStorage are cleared)
  window.addEventListener('storage', (e) => {
    if (e.key === BANNER_STORAGE_KEY && e.newValue === null) {
      // Banner closure was cleared from another tab/window
      banner.classList.remove('hidden');
    }
  });

  // Detect when user clears all storage (including this key)
  // This is a simple heuristic: check periodically if storage was cleared
  detectStorageCleared(banner);
}

/**
 * Detect when user clears browser storage/cookies
 * Shows banner again when storage is cleared
 */
function detectStorageCleared(banner) {
  // Set a marker to detect if storage was cleared
  const MARKER_KEY = '__storageMarker__';
  const wasMarkerPresent = sessionStorage.getItem(MARKER_KEY) !== null;

  if (!wasMarkerPresent) {
    // First page load in this session
    sessionStorage.setItem(MARKER_KEY, 'true');
  }

  // Listen for visibility changes to detect if user cleared storage in another tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Page became visible again - check if storage was cleared
      const markerExists = sessionStorage.getItem(MARKER_KEY) !== null;
      if (wasMarkerPresent && !markerExists) {
        // Storage was cleared while page was hidden
        banner.classList.remove('hidden');
        localStorage.removeItem(BANNER_STORAGE_KEY);
      }
    }
  });
}
