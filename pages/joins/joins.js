/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SQL Joins Visualizer — Main Page
 * ═══════════════════════════════════════════════════════════════════════════════
 * Orchestrates join visualization with interactive tables and live result preview.
 * 
 * Sections:
 * - Imports: External modules and utilities
 * - Constants: Join operators list
 * - Join Condition: Build & manage ON clause
 * - Operation Dropdowns: Join type & set operator selection
 * - UI Components: Popovers, table selectors
 * - Main Render: Core render pipeline
 * - Exports: Public API
 * - Initialization: Page startup
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════
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
  validRows,
  addTable,
  removeTable,
  addRow,
  delRow,
  updateVal,
  renameTable,
  renameColumn,
  addColumn,
  removeColumn,
  setSvgColumn,
  setJoinCondition,
  loadPreset,
  getJoinConditionDisplay,
  getPair,
  addJoinCondition,
  removeJoinCondition,
  updateJoinCondition,
  validateName,
} from "../../js/core/utils.js";
import { LIMITS, LIMIT_MESSAGES } from "../../js/core/limits.js";
import { computeResult, validateSetOperatorCompatibility } from "../../js/engines/joinEngine.js";
import { ModalHandler } from "../../js/components/modal-handler.js";
import { DropdownHandler } from "../../js/components/dropdown-handler.js";
import { renderTables, renderConn, renderResult, renderDiagramColSelectors } from "./joins-ui.js";
import {
  renderSqlPanel,
  copySqlToClipboard,
  generateSql,
} from "./sql-generator.js";
import { initBanner } from "../../global/banner.js";
import { initKeyboardShortcuts } from "./keyboard-shortcuts.js";
import {
  parseUrlParams,
  generateShareUrl,
  copyShareLink,
  showToast,
  updateShareButtonVisibility,
  copyShareLinkWithToast,
  stopBellAnimation,
  makeEditableCopy,
} from "../../js/core/url-state.js";

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER CACHE — Prevents unnecessary DOM rebuilds
// ═══════════════════════════════════════════════════════════════════════════════
const renderCache = {
  lastOp: null,
  lastPair: null,
  lastTablesCount: 0,
  lastConditions: null,
  lastValidation: null,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Column modal handler for adding new columns
const colModal = ModalHandler.setup(
  "col-modal",
  ({ dataValue, name, type }) => {
    try {
      // Validate table index
      const ti = parseInt(dataValue);
      if (!Number.isInteger(ti) || ti < 0 || ti >= state.tables.length) {
        showToast("❌ Invalid table selection", "error");
        return;
      }

      // Validate column name
      const validation = validateName(name);
      if (!validation.valid) {
        showToast(validation.error, "error");
        return;
      }

      // Validate column type
      if (!type || !DATA_TYPES[type]) {
        showToast("❌ Invalid data type", "error");
        return;
      }

      // Add column with error handling
      const result = addColumn(ti, validation.value, type);
      if (!result) {
        showToast("❌ Failed to add column", "error");
        return;
      }

      showToast("Column added");
      render();
    } catch (err) {
      console.error("Error adding column:", err);
      showToast("❌ Failed to add column", "error");
    }
  },
);

// Join condition operators available in the ON clause dropdown
const JOIN_OPS_LIST = [
  { value: "=", label: "=" },
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: ">=", label: ">=" },
  { value: "<=", label: "<=" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// JOIN CONDITION — Build & manage the ON clause
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds the HTML for the join condition editor (ON clause).
 * Supports multiple conditions with AND logic.
 * @returns {string} HTML string for the join condition editor
 */
function buildJoinConditionEditor() {
  const [li, ri] = getPair();
  if (li === undefined || ri === undefined) return "";

  // For SELF JOIN, both left and right use the same table
  const rightTableIdx = state.currentOp === "self" ? li : ri;

  const leftTable = state.tables[li];
  const rightTable = state.tables[rightTableIdx];
  if (!leftTable || !rightTable) return "";

  const getColName = (table, colId) =>
    table.columns.find((c) => c.id === colId)?.name || "Select column";

  const buildColItems = (cols) =>
    cols
      .map(
        (c) =>
          `<button class="dropdown-item" data-value="${c.id}">${c.name}</button>`,
      )
      .join("");

  const leftColItems = buildColItems(leftTable.columns);
  const rightColItems = buildColItems(rightTable.columns);
  const opItems = JOIN_OPS_LIST.map(
    (item) =>
      `<button class="dropdown-item" data-value="${item.value}">${item.label}</button>`,
  ).join("");

  const isSelfJoin = state.currentOp === "self";
  const tableName = isSelfJoin ? `${leftTable.name} (T1)` : leftTable.name;
  const aliasName = isSelfJoin ? `${leftTable.name} (T2)` : rightTable.name;

  // Build multiple condition rows with validation status
  const conditionRows = state.joinConditions.map((cond, idx) => {
    const leftColName = getColName(leftTable, cond.leftCol);
    const rightColName = getColName(rightTable, cond.rightCol);
    const isFirst = idx === 0;
    const canRemove = state.joinConditions.length > 1;

    // Check if condition is complete (both columns selected)
    const isComplete = !!(cond.leftCol && cond.rightCol);
    const statusClass = isComplete ? "complete" : "incomplete";
    const statusIcon = isComplete ? "✓" : "⚠";

    return `
      <div class="join-condition-row ${statusClass}" data-cond-index="${idx}">
        <span class="join-cond-label">${isFirst ? "ON" : "AND"}</span>
        ${isSelfJoin ? `<span class="self-join-hint">${tableName}</span>` : ""}

        <div class="custom-dropdown join-condition-dropdown" id="join-left-col-wrapper-${idx}">
          <button class="dropdown-toggle" aria-expanded="false">
            <span>${leftColName}</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="dropdown-menu" style="display: none">${leftColItems}</div>
        </div>

        <div class="custom-dropdown join-condition-dropdown" id="join-op-wrapper-${idx}">
          <button class="dropdown-toggle" aria-expanded="false">
            <span>${cond.op || "="}</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="dropdown-menu" style="display: none">${opItems}</div>
        </div>

        <div class="custom-dropdown join-condition-dropdown" id="join-right-col-wrapper-${idx}">
          <button class="dropdown-toggle" aria-expanded="false">
            <span>${rightColName}</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="dropdown-menu" style="display: none">${rightColItems}</div>
        </div>
        ${isSelfJoin ? `<span class="self-join-hint">${aliasName}</span>` : ""}

        <span class="condition-status ${statusClass}" title="${isComplete ? "Complete" : "Incomplete - select both columns"}">${statusIcon}</span>

        ${canRemove ? `<button class="remove-condition-btn" title="Remove this condition" aria-label="Remove condition ${idx + 1}">×</button>` : ""}

        <input type="hidden" id="join-left-col-${idx}" value="${cond.leftCol || ""}">
        <input type="hidden" id="join-op-${idx}" value="${cond.op || "="}">
        <input type="hidden" id="join-right-col-${idx}" value="${cond.rightCol || ""}">
      </div>
    `;
  }).join("");

  // Check if last condition is complete to enable/disable add button
  const lastCond = state.joinConditions[state.joinConditions.length - 1];
  const lastCondComplete = lastCond && lastCond.leftCol && lastCond.rightCol;
  const addBtnDisabled = !lastCondComplete ? 'disabled' : '';
  const addBtnTitle = lastCondComplete
    ? "Add another condition with AND logic"
    : "Complete the current condition first";

  return `
    <div class="join-condition-editor">
      ${conditionRows}
      <button class="add-condition-btn" id="add-condition-btn" title="${addBtnTitle}" ${addBtnDisabled}>+ AND condition</button>
    </div>
  `;
}

/**
 * Sets up dropdown handlers for all join condition rows.
 * Handles multiple conditions with proper indexing.
 */
function setupJoinConditionDropdowns() {

  // Setup dropdowns for each condition row
  state.joinConditions.forEach((_, idx) => {
    DropdownHandler.setup(`join-left-col-wrapper-${idx}`, (value) => {
      document.getElementById(`join-left-col-${idx}`).value = value;
      updateJoinConditionAt(idx);
    });

    DropdownHandler.setup(`join-op-wrapper-${idx}`, (value) => {
      document.getElementById(`join-op-${idx}`).value = value;
      updateJoinConditionAt(idx);
    });

    DropdownHandler.setup(`join-right-col-wrapper-${idx}`, (value) => {
      document.getElementById(`join-right-col-${idx}`).value = value;
      updateJoinConditionAt(idx);
    });
  });

  // Setup add condition button with validation
  const addBtn = document.getElementById("add-condition-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      // Check if last condition is complete
      const lastCond = state.joinConditions[state.joinConditions.length - 1];
      if (lastCond && (!lastCond.leftCol || !lastCond.rightCol)) {
        const lTable = state.tables[lastCond.leftTable]?.name || "Table";
        const rTable = state.tables[lastCond.rightTable]?.name || "Table";
        const lColName = state.tables[lastCond.leftTable]?.columns.find(c => c.id === lastCond.leftCol)?.name || "?";
        const rColName = state.tables[lastCond.rightTable]?.columns.find(c => c.id === lastCond.rightCol)?.name || "?";
        const incomplete = !lastCond.leftCol ? `${lTable} column` : `${rTable} column`;
        showToast(`⚠️ Join condition incomplete\nCurrent: ${lTable}.${lColName} = ${rTable}.${rColName}\n\nComplete the ${incomplete} selection, or delete this condition first.`, "error");
        return;
      }
      addJoinCondition();
      render();
    });
  }

  // Setup remove condition buttons - get index from data attribute, not forEach
  document.querySelectorAll(".remove-condition-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      try {
        const condRow = btn.closest(".join-condition-row");
        if (!condRow) {
          console.error("Could not find join-condition-row element");
          return;
        }
        const idx = parseInt(condRow.getAttribute("data-cond-index"));
        if (!Number.isInteger(idx) || idx < 0) {
          console.error("Invalid condition index:", idx);
          return;
        }
        removeJoinCondition(idx);
        render();
      } catch (err) {
        console.error("Error removing join condition:", err);
        showToast("❌ Failed to remove condition", "error");
      }
    });
  });
}

