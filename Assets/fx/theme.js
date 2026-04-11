(function () {
  const root = document.documentElement;
  const STORAGE = "whyaweeye-theme";

  // ── load saved preference immediately ──
  const saved = localStorage.getItem(STORAGE);
  if (saved) root.setAttribute("data-theme", saved);

  // ── wait for nav to load then attach ──
  function attachToggle() {
    ["themeToggle", "themeToggleMobile"].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn || btn._themeAttached) return;
      btn._themeAttached = true;
      updateIcon(btn);
      btn.addEventListener("click", () => {
        const current = root.getAttribute("data-theme") || "dark";
        const next = current === "light" ? "dark" : "light";
        root.setAttribute("data-theme", next);
        localStorage.setItem(STORAGE, next);
        // update all toggle buttons
        ["themeToggle", "themeToggleMobile"].forEach((i) => {
          const b = document.getElementById(i);
          if (b) updateIcon(b);
        });
      });
    });
  }

  function updateIcon(btn) {
    if (!btn) return;
    const current = root.getAttribute("data-theme") || "dark";
    btn.textContent = current === "light" ? "☀️" : "🌒";
    btn.title =
      current === "light" ? "Switch to dark mode" : "Switch to light mode";
  }

  // ── try on DOMContentLoaded ──
  document.addEventListener("DOMContentLoaded", attachToggle);

  // ── also observe DOM for nav injection ──
  const observer = new MutationObserver(() => {
    const btn = document.getElementById("themeToggle");
    if (btn && !btn._themeAttached) {
      console.log("Theme button found, attaching listeners...");
      attachToggle();
      observer.disconnect(); // stop watching once found
    }
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  // ── Also listen for custom navFooterLoaded event ──
  document.addEventListener("navFooterLoaded", () => {
    const btn = document.getElementById("themeToggle");
    if (btn && !btn._themeAttached) {
      console.log("Nav footer loaded, attaching theme toggle...");
      attachToggle();
    }
  });
})();
