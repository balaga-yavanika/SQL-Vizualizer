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
} from "../../js/core/state.js";
import {
  rebuildPairSelect,
  getMatchedIdx,
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
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Column modal handler for adding new columns
const colModal = ModalHandler.setup(
  "col-modal",
  ({ dataValue, name, type }) => {
    addColumn(parseInt(dataValue), name, type);
    render();
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
        ${isSelfJoin && isFirst ? `<span class="self-join-hint">${tableName}</span>` : ""}

        <div class="custom-dropdown" id="join-left-col-wrapper-${idx}">
          <button class="dropdown-toggle" aria-expanded="false">
            <span>${leftColName}</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="dropdown-menu" style="display: none">${leftColItems}</div>
        </div>

        <div class="custom-dropdown" id="join-op-wrapper-${idx}">
          <button class="dropdown-toggle" aria-expanded="false">
            <span>${cond.op || "="}</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="dropdown-menu" style="display: none">${opItems}</div>
        </div>

        <div class="custom-dropdown" id="join-right-col-wrapper-${idx}">
          <button class="dropdown-toggle" aria-expanded="false">
            <span>${rightColName}</span>
            <span class="dropdown-arrow">▼</span>
          </button>
          <div class="dropdown-menu" style="display: none">${rightColItems}</div>
        </div>
        ${isSelfJoin && isFirst ? `<span class="self-join-hint">${aliasName}</span>` : ""}

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
    addBtn.onclick = () => {
      // Check if last condition is complete
      const lastCond = state.joinConditions[state.joinConditions.length - 1];
      if (lastCond && (!lastCond.leftCol || !lastCond.rightCol)) {
        const lTable = state.tables[lastCond.leftTableIdx]?.name || "Table";
        const rTable = state.tables[lastCond.rightTableIdx]?.name || "Table";
        const incomplete = !lastCond.leftCol ? `${lTable} column` : `${rTable} column`;
        showToast(`⚠️ Join condition incomplete\nCurrent: ${lTable}.${lastCond.leftCol?.name || "?"} = ${rTable}.${lastCond.rightCol?.name || "?"}\n\nComplete the ${incomplete} selection, or delete this condition first.`, "error");
        return;
      }
      addJoinCondition();
      render();
    };
  }

  // Setup remove condition buttons - get index from data attribute, not forEach
  document.querySelectorAll(".remove-condition-btn").forEach((btn) => {
    btn.onclick = () => {
      const idx = parseInt(btn.closest(".join-condition-row")?.getAttribute("data-cond-index"));
      if (!isNaN(idx)) {
        removeJoinCondition(idx);
        render();
      }
    };
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
    } else if (state.selectedPair && state.selectedPair.split("-")[0] === state.selectedPair.split("-")[1]) {
      // Reset pair from self-join to regular join if switching away from SELF JOIN
      // But only if 0-1 is valid (both tables exist)
      if (state.tables.length >= 2) {
        state.selectedPair = "0-1";
      } else if (state.tables.length === 1) {
        state.selectedPair = "0-0";  // Only one table, stay on it
      }
    }
    updateOperationDisplay();
    render();
  });

  populateDropdownMenu("set-op-menu", "set");
  DropdownHandler.setup("set-op-dropdown-wrapper", (value) => {
    state.currentOp = value;
    // Clear join conditions for SET operators (they don't use ON clauses)
    if (["union", "union_all", "except", "intersect"].includes(value)) {
      state.joinConditions = [];
    }
    updateOperationDisplay();
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
      <button class="copy-btn" onclick="window.app.makeEditableCopy()">Make a Copy to Edit</button>
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
    "#join-left-col-wrapper .dropdown-toggle",
    "#join-op-wrapper .dropdown-toggle",
    "#join-right-col-wrapper .dropdown-toggle",
  ];

  dropdownToggles.forEach((selector) => {
    document.querySelectorAll(selector).forEach((btn) => {
      btn.disabled = true;
      btn.style.opacity = "0.6";
      btn.style.pointerEvents = "none";
      btn.style.cursor = "not-allowed";
    });
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
    "#join-left-col-wrapper .dropdown-toggle",
    "#join-op-wrapper .dropdown-toggle",
    "#join-right-col-wrapper .dropdown-toggle",
  ];

  dropdownToggles.forEach((selector) => {
    document.querySelectorAll(selector).forEach((btn) => {
      btn.disabled = false;
      btn.removeAttribute("style");
    });
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
 */
export function render() {
  rebuildPairSelect();
  
  // Re-setup pair selector dropdown after rebuilding menu items
  DropdownHandler.setup("join-pair-select-wrapper", (value) => {
    // Validate pair indices before updating
    const [li, ri] = value.split("-").map(Number);
    if (li >= 0 && li < state.tables.length && ri >= 0 && ri < state.tables.length) {
      // Clear stale join conditions when pair changes (conditions reference old table indices)
      if (state.selectedPair !== value) {
        state.joinConditions = [];
      }
      state.selectedPair = value;
      render();
    } else {
      // Invalid pair selection - provide context-aware error message
      const tableCount = state.tables.length;
      if (tableCount < 2) {
        showToast(`⚠️ Can't pair tables - only ${tableCount} table exists.\n\nAdd another table using "+ add table", or use Self-Join (join a table to itself).`, "error");
      } else {
        showToast(`⚠️ Invalid pair: ${li}-${ri}. Valid tables: 0-${tableCount - 1}.\n\nSelect two different tables, or use Self-Join.`, "error");
      }
    }
  });
  
  document.getElementById("pair-row").style.display =
    state.tables.length > 2 ? "flex" : "none";

  // Only show join condition panel for join operations, not set operators
  const joinCondPanel = document.querySelector(".join-condition-panel");
  const isSetOperator = state.currentOp && JOIN_OPS[state.currentOp]?.group === "set";

  if (joinCondPanel) {
    joinCondPanel.style.display = isSetOperator ? "none" : "block";
  }

  // Validate SET OPERATORS compatibility
  if (isSetOperator) {
    const [li, ri] = getPair();
    const validation = validateSetOperatorCompatibility(li, ri);
    if (!validation.valid) {
      showToast(`⚠️ ${validation.error}`, "error", 4000);
    }
  }

  const joinCondEditor = document.getElementById("join-cond-container");
  const isCrossJoin = state.currentOp === "cross";
  if (joinCondEditor) {
    // Only rebuild if join condition state has actually changed
    const [li, ri] = getPair();
    const currentPair = `${li}-${ri}`;
    // Check ALL conditions, not just the first one
    const currentConds = JSON.parse(JSON.stringify(state.joinConditions));
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
          joinCondEditor.innerHTML = buildJoinConditionEditor();
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
  const { m1, m2 } = getMatchedIdx(rows);
  renderTables(m1, m2, li, ri);
  renderDiagramColSelectors();
  setupSvgColSelectors();
  renderConn();
  renderResult();
  renderSqlPanel();
  updateOperationDisplay();
  updateShareButtonVisibility();
  updateSharedViewBanner();
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API — Exposed via window.app
// ═══════════════════════════════════════════════════════════════════════════════

window.app = {
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
    const input = event.target;
    let text = input.value;
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
      input.value = text;
      const err = document.getElementById("col-modal-error");
      if (err) {
        err.textContent = msg;
        err.style.display = "block";
      }
      // Move cursor to end
      input.setSelectionRange(input.value.length, input.value.length);
    } else {
      const err = document.getElementById("col-modal-error");
      if (err) err.style.display = "none";
    }
  },
  setSvgCol: (ti, colId) => {
    setSvgColumn(ti, colId);
    renderConn();
  },
  addTableAndRender: () => {
    if (state.tables.length >= LIMITS.MAX_TABLES) {
      return;
    }
    const result = addTable();
    if (result) {
      showToast("Table added");
      render();
    } else {
      showToast("Add data to the previous table first");
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
    updateVal(ti, ri, colId, val);
    renderConn();
    renderResult();
  },
  handleKeyInput: (event, ti, ri, colId, isKey, colType) => {
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
    updateVal(ti, ri, colId, event.target.value);
    renderConn();
    renderResult();
  },
  handleKeyChange: (event, ti, ri, colId, isKey, colType) => {
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
          event.target.value = "1";
          showToast(`⚠️ Duplicate ID: ${num}\n\nID ${num} already exists in row ${duplicateIndex + 1}.\nEach row must have a unique ID in this table.\nReset to: 1`, "error");
          updateVal(ti, ri, colId, "1");
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
  loadPresetAndRender: (presetName) => {
    if (PRESET_DATASETS[presetName]) {
      loadPreset(PRESET_DATASETS[presetName]);
      // Auto-select UNION for warehouse_products dataset (optimized for set operators)
      if (presetName === "warehouse_products") {
        state.currentOp = "union";
        showToast("ℹ️ Warehouse Products dataset works best with SET operators", "success", 5000);
      } else {
        state.currentOp = "inner";
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
    window.app.loadPresetAndRender(value);
  });
}

// Initialize all components on page load
initBanner();
initHowToPopover();
initOperationDropdowns();
initPresetDropdown();
initModalTypeDropdown();
initKeyboardShortcuts();

// Pair selector setup is done in render() after rebuildPairSelect()

// Parse URL params on load to restore state (for shared links)
parseUrlParams();
render();
