// Simple menu toggle - no complexity
(function () {
  let menuSetup = false;

  function setupMenus() {
    if (menuSetup) return;

    const hamburger = document.getElementById("hamburger-menu");
    const drawer = document.getElementById("drawer-menu");
    const overlay = document.getElementById("drawer-overlay");

    if (!hamburger || !drawer || !overlay) return;

    menuSetup = true;

    hamburger.onclick = function (e) {
      e.preventDefault();
      drawer.classList.toggle("active");
      overlay.classList.toggle("active");
    };

    overlay.onclick = function (e) {
      e.preventDefault();
      drawer.classList.remove("active");
      overlay.classList.remove("active");
    };

    const closeBtn = drawer.querySelector(".drawer-close");
    if (closeBtn) {
      closeBtn.onclick = function (e) {
        e.preventDefault();
        drawer.classList.remove("active");
        overlay.classList.remove("active");
      };
    }

    drawer.querySelectorAll("a").forEach(link => {
      link.onclick = function () {
        drawer.classList.remove("active");
        overlay.classList.remove("active");
      };
    });

    document.onkeydown = function (e) {
      if (e.key === "Escape") {
        drawer.classList.remove("active");
        overlay.classList.remove("active");
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupMenus);
  } else {
    setupMenus();
  }

  const observer = new MutationObserver(() => {
    const hamburger = document.getElementById("hamburger-menu");
    if (hamburger && !menuSetup) {
      setupMenus();
      observer.disconnect();
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
