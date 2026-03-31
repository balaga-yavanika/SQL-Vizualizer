// ── js/core/utils.js ──────────────────────────────────────────────────────────
import { state, DATA_TYPES } from "./state.js";

// ── Column accessors ───────────────────────────────────────────────────────────
export function getKeyColumn(ti) {
  return (
    state.tables[ti].columns.find((c) => c.isKey) || state.tables[ti].columns[0]
  );
}
export function getKeyValue(ti, ri) {
  return state.tables[ti].rows[ri][getKeyColumn(ti).id];
}
export function getSvgColumn(ti) {
  const t = state.tables[ti];
  return t.columns.find((c) => c.id === t.svgColId) || t.columns[0];
}
export function getSvgValue(ti, ri) {
  return state.tables[ti].rows[ri][getSvgColumn(ti).id];
}
export function validRows(ti) {
  return state.tables[ti].rows
    .map((row, i) => ({ row, i }))
    .filter((x) => {
      const v = getKeyValue(ti, x.i);
      return v !== "" && v !== undefined && v !== null;
    });
}

// ── Pair selector ──────────────────────────────────────────────────────────────
export function getPair() {
  const p = (state.selectedPair || "0-1").split("-");
  return [parseInt(p[0]), parseInt(p[1])];
}
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

  menu.innerHTML = "";

  for (let i = 0; i < tables.length; i++) {
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

  // Update display text
  const [selectedI, selectedJ] = old.split("-").map(Number);
  const selectedLabel = tables[selectedI].name + " → " + tables[selectedJ].name;
  if (display) display.textContent = selectedLabel;
}

// ── Result helpers ─────────────────────────────────────────────────────────────
export function getMatchedIdx(rows) {
  const m1 = new Set(),
    m2 = new Set();
  rows.forEach((r) => {
    if (r.i1 >= 0) m1.add(r.i1);
    if (r.i2 >= 0) m2.add(r.i2);
  });
  return { m1, m2 };
}
export function nullBadge() {
  return `<span class="null-val">NULL</span>`;
}
export function emptyState() {
  return `<p class="empty-state">No rows returned for this join type with the current data.</p>`;
}

// ── Table / row / column mutations ─────────────────────────────────────────────
export function addTable() {
  // Limit: 2 defaults + 4 new = 6 total
  if (state.tables.length >= 6) return false;
  state.tables.push({
    name: "table_" + (state.tables.length + 1),
    columns: [{ id: "col_0", name: "id", type: "number", isKey: true }],
    rows: [],
    svgColId: "col_0",
  });
  return true;
}
export function removeTable(ti) {
  if (state.tables.length <= 2) return false;
  state.tables.splice(ti, 1);
  return true;
}
export function addRow(ti) {
  const newRow = {};
  state.tables[ti].columns.forEach((col) => {
    newRow[col.id] = DATA_TYPES[col.type]?.defaultValue ?? "";
  });
  state.tables[ti].rows.push(newRow);
}
export function delRow(ti, ri) {
  state.tables[ti].rows.splice(ri, 1);
}
export function updateVal(ti, ri, colId, val) {
  const col = state.tables[ti].columns.find((c) => c.id === colId);
  if (!col) return;
  let parsed = val;
  if (col.type === "number") parsed = val === "" ? "" : Number(val);
  else if (col.type === "float") parsed = val === "" ? "" : parseFloat(val);
  else if (col.type === "boolean")
    parsed = val === "on" || val === true || val === "true";
  state.tables[ti].rows[ri][colId] = parsed;
}
export function addColumn(ti, colName, colType) {
  const colId = "col_" + Date.now();
  state.tables[ti].columns.push({
    id: colId,
    name: colName,
    type: colType || "string",
    isKey: false,
  });
  const defaultVal = DATA_TYPES[colType]?.defaultValue ?? "";
  state.tables[ti].rows.forEach((row) => {
    row[colId] = defaultVal;
  });
}
export function removeColumn(ti, colId) {
  const col = state.tables[ti].columns.find((c) => c.id === colId);
  if (!col || col.isKey || state.tables[ti].columns.length <= 1) return false;
  state.tables[ti].columns = state.tables[ti].columns.filter(
    (c) => c.id !== colId,
  );
  state.tables[ti].rows.forEach((row) => {
    delete row[colId];
  });
  if (state.tables[ti].svgColId === colId)
    state.tables[ti].svgColId = state.tables[ti].columns[0].id;
  return true;
}
export function setSvgColumn(ti, colId) {
  state.tables[ti].svgColId = colId;
}

// ── Join condition helpers ────────────────────────────────────────────────────
export function setJoinCondition(conditionIndex, condition) {
  if (conditionIndex >= 0 && conditionIndex < state.joinConditions.length) {
    state.joinConditions[conditionIndex] = condition;
  } else if (conditionIndex === state.joinConditions.length) {
    state.joinConditions.push(condition);
  }
}

export function removeJoinCondition(conditionIndex) {
  state.joinConditions.splice(conditionIndex, 1);
}

export function clearAllData() {
  state.tables.forEach((t) => {
    t.rows = [];
  });
  state.joinConditions = [];
}

export function loadPreset(presetData) {
  state.tables = JSON.parse(JSON.stringify(presetData.tables));
  state.joinConditions = JSON.parse(
    JSON.stringify(presetData.joinConditions || []),
  );
}

export function getJoinConditionDisplay() {
  if (!state.joinConditions.length) return "No join condition set";
  return state.joinConditions
    .map((cond) => {
      const leftTable = state.tables[cond.leftTable];
      const rightTable = state.tables[cond.rightTable];
      const leftColName =
        leftTable.columns.find((c) => c.id === cond.leftCol)?.name || "?";
      const rightColName =
        rightTable.columns.find((c) => c.id === cond.rightCol)?.name || "?";
      return `${leftTable.name}.${leftColName} ${cond.op} ${rightTable.name}.${rightColName}`;
    })
    .join(" AND ");
}
