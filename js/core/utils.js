// ═══════════════════════════════════════════════════════════════════════════════
// js/core/utils.js — Utility Functions for Joins Visualizer
// ═══════════════════════════════════════════════════════════════════════════════
// This file provides helper functions for:
// - Column accessors: Get key/svg columns and values from tables
// - Pair selector: Rebuild dropdown for selecting table pairs
// - Result helpers: Matched indices, NULL badges, empty states
// - Table mutations: Add/remove tables, rows, columns
// ═══════════════════════════════════════════════════════════════════════════════

import { state, JOIN_OPS } from "./state.js";
import { LIMITS } from "./limits.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safely execute a function with error handling
 * @param {Function} fn - Function to execute
 * @param {string} errorMsg - Error message to show user
 * @param {Function} onError - Optional callback on error
 * @returns {any} Function result or null if error
 */
export function safeExecute(fn, errorMsg = "Operation failed", onError = null) {
  try {
    return fn();
  } catch (err) {
    console.error(`[Error] ${errorMsg}:`, err);
    if (onError) onError(err);
    return null;
  }
}

/**
 * Create a safe event handler wrapper
 * @param {Function} handler - Event handler function
 * @param {string} errorMsg - Error message to show user
 * @returns {Function} Wrapped handler
 */
export function safeHandler(handler, errorMsg = "Operation failed") {
  return function(...args) {
    try {
      return handler(...args);
    } catch (err) {
      console.error(`[Handler Error] ${errorMsg}:`, err);
      // Show error to user if showToast is available
      if (window.ysqlvizApp?.joins?.showToast) {
        window.ysqlvizApp.joins.showToast(`❌ ${errorMsg}`, "error");
      }
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: SECURITY UTILITIES — Input Validation & Escaping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Escape HTML/XML special characters to prevent XSS and rendering errors
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for HTML/SVG
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validate name (table or column): alphanumeric + underscore, strict rules
 * - Must not be empty
 * - No spaces
 * - Must start with letter (not number)
 * - Only letters, numbers, underscores allowed
 * - Max characters (see LIMITS.MAX_NAME_LENGTH)
 * Prevents special characters that could break SQL/HTML/SVG
 * @param {string} name - Name to validate
 * @returns {object} { valid: boolean, error?: string, value?: string }
 */
export function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name must be a non-empty string' };
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, error: 'Name is required' };
  }
  if (/\s/.test(trimmed)) {
    return { valid: false, error: 'Name cannot contain spaces' };
  }
  if (/^[0-9]/.test(trimmed)) {
    return { valid: false, error: 'Name must start with a letter' };
  }
  if (/[^a-zA-Z0-9_]/.test(trimmed)) {
    return { valid: false, error: 'Name must only use letters, numbers, underscores' };
  }
  if (trimmed.length > LIMITS.MAX_NAME_LENGTH) {
    return { valid: false, error: `Name limited to ${LIMITS.MAX_NAME_LENGTH} characters` };
  }
  return { valid: true, value: trimmed };
}

/**
 * Validate array index bounds
 * @param {number} index - Index to validate
 * @param {number} length - Array length
 * @returns {boolean} True if index is valid (0 <= index < length)
 */
