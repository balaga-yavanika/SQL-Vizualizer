/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Join Engine V2 — Post-Join Pipeline
 * ═══════════════════════════════════════════════════════════════════════════════
 * Extends the base join engine with new features. Maps 1:1 to:
 *   js/engines/joinEngine.js
 *
 * NEW in V2:
 *   Feature L  — OR condition logic for ON clause (conditionLogic: 'AND'|'OR')
 *   Feature A  — WHERE filtering (applied after join)
 *   Feature B  — ORDER BY sorting
 *   Feature C  — GROUP BY + aggregate functions (COUNT, SUM, AVG, MIN, MAX)
 *   Feature D  — HAVING filtering (applied after GROUP BY)
 *
 * Main export: computeResultV2(op, v2State) → processed rows
 */

import { state } from '../../js/core/state.js';
import { validRows, getKeyValue, getPair } from '../../js/core/utils.js';
import { computeResult, validateSetOperatorCompatibility } from '../../js/engines/joinEngine.js';

export { validateSetOperatorCompatibility };

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE L — OR CONDITION SUPPORT FOR ON CLAUSE
// ═══════════════════════════════════════════════════════════════════════════════

function compareValues(leftVal, rightVal, op, nullable = false) {
  if (leftVal == null && rightVal == null) return nullable;
  if (leftVal == null || rightVal == null) return false;
  if (op === '=') return leftVal === rightVal;
  let l = leftVal, r = rightVal;
  if (typeof l === 'number' && typeof r === 'string' && !isNaN(r) && r !== '') r = Number(r);
  else if (typeof r === 'number' && typeof l === 'string' && !isNaN(l) && l !== '') l = Number(l);
  else if (typeof l !== typeof r) return false;
  switch (op) {
    case '>': return l > r;
    case '<': return l < r;
    case '>=': return l >= r;
    case '<=': return l <= r;
    default: return false;
  }
}

function isNullableCol(nullableCols, ti, colId) {
  return nullableCols && nullableCols[`${ti}_${colId}`] === true;
}

function matchesConditionsOR(li, leftIdx, ri, rightIdx, nullableCols) {
  const valid = state.joinConditions.filter(c => c !== null && c.leftCol && c.rightCol);
  if (valid.length === 0) return false;
  return valid.some(cond => {
    const leftRow = state.tables[li]?.rows[leftIdx];
    const rightRow = state.tables[ri]?.rows[rightIdx];
    const nullable = isNullableCol(nullableCols, li, cond.leftCol) || isNullableCol(nullableCols, ri, cond.rightCol);
    return compareValues(leftRow?.[cond.leftCol], rightRow?.[cond.rightCol], cond.op, nullable);
  });
}

function matchesConditionsAND(li, leftIdx, ri, rightIdx, nullableCols) {
  const valid = state.joinConditions.filter(c => c !== null && c.leftCol && c.rightCol);
  if (valid.length === 0) return false;
  return valid.every(cond => {
    const leftRow = state.tables[li]?.rows[leftIdx];
    const rightRow = state.tables[ri]?.rows[rightIdx];
    const nullable = isNullableCol(nullableCols, li, cond.leftCol) || isNullableCol(nullableCols, ri, cond.rightCol);
    return compareValues(leftRow?.[cond.leftCol], rightRow?.[cond.rightCol], cond.op, nullable);
  });
}

/**
 * Full join computation with nullable + OR/AND condition support.
 * Set operators fall through to original computeResult (they don't use ON conditions).
 */
