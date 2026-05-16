(() => {
  // ── Fonts ──
  if (!document.querySelector('link[href*="Space+Grotesk"]')) {
    const preconnect1 = document.createElement("link");
    preconnect1.rel = "preconnect";
    preconnect1.href = "https://fonts.googleapis.com";
    document.head.appendChild(preconnect1);

    const preconnect2 = document.createElement("link");
    preconnect2.rel = "preconnect";
    preconnect2.href = "https://fonts.gstatic.com";
    preconnect2.crossOrigin = "anonymous";
    document.head.appendChild(preconnect2);

    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap";
    document.head.appendChild(fontLink);
  }

  // ── Styles ──
  const style = document.createElement("style");
  style.textContent = `
    .fmenu-root {
      --fmenu-bg-shade-2: oklch(27% 0.009 317);
      --fmenu-bg-shade-3: oklch(32% 0.009 322);
      --fmenu-purple: oklch(68.601% 0.18154 292.175);
      --fmenu-yellow: oklch(89.392% 0.13858 90.472);
      --fmenu-primary: var(--fmenu-purple);
      --fmenu-secondary: var(--fmenu-yellow);
      --fmenu-font-main: "Space Grotesk", sans-serif;
      --fmenu-font-mono: "Space Mono", monospace;
      --fmenu-text-tag: clamp(0.65rem, 0.8vw, 0.75rem);
      --fmenu-text-ui: clamp(0.7rem, 1vw, 1rem);
      --fmenu-z-menu: 100;
      position: relative;
    }

    [data-theme="light"] .fmenu-root {
      --fmenu-bg-shade-2: #eceae6;
      --fmenu-bg-shade-3: #d4d0c8;
      --fmenu-purple: hsl(248, 51%, 53%);
      --fmenu-yellow: #b36a08;
    }

    .fmenu-toggle {
      font-family: var(--fmenu-font-mono);
      font-size: var(--fmenu-text-tag);
      color: var(--fmenu-secondary);
      font-weight: 700;
      text-transform: uppercase;
      text-decoration: none;
      cursor: pointer;
    }

    .fmenu-toggle:hover {
      color: oklch(from var(--fmenu-primary) calc(l + 0.1) c h);
    }

    .fmenu-toggle:focus-visible {
      outline: 2px solid var(--fmenu-primary);
      outline-offset: 2px;
      border-radius: 2px;
    }

    .fmenu-panel {
      position: absolute;
      bottom: calc(100% + 8px);
      right: 0;
      background: var(--fmenu-bg-shade-2);
      border: 1px solid var(--fmenu-bg-shade-3);
      border-radius: 4px;
      padding: 8px 0;
      z-index: var(--fmenu-z-menu);
      min-width: 200px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .fmenu-panel.hidden {
      display: none;
    }

    .fmenu-link {
      display: block;
      padding: 8px 16px;
      color: oklch(from var(--fmenu-primary) calc(l + 0.1) calc(c - 0.16) h);
      text-decoration: none;
      font-family: var(--fmenu-font-main);
      font-size: 0.875rem;
      border-bottom: 1px solid var(--fmenu-bg-shade-3);
      cursor: pointer;
    }

    .fmenu-link:last-child {
      border-bottom: none;
    }

    .fmenu-link:hover {
      background: var(--fmenu-bg-shade-3);
      color: var(--fmenu-secondary);
    }

    .fmenu-link i {
      margin-right: 8px;
      width: 16px;
      display: inline-block;
    }

    @media (max-width: 768px) {
      .fmenu-root {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);

  // ── HTML ──
  const wrapper = document.createElement("span");
  wrapper.className = "fmenu-root";
  wrapper.innerHTML = `
    <a
      href="#"
      id="fmenu-toggle"
      class="fmenu-toggle"
      rel="noopener noreferrer"
      aria-label="Open menu"
      aria-expanded="false"
    >[ <i class="fa-solid fa-question"></i> ]</a>

    <div class="fmenu-panel hidden" id="fmenu-panel">
      <a href="#" class="fmenu-link">
        <i class="fa-solid fa-hand-holding-heart"></i> Support Here
      </a>
      <a href="https://medium.com/" class="fmenu-link" rel="noopener noreferrer" target="_blank">
        <i class="fa-brands fa-medium"></i> Read Articles
      </a>
      <a href="#" class="fmenu-link">
        <i class="fa-solid fa-book-open"></i> About
      </a>
      <a href="#" class="fmenu-link">
        <i class="fa-solid fa-clock-rotate-left"></i> Version Notes
      </a>
      <a href="#" class="fmenu-link">
        <i class="fa-solid fa-pen-clip"></i> Submit Feedback
      </a>
      <a href="#" class="fmenu-link">
        <i class="fa-solid fa-pen-clip"></i> Submit Issues
      </a>
      <a href="#" class="fmenu-link">
        <i class="fa-solid fa-file-shield"></i> License & Terms
      </a>
    </div>
  `;

  document.currentScript
    ? document.currentScript.parentNode.insertBefore(
        wrapper,
        document.currentScript
      )
    : document.body.appendChild(wrapper);

  // ── Behaviour ──
  const toggle = wrapper.querySelector("#fmenu-toggle");
  const panel = wrapper.querySelector("#fmenu-panel");

  toggle.addEventListener("click", (e) => {
    e.preventDefault();
    const isHidden = panel.classList.toggle("hidden");
    toggle.setAttribute("aria-expanded", String(!isHidden));
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      panel.classList.add("hidden");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  window.addEventListener("scroll", () => {
    panel.classList.add("hidden");
    toggle.setAttribute("aria-expanded", "false");
  }, { passive: true });
})();