export function isValidIndex(index, length) {
  return Number.isInteger(index) && index >= 0 && index < length;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: COLUMN ACCESSORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the key column for a table (isKey=true, or first column)
 * @param {number} ti - Table index
 * @returns {object} Column object with id, name, type, isKey
 */
export function getKeyColumn(ti) {
  return (
    state.tables[ti].columns.find((c) => c.isKey) || state.tables[ti].columns[0]
  );
}

/**
 * Get the key value for a specific row in a table
 * @param {number} ti - Table index
 * @param {number} ri - Row index
 * @returns {any} The key value
 */
export function getKeyValue(ti, ri) {
  return state.tables[ti].rows[ri][getKeyColumn(ti).id];
}

/**
 * Get the SVG display column for a table (svgColId, or first column)
 * @param {number} ti - Table index
 * @returns {object} Column object
 */
export function getSvgColumn(ti) {
  const t = state.tables[ti];
  return t.columns.find((c) => c.id === t.svgColId) || t.columns[0];
}

/**
 * Get the SVG display value for a specific row
 * @param {number} ti - Table index
 * @param {number} ri - Row index
 * @returns {any} The SVG column value
 */
export function getSvgValue(ti, ri) {
  return state.tables[ti].rows[ri][getSvgColumn(ti).id];
}

/**
 * Get rows that have a valid key value (non-empty)
 * @param {number} ti - Table index
 * @returns {Array} Array of {row, i} objects for valid rows
 */
export function validRows(ti) {
  return state.tables[ti].rows
    .map((row, i) => ({ row, i }))
    .filter((x) => {
      const v = getKeyValue(ti, x.i);
      return v !== "" && v !== undefined && v !== null;
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: PAIR SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the currently selected table pair indices
 * Validates bounds and returns safe default if invalid
 * @returns {[number, number]} [leftTableIndex, rightTableIndex]
 */
export function getPair() {
  const p = (state.selectedPair || "0-1").split("-");
  let li = parseInt(p[0]);
  let ri = parseInt(p[1]);

  // Validate indices are within bounds
  if (!isValidIndex(li, state.tables.length) || !isValidIndex(ri, state.tables.length)) {
    // Fallback to safe default based on table count
    if (state.tables.length >= 2) {
      li = 0;
      ri = 1;
    } else if (state.tables.length === 1) {
      li = 0;
      ri = 0; // Self-join
    } else {
      li = -1;
      ri = -1; // No tables
    }
  }

  return [li, ri];
}

/**
 * Rebuild the pair selector dropdown menu
 * Updates options based on available tables and validates current selection
 */
export function rebuildPairSelect() {
  const menu = document.getElementById("pair-select-menu");
  const display = document.getElementById("pair-select-display");
  if (!menu) return;

  let old = state.selectedPair || "0-1";
  const { tables } = state;

  // Validate old pair — if indices are out of bounds, reset to 0-1
  const [oldI, oldJ] = old.split("-").map(Number);
  if (oldI >= tables.length || oldJ >= tables.length) {
    old = "0-1";
    state.selectedPair = "0-1";
  }

  // For self-join, use same index for both sides
  const isSelfJoin = state.currentOp === "self";

  menu.innerHTML = "";

  for (let i = 0; i < tables.length; i++) {
    if (isSelfJoin) {
      // Self-join: only show self-referencing pairs
      const btn = document.createElement("button");
      btn.className = "dropdown-item";
      btn.setAttribute("data-value", `${i}-${i}`);
      btn.textContent = `${tables[i].name} → ${tables[i].name} (self)`;
      if (`${i}-${i}` === old) btn.classList.add("selected");
      menu.appendChild(btn);
    } else {
      // Regular join: skip same-table pairs
      for (let j = 0; j < tables.length; j++) {
        if (i === j) continue;
        const btn = document.createElement("button");
        btn.className = "dropdown-item";
        btn.setAttribute("data-value", `${i}-${j}`);
        btn.textContent = `${tables[i].name} → ${tables[j].name}`;
        if (`${i}-${j}` === old) btn.classList.add("selected");
        menu.appendChild(btn);
      }
    }
  }

  // Update display text
  const [selectedI, selectedJ] = old.split("-").map(Number);
  let selectedLabel;
  if (isSelfJoin && selectedI === selectedJ) {
    selectedLabel = tables[selectedI].name + " → " + tables[selectedJ].name + " (self)";
  } else {
    selectedLabel = tables[selectedI].name + " → " + tables[selectedJ].name;
  }
  if (display) display.textContent = selectedLabel;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: RESULT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract matched row indices from join results
 * @param {Array} rows - Join result rows
 * @returns {{m1: Set, m2: Set}} Sets of matched indices for left and right tables
 */
export function getMatchedIdx(rows) {
  const m1 = new Set(),
    m2 = new Set();
  rows.forEach((r) => {
    if (r.i1 >= 0) m1.add(r.i1);
    if (r.i2 >= 0) m2.add(r.i2);
  });
  return { m1, m2 };
}

/**
 * Get NULL display text
 * @returns {string} Text representation of NULL value
 */
export function nullBadge() {
  return "NULL";
}

/**
 * Generate empty state message content
 * @param {object|null} reason - Optional reason object with message and icon
 * @returns {string} Empty state message text or HTML icon+message
 */
export function emptyState(reason) {
  if (reason) {
    return `<i class="fa-solid ${reason.icon}" style="font-size:12px"></i>&nbsp;${reason.message}`;
  }
  return "No rows returned for this join type with the current data.";
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: EMPTY STATE REASONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a single table has data (at least 1 row with at least 1 non-empty cell)
 * @param {number} ti - Table index
 * @returns {boolean} true if table has data
 */
function tableHasData(ti) {
  const table = state.tables[ti];
  if (!table || table.rows.length === 0) return false;
  return table.rows.some((row) => {
    return Object.values(row).some(
      (val) => val !== "" && val !== null && val !== undefined,
    );
  });
}

/**
 * Check if any table in state has data
 * @returns {boolean} true if at least one table has data
 */
function anyTableHasData() {
  return state.tables.some((_, i) => tableHasData(i));
}

/**
 * Check if a join condition is set
 * @returns {boolean} true if at least one join condition exists with columns selected
 */
function hasJoinCondition() {
  return (
    state.joinConditions.length > 0 &&
    state.joinConditions[0]?.leftCol &&
    state.joinConditions[0]?.rightCol
  );
}

/**
 * Determine why the result is empty and return appropriate message/icon
 * @returns {object} {message, icon} for the empty state
 */
export function getEmptyStateReason() {
  if (state.tables.length < 2) {
    return {
      message: "Add at least 2 tables to see join results.",
      icon: "fa-table",
    };
  }
  if (!anyTableHasData()) {
    return {
      message: "Add data to your tables first.",
      icon: "fa-pen-to-square",
    };
  }
  const isSetOp = state.currentOp && JOIN_OPS[state.currentOp]?.group === "set";
  const isCrossJoin = state.currentOp === "cross";
  if (!isSetOp && !isCrossJoin && !hasJoinCondition()) {
    return { message: "Set a join condition to see results.", icon: "fa-link" };
  }
  if (!isSetOp && !isCrossJoin && hasJoinCondition()) {
    return { message: "No rows match your join condition.", icon: "fa-equals" };
  }
  return { message: "No rows returned.", icon: "fa-equals" };
}

/**
 * Determine why the SVG diagram is empty and return appropriate message
 * @param {number} li - Left table index
 * @param {number} ri - Right table index
 * @returns {object|null} {message, icon} or null if diagram has data
 */
export function getSvgEmptyStateReason(li, ri) {
  if (!state.tables[li] || !state.tables[ri]) {
    return { message: "Add tables to see the diagram.", icon: "fa-table" };
  }
  const leftHasData = tableHasData(li);
  const rightHasData = tableHasData(ri);

  if (!leftHasData && !rightHasData) {
    return {
      message: "Fill in table values to see the diagram.",
      icon: "fa-pen-to-square",
    };
  }
  if (!leftHasData) {
    return {
      message: `Add data to ${state.tables[li].name} first.`,
      icon: "fa-pen-to-square",
    };
  }
  if (!rightHasData) {
    return {
      message: `Add data to ${state.tables[ri].name} first.`,
      icon: "fa-pen-to-square",
    };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: TABLE / ROW / COLUMN MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Valid join condition operators
 */
const VALID_OPERATORS = ["=", ">", "<", ">=", "<="];

/**
 * Validate join condition operator
 * @param {string} op - Operator to validate
 * @returns {boolean} true if operator is valid
 */
function isValidOperator(op) {
  return VALID_OPERATORS.includes(op);
}

/**
 * Set or update a join condition with validation
 * @param {number} conditionIndex - Index of the condition to set
 * @param {object} condition - Condition object with leftTable, leftCol, op, rightTable, rightCol
 */
export function setJoinCondition(conditionIndex, condition) {
  // Validate and sanitize operator
  if (condition && condition.op && !isValidOperator(condition.op)) {
    console.warn(`Invalid join operator "${condition.op}", defaulting to "="`);
    condition = { ...condition, op: "=" };
  }

  if (conditionIndex >= 0 && conditionIndex < state.joinConditions.length) {
    state.joinConditions[conditionIndex] = condition;
  } else if (conditionIndex === state.joinConditions.length) {
    state.joinConditions.push(condition);
  }
}

/**
 * Add a new table to state
 * Only allowed when: less than MAX_TABLES total AND previous table has data
 * @returns {boolean} true if table was added successfully
 */
export function addTable() {
  if (state.tables.length >= LIMITS.MAX_TABLES) return false;

  // Check if previous table has data before allowing new table
  const prevTableIndex = state.tables.length - 1;
  if (prevTableIndex >= 0 && !tableHasData(prevTableIndex)) {
    return false;
  }

  state.tables.push({
    name: "table_" + (state.tables.length + 1),
    columns: [{ id: "col_0", name: "id", type: "number", isKey: true }],
    rows: [],
    svgColId: "col_0",
  });
  return true;
}

/**
 * Add a new row to a table
 * Auto-increments primary key column if present
 * @param {number} ti - Table index
 */
export function addRow(ti) {
  const t = state.tables[ti];
  const newRow = {};
  t.columns.forEach((c) => (newRow[c.id] = ""));

  // Auto-increment primary key column
  const keyCol = t.columns.find((c) => c.isKey);
  if (keyCol) {
    // Find max key value in existing rows
    const maxKey = t.rows.reduce((max, row) => {
      const val = parseInt(row[keyCol.id]) || 0;
      return val > max ? val : max;
    }, 0);
    newRow[keyCol.id] = String(maxKey + 1);
  }

  t.rows.push(newRow);
}

/**
 * Add a new column to a table
 * Validates column name before adding
 * @param {number} ti - Table index
 * @param {string} name - Column name (must be valid per validateName)
 * @param {string} type - Data type (int, string, float, date)
 */
export function addColumn(ti, name, type) {
  // Defensive validation - should be validated before calling, but validate here too
  const validation = validateName(name);
  if (!validation.valid) {
    console.error(`Invalid column name: ${validation.error}`);
    return false;
  }

  const t = state.tables[ti];
  const id = "col_" + t.columns.length;
  t.columns.push({ id, name: validation.value, type, isKey: false });
  t.rows.forEach((row) => (row[id] = ""));
  return true;
}

/**
 * Remove a table from state
 * @param {number} ti - Table index to remove
 */
export function removeTable(ti) {
  state.tables.splice(ti, 1);

  // Reset selected pair if now invalid
  if (state.tables.length >= 2) {
    const [i, j] = getPair();
    if (i >= state.tables.length || j >= state.tables.length) {
      state.selectedPair = "0-1";
    }
  } else if (state.tables.length === 1) {
    // Only 1 table left - set to self-join
    state.selectedPair = "0-0";
  } else {
    // No tables left - clear pair
    state.selectedPair = "";
  }

  return true;
}

/**
 * Remove a row from a table
 * @param {number} ti - Table index
 * @param {number} ri - Row index to remove
 */
export function removeRow(ti, ri) {
  state.tables[ti].rows.splice(ri, 1);
}

/**
 * Remove a column from a table
 * Resets svgColId if the deleted column was the SVG diagram column
 * @param {number} ti - Table index
 * @param {string} colId - Column ID to remove
 */
export function removeColumn(ti, colId) {
  const t = state.tables[ti];
  const ci = t.columns.findIndex((c) => c.id === colId);
  if (ci === -1) return false;

  // Reset svgColId if the deleted column was selected for diagram
  if (t.svgColId === colId) {
    // First delete the column from the array
    t.columns.splice(ci, 1);
    // Then check what columns remain and pick one
    if (t.columns.length > 0) {
      // Use the first available column (or the one before the deleted index if possible)
      const fallbackIdx = Math.min(ci, t.columns.length - 1);
      t.svgColId = t.columns[fallbackIdx].id;
    } else {
      t.svgColId = null;
    }
  } else {
    // Just delete the column
    t.columns.splice(ci, 1);
  }

  t.rows.forEach((row) => delete row[colId]);
  return true;
}

/**
 * Delete a row from a table (alias for removeRow)
 * @param {number} ti - Table index
 * @param {number} ri - Row index to remove
 */
export function delRow(ti, ri) {
  state.tables[ti].rows.splice(ri, 1);
}

/**
 * Validate and convert a value based on column type
 * @param {string} type - Column type (number, string, float, date)
 * @param {any} val - Value to validate
 * @returns {object} {valid: boolean, value?: any, error?: string}
 */
export function validateAndConvertValue(type, val) {
  // Allow empty values (user can clear cells)
  if (val === "" || val === null || val === undefined) {
    return { valid: true, value: "" };
  }

  const strVal = String(val).trim();
  if (strVal === "") {
    return { valid: true, value: "" };
  }

  switch (type) {
    case "number": {
      const num = parseInt(strVal, 10);
      if (isNaN(num)) {
        return { valid: false, error: `"${val}" is not a valid number` };
      }
      return { valid: true, value: String(num) };
    }

    case "float": {
      const num = parseFloat(strVal);
      if (isNaN(num)) {
        return { valid: false, error: `"${val}" is not a valid decimal number` };
      }
      return { valid: true, value: String(num) };
    }

    case "date": {
      // Basic validation: YYYY-MM-DD format
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(strVal)) {
        return { valid: false, error: `"${val}" must be YYYY-MM-DD format` };
      }
      const date = new Date(strVal + "T00:00:00Z");
      if (isNaN(date.getTime())) {
        return { valid: false, error: `"${val}" is not a valid date` };
      }
      return { valid: true, value: strVal };
    }

    case "string":
    default:
      return { valid: true, value: String(val) };
  }
}

/**
 * Update a cell value in a table with type validation and conversion
 * @param {number} ti - Table index
 * @param {number} ri - Row index
 * @param {string} colId - Column ID
 * @param {any} val - New value
 * @returns {object} {valid: boolean, error?: string}
 */
export function updateVal(ti, ri, colId, val) {
  try {
    // Validate indices
    if (!isValidIndex(ti, state.tables.length)) {
      return { valid: false, error: "Invalid table index" };
    }
    if (!isValidIndex(ri, state.tables[ti].rows.length)) {
      return { valid: false, error: "Invalid row index" };
    }

    const table = state.tables[ti];
    const column = table.columns.find((c) => c.id === colId);

    if (!column) {
      // Fallback: store as-is if column not found (shouldn't happen)
      state.tables[ti].rows[ri][colId] = val;
      return { valid: true };
    }

    // Validate and convert based on column type
    const validation = validateAndConvertValue(column.type, val);
    if (!validation.valid) {
      return validation;
    }

    state.tables[ti].rows[ri][colId] = validation.value;
    return { valid: true };
  } catch (err) {
    console.error("Error updating cell value:", err);
    return { valid: false, error: "Failed to update cell" };
  }
}

/**
 * Rename a table
 * @param {number} ti - Table index
 * @param {string} newName - New table name
 */
export function renameTable(ti, newName) {
  const validation = validateName(newName);
  if (validation.valid) {
    state.tables[ti].name = newName.trim();
    return { success: true };
  }
  return { success: false, error: validation.error };
}

/**
 * Rename a column
 * @param {number} ti - Table index
 * @param {string} colId - Column ID
 * @param {string} newName - New column name
 */
export function renameColumn(ti, colId, newName) {
  const validation = validateName(newName);
  if (validation.valid) {
    const col = state.tables[ti].columns.find((c) => c.id === colId);
    if (col) {
      col.name = newName.trim();
      return { success: true };
    }
  }
  return { success: false, error: validation.error };
}

/**
 * Set the SVG display column for a table
 * @param {number} ti - Table index
 * @param {string} colId - Column ID to display
 */
export function setSvgColumn(ti, colId) {
  state.tables[ti].svgColId = colId;
}

/**
 * Get the join condition display text
 * @returns {string} Human-readable join condition description
 */
export function getJoinConditionDisplay() {
  if (!state.joinConditions.length) return "No join condition set";
  return state.joinConditions
    .filter((c) => c !== null)
    .map((c) => {
      const tL = state.tables[c.leftTable];
      const tR = state.tables[c.rightTable];
      const cL = tL?.columns.find((x) => x.id === c.leftCol);
      const cR = tR?.columns.find((x) => x.id === c.rightCol);
      if (!cL || !cR) return "Invalid condition";
      return `${tL.name}.${cL.name} ${c.op} ${tR.name}.${cR.name}`;
    })
    .join(" AND ");
}

/**
 * Reset all tables to default preset
 * @param {object} preset - Preset object with tables and joinConditions
 */
export function loadPreset(preset) {
  if (!preset) return;

  state.tables = JSON.parse(JSON.stringify(preset.tables));
  state.joinConditions = JSON.parse(
    JSON.stringify(preset.joinConditions || []),
  );
  state.currentOp = "inner";
  state.selectedPair = "0-1";
}

/**
 * Get the join condition summary text (only valid conditions)
 * @returns {string} Human-readable join condition description
 */
export function getJoinConditionSummary() {
  if (!state.joinConditions.length) return "No join condition set";

  // Only include valid, complete conditions
  const validConditions = state.joinConditions
    .filter((c) => c && c.leftCol && c.rightCol)
    .map((c) => {
      const tL = state.tables[c.leftTable];
      const tR = state.tables[c.rightTable];
      const cL = tL?.columns.find((x) => x.id === c.leftCol);
      const cR = tR?.columns.find((x) => x.id === c.rightCol);
      if (!cL || !cR) return null;
      return `${tL.name}.${cL.name} ${c.op} ${tR.name}.${cR.name}`;
    })
    .filter(Boolean);

  if (validConditions.length === 0) return "No complete conditions set";
  return validConditions.join(" AND ");
}

/**
 * Add a new empty join condition
 */
export function addJoinCondition() {
  const [li, ri] = getPair();
  state.joinConditions.push({
    leftTable: li,
    leftCol: "",
    op: "=",
    rightTable: ri,
    rightCol: "",
  });
}

/**
 * Remove a join condition by index
 * @param {number} index - Index of condition to remove
 */
export function removeJoinCondition(index) {
  if (index >= 0 && index < state.joinConditions.length) {
    state.joinConditions.splice(index, 1);
  }
}

/**
 * Update a join condition at specific index with validation
 * @param {number} index - Index of condition to update
 * @param {object} updates - Object with leftCol, op, rightCol to update
 */
export function updateJoinCondition(index, updates) {
  if (state.joinConditions[index]) {
    // Validate operator if provided in updates
    if (updates && updates.op && !isValidOperator(updates.op)) {
      console.warn(`Invalid join operator "${updates.op}", defaulting to "="`);
      updates = { ...updates, op: "=" };
    }
    Object.assign(state.joinConditions[index], updates);
  }
}