/**
 * Updates a specific join condition by index.
 * Only updates column selections, preserves original table pair.
 * @param {number} idx - Index of the condition to update
 */
function updateJoinConditionAt(idx) {
  const leftColId = document.getElementById(`join-left-col-${idx}`)?.value;
  const rightColId = document.getElementById(`join-right-col-${idx}`)?.value;
  const op = document.getElementById(`join-op-${idx}`)?.value || "=";

  if (leftColId && rightColId) {
    // Only update column selections, don't change table indices
    updateJoinCondition(idx, {
      leftCol: leftColId,
      op,
      rightCol: rightColId,
    });
  } else {
    // Show error if user partially filled the condition
    if ((leftColId || rightColId) && !(leftColId && rightColId)) {
      showToast("⚠️ Select both columns to set a join condition", "error");
    }
    // Clear condition if either column is cleared
    if (!leftColId && !rightColId) {
      updateJoinCondition(idx, null);
    }
  }
  render();
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATION DROPDOWNS — Join type & Set operator selection
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Populates a dropdown menu with items from JOIN_OPS filtered by group.
 * @param {string} menuId - The ID of the menu element
 * @param {string} group - Filter group: 'join' or 'set'
 */
function populateDropdownMenu(menuId, group) {
  const menu = document.getElementById(menuId);
  if (!menu) return;

  Object.entries(JOIN_OPS)
    .filter(([, v]) => v.group === group)
    .forEach(([key, cfg]) => {
      const btn = document.createElement("button");
      btn.className = "dropdown-item";
      btn.textContent = cfg.label;
      btn.setAttribute("data-value", key);
      menu.appendChild(btn);
    });

  menu.style.display = "none";
}

/**
 * Initializes the join type and set operator dropdowns.
 * Populates menus and sets up selection handlers.
 */
function initOperationDropdowns() {
  populateDropdownMenu("join-type-menu", "join");
  DropdownHandler.setup("join-type-dropdown-wrapper", (value) => {
    state.currentOp = value;
    if (value === "self") {
      // Use the left table from the current pair for self-join
      const [leftIdx] = (state.selectedPair || "0-0").split("-").map(Number);
      state.selectedPair = `${leftIdx}-${leftIdx}`;
    } else if (value === "cross") {
      // Clear join conditions for CROSS JOIN (Cartesian product, no ON clause needed)
      state.joinConditions = [];
    } else if (state.selectedPair && state.selectedPair.split("-")[0] === state.selectedPair.split("-")[1]) {
      // Reset pair from self-join to regular join if switching away from SELF JOIN
      // But only if 0-1 is valid (both tables exist)
      if (state.tables.length >= 2) {
        state.selectedPair = "0-1";
      } else if (state.tables.length === 1) {
        state.selectedPair = "0-0";  // Only one table, stay on it
      }
    }
    // Re-seed a blank condition when switching to a join that needs an ON clause
    if (value !== "cross" && state.joinConditions.length === 0) {
      addJoinCondition();
    }
    updateOperationDisplay();
    updateSelfJoinTip();
    render();
  });

  populateDropdownMenu("set-op-menu", "set");
  DropdownHandler.setup("set-op-dropdown-wrapper", (value) => {
    state.currentOp = value;
    if (["union", "union_all", "except", "intersect"].includes(value)) {
      state.joinConditions = [];
      const isWarehouse = state.tables[0]?.name === "warehouse_a" && state.tables[1]?.name === "warehouse_b";
      if (!isWarehouse) {
        showToast("ℹ️ Switched to Warehouse Products — best dataset for set operators", "success", 3000);
        window.ysqlvizApp.joins.loadPresetAndRender("warehouse_products", true);
        return;
      }
    }
    updateOperationDisplay();
    updateSelfJoinTip();
    render();
  });
}

/**
 * Updates the display text and selected state for operation dropdowns.
 * Called when user selects an operation or when state changes.
 */
function updateOperationDisplay() {
  const joinTypeDisplay = document.getElementById("join-type-display");
  const setOpDisplay = document.getElementById("set-op-display");

  if (!state.currentOp) {
    if (joinTypeDisplay) joinTypeDisplay.textContent = "Select a join type...";
    if (setOpDisplay) setOpDisplay.textContent = "Select a set operator...";
    document
      .querySelectorAll(
        "#join-type-menu .dropdown-item, #set-op-menu .dropdown-item",
      )
      .forEach((item) => item.classList.remove("selected"));
    return;
  }

  const currentOpConfig = JOIN_OPS[state.currentOp];
  if (!currentOpConfig) return;

  if (currentOpConfig.group === "join" && joinTypeDisplay) {
    joinTypeDisplay.textContent = currentOpConfig.label;
    document
      .querySelectorAll("#join-type-menu .dropdown-item")
      .forEach((item) => {
        item.classList.toggle(
          "selected",
          item.getAttribute("data-value") === state.currentOp,
        );
      });
    // Reset set operator display when switching to join type
    if (setOpDisplay) setOpDisplay.textContent = "Select a set operator...";
    document.querySelectorAll("#set-op-menu .dropdown-item")
      .forEach((item) => item.classList.remove("selected"));
  }

  if (currentOpConfig.group === "set" && setOpDisplay) {
    setOpDisplay.textContent = currentOpConfig.label;
    document.querySelectorAll("#set-op-menu .dropdown-item").forEach((item) => {
      item.classList.toggle(
        "selected",
        item.getAttribute("data-value") === state.currentOp,
      );
    });
    // Reset join type display when switching to set operator
    if (joinTypeDisplay) joinTypeDisplay.textContent = "Select a join type...";
    document.querySelectorAll("#join-type-menu .dropdown-item")
      .forEach((item) => item.classList.remove("selected"));
  }
}

/**
 * Shows/hides contextual tips for special join types (SELF, ANTI, SEMI, EXISTS).
 * Each join type has specific guidance shown below the join condition panel.
 */
function updateSpecialJoinTips() {
  const selfTip = document.getElementById("self-join-tip");
  const antiTip = document.getElementById("anti-join-tip");
  const semiTip = document.getElementById("semi-join-tip");
  
  // Hide all tips first
  [selfTip, antiTip, semiTip].forEach(tip => {
    if (tip) tip.style.display = "none";
  });

  // Show appropriate tip based on current operation
  if (state.currentOp === "self" && selfTip) {
    selfTip.style.display = "block";
  } else if ((state.currentOp === "left_anti" || state.currentOp === "right_anti") && antiTip) {
    antiTip.style.display = "block";
  } else if ((state.currentOp === "left_semi" || state.currentOp === "right_semi" || state.currentOp === "exists" || state.currentOp === "not_exists") && semiTip) {
    semiTip.style.display = "block";
  }
}

// Keep old function name for backwards compatibility
const updateSelfJoinTip = updateSpecialJoinTips;

/**
 * Shows/hides the shared view banner and disables edit controls when in read-only mode.
 * Also hides the "Before You Start" banner in shared view mode.
 * Called during render when isSharedView state changes.
 */
function updateSharedViewBanner() {
  let banner = document.getElementById("shared-view-banner");
  const beforeStartBanner = document.getElementById("before-start-banner");

  if (state.isSharedView) {
    // Hide "Before You Start" banner in shared view
    if (beforeStartBanner) {
      beforeStartBanner.style.display = "none";
    }
    // Create banner if it doesn't exist
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "shared-view-banner";
      const heading = document.querySelector(".heading-wrapper");
      if (heading) {
        heading.parentNode.insertBefore(banner, heading.nextSibling);
      }
    }

    banner.innerHTML = `
      <div>
        <div class="banner-title">
          <i class="fa-solid fa-lock"></i>
          <strong>📖 Viewing a Shared Example</strong>
        </div>
        <p class="banner-text">
          This data is read-only. Make a copy below to edit and explore on your own.
        </p>
      </div>
      <button class="copy-btn" data-action="make-editable-copy">Make a Copy to Edit</button>
    `;
    banner.style.display = "flex";

    // Disable edit controls
    disableEditControls();
  } else {
    // Hide shared view banner
    if (banner) {
      banner.style.display = "none";
    }
    // Show "Before You Start" banner in edit mode
    if (beforeStartBanner) {
      beforeStartBanner.style.display = "block";
    }
    // Enable edit controls
    enableEditControls();
  }
}

