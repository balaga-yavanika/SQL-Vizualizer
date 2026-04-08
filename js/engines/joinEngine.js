// ── js/engines/joinEngine.js ──────────────────────────────────────────────────
import { validRows, getKeyValue, getPair } from "../core/utils.js";
import { state } from "../core/state.js";

// ── Helper: Validate SET OPERATORS compatibility ──────────────────────────────
export function validateSetOperatorCompatibility(li, ri) {
  const leftTable = state.tables[li];
  const rightTable = state.tables[ri];

  if (!leftTable || !rightTable) {
    return { valid: false, error: "Invalid table selection: One or both tables don't exist. Try selecting a different table pair or add a new table." };
  }

  // Check column count
  if (leftTable.columns.length !== rightTable.columns.length) {
    return {
      valid: false,
      error: `Column count mismatch: ${leftTable.name} has ${leftTable.columns.length}, ${rightTable.name} has ${rightTable.columns.length}`
    };
  }

  // Check that columns are in the same order (by ID and type)
  for (let i = 0; i < leftTable.columns.length; i++) {
    const lCol = leftTable.columns[i];
    const rCol = rightTable.columns[i];

    // Check if column IDs match (ensures same logical column)
    if (lCol.id !== rCol.id) {
      return {
        valid: false,
        error: `Column order mismatch at position ${i + 1}: "${lCol.name}" (ID: ${lCol.id}) vs "${rCol.name}" (ID: ${rCol.id}). Reorder columns to match.`
      };
    }

    // Check data types match
    if (lCol.type !== rCol.type) {
      return {
        valid: false,
        error: `Column type mismatch at position ${i + 1}\n${leftTable.name}: "${lCol.name}" is ${lCol.type}\n${rightTable.name}: "${rCol.name}" is ${rCol.type}\n\nBoth tables must have matching column types.\nChange one column type to match, or use a different column.`
      };
    }
  }

  return { valid: true };
}

// ── Helper: Strict comparison without type coercion ──────────────────────────────
/**
 * Compare two values with type safety (no coercion)
 * Returns null if either value is null/undefined
 * @param {any} leftVal - Left value
 * @param {any} rightVal - Right value
 * @param {string} op - Comparison operator: =, >, <, >=, <=
 * @returns {boolean|null} Comparison result or null if values are null/undefined
 */
function compareValues(leftVal, rightVal, op) {
  // Handle null/undefined — don't match
  if (leftVal == null || rightVal == null) {
    return false;
  }

  // For equality, use strict comparison
  if (op === "=") {
    return leftVal === rightVal;
  }

  // For numeric comparisons, both values must be the same type
  // If types differ, convert strings that look like numbers to numbers
  let l = leftVal;
  let r = rightVal;

  // Attempt numeric conversion only if one is a number and the other is a numeric string
  if (typeof l === "number" && typeof r === "string" && !isNaN(r) && r !== "") {
    r = Number(r);
  } else if (typeof r === "number" && typeof l === "string" && !isNaN(l) && l !== "") {
    l = Number(l);
  } else if (typeof l !== typeof r) {
    // Different types and not a number/string case — no match
    return false;
  }

  // Now do strict type comparison
  switch (op) {
    case ">":
      return l > r;
    case "<":
      return l < r;
    case ">=":
      return l >= r;
    case "<=":
      return l <= r;
    default:
      return false;
  }
}

