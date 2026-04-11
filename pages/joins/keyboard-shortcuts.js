/**
 * Keyboard shortcuts for the joins page.
 */

export function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    const isInput = e.target.matches("input, textarea, [contenteditable]");
    const isModalOpen = document.getElementById("col-modal")?.style.display === "flex";

    // Ctrl+Enter: Add row to first table
    if (e.ctrlKey && e.key === "Enter" && !isInput && !isModalOpen) {
      e.preventDefault();
      if (window.ysqlvizApp?.joins?.addRowAndFocus) {
        window.ysqlvizApp.joins.addRowAndFocus(0);
      }
    }

    // Ctrl+N: Add new table
    if (e.ctrlKey && e.key === "n" && !isInput && !isModalOpen) {
      e.preventDefault();
      if (window.ysqlvizApp?.joins?.addTableAndRender) {
        window.ysqlvizApp.joins.addTableAndRender();
      }
    }

    // Ctrl+Shift+R: Reset all
    if (e.ctrlKey && e.shiftKey && e.key === "R" && !isInput && !isModalOpen) {
      e.preventDefault();
      if (confirm("Reset all data?") && window.ysqlvizApp?.joins?.resetAllAndRender) {
        window.ysqlvizApp.joins.resetAllAndRender();
      }
    }

    // Escape: Close modal
    if (e.key === "Escape" && isModalOpen) {
      document.getElementById("col-modal").style.display = "none";
    }
  });

  // Show hint on first load
  if (!localStorage.getItem("shown-shortcuts-hint")) {
    setTimeout(() => {
      if (window.ysqlvizApp?.joins?.showToast) {
        window.ysqlvizApp.joins.showToast("⌨️ Ctrl+Enter: Add row | Ctrl+N: Add table | Ctrl+Shift+R: Reset", "success", 6000);
      }
    }, 1500);
    localStorage.setItem("shown-shortcuts-hint", "true");
  }
}
