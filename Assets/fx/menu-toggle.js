// Simple menu toggle - no complexity
function setupMenus() {
  const hamburger = document.getElementById("hamburger-menu");
  const drawer = document.getElementById("drawer-menu");
  const overlay = document.getElementById("drawer-overlay");

  if (!hamburger || !drawer || !overlay) {
    console.log("Menu elements not found, retrying...");
    setTimeout(setupMenus, 500);
    return;
  }

  console.log("Menu setup successful");

  // Hamburger click - toggle drawer
  hamburger.onclick = function(e) {
    e.preventDefault();
    drawer.classList.toggle("active");
    overlay.classList.toggle("active");
  };

  // Overlay click - close drawer
  overlay.onclick = function(e) {
    e.preventDefault();
    drawer.classList.remove("active");
    overlay.classList.remove("active");
  };

  // Close button - close drawer
  const closeBtn = drawer.querySelector(".drawer-close");
  if (closeBtn) {
    closeBtn.onclick = function(e) {
      e.preventDefault();
      drawer.classList.remove("active");
      overlay.classList.remove("active");
    };
  }

  // Menu links - close drawer after clicking
  drawer.querySelectorAll("a").forEach(link => {
    link.onclick = function() {
      drawer.classList.remove("active");
      overlay.classList.remove("active");
    };
  });

  // Escape key - close drawer
  document.onkeydown = function(e) {
    if (e.key === "Escape") {
      drawer.classList.remove("active");
      overlay.classList.remove("active");
    }
  };
}

// Start setup when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupMenus);
} else {
  setupMenus();
}

// Also try after a short delay as backup
setTimeout(setupMenus, 1000);