// ── Helper: Evaluate custom join conditions  ───────────────────────────────────
function matchesConditions(li, rowIndexLeft, ri, rowIndexRight) {
  // Filter out null conditions (incomplete join conditions)
  const validConditions = state.joinConditions.filter((c) => c !== null);

  // Find conditions that apply to this table pair
  const applicableConditions = validConditions.filter((cond) => {
    const effectiveLeftTable = state.currentOp === "self" ? li : cond.leftTable;
    const effectiveRightTable = state.currentOp === "self" ? ri : cond.rightTable;
    return effectiveLeftTable === li && effectiveRightTable === ri;
  });

  // If custom conditions exist for this table pair, use them
  if (applicableConditions.length > 0) {
    return applicableConditions.every((cond) => {
      const leftRow = state.tables[li].rows[rowIndexLeft];
      const rightRow = state.tables[ri].rows[rowIndexRight];
      const leftVal = leftRow?.[cond.leftCol];
      const rightVal = rightRow?.[cond.rightCol];

      // Use strict comparison function (no type coercion)
      return compareValues(leftVal, rightVal, cond.op);
    });
  }

  // Fallback: use key-based matching if no conditions apply to this pair
  const kv = (ti, i) => getKeyValue(ti, i);
  // For self-join, compare against original table index
  const rightTableIdx = state.currentOp === "self" ? getPair()[0] : ri;
  return kv(li, rowIndexLeft) === kv(rightTableIdx, rowIndexRight);
}

