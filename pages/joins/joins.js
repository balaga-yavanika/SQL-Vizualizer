/**
 * SQL Joins Visualizer — Main Page
 * Orchestrates join visualization with interactive tables and live result preview
 */
import {
  state,
  JOIN_OPS,
  DESCS,
  PRESET_DATASETS,
  INITIAL_STATE,
  DATA_TYPES,
} from "../../js/core/state.js";
import {
  rebuildPairSelect,
  getMatchedIdx,
  addTable,
  removeTable,
  addRow,
  delRow,
  updateVal,
  addColumn,
  removeColumn,
  setSvgColumn,
  setJoinCondition,
  loadPreset,
  getJoinConditionDisplay,
  getPair,
} from "../../js/core/utils.js";
import { computeResult } from "../../js/engines/joinEngine.js";
import { ModalHandler } from "../../js/components/modal-handler.js";
import { DropdownHandler } from "../../js/components/dropdown-handler.js";
import { renderTables, renderConn, renderResult } from "./joins-ui.js";
import {
  renderSqlPanel,
  copySqlToClipboard,
  generateSql,
} from "./sql-generator.js";
import { initBanner } from "../../global/banner.js";

// ─────────────────────────────────────────────────────────────────────────────
// UI State Management
// ─────────────────────────────────────────────────────────────────────────────

