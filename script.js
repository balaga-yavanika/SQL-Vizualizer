document.addEventListener("DOMContentLoaded", () => {
  /* ═══════════════════════════════════════════════
   LOADER
═══════════════════════════════════════════════ */

  const loader = document.getElementById("loading-screen");
  const content = document.getElementById("content");
  const percentageText = document.getElementById("percentage");

  if (loader && content && percentageText) {
    //  Skip loader if:
    // 1. Coming with #section
    // 2. Homepage already loaded in this session

    if (window.location.hash || sessionStorage.getItem("homeLoaded")) {
      loader.style.display = "none";
    } else {
      // Mark homepage as loaded
      sessionStorage.setItem("homeLoaded", "true");

      let count = 0;

      const interval = setInterval(() => {
        if (count <= 100) {
          percentageText.textContent = `[${count}%]`;
          count++;
        } else {
          clearInterval(interval);
          loader.style.display = "none";
          // tell transition.js loader already handled the reveal
          window.__loaderDone = true;
        }
      }, 10);
    }
  }
});