/**
 * Disables all editing UI elements when in shared view mode.
 */
function disableEditControls() {
  const selectors = [
    ".add-row-btn",
    ".add-col-btn",
    ".del-btn",
    ".add-tbl-btn",
    ".col-remove-btn",
    ".table-name[contenteditable]",
    ".col-input",
    ".id-input",
  ];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (selector.includes("[contenteditable]")) {
        el.contentEditable = "false";
        el.style.opacity = "0.6";
        el.style.cursor = "not-allowed";
      } else if (el.classList.contains("col-input") || el.classList.contains("id-input")) {
        el.disabled = true;
        el.style.opacity = "0.6";
        el.style.cursor = "not-allowed";
      } else {
        el.disabled = true;
        el.style.opacity = "0.6";
        el.style.pointerEvents = "none";
      }
    });
  });

  // Disable column modal buttons
  document.querySelectorAll(".show-col-modal").forEach((btn) => {
    btn.disabled = true;
    btn.style.opacity = "0.6";
    btn.style.pointerEvents = "none";
  });

  // Disable all dropdowns
  const dropdownToggles = [
    "#join-type-toggle",
    "#set-op-toggle",
    "#pair-select-toggle",
    "#preset-toggle",
    ".diagram-col-dropdown .dropdown-toggle",
    ".join-condition-dropdown .dropdown-toggle",
  ];

  dropdownToggles.forEach((selector) => {
    document.querySelectorAll(selector).forEach((btn) => {
      btn.disabled = true;
      btn.style.opacity = "0.6";
      btn.style.pointerEvents = "none";
      btn.style.cursor = "not-allowed";
    });
  });

  // Disable join condition action buttons
  document.querySelectorAll(".add-condition-btn, .remove-condition-btn").forEach((btn) => {
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.pointerEvents = "none";
    btn.style.cursor = "not-allowed";
  });

  // Disable reset button
  const resetBtn = document.querySelector(".reset-btn");
  if (resetBtn) {
    resetBtn.disabled = true;
    resetBtn.dataset.sharedViewOpacity = resetBtn.style.opacity || "";
    resetBtn.dataset.sharedViewPointerEvents = resetBtn.style.pointerEvents || "";
    resetBtn.style.opacity = "0.6";
    resetBtn.style.pointerEvents = "none";
  }

  // Disable SQL copy button
  const sqlCopyBtn = document.getElementById("sql-copy-btn");
  if (sqlCopyBtn) {
    sqlCopyBtn.disabled = true;
    sqlCopyBtn.style.opacity = "0.6";
    sqlCopyBtn.style.pointerEvents = "none";
  }

  // Disable share button (already handled by updateShareButtonVisibility, but ensure it's disabled)
  const shareBtn = document.getElementById("share-btn");
  if (shareBtn) {
    shareBtn.disabled = true;
  }

  // Dim the description text
  const desc = document.getElementById("desc");
  if (desc) {
    desc.style.opacity = "0.5";
  }

  // Prevent column name editing in table headers
  document.querySelectorAll(".col-header-name").forEach((el) => {
    el.contentEditable = "false";
    el.style.opacity = "0.6";
    el.style.cursor = "not-allowed";
  });
}

/**
 * Enables all editing UI elements when exiting shared view mode.
 */
