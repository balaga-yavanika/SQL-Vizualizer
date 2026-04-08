/**
 * Reusable custom dropdown handler
 * Usage: DropdownHandler.setup(wrapperId, onSelect)
 *
 * Features:
 * - Only one dropdown open at a time
 * - Opening another closes the previous (preserves selected value)
 * - Close on outside click or Escape
 * - Reset restores all dropdowns to placeholder text
 */
export const DropdownHandler = {
  // Global registry of all dropdowns
  _dropdowns: new Map(),

  setup(wrapperId, onSelect) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    const toggle = wrapper.querySelector(".dropdown-toggle");
    const menu = wrapper.querySelector(".dropdown-menu");
    const displaySpan = toggle.querySelector("span:first-child");
    const placeholderText = displaySpan.textContent;

    if (!toggle || !menu) return;

    // Remove old items' event listeners by cloning and replacing
    const oldItems = menu.querySelectorAll(".dropdown-item");
    oldItems.forEach(item => {
      const newItem = item.cloneNode(false);
      newItem.className = item.className;
      newItem.setAttribute("data-value", item.getAttribute("data-value"));
      newItem.textContent = item.textContent;
      item.parentNode.replaceChild(newItem, item);
    });

    const items = menu.querySelectorAll(".dropdown-item");

    // Store dropdown instance
    const dropdownInstance = { wrapper, toggle, menu, items, displaySpan, placeholderText, wrapperId };
    this._dropdowns.set(wrapperId, dropdownInstance);

    // Toggle dropdown - closes all others when opening
    const toggleDropdown = (force) => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      const shouldOpen = force !== undefined ? force : !isOpen;

      if (shouldOpen) {
        // Close all other dropdowns first
        this._closeAllDropdowns(wrapperId);
        toggle.setAttribute("aria-expanded", "true");
        menu.style.display = "block";

        // Position dropdown relative to toggle button (for modals and overflow containers)
        const rect = toggle.getBoundingClientRect();
        menu.style.position = "fixed";
        menu.style.left = rect.left + "px";
        menu.style.top = (rect.bottom + 4) + "px"; // 4px gap below toggle
        menu.style.width = rect.width + "px";
      } else {
        toggle.setAttribute("aria-expanded", "false");
        menu.style.display = "none";
      }
    };

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    // Handle item selection
    items.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const value = item.getAttribute("data-value");
        const label = item.textContent;

        displaySpan.textContent = label;
        toggleDropdown(false);

        // Mark as selected
        items.forEach((i) => i.classList.remove("selected"));
        item.classList.add("selected");

        onSelect(value);
      });
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target)) {
        toggleDropdown(false);
      }
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        toggleDropdown(false);
      }
    });

    return { toggleDropdown, wrapper };
  },

  /**
   * Close all dropdowns except the specified one
   */
  _closeAllDropdowns(exceptId = null) {
    this._dropdowns.forEach((instance, id) => {
      if (id !== exceptId) {
        instance.toggle.setAttribute("aria-expanded", "false");
        instance.menu.style.display = "none";
      }
    });
  },

  /**
   * Update the display text for a dropdown
   */
  updateDisplay(wrapperId, text) {
    const instance = this._dropdowns.get(wrapperId);
    if (instance) {
      instance.displaySpan.textContent = text;
    }
  },

  /**
   * Select an item by value programmatically
   */
  selectByValue(wrapperId, value) {
    const instance = this._dropdowns.get(wrapperId);
    if (instance) {
      const item = instance.wrapper.querySelector(
        `.dropdown-item[data-value="${value}"]`,
      );
      if (item) item.click();
    }
  },

  /**
   * Reset all dropdowns to placeholder text and close them
   */
  resetAll() {
    this._dropdowns.forEach((instance) => {
      // Close dropdown
      instance.toggle.setAttribute("aria-expanded", "false");
      instance.menu.style.display = "none";

      // Restore placeholder text
      instance.displaySpan.textContent = instance.placeholderText;

      // Remove selected state from all items
      instance.items.forEach((item) => item.classList.remove("selected"));
    });
  },
};
