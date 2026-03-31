/**
 * Reusable column modal handler
 * Usage: ModalHandler.setup(modalId, submitCallback, dataAttribute)
 */
export const ModalHandler = {
  setup(modalId, submitCallback, dataAttribute = "ti") {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Show modal
    this.show = (dataValue) => {
      modal.dataset[dataAttribute] = dataValue;
      document.getElementById(modalId + "-name").value = "";
      const typeInput = document.getElementById(modalId + "-type-value");
      if (typeInput) {
        typeInput.value = "int";
        const display = document.getElementById(modalId + "-type-display");
        if (display) display.textContent = "Integer";
      }
      modal.style.display = "flex";
      setTimeout(() => document.getElementById(modalId + "-name").focus(), 50);
    };

    // Hide modal
    this.hide = () => {
      modal.style.display = "none";
    };

    // Submit modal
    this.submit = () => {
      const nameInput = document.getElementById(modalId + "-name");
      const typeInput = document.getElementById(modalId + "-type-value");
      const name = nameInput.value.trim();
      const type = typeInput ? typeInput.value : "int";

      if (!name) {
        nameInput.focus();
        return;
      }

      this.hide();
      submitCallback({
        dataValue: modal.dataset[dataAttribute],
        name,
        type,
      });
    };

    // Event listeners
    document.addEventListener("click", (e) => {
      if (e.target === modal) this.hide();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.hide();
      if (e.key === "Enter" && modal.style.display === "flex") this.submit();
    });

    // Expose submit via button
    const confirmBtn = modal.querySelector(".modal-btn-confirm");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => this.submit());
    }

    const cancelBtn = modal.querySelector(".modal-btn-cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.hide());
    }

    return this;
  },
};
