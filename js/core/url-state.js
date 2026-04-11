/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * URL State Sharing
 * ═══════════════════════════════════════════════════════════════════════════════
 * Encodes and decodes app state to/from URL parameters for sharing configurations.
 * Allows users to share their current join setup via a URL link.
 * 
 * Sections:
 * - Serialization: Convert state to URL params
 * - URL Generation: Build shareable URLs
 * - Parsing: Restore state from URL
 * - Share Features: Clipboard, toast notifications
 * - Share Button: Animation and visibility control
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════
import { state, PRESET_DATASETS, INITIAL_STATE } from "./state.js";
import { setJoinCondition, loadPreset, isValidIndex } from "./utils.js";
import { LIMITS } from "./limits.js";
import { PresetHashCache } from "./hash.js";

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET HASH CACHE — Initialize once at startup
// ═══════════════════════════════════════════════════════════════════════════════
const presetHashCache = new PresetHashCache();

// Initialize cache with all presets (computed once, not on every render)
Object.entries(PRESET_DATASETS).forEach(([name, preset]) => {
  presetHashCache.set(name, preset.tables);
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZATION — Convert state to URL params
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serializes current app state to URL search params.
 * Captures: current operation, preset or custom tables, join conditions, selected pair.
 * Uses compact format to minimize URL length.
 * @returns {string} URLSearchParams string
 */
export function serializeState() {
  const params = new URLSearchParams();

  // Current operation
  if (state.currentOp) {
    params.set("op", state.currentOp);
  }

  // Check if using a preset (uses fast hash comparison instead of JSON.stringify)
  const presetName = presetHashCache.findMatch(state.tables);
  if (presetName) {
    params.set("preset", presetName);
  } else if (state.tables.length > 0) {
    // Custom tables - use compact CSV-like format instead of full JSON
    try {
      const compact = state.tables.map(t => {
        const cols = t.columns.map(c => `${c.id}:${c.name}:${c.type}`).join(",");
        const rows = t.rows.map(r =>
          t.columns.map(c => r[c.id] === null || r[c.id] === undefined ? "" : String(r[c.id]).replace(/[|:]/g, "")).join(":")
        ).join("|");
        const svgCol = t.svgColId || (t.columns.length > 0 ? t.columns[0].id : "");
        return `${t.name};${cols};${rows};${svgCol}`;
      }).join("\x00");
      params.set("tables", compact);
    } catch (e) {
      console.warn("Could not serialize tables:", e);
      // Fallback to minified JSON
      try {
        const tablesJson = JSON.stringify(state.tables);
        params.set("tables", tablesJson);
      } catch (e2) {
        console.warn("Fallback serialization also failed:", e2);
      }
    }
  }

  // Join conditions
  const cond = state.joinConditions[0];
  if (cond) {
    if (cond.leftCol) params.set("lc", cond.leftCol);
    if (cond.rightCol) params.set("rc", cond.rightCol);
    if (cond.op && cond.op !== "=") params.set("rop", cond.op);
  }

  // Selected pair (for 3+ tables)
  if (state.selectedPair) {
    params.set("pair", state.selectedPair);
  }

  return params.toString();
}

// ═══════════════════════════════════════════════════════════════════════════════
// URL GENERATION — Build shareable URLs
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates a full shareable URL with current state encoded as params.
 * @returns {string} Full URL with params
 */
export function generateShareUrl() {
  const params = serializeState();
  const baseUrl = window.location.origin + window.location.pathname;
  return params ? `${baseUrl}?${params}` : baseUrl;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSING — Restore state from URL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parses URL parameters and restores app state.
 * Handles: operation, presets, custom tables, join conditions, selected pair.
 * Sets isSharedView = true when loading from URL (read-only mode).
 * @returns {boolean} true if state was restored, false if no valid params
 */
export function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);

  // No params - use default state
  if (!params.toString()) {
    state.isSharedView = false;
    return false;
  }

  // Mark as shared view (read-only)
  state.isSharedView = true;

  // Operation
  const op = params.get("op");
  if (op) {
    state.currentOp = op;
  }

  // Preset
  const presetName = params.get("preset");
  if (presetName && PRESET_DATASETS[presetName]) {
    loadPreset(PRESET_DATASETS[presetName]);
    state.currentOp = op || "inner";
    return true;
  }

  // Custom tables (handle both compact and JSON formats)
  const tablesData = params.get("tables");
  if (tablesData) {
    try {
      // Try compact format first (contains null char separator)
      if (tablesData.includes("\x00")) {
        state.tables = tablesData.split("\x00").map(tStr => {
          const parts = tStr.split(";");
          const [name, colsStr, rowsStr] = [parts[0], parts[1], parts[2]];
          const svgColId = parts[3] || "";
          const columns = colsStr ? colsStr.split(",").map(c => {
            const [id, colName, type] = c.split(":");
            return { id, name: colName, type, isKey: false };
          }) : [];
          const rows = rowsStr ? rowsStr.split("|").map(rStr => {
            const vals = rStr.split(":");
            const row = {};
            columns.forEach((c, i) => {
              if (vals[i] === "") {
                row[c.id] = null;
              } else if (c.type === "boolean") {
                row[c.id] = vals[i] === "true";
              } else if (!isNaN(vals[i])) {
                row[c.id] = Number(vals[i]);
              } else {
                row[c.id] = vals[i];
              }
            });
            return row;
          }) : [];
          return { name, columns, rows, svgColId };
        });
      } else {
        // Fallback to JSON format for old links
        state.tables = JSON.parse(tablesData);
      }
    } catch (e) {
      console.warn("Could not parse tables from URL:", e);
      state.tables = JSON.parse(JSON.stringify(INITIAL_STATE.tables));
    }
  }

  // Join conditions
  const lc = params.get("lc");
  const rc = params.get("rc");
  const rop = params.get("rop") || "=";
  const pair = params.get("pair");

  if (lc && rc) {
    let [li, ri] = pair ? pair.split("-").map(Number) : [0, 1];
    // Validate pair indices
    if (!isValidIndex(li, state.tables.length) || !isValidIndex(ri, state.tables.length)) {
      li = 0;
      ri = 1;
    }
    setJoinCondition(0, {
      leftTable: li,
      leftCol: lc,
      op: rop,
      rightTable: ri,
      rightCol: rc,
    });
  }

  // Selected pair - validate before setting
  if (pair) {
    const [li, ri] = pair.split("-").map(Number);
    if (isValidIndex(li, state.tables.length) && isValidIndex(ri, state.tables.length)) {
      state.selectedPair = pair;
    }
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARE FEATURES — Clipboard & Toast
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Copies the generated share URL to the system clipboard.
 * @returns {Promise<boolean>} true if copy succeeded
 */
export async function copyShareLink() {
  const url = generateShareUrl();
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (err) {
    console.error("Failed to copy share link:", err);
    return false;
  }
}

/**
 * Shows a toast notification message at the bottom of the screen.
 * Used for user feedback (e.g., "Link copied!").
 * @param {string} message - Message to display
 * @param {string} type - Optional type: "error" for red styling
 * @param {number} duration - How long to show (ms), default 2000
 */
export function showToast(message, type = "success", duration = 2000) {
  // Remove existing toast to avoid stacking
  const existing = document.querySelector(".url-state-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "url-state-toast";
  toast.textContent = message;
  const bg = type === "error" ? 
  "var(--color-error, hsl(345, 100%, 69%))" : "var(--color-success, hsl(90, 59%, 66%))";
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: ${bg};
    color: #121212;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: var(--text-body-sm);
    font-weight: var(--weight-bold);
    font-family: var(--font-main, sans-serif);
    z-index: 9999;
    animation: fadeInUp 0.2s ease;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "fadeOut 0.2s ease";
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

// Inject fade animation keyframes once
if (!document.getElementById("url-state-animations")) {
  const style = document.createElement("style");
  style.id = "url-state-animations";
  style.textContent = `
    @keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
  `;
  document.head.appendChild(style);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARE BUTTON — Animation & Visibility
// ═══════════════════════════════════════════════════════════════════════════════

let _prevShareBtnEnabled = false;
let bellAnimationTimers = [];
let bellAnimationInterval = null;

/**
 * Check if the top heading/header is visible in the viewport
 * @returns {boolean} true if visible
 */
function isTopHeaderVisible() {
  const heading = document.querySelector(".heading-wrapper") || document.querySelector(".heading-part-top");
  if (!heading) return true; // If can't find, show anyway
  const rect = heading.getBoundingClientRect();
  return rect.top >= 0 && rect.bottom <= window.innerHeight;
}

/**
 * Triggers the bell shake animation on the share button.
 * Runs 4 shakes, pauses 2 seconds, repeats 5 times total.
 * Only triggers if the top header is visible in the viewport.
 * Does NOT trigger in shared view mode (read-only).
 */
export function triggerBellAnimation() {
  const btn = document.getElementById("share-btn");
  if (!btn || btn.disabled) return;

  // Don't animate in shared view mode
  if (state.isSharedView) return;

  // Only animate if top header is visible in viewport
  if (!isTopHeaderVisible()) return;

  // Clear any existing animation timers first
  bellAnimationTimers.forEach((id) => clearTimeout(id));
  bellAnimationTimers = [];
  if (bellAnimationInterval) {
    clearInterval(bellAnimationInterval);
    bellAnimationInterval = null;
  }

  let cycleCount = 0;
  const maxCycles = 5;
  
  function runShakeCycle() {
    let shakeCount = 0;
    const maxShakes = 4;
    
    bellAnimationInterval = setInterval(() => {
      btn.classList.remove("animate-bell");
      void btn.offsetWidth;
      btn.classList.add("animate-bell");
      shakeCount++;
      
      if (shakeCount >= maxShakes) {
        clearInterval(bellAnimationInterval);
        bellAnimationInterval = null;
        cycleCount++;
        
        // Wait 2 seconds before next cycle (except after last cycle)
        if (cycleCount < maxCycles) {
          const timeoutId = setTimeout(runShakeCycle, 2000);
          bellAnimationTimers.push(timeoutId);
        } else {
          // After all cycles, clean up
          const timeoutId = setTimeout(() => btn.classList.remove("animate-bell"), 750);
          bellAnimationTimers.push(timeoutId);
        }
      }
    }, 750);
  }
  
  runShakeCycle();
}

/**
 * Stops the bell animation immediately and removes animation class.
 * Used when resetting the app state.
 */
export function stopBellAnimation() {
  const btn = document.getElementById("share-btn");
  if (btn) {
    btn.classList.remove("animate-bell");
    btn.disabled = true;
    btn.classList.add("disabled");
    // Force stop CSS animation by setting animation to none
    btn.style.animation = "none";
    // Force reflow to apply the change
    void btn.offsetWidth;
    // Restore to no animation style (let CSS control when needed)
    btn.style.animation = "";
    // Force reflow again
    void btn.offsetWidth;
  }
  // Clear all animation timers
  bellAnimationTimers.forEach((id) => clearTimeout(id));
  bellAnimationTimers = [];
  // Clear the interval
  if (bellAnimationInterval) {
    clearInterval(bellAnimationInterval);
    bellAnimationInterval = null;
  }
  // Reset the previous state so animation can trigger again when data is added
  _prevShareBtnEnabled = false;
}

/**
 * Updates the share button's enabled/disabled state based on app state.
 * Enables button when there's data, operation, or join conditions set.
 * Triggers animation when transitioning from disabled to enabled.
 */
export function updateShareButtonVisibility() {
  const btn = document.getElementById("share-btn");
  if (!btn) return;

  const hasData = state.tables.some((t) => t.rows.length > 0);
  const hasOp = !!state.currentOp;
  const hasCondition =
    state.joinConditions.length > 0 &&
    state.joinConditions[0]?.leftCol &&
    state.joinConditions[0]?.rightCol;
  const shouldEnable = hasData || hasOp || hasCondition;

  btn.disabled = !shouldEnable;
  btn.classList.toggle("disabled", !shouldEnable);

  // Trigger bell animation when becoming enabled
  if (!_prevShareBtnEnabled && shouldEnable) {
    triggerBellAnimation();
  }
  _prevShareBtnEnabled = shouldEnable;
}

/**
 * Exits shared view mode and enables editing.
 * Clears URL params so this becomes a personal editable copy.
 */
export function makeEditableCopy() {
  state.isSharedView = false;
  // Clear URL params while preserving the path
  window.history.replaceState({}, document.title, window.location.pathname);
  // Show feedback
  showToast("Switched to edit mode. Your changes are now editable.", "success", 2500);
}

/**
 * Copies share link and shows a toast notification.
 * Convenience function combining copy and feedback.
 * Also warns if URL is excessively long.
 * @returns {Promise<boolean>} success
 */
export async function copyShareLinkWithToast() {
  const url = generateShareUrl();

  // Warn if URL is too long
  if (url.length > LIMITS.MAX_URL_LENGTH) {
    showToast(`⚠️ Link is large (${Math.round(url.length / 1024 * 10) / 10}KB). Some servers may reject it.`, "warning", 3500);
  }

  const success = await copyShareLink();
  if (success) {
    showToast("Link copied to clipboard!", "success", 2000);
  } else {
    showToast("Failed to copy link to clipboard", "error", 3000);
    // Show fallback: open modal with URL for manual copy
    showShareLinkFallback(url);
  }
  return success;
}

/**
 * Shows a modal with the share URL for manual copying (fallback when clipboard fails).
 * @param {string} url - The share URL to display
 */
function showShareLinkFallback(url) {
  const modal = document.createElement("div");
  modal.className = "share-link-modal";
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--color-bg-vdb, white);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 20px;
    max-width: 500px;
    z-index: 10000;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    font-family: var(--font-main, sans-serif);
  `;
  modal.innerHTML = `
    <h4 style="margin: 0 0 12px 0; color: var(--color-text);">Copy Link Manually</h4>
    <p style="margin: 0 0 12px 0; color: var(--color-text-muted); font-size: 14px;">Your clipboard is not available. Select and copy this link:</p>
    <textarea readonly style="
      width: 100%;
      height: 80px;
      padding: 8px;
      font-family: var(--font-mono, monospace);
      font-size: 12px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: var(--color-bg-vdb-shade-1);
      color: var(--color-text);
      resize: none;
    ">${url}</textarea>
    <button onclick="this.closest('.share-link-modal').remove()" style="
      width: 100%;
      margin-top: 12px;
      padding: 8px 12px;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    ">Done</button>
  `;
  document.body.appendChild(modal);

  // Auto-select the textarea
  const textarea = modal.querySelector("textarea");
  textarea.select();

  // Remove modal on outside click
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}