function enableEditControls() {
  const selectors = [
    ".add-row-btn",
    ".add-col-btn",
    ".del-btn",
    ".add-tbl-btn",
    ".col-remove-btn",
    ".table-name[contenteditable]",
    ".col-input",
    ".id-input",
  ];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (selector.includes("[contenteditable]")) {
        el.contentEditable = "true";
        el.removeAttribute("style");
      } else if (el.classList.contains("col-input") || el.classList.contains("id-input")) {
        el.disabled = false;
        el.removeAttribute("style");
      } else {
        el.disabled = false;
        el.removeAttribute("style");
      }
    });
  });

  // Enable column modal buttons
  document.querySelectorAll(".show-col-modal").forEach((btn) => {
    btn.disabled = false;
    btn.removeAttribute("style");
  });

  // Enable all dropdowns
  const dropdownToggles = [
    "#join-type-toggle",
    "#set-op-toggle",
    "#pair-select-toggle",
    "#preset-toggle",
    ".diagram-col-dropdown .dropdown-toggle",
    ".join-condition-dropdown .dropdown-toggle",
  ];

  dropdownToggles.forEach((selector) => {
    document.querySelectorAll(selector).forEach((btn) => {
      btn.disabled = false;
      btn.removeAttribute("style");
    });
  });

  // Enable join condition action buttons
  document.querySelectorAll(".add-condition-btn, .remove-condition-btn").forEach((btn) => {
    btn.disabled = false;
    btn.removeAttribute("style");
  });

  // Enable reset button
  const resetBtn = document.querySelector(".reset-btn");
  if (resetBtn) {
    resetBtn.disabled = false;
    resetBtn.style.opacity = resetBtn.dataset.sharedViewOpacity || "";
    resetBtn.style.pointerEvents = resetBtn.dataset.sharedViewPointerEvents || "";
    if (!resetBtn.dataset.sharedViewOpacity) resetBtn.style.removeProperty("opacity");
    if (!resetBtn.dataset.sharedViewPointerEvents) resetBtn.style.removeProperty("pointer-events");
  }

  // Enable SQL copy button
  const sqlCopyBtn = document.getElementById("sql-copy-btn");
  if (sqlCopyBtn) {
    sqlCopyBtn.disabled = false;
    sqlCopyBtn.removeAttribute("style");
  }

  // Re-enable share button (will be properly set by updateShareButtonVisibility)
  const shareBtn = document.getElementById("share-btn");
  if (shareBtn) {
    shareBtn.disabled = false;
  }

  // Restore description text opacity
  const desc = document.getElementById("desc");
  if (desc) {
    desc.removeAttribute("style");
  }

  // Enable column name editing in table headers
  document.querySelectorAll(".col-header-name").forEach((el) => {
    el.contentEditable = "true";
    el.removeAttribute("style");
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS — Popovers, table selectors, SVG columns
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initializes the "How To" popover with toggle, close, and keyboard handlers.
 */
function initHowToPopover() {
  const toggle = document.getElementById("how-to-toggle");
  const popover = document.getElementById("how-to-popover");
  if (!toggle || !popover) return;

  const closeBtn = document.getElementById("popover-close");
  closeBtn?.addEventListener("click", () => (popover.style.display = "none"));

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    popover.style.display = popover.style.display === "none" ? "block" : "none";
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RENDER PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sets up SVG diagram column dropdowns for each table.
 * Allows users to select which column to display in the diagram.
 * Disables dropdowns for set operators (since diagram is not used for them).
 */
function setupSvgColSelectors() {
  const isSetOperator = state.currentOp && ["union", "union_all", "except", "intersect"].includes(state.currentOp);

  state.tables.forEach((t, ti) => {
    const wrapperId = `diagram-col-dropdown-${ti}`;
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    if (isSetOperator) {
      // Disable diagram column selector for set operators
      const toggle = wrapper.querySelector(".dropdown-toggle");
      if (toggle) {
        toggle.disabled = true;
        toggle.style.opacity = "0.5";
        toggle.style.cursor = "not-allowed";
        toggle.style.pointerEvents = "none";
      }
    } else {
      // Enable for joins
      const toggle = wrapper.querySelector(".dropdown-toggle");
      if (toggle) {
        toggle.disabled = false;
        toggle.removeAttribute("style");
      }
      DropdownHandler.setup(wrapperId, (value) => {
        setSvgColumn(ti, value);
        renderConn();
      });
    }
  });
}

/**
 * Main render function — orchestrates the entire UI update.
 * Called after any state change to reflect current state in the UI.
 * Renders: pair selector, join condition, description, tables, diagram, results, SQL
 * Wrapped with error handling to keep app stable even if rendering fails.
 */
let _pairSelectReady = false;
let _pairSelectCb = null;

export function render() {
  try {
    rebuildPairSelect();
  
  // Setup pair selector dropdown once (DropdownHandler handles cleanup if re-registered)
  if (!_pairSelectReady) {
    _pairSelectReady = true;
    _pairSelectCb = (value) => {
      const [li, ri] = value.split("-").map(Number);
      if (li >= 0 && li < state.tables.length && ri >= 0 && ri < state.tables.length) {
        if (state.selectedPair !== value) {
          state.joinConditions = [];
          addJoinCondition();
        }
        state.selectedPair = value;
        render();
      } else {
        const tableCount = state.tables.length;
        if (tableCount < 2) {
          showToast(`⚠️ Can't pair tables - only ${tableCount} table exists.\n\nAdd another table using "+ add table", or use Self-Join (join a table to itself).`, "error");
        } else {
          showToast(`⚠️ Invalid pair: ${li}-${ri}. Valid tables: 0-${tableCount - 1}.\n\nSelect two different tables, or use Self-Join.`, "error");
        }
      }
    };
    DropdownHandler.setup("join-pair-select-wrapper", _pairSelectCb);
  }
  
  const isSelfJoin = state.currentOp === "self";

  // For self join: show only when there are 2+ tables (need a choice)
  // For regular joins: show when there are 3+ tables (2-table joins don't need a selector)
  const showPairRow = isSelfJoin ? state.tables.length >= 2 : state.tables.length > 2;
  document.getElementById("pair-row").style.display = showPairRow ? "flex" : "none";

  // Swap label and hint text for self join
  const pairLabel = document.getElementById("pair-selector-label");
  const pairHint = document.getElementById("pair-selector-hint");
  const pairToggle = document.getElementById("pair-select-toggle");
  if (pairLabel) pairLabel.textContent = isSelfJoin ? "Self-join table:" : "Which tables to join:";
  if (pairHint) pairHint.style.display = isSelfJoin ? "none" : "block";
  if (pairToggle) pairToggle.title = isSelfJoin
    ? "Select which table to join with itself"
    : "Select which two tables to join. Arrow shows left table → right table.";

  // Show/hide SELF JOIN tip
  updateSelfJoinTip();

  // Only show join condition panel for join operations (hide when no operation selected or set operators)
  const joinCondPanel = document.querySelector(".join-condition-panel");
  const isSetOperator = state.currentOp && JOIN_OPS[state.currentOp]?.group === "set";

  // Show diagram section for joins (placeholder when no data, actual diagram when data exists)
  // Hide for set operators. For FULL OUTER, hide header but keep SVG visible (shows message)
  const isFullOuter = state.currentOp === "full";
  const diagramHeader = document.querySelector(".diagram-section-header");
  const diagramScrollWrapper = document.querySelector(".diagram-scroll-wrapper");
  if (diagramHeader) diagramHeader.style.display = (isSetOperator || isFullOuter) ? "none" : "";
  if (diagramScrollWrapper) diagramScrollWrapper.style.display = isSetOperator ? "none" : "";

  if (joinCondPanel) {
    joinCondPanel.style.display = (isSetOperator || !state.currentOp) ? "none" : "block";
  }

  // Validate SET OPERATORS compatibility (cache result to avoid repeated validation on every render)
  if (isSetOperator) {
    const [li, ri] = getPair();
    const validationKey = `${state.currentOp}-${li}-${ri}-${state.tables.length}`;
    if (renderCache.lastValidation !== validationKey) {
      renderCache.lastValidation = validationKey;
      const validation = validateSetOperatorCompatibility(li, ri);
      if (!validation.valid) {
        showToast(`⚠️ ${validation.error}`, "error", 4000);
      }
    }
  } else {
    renderCache.lastValidation = null;
  }

  const joinCondEditor = document.getElementById("join-cond-container");
  const isCrossJoin = state.currentOp === "cross";

  if (joinCondEditor) {
    // Only rebuild if join condition state has actually changed
    const [li, ri] = getPair();
    const currentPair = `${li}-${ri}`;
    // Check ALL conditions, not just the first one
    let currentConds;
    try {
      currentConds = JSON.parse(JSON.stringify(state.joinConditions));
    } catch (err) {
      console.error("Error cloning conditions:", err);
      currentConds = []; // Fallback to empty array
    }
    const needsRebuild =
      renderCache.lastOp !== state.currentOp ||
      renderCache.lastPair !== currentPair ||
      renderCache.lastTablesCount !== state.tables.length ||
      JSON.stringify(renderCache.lastConditions) !== JSON.stringify(currentConds);

    if (needsRebuild) {
      renderCache.lastOp = state.currentOp;
      renderCache.lastPair = currentPair;
      renderCache.lastTablesCount = state.tables.length;
      renderCache.lastConditions = currentConds;

      if (!isSetOperator) {
        if (isCrossJoin) {
          // Show note for CROSS JOIN (no ON condition needed)
          joinCondEditor.innerHTML = `<div class="cross-join-note">
            <strong>⚠️ CROSS JOIN:</strong> Produces a Cartesian product and does not require an ON condition.
          </div>`;
        } else {
          const editorHTML = buildJoinConditionEditor();
          joinCondEditor.innerHTML = editorHTML;
          setupJoinConditionDropdowns();
        }
      } else {
        // For set operators, clear the editor
        joinCondEditor.innerHTML = "";
      }
    }
  }

  const condSummary = document.getElementById("join-condition-summary");
  if (condSummary) {
    if (isCrossJoin) {
      condSummary.textContent = "Current condition: Not applicable (Cartesian product)";
    } else {
      condSummary.textContent = "Current condition: " + getJoinConditionDisplay();
    }
  }

  const desc = document.getElementById("desc");
  if (desc) {
    const descText = state.currentOp
      ? DESCS[state.currentOp]
      : "Select a type or operator to view its meaning.";

    // Check if using warehouse_products dataset (for special note)
    const isWarehouseDataset = state.tables[0]?.name === "warehouse_a" && state.tables[1]?.name === "warehouse_b";
    const isJoin = state.currentOp && ["inner", "left", "right", "full", "cross", "left_anti", "right_anti", "left_semi", "right_semi", "self"].includes(state.currentOp);

    if (isWarehouseDataset && isJoin) {
      desc.innerHTML = `${descText}<div style="margin-top: 8px; padding: 8px 12px; background: rgba(158, 255, 0, 0.08); border-left: 2px solid var(--color-primary); border-radius: 4px; font-size: 12px; color: var(--color-text-muted); line-height: 1.4;">
        <strong style="color: var(--color-primary);">💡 Note:</strong> This dataset is optimized for SET operators (UNION, EXCEPT, INTERSECT). Joins will match rows with same product_id, but this may not be the intended use case.
      </div>`;
    } else {
      desc.textContent = descText;
    }
  }

  const rows = computeResult(state.currentOp);
  let [li, ri] = getPair();
  if (state.currentOp === "self") ri = li;

  // For UNION/UNION ALL: highlight ALL valid rows on both sides, including duplicates,
  // so users can see which right-side rows were deduplicated out of the result.
  // For all other ops: derive highlighted rows from the result set itself.
  let m1, m2;
  if (state.currentOp === "union" || state.currentOp === "union_all") {
    m1 = new Set(validRows(li).map(x => x.i));
    m2 = new Set(validRows(ri).map(x => x.i));
  } else {
    ({ m1, m2 } = getMatchedIdx(rows, li, ri));
  }
  // Wrap individual render calls with error handling to isolate failures
  try {
    renderTables(m1, m2, li, ri);
  } catch (err) {
    console.error("Error rendering tables:", err);
    showToast("⚠️ Error rendering tables. Please refresh.", "error");
  }

  try {
    // Only render diagram column selectors for join operations (not set operators)
    if (!isSetOperator) {
      renderDiagramColSelectors();
      setupSvgColSelectors();
    }
  } catch (err) {
    console.error("Error rendering diagram:", err);
    showToast("⚠️ Error rendering diagram. Please refresh.", "error");
  }

  try {
    renderConn();
  } catch (err) {
    console.error("Error rendering connections:", err);
  }

  // Show CROSS JOIN warning if results > 10
  const crossJoinWarning = document.getElementById("cross-join-warning");
  const crossJoinCount = document.getElementById("cross-join-count");
  if (crossJoinWarning && crossJoinCount) {
    if (state.currentOp === "cross") {
      if (rows.length > 10) {
        crossJoinCount.textContent = rows.length;
        crossJoinWarning.style.display = "flex";
      } else {
        crossJoinWarning.style.display = "none";
      }
    } else {
      crossJoinWarning.style.display = "none";
    }
  }

  try {
    renderResult();
  } catch (err) {
    console.error("Error rendering results:", err);
    showToast("⚠️ Error rendering results. Please refresh.", "error");
  }

  try {
    renderSqlPanel();
  } catch (err) {
    console.error("Error rendering SQL:", err);
  }

  try {
    updateOperationDisplay();
    updateShareButtonVisibility();
    updateSharedViewBanner();
  } catch (err) {
    console.error("Error updating UI state:", err);
  }

  } catch (err) {
    console.error("[Critical] Render failed:", err);
    showToast("❌ Critical render error. Please refresh the page.", "error");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT DELEGATION — Safe event handlers without inline handlers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Setup event delegation for dynamically generated table elements.
 * Uses event bubbling instead of inline handlers for better security and maintainability.
 */
function setupEventDelegation() {
  const tablesArea = document.getElementById("tables-area");
  if (!tablesArea) return;

  // Column remove button
  tablesArea.addEventListener("click", (e) => {
    if (e.target.classList.contains("col-remove-btn")) {
      try {
        const ti = parseInt(e.target.dataset.ti);
        const colId = e.target.dataset.colId;
        if (!Number.isInteger(ti) || ti < 0 || !colId) {
          console.error("Invalid column remove params:", { ti, colId });
          showToast("❌ Invalid column reference", "error");
          return;
        }
        window.ysqlvizApp.joins.removeColAndRender(ti, colId);
      } catch (err) {
        console.error("Error removing column:", err);
        showToast("❌ Failed to remove column", "error");
      }
    }

    // Add row button
    if (e.target.classList.contains("add-row-btn")) {
      try {
        const ti = parseInt(e.target.dataset.ti);
        window.ysqlvizApp.joins.addRowAndFocus(ti);
      } catch (err) {
        console.error("Error adding row:", err);
        showToast("❌ Failed to add row", "error");
      }
    }

    // Add column button
    if (e.target.classList.contains("add-col-btn")) {
      try {
        const ti = parseInt(e.target.dataset.ti);
        if (!Number.isInteger(ti) || ti < 0) {
          console.error("Invalid table index for add column:", ti);
          showToast("❌ Invalid table reference", "error");
          return;
        }
        window.ysqlvizApp.joins.showColModal(ti);
      } catch (err) {
        console.error("Error showing column modal:", err);
        showToast("❌ Failed to open column editor", "error");
      }
    }

    // Delete row button
    if (e.target.classList.contains("del-btn")) {
      try {
        const ti = parseInt(e.target.dataset.ti);
        const ri = parseInt(e.target.dataset.ri);
        if (!Number.isInteger(ti) || !Number.isInteger(ri) || ti < 0 || ri < 0) {
          console.error("Invalid indices for delete row:", { ti, ri });
          showToast("❌ Invalid row reference", "error");
          return;
        }
        window.ysqlvizApp.joins.delRowAndRender(ti, ri);
      } catch (err) {
        console.error("Error deleting row:", err);
        showToast("❌ Failed to delete row", "error");
      }
    }
  });

  // Cell input/change events (delegated)
  tablesArea.addEventListener("input", (e) => {
    if (e.target.classList.contains("cell-input")) {
      try {
        const ti = parseInt(e.target.dataset.ti);
        const ri = parseInt(e.target.dataset.ri);
        const colId = e.target.dataset.colId;
        const isKey = e.target.dataset.isKey === "true";
        const colType = e.target.dataset.colType;
        if (!Number.isInteger(ti) || !Number.isInteger(ri) || !colId || !colType) {
          console.error("Invalid cell input data attributes", { ti, ri, colId, colType });
          return;
        }
        window.ysqlvizApp.joins.handleKeyInput(e, ti, ri, colId, isKey, colType);
      } catch (err) {
        console.error("Error handling cell input:", err);
      }
    }
  }, true); // Use capture phase for input events

  tablesArea.addEventListener("change", (e) => {
    if (e.target.classList.contains("cell-input")) {
      try {
        const ti = parseInt(e.target.dataset.ti);
        const ri = parseInt(e.target.dataset.ri);
        const colId = e.target.dataset.colId;
        const isKey = e.target.dataset.isKey === "true";
        const colType = e.target.dataset.colType;
        if (!Number.isInteger(ti) || !Number.isInteger(ri) || !colId || !colType) {
          console.error("Invalid cell change data attributes", { ti, ri, colId, colType });
          return;
        }
        window.ysqlvizApp.joins.handleKeyChange(e, ti, ri, colId, isKey, colType);
      } catch (err) {
        console.error("Error handling cell change:", err);
        showToast("❌ Failed to update cell", "error");
      }
    }
  });

  // Checkbox change event
  tablesArea.addEventListener("change", (e) => {
    if (e.target.classList.contains("cell-checkbox")) {
      try {
        const ti = parseInt(e.target.dataset.ti);
        const ri = parseInt(e.target.dataset.ri);
        const colId = e.target.dataset.colId;
        if (!Number.isInteger(ti) || !Number.isInteger(ri) || !colId) {
          console.error("Invalid checkbox data attributes", { ti, ri, colId });
          return;
        }
        window.ysqlvizApp.joins.updateValAndRefresh(ti, ri, colId, e.target.checked);
      } catch (err) {
        console.error("Error updating checkbox:", err);
        showToast("❌ Failed to update cell", "error");
      }
    }
  });

  // Cell focus/keydown for escape handling
  tablesArea.addEventListener("focus", (e) => {
    if (e.target.classList.contains("cell-input")) {
      e.target._originalValue = e.target.value;
    }
    // Table/column name contenteditable focus
    if (e.target.classList.contains("table-name") || e.target.classList.contains("col-header-name")) {
      e.target.dataset.originalValue = e.target.textContent;
    }
  }, true); // Use capture phase

  // Table/column name contenteditable input
  tablesArea.addEventListener("input", (e) => {
    if (e.target.classList.contains("table-name")) {
      try {
        const ti = parseInt(e.target.dataset.ti);
        window.ysqlvizApp.joins.handleTableRenameInput(e, ti);
      } catch (err) {
        console.error("Error handling table rename input:", err);
      }
    } else if (e.target.classList.contains("col-header-name")) {
      try {
        const ti = parseInt(e.target.dataset.ti);
        const colId = e.target.dataset.colId;
        window.ysqlvizApp.joins.handleColumnRenameInput(e, ti, colId);
      } catch (err) {
        console.error("Error handling column rename input:", err);
      }
    }
  }, true); // Use capture phase

  // Table/column name contenteditable blur
  tablesArea.addEventListener("blur", (e) => {
    if (e.target.classList.contains("table-name")) {
      try {
        const ti = parseInt(e.target.dataset.ti);
        window.ysqlvizApp.joins.renameTableAndRender(ti, e.target.textContent);
      } catch (err) {
        console.error("Error renaming table:", err);
      }
    } else if (e.target.classList.contains("col-header-name")) {
      try {
        const ti = parseInt(e.target.dataset.ti);
        const colId = e.target.dataset.colId;
        window.ysqlvizApp.joins.renameColumnAndRender(ti, colId, e.target.textContent);
      } catch (err) {
        console.error("Error renaming column:", err);
      }
    }
  }, true); // Use capture phase

  // Table/column name contenteditable keydown
  tablesArea.addEventListener("keydown", (e) => {
    if (e.target.classList.contains("cell-input") && e.key === "Escape") {
      e.target.value = e.target._originalValue || "";
      e.target._escapePressed = true;
      e.target.blur();
      e.preventDefault();
    }
    // Table/column name contenteditable keydown
    if (e.target.classList.contains("table-name") || e.target.classList.contains("col-header-name")) {
      if (e.key === "Enter") {
        e.target.blur();
        e.preventDefault();
      } else if (e.key === "Escape") {
        e.target.textContent = e.target.dataset.originalValue || "";
        e.target.blur();
        e.preventDefault();
      }
    }
  }, true); // Use capture phase

  // Remove table button
  tablesArea.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-table-btn")) {
      try {
        const ti = parseInt(e.target.dataset.ti);
        if (!Number.isInteger(ti) || ti < 0) {
          console.error("Invalid table index for remove:", ti);
          showToast("❌ Invalid table reference", "error");
          return;
        }
        window.ysqlvizApp.joins.removeTableAndRender(ti);
      } catch (err) {
        console.error("Error removing table:", err);
        showToast("❌ Failed to remove table", "error");
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API — Exposed via window.ysqlvizApp.joins
// ═══════════════════════════════════════════════════════════════════════════════

// Initialize namespace if needed
window.ysqlvizApp = window.ysqlvizApp || {};

window.ysqlvizApp.joins = {
  render,
  showColModal: (ti) => {
    const nonKeyColumns = state.tables[ti].columns.filter((c) => !c.isKey).length;
    if (nonKeyColumns >= LIMITS.MAX_COLS_PER_TABLE) {
      showToast(LIMIT_MESSAGES.COLUMN_LIMIT, "error");
      return;
    }
    colModal.show(ti);
    document.getElementById("col-modal-error").style.display = "none";
  },
  clearModalError: () => {
    const err = document.getElementById("col-modal-error");
    if (err) err.style.display = "none";
  },
  handleColModalInput: (event) => {
    try {
      const input = event.target;
      const text = input.value;
      const err = document.getElementById("col-modal-error");

      if (!text) {
        // Empty input - no error message until user tries to submit
        if (err) err.style.display = "none";
        return;
      }

      // Use centralized validateName function
      const validation = validateName(text);

      if (!validation.valid) {
        // Show error message but don't modify input
        if (err) {
          err.textContent = validation.error;
          err.style.display = "block";
        }
      } else {
        // Valid input - hide error
        if (err) err.style.display = "none";
      }
    } catch (err) {
      console.error("Error handling modal input:", err);
      showToast("❌ Modal input error", "error");
    }
  },
  setSvgCol: (ti, colId) => {
    try {
      setSvgColumn(ti, colId);
      renderConn();
    } catch (err) {
      console.error("Error setting SVG column:", err);
      showToast("❌ Failed to set diagram column", "error");
    }
  },
  addTableAndRender: () => {
    if (state.tables.length >= LIMITS.MAX_TABLES) {
      showToast(`Maximum of ${LIMITS.MAX_TABLES} tables reached`, "error");
      return;
    }
    const result = addTable();
    if (result) {
      showToast("Table added");
      render();
    } else {
      const prevIdx = state.tables.length - 1;
      const prevName = state.tables[prevIdx]?.name || `table ${prevIdx + 1}`;
      showToast(`Add data to "${prevName}" first before adding a new table`, "error");
    }
  },
  removeTableAndRender: (ti) => {
    if (removeTable(ti)) {
      showToast("Table removed");
      render();
    }
  },
  addRowAndFocus: (ti) => {
    if (state.tables[ti].rows.length >= LIMITS.MAX_ROWS_PER_TABLE) {
      showToast(LIMIT_MESSAGES.ROW_LIMIT, "error");
      return;
    }
    addRow(ti);
    showToast("Row added");
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
    showToast("Row deleted");
    render();
  },
  updateValAndRefresh: (ti, ri, colId, val) => {
    try {
      const result = updateVal(ti, ri, colId, val);
      if (!result.valid) {
        showToast(`❌ ${result.error || "Invalid value"}`, "error");
        return;
      }
      renderConn();
      renderResult();
    } catch (err) {
      console.error("Error updating value:", err);
      showToast("❌ Failed to update cell", "error");
    }
  },
  handleKeyInput: (event, ti, ri, colId, isKey, colType) => {
    try {
      let val = event.target.value;
      if (isKey) {
        // For key columns: prevent negative numbers
        if (val === "-" || val.startsWith("-")) {
          event.target.value = val.replace(/-/g, "");
          showToast("⚠️ ID cannot be negative\nIDs must be positive whole numbers (1, 2, 3...)\nNegative sign (-) removed.", "error");
        }
      }
      if (colType === "float") {
        // For float columns: allow negative and decimal
        // Just update value, validation happens on change
      }
      const result = updateVal(ti, ri, colId, event.target.value);
      if (result.valid) {
        renderConn();
        renderResult();
      }
    } catch (err) {
      console.error("Error handling key input:", err);
      showToast("❌ Failed to process input", "error");
    }
  },
  handleKeyChange: (event, ti, ri, colId, isKey, colType) => {
    try {
      let val = event.target.value;
      if (isKey) {
        // For key columns: ensure positive integer, not empty
        const num = parseInt(val);
        if (isNaN(num) || num < 1) {
          event.target.value = "1";
          showToast(`⚠️ Invalid ID: "${val}"\n\nIDs must be positive whole numbers (1, 2, 3...).\nYou entered: ${val || "(empty)"}\nReset to: 1`, "error");
          updateVal(ti, ri, colId, "1");
        } else {
          // Check for duplicate key in same table
          const table = state.tables[ti];
          const duplicateIndex = table.rows.findIndex((row, idx) =>
            idx !== ri && String(row[colId]) === String(num)
          );
          if (duplicateIndex !== -1) {
            // Find the first available positive integer
            const usedKeys = new Set();
            table.rows.forEach((row, idx) => {
              if (idx !== ri) usedKeys.add(String(row[colId]));
            });
            let newVal = 1;
            while (usedKeys.has(String(newVal))) newVal++;
            event.target.value = String(newVal);
            showToast(`⚠️ Duplicate ID: ${num}\n\nID ${num} already exists in row ${duplicateIndex + 1}.\nEach row must have a unique ID in this table.\nReset to: ${newVal}`, "error");
            updateVal(ti, ri, colId, String(newVal));
          } else {
            updateVal(ti, ri, colId, String(num));
          }
        }
      } else if (colType === "float") {
        // For float columns: allow negative, ensure valid number
        const num = parseFloat(val);
        if (isNaN(num)) {
          event.target.value = "";
          updateVal(ti, ri, colId, "");
        } else {
          updateVal(ti, ri, colId, String(num));
        }
      } else {
        updateVal(ti, ri, colId, val);
      }
      renderConn();
      renderResult();
    } catch (err) {
      console.error("Error handling key change:", err);
      showToast("❌ Failed to process change", "error");
    }
  },
  renameTableAndRender: (ti, newName) => {
    const validation = validateName(newName);
    if (!validation.valid) {
      showToast(validation.error, "error");
      render();
      return;
    }
    renameTable(ti, validation.value);
    render();
  },
  handleTableRenameInput: (event, ti) => {
    // Prevent recursive calls from setting textContent
    if (event.target._isHandlingRename) return;
    event.target._isHandlingRename = true;
    
    let text = event.target.textContent;
    let invalid = false;
    let msg = "";
    
    // Check for spaces
    if (/\s/.test(text)) {
      msg = "Name cannot contain spaces";
      invalid = true;
      text = text.replace(/\s/g, "");
    }
    // Check for special chars or leading number
    else if (/[^a-zA-Z0-9_]/.test(text)) {
      msg = "Name must only use letters, numbers, underscores";
      invalid = true;
      text = text.replace(/[^a-zA-Z0-9_]/g, "");
    }
    // Check for leading number
    else if (/^[0-9]/.test(text)) {
      msg = "Name must start with a letter";
      invalid = true;
      text = text.replace(/^[0-9]+/, "");
    }
    // Check length limit
    else if (text.length > LIMITS.MAX_NAME_LENGTH) {
      msg = LIMIT_MESSAGES.NAME_LENGTH;
      invalid = true;
      text = text.substring(0, LIMITS.MAX_NAME_LENGTH);
    }
    
    if (invalid) {
      event.target.textContent = text;
      showToast(msg, "error");
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(event.target);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    
    // Use setTimeout to reset the flag after current event loop
    setTimeout(() => {
      event.target._isHandlingRename = false;
    }, 0);
  },
  renameColumnAndRender: (ti, colId, newName) => {
    const validation = validateName(newName);
    if (!validation.valid) {
      showToast(validation.error, "error");
      render();
      return;
    }
    renameColumn(ti, colId, validation.value);
    render();
  },
  handleColumnRenameInput: (event, ti, colId) => {
    // Prevent recursive calls from setting textContent
    if (event.target._isHandlingRename) return;
    event.target._isHandlingRename = true;
    
    let text = event.target.textContent;
    let invalid = false;
    let msg = "";
    
    // Check for spaces
    if (/\s/.test(text)) {
      msg = "Name cannot contain spaces";
      invalid = true;
      text = text.replace(/\s/g, "");
    }
    // Check for special chars or leading number
    else if (/[^a-zA-Z0-9_]/.test(text)) {
      msg = "Name must only use letters, numbers, underscores";
      invalid = true;
      text = text.replace(/[^a-zA-Z0-9_]/g, "");
    }
    // Check for leading number
    else if (/^[0-9]/.test(text)) {
      msg = "Name must start with a letter";
      invalid = true;
      text = text.replace(/^[0-9]+/, "");
    }
    // Check length limit
    else if (text.length > LIMITS.MAX_NAME_LENGTH) {
      msg = LIMIT_MESSAGES.NAME_LENGTH;
      invalid = true;
      text = text.substring(0, LIMITS.MAX_NAME_LENGTH);
    }
    
    if (invalid) {
      event.target.textContent = text;
      showToast(msg, "error");
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(event.target);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    
    // Use setTimeout to reset the flag after current event loop
    setTimeout(() => {
      event.target._isHandlingRename = false;
    }, 0);
  },
  removeColAndRender: (ti, colId) => {
    if (removeColumn(ti, colId)) {
      showToast("Column removed");
      render();
    }
  },
  updateJoinCondition,
  loadPresetAndRender: (presetName, isAutoSwitch = false) => {
    if (PRESET_DATASETS[presetName]) {
      loadPreset(PRESET_DATASETS[presetName], isAutoSwitch);
      const presetDisplay = document.getElementById("preset-display");
      if (presetDisplay) {
        const presetLabels = {
          users_orders: "Users + Orders",
          students_courses: "Students + Courses",
          warehouse_products: "Warehouse Products"
        };
        presetDisplay.textContent = presetLabels[presetName] || presetName;
      }
      if (!isAutoSwitch) {
        if (presetName === "warehouse_products") {
          state.currentOp = "union";
          showToast("ℹ️ Warehouse Products dataset works best with SET operators", "success", 5000);
        } else {
          state.currentOp = "inner";
        }
      }
      render();
    }
  },
  resetAllAndRender: () => {
    // Stop any running bell animation first
    const shareBtn = document.getElementById("share-btn");
    if (shareBtn) {
      shareBtn.classList.remove("animate-bell");
      shareBtn.classList.add("disabled");
      shareBtn.disabled = true;
    }

    state.tables = JSON.parse(JSON.stringify(INITIAL_STATE.tables));
    state.currentOp = null;
    state.joinConditions = [];
    state.selectedPair = "0-1";
    DropdownHandler.resetAll();
    const presetDisplay = document.getElementById("preset-display");
    if (presetDisplay) {
      presetDisplay.textContent = "Select a dataset...";
    }
    stopBellAnimation();
    showToast("Reset complete");
    render();
  },
  generateShareLink: () => generateShareUrl(),
  copyShareLink: () => copyShareLinkWithToast(),
  makeEditableCopy: () => {
    makeEditableCopy();
    render();
  },
  showToast,
};

// Handler for the Copy SQL button in the code panel
window.copySqlButtonClicked = () => {
  const sql = generateSql();
  copySqlToClipboard(sql);
  showToast("SQL copied!");
};

// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION — Page startup
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initializes the column type dropdown in the add column modal.
 */
function initModalTypeDropdown() {
  DropdownHandler.setup("col-modal-type-dropdown", (value) => {
    document.getElementById("col-modal-type-value").value = value;
    const labels = { number: "Integer", string: "String", float: "Float", date: "Date", boolean: "Boolean" };
    document.getElementById("col-modal-type-display").textContent = labels[value] || value;
  });
}

/**
 * Initializes the preset dropdown for quick-start datasets.
 */
function initPresetDropdown() {
  DropdownHandler.setup("preset-dropdown-wrapper", (value) => {
    window.ysqlvizApp.joins.loadPresetAndRender(value);
  });
}

/**
 * Setup event listeners for buttons without inline handlers
 */
function setupButtonListeners() {
  // Breadcrumb back button
  const breadcrumbBack = document.querySelector(".breadcrumb-back");
  if (breadcrumbBack) {
    breadcrumbBack.addEventListener("click", (e) => {
      e.preventDefault();
      history.back();
    });
  }

  // Share button
  const shareBtn = document.getElementById("share-btn");
  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      if (!shareBtn.disabled) {
        window.ysqlvizApp.joins.copyShareLink();
      }
    });
  }

  // Make editable copy button (delegated event listener for dynamic banner)
  document.addEventListener("click", (e) => {
    if (e.target.closest('[data-action="make-editable-copy"]')) {
      window.ysqlvizApp.joins.makeEditableCopy();
    }
  });

  // Reset all button
  const resetAllBtn = document.getElementById("reset-all-btn");
  if (resetAllBtn) {
    resetAllBtn.addEventListener("click", () => {
      window.ysqlvizApp.joins.resetAllAndRender();
    });
  }

  // Add table button (from HTML, not generated)
  const addTableBtn = document.getElementById("add-table-btn");
  if (addTableBtn) {
    addTableBtn.addEventListener("click", () => {
      window.ysqlvizApp.joins.addTableAndRender();
    });
  }

  // Modal close button
  const colModalClose = document.getElementById("col-modal-close");
  if (colModalClose) {
    colModalClose.addEventListener("click", () => {
      document.getElementById("col-modal").style.display = "none";
    });
  }

  // Modal name input
  const colModalName = document.getElementById("col-modal-name");
  if (colModalName) {
    colModalName.addEventListener("input", (e) => {
      window.ysqlvizApp.joins.handleColModalInput(e);
    });
  }

  // SQL copy button
  const sqlCopyBtn = document.getElementById("sql-copy-btn");
  if (sqlCopyBtn) {
    sqlCopyBtn.addEventListener("click", () => {
      window.copySqlButtonClicked();
    });
  }
}

// Initialize all components on page load
initBanner();
initHowToPopover();
initOperationDropdowns();
initPresetDropdown();
initModalTypeDropdown();
initKeyboardShortcuts();
setupButtonListeners();
setupEventDelegation();

// Pair selector setup is done in render() after rebuildPairSelect()

// Parse URL params on load to restore state (for shared links)
parseUrlParams();
render();

// Back to top button
const backToTopBtn = document.querySelector('.back-to-top');
if (backToTopBtn) {
  const toggleBackToTop = () => {
    if (window.scrollY > 300) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  };
  window.addEventListener('scroll', toggleBackToTop, { passive: true });
  toggleBackToTop();
  backToTopBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
