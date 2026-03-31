(() => {
  const frames = [
    "/Assets/Favicon/w/W.svg",
    "/Assets/Favicon/w/H.svg",
    "/Assets/Favicon/w/Y.svg",
  ];

  const speed = 900; // ms
  let index = 0;
  let timer = null;

  function getFaviconElement() {
    return document.querySelector('link[rel*="icon"]');
  }

  function setFavicon(src) {
    const link = getFaviconElement();
    if (!link) return;

    // Force refresh for browser cache
    link.href = src + "?v=" + Date.now();
  }

  function start() {
    if (timer) return;

    timer = setInterval(() => {
      index = (index + 1) % frames.length;
      setFavicon(frames[index]);
    }, speed);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  // Respect reduced motion
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  document.addEventListener("visibilitychange", () => {
    document.hidden ? stop() : start();
  });

  document.addEventListener("DOMContentLoaded", start);
})();