export function computeResult(op) {
  let [li, ri] = getPair();
  if (op === "self") ri = li;
  const vl = validRows(li),
    vr = validRows(ri);
  const kv = (ti, i) => getKeyValue(ti, i);

  // ── Set operators ────────────────────────────────────────────────────────────
  if (op === "union") {
    // UNION: combine unique rows from both tables, show all columns
    const leftTable = state.tables[li];
    const rightTable = state.tables[ri];
    const leftColIds = leftTable.columns.map(c => c.id);
    const rightColIds = rightTable.columns.map(c => c.id);
    
    // Get all rows from left table
    const leftRows = vl.map(x => ({
      ti: li,
      ri: x.i,
      cols: leftColIds
    }));
    
    // Get all rows from right table  
    const rightRows = vr.map(x => ({
      ti: ri,
      ri: x.i,
      cols: rightColIds
    }));
    
    // Combine and deduplicate by comparing all column values
    const allRows = [...leftRows, ...rightRows];
    const uniqueRows = [];
    const seen = new Set();
    
    for (const row of allRows) {
      const table = state.tables[row.ti];
      const rowData = table.rows[row.ri];
      // Create key from all column values
      const key = JSON.stringify(rowData);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRows.push(row);
      }
    }
    
    // Mark as set op so renderer knows to show all columns
    return uniqueRows.map(r => ({ ...r, isSetOp: true }));
  }

  if (op === "union_all") {
    // UNION ALL: combine all rows from both tables, show all columns
    const leftTable = state.tables[li];
    const rightTable = state.tables[ri];
    const leftColIds = leftTable.columns.map(c => c.id);
    const rightColIds = rightTable.columns.map(c => c.id);
    
    return [
      ...vl.map(x => ({ ti: li, ri: x.i, cols: leftColIds, isSetOp: true })),
      ...vr.map(x => ({ ti: ri, ri: x.i, cols: rightColIds, isSetOp: true }))
    ];
  }

  if (op === "except") {
    // EXCEPT: rows in left but not in right, show all columns
    const leftTable = state.tables[li];
    const rightTable = state.tables[ri];
    const leftColIds = leftTable.columns.map(c => c.id);
    const rightColIds = rightTable.columns.map(c => c.id);
    
    // Build set of right row keys
    const rightKeys = new Set(vr.map(b => {
      const row = state.tables[ri].rows[b.i];
      return JSON.stringify(row);
    }));
    
    return vl
      .filter(a => !rightKeys.has(JSON.stringify(state.tables[li].rows[a.i])))
      .map(x => ({ ti: li, ri: x.i, cols: leftColIds, isSetOp: true }));
  }

  if (op === "intersect") {
    // INTERSECT: rows in both tables, show all columns
    const leftTable = state.tables[li];
    const rightTable = state.tables[ri];
    const leftColIds = leftTable.columns.map(c => c.id);
    const rightColIds = rightTable.columns.map(c => c.id);
    
    const rightKeys = new Set(vr.map(b => 
      JSON.stringify(state.tables[ri].rows[b.i])
    ));
    
    return vl
      .filter(a => rightKeys.has(JSON.stringify(state.tables[li].rows[a.i])))
      .map(x => ({ ti: li, ri: x.i, cols: leftColIds, isSetOp: true }));
  }

  // ── Semi / Anti joins ────────────────────────────────────────────────────────
  if (op === "left_anti")
    return vl
      .filter((a) => !vr.some((b) => matchesConditions(li, a.i, ri, b.i)))
      .map((a) => ({ c1: kv(li, a.i), c2: null, i1: a.i, i2: -1 }));

  if (op === "right_anti")
    return vr
      .filter((b) => !vl.some((a) => matchesConditions(li, a.i, ri, b.i)))
      .map((b) => ({ c1: null, c2: kv(ri, b.i), i1: -1, i2: b.i }));

  if (op === "left_semi")
    return vl
      .filter((a) => vr.some((b) => matchesConditions(li, a.i, ri, b.i)))
      .map((a) => ({
        c1: kv(li, a.i),
        c2: undefined,
        i1: a.i,
        i2: -1,
        single: true,
      }));

  if (op === "right_semi")
    return vr
      .filter((b) => vl.some((a) => matchesConditions(li, a.i, ri, b.i)))
      .map((b) => ({
        c1: null,
        c2: kv(ri, b.i),
        i1: -1,
        i2: b.i,
        single: true,
      }));

  if (op === "exists")
    return vl
      .filter((a) => vr.some((b) => matchesConditions(li, a.i, ri, b.i)))
      .map((a) => ({
        c1: kv(li, a.i),
        c2: undefined,
        i1: a.i,
        i2: -1,
        single: true,
      }));

  if (op === "not_exists")
    return vl
      .filter((a) => !vr.some((b) => matchesConditions(li, a.i, ri, b.i)))
      .map((a) => ({
        c1: kv(li, a.i),
        c2: undefined,
        i1: a.i,
        i2: -1,
        single: true,
      }));

  // ── Self join ────────────────────────────────────────────────────────────────
  if (op === "self") {
    const rows = [];
    vl.forEach((a) =>
      vr
        .filter((b) => b.i !== a.i && matchesConditions(li, a.i, li, b.i))
        .forEach((b) =>
          rows.push({
            c1: kv(li, a.i),
            c2: kv(li, b.i),
            i1: a.i,
            i2: b.i,
            li,
            ri: li,
          }),
        ),
    );
    return rows;
  }

  // ── Standard joins (return index refs so renderer can show all columns) ──────
  if (op === "cross") {
    const rows = [];
    vl.forEach((a) =>
      vr.forEach((b) => rows.push({ i1: a.i, i2: b.i, li, ri })),
    );
    return rows;
  }
  if (op === "inner") {
    const rows = [];
    vl.forEach((a) =>
      vr
        .filter((b) => matchesConditions(li, a.i, ri, b.i))
        .forEach((b) => rows.push({ i1: a.i, i2: b.i, li, ri })),
    );
    return rows;
  }
  if (op === "left") {
    const rows = [];
    vl.forEach((a) => {
      const m = vr.filter((b) => matchesConditions(li, a.i, ri, b.i));
      if (m.length) m.forEach((b) => rows.push({ i1: a.i, i2: b.i, li, ri }));
      else rows.push({ i1: a.i, i2: -1, li, ri });
    });
    return rows;
  }
  if (op === "right") {
    const rows = [];
    vr.forEach((b) => {
      const m = vl.filter((a) => matchesConditions(li, a.i, ri, b.i));
      if (m.length) m.forEach((a) => rows.push({ i1: a.i, i2: b.i, li, ri }));
      else rows.push({ i1: -1, i2: b.i, li, ri });
    });
    return rows;
  }
  if (op === "full") {
    const rows = [],
      used = new Set();
    vl.forEach((a) => {
      const m = vr.filter((b) => matchesConditions(li, a.i, ri, b.i));
      if (m.length)
        m.forEach((b) => {
          rows.push({ i1: a.i, i2: b.i, li, ri });
          used.add(b.i);
        });
      else rows.push({ i1: a.i, i2: -1, li, ri });
    });
    vr.filter((b) => !used.has(b.i)).forEach((b) =>
      rows.push({ i1: -1, i2: b.i, li, ri }),
    );
    return rows;
  }
  return [];
}