const colModal = ModalHandler.setup(
  "col-modal",
  ({ dataValue, name, type }) => {
    addColumn(parseInt(dataValue), name, type);
    render();
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// Join Condition Editor
// ─────────────────────────────────────────────────────────────────────────────

function buildJoinConditionEditor() {
  let [li, ri] = getPair();
  const leftTable = state.tables[li];
  const rightTable = state.tables[ri];
  const cond = state.joinConditions[0] || {};

  const leftColName =
    leftTable.columns.find((c) => c.id === cond.leftCol)?.name ||
    "Select column";
  const rightColName =
    rightTable.columns.find((c) => c.id === cond.rightCol)?.name ||
    "Select column";

  const leftColItems = leftTable.columns
    .map(
      (c) =>
        `<button class="dropdown-item" data-value="${c.id}">${c.name}</button>`,
    )
    .join("");

  const rightColItems = rightTable.columns
    .map(
      (c) =>
        `<button class="dropdown-item" data-value="${c.id}">${c.name}</button>`,
    )
    .join("");

  const opItems = [
    { value: "=", label: "=" },
    { value: ">", label: ">" },
    { value: "<", label: "<" },
    { value: ">=", label: ">=" },
    { value: "<=", label: "<=" },
  ]
    .map(
      (item) =>
        `<button class="dropdown-item" data-value="${item.value}">${item.label}</button>`,
    )
    .join("");

  return `
    <div class="join-condition-editor">
      <span class="join-cond-label">ON</span>

      <div class="custom-dropdown" id="join-left-col-wrapper">
        <button class="dropdown-toggle" aria-expanded="false">
          <span>${leftColName}</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        <div class="dropdown-menu" style="display: none">${leftColItems}</div>
      </div>

      <div class="custom-dropdown" id="join-op-wrapper">
        <button class="dropdown-toggle" aria-expanded="false">
          <span>${cond.op || "="}</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        <div class="dropdown-menu" style="display: none">${opItems}</div>
      </div>

      <div class="custom-dropdown" id="join-right-col-wrapper">
        <button class="dropdown-toggle" aria-expanded="false">
          <span>${rightColName}</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        <div class="dropdown-menu" style="display: none">${rightColItems}</div>
      </div>

      <input type="hidden" id="join-left-col" value="${cond.leftCol || ""}">
      <input type="hidden" id="join-op" value="${cond.op || "="}">
      <input type="hidden" id="join-right-col" value="${cond.rightCol || ""}">
    </div>
  `;
}

function setupJoinConditionDropdowns() {
  DropdownHandler.setup("join-left-col-wrapper", (value) => {
    document.getElementById("join-left-col").value = value;
    updateJoinCondition();
  });

  DropdownHandler.setup("join-op-wrapper", (value) => {
    document.getElementById("join-op").value = value;
    updateJoinCondition();
  });

  DropdownHandler.setup("join-right-col-wrapper", (value) => {
    document.getElementById("join-right-col").value = value;
    updateJoinCondition();
  });
}

function updateJoinCondition() {
  let [li, ri] = getPair();
  const leftColId = document.getElementById("join-left-col")?.value;
  const rightColId = document.getElementById("join-right-col")?.value;
  const op = document.getElementById("join-op")?.value || "=";
  if (leftColId && rightColId) {
    setJoinCondition(0, {
      leftTable: li,
      leftCol: leftColId,
      op,
      rightTable: ri,
      rightCol: rightColId,
    });
    render();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Operation Dropdowns (Join Type & Set Operators)
// ─────────────────────────────────────────────────────────────────────────────

function initOperationDropdowns() {
  const joinTypeMenu = document.getElementById("join-type-menu");
  if (joinTypeMenu) {
    Object.entries(JOIN_OPS)
      .filter(([, v]) => v.group === "join")
      .forEach(([key, cfg]) => {
        const btn = document.createElement("button");
        btn.className = "dropdown-item";
        btn.textContent = cfg.label;
        btn.setAttribute("data-value", key);
        joinTypeMenu.appendChild(btn);
      });

    DropdownHandler.setup("join-type-dropdown-wrapper", (value) => {
      state.currentOp = value;
      updateOperationDisplay();
      render();
    });

    // Ensure dropdown is hidden by default
    joinTypeMenu.style.display = "none";
  }

  const setOpMenu = document.getElementById("set-op-menu");
  if (setOpMenu) {
    Object.entries(JOIN_OPS)
      .filter(([, v]) => v.group === "set")
      .forEach(([key, cfg]) => {
        const btn = document.createElement("button");
        btn.className = "dropdown-item";
        btn.textContent = cfg.label;
        btn.setAttribute("data-value", key);
        setOpMenu.appendChild(btn);
      });

    DropdownHandler.setup("set-op-dropdown-wrapper", (value) => {
      state.currentOp = value;
      updateOperationDisplay();
      render();
    });

    // Ensure dropdown is hidden by default
    setOpMenu.style.display = "none";
  }
}

function updateOperationDisplay() {
  const joinTypeDisplay = document.getElementById("join-type-display");
  const setOpDisplay = document.getElementById("set-op-display");

  // If no operation selected, show placeholders
  if (!state.currentOp) {
    if (joinTypeDisplay) joinTypeDisplay.textContent = "Select a join type...";
    if (setOpDisplay) setOpDisplay.textContent = "Select a set operator...";
    document
      .querySelectorAll("#join-type-menu .dropdown-item, #set-op-menu .dropdown-item")
      .forEach((item) => item.classList.remove("selected"));
    return;
  }

  if (joinTypeDisplay) {
    const currentJoinOp = Object.entries(JOIN_OPS).find(
      ([key, v]) => key === state.currentOp && v.group === "join",
    );
    if (currentJoinOp) {
      joinTypeDisplay.textContent = currentJoinOp[1].label;
      document
        .querySelectorAll("#join-type-menu .dropdown-item")
        .forEach((item) => {
          item.classList.toggle("selected", item.getAttribute("data-value") === state.currentOp);
        });
    }
  }

  if (setOpDisplay) {
    const currentSetOp = Object.entries(JOIN_OPS).find(
      ([key, v]) => key === state.currentOp && v.group === "set",
    );
    if (currentSetOp) {
      setOpDisplay.textContent = currentSetOp[1].label;
      document
        .querySelectorAll("#set-op-menu .dropdown-item")
        .forEach((item) => {
          item.classList.toggle("selected", item.getAttribute("data-value") === state.currentOp);
        });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// How-to Popover
// ─────────────────────────────────────────────────────────────────────────────

function initHowToPopover() {
  const toggle = document.getElementById("how-to-toggle");
  const popover = document.getElementById("how-to-popover");
  const closeBtn = document.getElementById("popover-close");

  if (!toggle || !popover || !closeBtn) return;

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    popover.style.display = popover.style.display === "none" ? "block" : "none";
  });

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    popover.style.display = "none";
  });

  document.addEventListener("click", (e) => {
    if (!toggle.contains(e.target) && !popover.contains(e.target)) {
      popover.style.display = "none";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && popover.style.display !== "none") {
      popover.style.display = "none";
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Dropdown Handlers
// ─────────────────────────────────────────────────────────────────────────────

function reattachPairSelectItemListeners() {
  const wrapper = document.getElementById("join-pair-select-wrapper");
  if (!wrapper) return;

  const items = wrapper.querySelectorAll(".dropdown-item");
  items.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const value = item.getAttribute("data-value");
      const label = item.textContent;

      const displaySpan = wrapper.querySelector(".dropdown-toggle span:first-child");
      displaySpan.textContent = label;

      const menu = wrapper.querySelector(".dropdown-menu");
      const toggle = wrapper.querySelector(".dropdown-toggle");
      toggle.setAttribute("aria-expanded", "false");
      menu.style.display = "none";

      items.forEach((i) => i.classList.remove("selected"));
      item.classList.add("selected");

      state.selectedPair = value;
      updateJoinCondition();
    });
  });
}

function setupSvgColSelectors() {
  state.tables.forEach((t, ti) => {
    const wrapperId = `diagram-col-dropdown-${ti}`;
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    DropdownHandler.setup(wrapperId, (value) => {
      setSvgColumn(ti, value);
      renderConn();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Render Function
// ─────────────────────────────────────────────────────────────────────────────

export function render() {
  rebuildPairSelect();
  reattachPairSelectItemListeners();
  document.getElementById("pair-row").style.display =
    state.tables.length > 2 ? "flex" : "none";

  // Update join condition editor
  const joinCondEditor = document.getElementById("join-cond-container");
  if (joinCondEditor) {
    joinCondEditor.innerHTML = buildJoinConditionEditor();
    setupJoinConditionDropdowns();
  }

  // Update join condition summary
  const condSummary = document.getElementById("join-condition-summary");
  if (condSummary) {
    condSummary.textContent = "Current condition: " + getJoinConditionDisplay();
  }

  const desc = document.getElementById("desc");
  if (desc) {
    desc.textContent = state.currentOp
      ? DESCS[state.currentOp]
      : "Select a type or operator to view its meaning.";
  }
  const rows = computeResult(state.currentOp);
  let [li, ri] = getPair();
  if (state.currentOp === "self") ri = li;
  const { m1, m2 } = getMatchedIdx(rows);
  renderTables(m1, m2, li, ri);
  setupSvgColSelectors();
  renderConn();
  renderResult();
  renderSqlPanel();
  updateOperationDisplay();
}

// ─────────────────────────────────────────────────────────────────────────────
// Global App API
// ─────────────────────────────────────────────────────────────────────────────

window.app = {
  render,
  showColModal: (ti) => colModal.show(ti),
  setSvgCol: (ti, colId) => {
    setSvgColumn(ti, colId);
    renderConn();
  },
  addTableAndRender: () => {
    if (addTable()) render();
  },
  removeTableAndRender: (ti) => {
    if (removeTable(ti)) render();
  },
  addRowAndFocus: (ti) => {
    addRow(ti);
    render();
    setTimeout(() => {
      const b = document.getElementById("tb-body-" + ti);
      if (b) {
        const ins = b.querySelectorAll("input");
        if (ins.length) ins[ins.length - 1].focus();
      }
    }, 50);
  },
  delRowAndRender: (ti, ri) => {
    delRow(ti, ri);
    render();
  },
  updateValAndRefresh: (ti, ri, colId, val) => {
    updateVal(ti, ri, colId, val);
    renderConn();
    renderResult();
  },
  removeColAndRender: (ti, colId) => {
    if (removeColumn(ti, colId)) render();
  },
  updateJoinCondition,
  loadPresetAndRender: (presetName) => {
    if (PRESET_DATASETS[presetName]) {
      loadPreset(PRESET_DATASETS[presetName]);
      state.currentOp = "inner";
      render();
    }
  },
  resetAllAndRender: () => {
    state.tables = JSON.parse(JSON.stringify(INITIAL_STATE.tables));
    state.currentOp = null;
    state.joinConditions = [];
    // Reset all dropdowns to placeholder text
    DropdownHandler.resetAll();
    render();
  },
};

// Make copySql function available globally for HTML onclick handler
window.copySqlButtonClicked = () => {
  const sql = generateSql();
  copySqlToClipboard(sql);
};

// ─────────────────────────────────────────────────────────────────────────────
// Initialize Pair-Select Toggle Button (once)
// ─────────────────────────────────────────────────────────────────────────────

function initPairSelectToggle() {
  const wrapper = document.getElementById("join-pair-select-wrapper");
  if (!wrapper) return;

  const toggle = wrapper.querySelector(".dropdown-toggle");
  const menu = wrapper.querySelector(".dropdown-menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", !isOpen);
    menu.style.display = !isOpen ? "block" : "none";
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      toggle.setAttribute("aria-expanded", "false");
      menu.style.display = "none";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      toggle.setAttribute("aria-expanded", "false");
      menu.style.display = "none";
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal Data Type Dropdown
// ─────────────────────────────────────────────────────────────────────────────

function initModalTypeDropdown() {
  const dropdown = document.getElementById("col-modal-type-dropdown");
  if (!dropdown) return;

  const toggle = document.getElementById("col-modal-type-toggle");
  const menu = document.getElementById("col-modal-type-menu");
  const display = document.getElementById("col-modal-type-display");
  const valueInput = document.getElementById("col-modal-type-value");
  const items = menu.querySelectorAll(".dropdown-item");

  // Toggle dropdown on button click
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === "none" ? "block" : "none";
  });

  // Handle item selection
  items.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const value = item.getAttribute("data-value");
      const text = item.textContent;

      valueInput.value = value;
      display.textContent = text;
      menu.style.display = "none";

      items.forEach((i) => i.classList.remove("selected"));
      item.classList.add("selected");
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      menu.style.display = "none";
    }
  });

  // Close dropdown on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.style.display !== "none") {
      menu.style.display = "none";
    }
  });

  // Set initial selected state
  items.forEach((item) => {
    if (item.getAttribute("data-value") === valueInput.value) {
      item.classList.add("selected");
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Preset Dropdown
// ─────────────────────────────────────────────────────────────────────────────

function initPresetDropdown() {
  DropdownHandler.setup("preset-dropdown-wrapper", (value) => {
    window.app.loadPresetAndRender(value);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────────────────────────────────────

initBanner();
initHowToPopover();
initOperationDropdowns();
initPresetDropdown();
initPairSelectToggle();
initModalTypeDropdown();
render();