function computeJoinWithOR(op, conditionLogic = 'OR', nullableCols = {}) {
  let [li, ri] = getPair();
  if (op === 'self') ri = li;
  const vl = validRows(li), vr = validRows(ri);
  const kv = (ti, i) => getKeyValue(ti, i);
  const matchFn = conditionLogic === 'OR' ? matchesConditionsOR : matchesConditionsAND;
  const m = (a, b) => matchFn(li, a.i, ri, b.i, nullableCols);

  if (['union', 'union_all', 'except', 'intersect'].includes(op)) return computeResult(op);

  if (op === 'cross') {
    const rows = [];
    vl.forEach(a => vr.forEach(b => rows.push({ i1: a.i, i2: b.i, li, ri })));
    return rows;
  }
  if (op === 'inner') {
    const rows = [];
    vl.forEach(a => vr.filter(b => m(a, b)).forEach(b => rows.push({ i1: a.i, i2: b.i, li, ri })));
    return rows;
  }
  if (op === 'left') {
    const rows = [];
    vl.forEach(a => {
      const matched = vr.filter(b => m(a, b));
      if (matched.length) matched.forEach(b => rows.push({ i1: a.i, i2: b.i, li, ri }));
      else rows.push({ i1: a.i, i2: -1, li, ri });
    });
    return rows;
  }
  if (op === 'right') {
    const rows = [];
    vr.forEach(b => {
      const matched = vl.filter(a => m(a, b));
      if (matched.length) matched.forEach(a => rows.push({ i1: a.i, i2: b.i, li, ri }));
      else rows.push({ i1: -1, i2: b.i, li, ri });
    });
    return rows;
  }
  if (op === 'full') {
    const rows = [], used = new Set();
    vl.forEach(a => {
      const matched = vr.filter(b => m(a, b));
      if (matched.length) matched.forEach(b => { rows.push({ i1: a.i, i2: b.i, li, ri }); used.add(b.i); });
      else rows.push({ i1: a.i, i2: -1, li, ri });
    });
    vr.filter(b => !used.has(b.i)).forEach(b => rows.push({ i1: -1, i2: b.i, li, ri }));
    return rows;
  }
  if (op === 'left_anti') return vl.filter(a => !vr.some(b => m(a, b))).map(a => ({ c1: kv(li, a.i), c2: undefined, i1: a.i, i2: -1 }));
  if (op === 'right_anti') return vr.filter(b => !vl.some(a => m(a, b))).map(b => ({ c1: undefined, c2: kv(ri, b.i), i1: -1, i2: b.i }));
  if (op === 'left_semi') return vl.filter(a => vr.some(b => m(a, b))).map(a => ({ c1: kv(li, a.i), c2: undefined, i1: a.i, i2: -1, single: true }));
  if (op === 'right_semi') return vr.filter(b => vl.some(a => m(a, b))).map(b => ({ c1: null, c2: kv(ri, b.i), i1: -1, i2: b.i, single: true }));
  if (op === 'exists') return vl.filter(a => vr.some(b => m(a, b))).map(a => ({ c1: kv(li, a.i), c2: undefined, i1: a.i, i2: -1, single: true }));
  if (op === 'not_exists') return vl.filter(a => !vr.some(b => m(a, b))).map(a => ({ c1: kv(li, a.i), c2: undefined, i1: a.i, i2: -1, single: true }));
  if (op === 'self') {
    const rows = [];
    vl.forEach(a => vr.filter(b => b.i !== a.i && matchesConditionsOR(li, a.i, li, b.i)).forEach(b => rows.push({ c1: kv(li, a.i), c2: kv(li, b.i), i1: a.i, i2: b.i, li, ri: li })));
    return rows;
  }
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE A — WHERE FILTERING
// ═══════════════════════════════════════════════════════════════════════════════

function compareFilter(val, op, filterVal) {
  if (val === null || val === undefined || val === '') {
    return op === '!=' ? true : false;
  }
  const strVal = String(val).toLowerCase();
  const strFilter = String(filterVal).toLowerCase();
  const numVal = parseFloat(val);
  const numFilter = parseFloat(filterVal);
  const hasNum = !isNaN(numVal) && !isNaN(numFilter);

  switch (op) {
    case '=':        return hasNum ? numVal === numFilter : strVal === strFilter;
    case '!=':       return hasNum ? numVal !== numFilter : strVal !== strFilter;
    case '>':        return hasNum && numVal > numFilter;
    case '<':        return hasNum && numVal < numFilter;
    case '>=':       return hasNum && numVal >= numFilter;
    case '<=':       return hasNum && numVal <= numFilter;
    case 'contains': return strVal.includes(strFilter);
    default:         return false;
  }
}

function getRowTableValue(row, side, colId) {
  const [li, ri] = getPair();
  const tableIdx = side === 'right' ? ri : li;
  const rowIdx = side === 'right' ? row.i2 : row.i1;
  if (rowIdx === undefined || rowIdx < 0) return null;
  return state.tables[tableIdx]?.rows[rowIdx]?.[colId] ?? null;
}

/**
 * Applies WHERE filters to join result rows.
 * @param {Array} rows - Result rows from join computation
 * @param {Array} whereFilters - [{side: 'left'|'right', colId, op, val}]
 */
export function applyWhere(rows, whereFilters) {
  if (!whereFilters || whereFilters.length === 0) return rows;
  const active = whereFilters.filter(f => f.colId && f.val !== '' && f.val !== undefined && f.val !== null);
  if (active.length === 0) return rows;

  return rows.filter(row => {
    return active.every(f => {
      const val = getRowTableValue(row, f.side, f.colId);
      return compareFilter(val, f.op, f.val);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE B — ORDER BY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Sorts join result rows.
 * @param {Array} rows - Result rows
 * @param {Array} orderBy - [{side: 'left'|'right', colId, dir: 'ASC'|'DESC'}]
 */
export function applyOrderBy(rows, orderBy) {
  if (!orderBy || orderBy.length === 0) return rows;
  const active = orderBy.filter(o => o.colId);
  if (active.length === 0) return rows;

  return [...rows].sort((a, b) => {
    for (const order of active) {
      const aVal = getRowTableValue(a, order.side, order.colId);
      const bVal = getRowTableValue(b, order.side, order.colId);

      if (aVal === null && bVal === null) continue;
      if (aVal === null) return order.dir === 'ASC' ? 1 : -1;
      if (bVal === null) return order.dir === 'ASC' ? -1 : 1;

      const numA = parseFloat(aVal), numB = parseFloat(bVal);
      const useNum = !isNaN(numA) && !isNaN(numB);
      const cmp = useNum ? numA - numB : String(aVal).localeCompare(String(bVal));
      if (cmp !== 0) return order.dir === 'ASC' ? cmp : -cmp;
    }
    return 0;
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE C — GROUP BY + AGGREGATES
// ═══════════════════════════════════════════════════════════════════════════════

export const AGG_FUNCS = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];

/**
 * Groups rows and computes aggregates.
 * @param {Array} rows - Result rows
 * @param {Array} groupBy - [{side: 'left'|'right', colId}]
 * @param {Array} aggregates - [{func: 'COUNT'|..., side, colId, alias}]
 * @returns {Array} Grouped rows with _isGrouped, _groupCount, _aggResults, _keyVals
 */
export function applyGroupBy(rows, groupBy, aggregates = []) {
  const activeGroups = groupBy.filter(g => g.colId);
  if (activeGroups.length === 0) return rows;

  const groups = new Map();
  for (const row of rows) {
    const key = activeGroups
      .map(g => String(getRowTableValue(row, g.side, g.colId) ?? 'NULL'))
      .join('\u0000');
    if (!groups.has(key)) {
      const keyVals = {};
      activeGroups.forEach(g => {
        keyVals[`${g.side}_${g.colId}`] = getRowTableValue(row, g.side, g.colId);
      });
      groups.set(key, { groupRow: row, rows: [], keyVals });
    }
    groups.get(key).rows.push(row);
  }

  return [...groups.values()].map(group => {
    const aggResults = {};
    aggregates.filter(a => a.func && a.colId).forEach(agg => {
      const vals = group.rows
        .map(r => getRowTableValue(r, agg.side, agg.colId))
        .filter(v => v !== null && v !== '');
      const nums = vals.map(v => parseFloat(v)).filter(v => !isNaN(v));
      const key = `${agg.func}_${agg.side}_${agg.colId}`;
      switch (agg.func) {
        case 'COUNT': aggResults[key] = vals.length; break;
        case 'SUM':   aggResults[key] = nums.reduce((s, v) => s + v, 0); break;
        case 'AVG':   aggResults[key] = nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : null; break;
        case 'MIN':   aggResults[key] = nums.length ? Math.min(...nums) : null; break;
        case 'MAX':   aggResults[key] = nums.length ? Math.max(...nums) : null; break;
      }
    });
    return {
      ...group.groupRow,
      _isGrouped: true,
      _groupCount: group.rows.length,
      _aggResults: aggResults,
      _keyVals: group.keyVals,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE D — HAVING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Filters grouped rows by aggregate condition.
 * @param {Array} groupedRows - Output from applyGroupBy
 * @param {Array} havingFilters - [{func, side, colId, op, val}]
 */
export function applyHaving(groupedRows, havingFilters) {
  if (!havingFilters || havingFilters.length === 0) return groupedRows;
  const active = havingFilters.filter(h => h.func && h.colId && h.val !== '' && h.val !== undefined);
  if (active.length === 0) return groupedRows;

  return groupedRows.filter(row => {
    return active.every(filter => {
      const key = `${filter.func}_${filter.side}_${filter.colId}`;
      const aggVal = row._aggResults?.[key];
      if (aggVal === null || aggVal === undefined) return false;
      return compareFilter(aggVal, filter.op, filter.val);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN V2 EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Full pipeline: join → WHERE → GROUP BY → HAVING → ORDER BY
 * @param {string} op - Join operation key
 * @param {Object} v2State - V2-specific state
 * @param {string}  v2State.conditionLogic  'AND' | 'OR' for ON clause (Feature L)
 * @param {Array}   v2State.whereFilters    WHERE filters (Feature A)
 * @param {Array}   v2State.orderBy         ORDER BY columns (Feature B)
 * @param {Array}   v2State.groupBy         GROUP BY columns (Feature C)
 * @param {Array}   v2State.aggregates      Aggregate functions (Feature C)
 * @param {Array}   v2State.havingFilters   HAVING filters (Feature D)
 */
export function computeResultV2(op, v2State = {}) {
  const {
    conditionLogic = 'AND',
    whereFilters = [],
    orderBy = [],
    groupBy = [],
    aggregates = [],
    havingFilters = [],
    nullableJoinCols = {},
  } = v2State;

  // Step 1: Base join with nullable + condition logic support
  const useNullable = Object.keys(nullableJoinCols).length > 0;
  const needsV2Join = conditionLogic === 'OR' || useNullable;
  let rows = needsV2Join ? computeJoinWithOR(op, conditionLogic, nullableJoinCols) : computeResult(op);

  // Step 2: WHERE
  rows = applyWhere(rows, whereFilters);

  // Step 3: GROUP BY + aggregates → Step 4: HAVING
  const hasActiveGroups = groupBy.some(g => g.colId);
  if (hasActiveGroups) {
    rows = applyGroupBy(rows, groupBy, aggregates);
    rows = applyHaving(rows, havingFilters);
  }

  // Step 5: ORDER BY
  rows = applyOrderBy(rows, orderBy);

  return rows;
}
