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

    // Ctrl+Shift+N: Add new table (Shift avoids overriding browser's Ctrl+N "New Window")
    if (e.ctrlKey && e.shiftKey && e.key === "n" && !isInput && !isModalOpen) {
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
}
