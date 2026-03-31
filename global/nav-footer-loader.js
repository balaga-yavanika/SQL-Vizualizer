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
    const footerMenu = temp.querySelector(".footer-menu");

    if (topNav) {
      // Insert top nav as first child of section
      section.insertBefore(topNav.cloneNode(true), section.firstChild);
    }

    if (bottomNav && footerMenu) {
      // Append bottom nav and footer menu at the end of section
      section.appendChild(bottomNav.cloneNode(true));
      // Append footer menu to body instead of section to ensure it stays fixed
      document.body.appendChild(footerMenu.cloneNode(true));
    }

    // Re-initialize menu toggle after injection
    initializeMenuToggle();
  } catch (error) {
    console.error("Failed to load nav-footer component:", error);
  }
}

function initializeMenuToggle() {
  const menuToggle = document.getElementById("menu-toggle");
  const footerMenu = document.getElementById("footer-menu");

  if (menuToggle && footerMenu) {
    menuToggle.addEventListener("click", (e) => {
      e.preventDefault();
      footerMenu.classList.toggle("hidden");
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (
        !e.target.closest(".footer-menu") &&
        !e.target.closest("#menu-toggle")
      ) {
        footerMenu.classList.add("hidden");
      }
    });

    // Hide menu when page scrolls
    window.addEventListener("scroll", () => {
      footerMenu.classList.add("hidden");
    }, { passive: true });
  }
}

// Load when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadNavFooter);
} else {
  loadNavFooter();
}
