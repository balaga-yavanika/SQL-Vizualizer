const menuToggle = document.getElementById("menu-toggle");
const footerMenu = document.getElementById("footer-menu");

if (menuToggle && footerMenu) {
  menuToggle.addEventListener("click", (e) => {
    e.preventDefault();
    footerMenu.classList.toggle("hidden");
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".footer-menu") && !e.target.closest("#menu-toggle")) {
      footerMenu.classList.add("hidden");
    }
  });

  // Hide menu when page scrolls
  let scrollTimeout;
  window.addEventListener("scroll", () => {
    // Hide the menu immediately on scroll
    footerMenu.classList.add("hidden");

    // Clear existing timeout
    clearTimeout(scrollTimeout);
  }, { passive: true });
}
