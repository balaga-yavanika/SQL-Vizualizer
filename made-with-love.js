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
    .mwl-root {
      --mwl-bg-shade-2: oklch(27% 0.009 317);
      --mwl-bg-shade-3: oklch(32% 0.009 322);
      --mwl-purple: oklch(68.601% 0.18154 292.175);
      --mwl-yellow: oklch(89.392% 0.13858 90.472);
      --mwl-primary: var(--mwl-purple);
      --mwl-secondary: var(--mwl-yellow);
      --mwl-font-main: "Space Grotesk", sans-serif;
      --mwl-font-mono: "Space Mono", monospace;
      --mwl-text-ui: clamp(0.7rem, 1vw, 1rem);
      --mwl-text-fine: clamp(0.6rem, 0.7vw, 0.7rem);
      --mwl-z-tooltip: 1100;
      --mwl-z-notification: 1200;
    }

    [data-theme="light"] .mwl-root {
      --mwl-bg-shade-2: #eceae6;
      --mwl-bg-shade-3: #d4d0c8;
      --mwl-purple: hsl(248, 51%, 53%);
      --mwl-yellow: #b36a08;
    }

    .mwl-root {
      display: flex;
      align-items: center;
    }

    .mwl-root a {
      position: relative;
      font-family: var(--mwl-font-mono);
      font-size: var(--mwl-text-ui);
      color: var(--mwl-secondary);
      font-weight: 700;
      text-transform: uppercase;
      text-decoration: none;
      cursor: pointer;
    }

    .mwl-root a:hover {
      color: oklch(from var(--mwl-primary) calc(l + 0.1) c h);
    }

    .mwl-root a[data-tooltip]:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: calc(100% + 10px);
      left: 50px;
      background: var(--mwl-bg-shade-2);
      border: 1px solid var(--mwl-bg-shade-3);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: var(--mwl-text-fine);
      white-space: nowrap;
      z-index: var(--mwl-z-tooltip);
      color: var(--mwl-secondary);
    }

    .mwl-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: hsl(90, 59%, 66%);
      color: #121212;
      padding: 10px 20px;
      border-radius: 6px;
      font-family: var(--mwl-font-main, "Space Grotesk", sans-serif);
      font-size: 0.875rem;
      font-weight: 700;
      z-index: var(--mwl-z-notification, 1200);
      white-space: nowrap;
      animation: mwlFadeInUp 0.2s ease forwards;
    }

    .mwl-toast.error {
      background: hsl(345, 100%, 69%);
    }

    @keyframes mwlFadeInUp {
      from { opacity: 0; transform: translateX(-50%) translateY(10px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }

    @keyframes mwlFadeOut {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // ── HTML ──
  const wrapper = document.createElement("span");
  wrapper.className = "mwl-root";
  wrapper.innerHTML = `
    <a
      id="share-love-btn"
      data-tooltip="Share with 💛"
      role="button"
      aria-label="Copy page link to share"
    >[made with 🩶]</a>
  `;
  document.currentScript
    ? document.currentScript.parentNode.insertBefore(
        wrapper,
        document.currentScript
      )
    : document.body.appendChild(wrapper);

  // ── Toast ──
  function showShareToast(message, type) {
    const existing = document.querySelector(".mwl-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "mwl-toast" + (type === "error" ? " error" : "");
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "mwlFadeOut 0.2s ease forwards";
      setTimeout(() => toast.remove(), 200);
    }, 5000);
  }

  // ── Click Handler ──
  const shareBtn = wrapper.querySelector("#share-love-btn");
  shareBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    const pageUrl = canonicalLink ? canonicalLink.href : window.location.href;
    const text = "Check out this: " + pageUrl;
    try {
      await navigator.clipboard.writeText(text);
      showShareToast("Link copied. Now share it with love 🩶", "success");
    } catch {
      showShareToast("Could not copy link. Try manually.", "error");
    }
  });
})();
