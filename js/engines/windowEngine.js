// ── js/engines/windowEngine.js ────────────────────────────────────────────────
// Window functions engine — to be built next after joins are complete.
//
// Planned window functions:
//   ROW_NUMBER()   — unique sequential int per row within partition
//   RANK()         — rank with gaps for ties
//   DENSE_RANK()   — rank without gaps for ties
//   NTILE(n)       — divide rows into n buckets
//   LAG(col, n)    — value from n rows before in partition
//   LEAD(col, n)   — value from n rows ahead in partition
//   FIRST_VALUE()  — first value in the window frame
//   LAST_VALUE()   — last value in the window frame
//   SUM / AVG / COUNT / MIN / MAX — running aggregates over a frame
//
// Each function will take:
//   { rows, partitionBy, orderBy, frameStart, frameEnd }
// and return annotated rows with the computed window column appended.

import { state } from "../core/state.js";

/**
 * Partitions rows by the given column id.
 * Returns a Map<partitionKey, rowIndex[]>
 */
export function partitionRows(ti, partitionColId) {
  const map = new Map();
  state.tables[ti].rows.forEach((row, i) => {
    const key = partitionColId ? String(row[partitionColId]) : "__all__";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(i);
  });
  return map;
}

/**
 * Sorts row indices within each partition by the given column id.
 */
export function sortPartition(ti, indices, orderColId, direction = "asc") {
  return [...indices].sort((a, b) => {
    const va = state.tables[ti].rows[a][orderColId];
    const vb = state.tables[ti].rows[b][orderColId];
    if (va === vb) return 0;
    const cmp = va < vb ? -1 : 1;
    return direction === "desc" ? -cmp : cmp;
  });
}

/**
 * ROW_NUMBER — 1-based sequential number per row in partition.
 */
export function rowNumber(ti, partitionColId, orderColId, direction = "asc") {
  const partitions = partitionRows(ti, partitionColId);
  const result = new Array(state.tables[ti].rows.length).fill(null);
  partitions.forEach((indices) => {
    const sorted = sortPartition(ti, indices, orderColId, direction);
    sorted.forEach((rowIdx, pos) => {
      result[rowIdx] = pos + 1;
    });
  });
  return result; // index → ROW_NUMBER value
}

/**
 * RANK — 1-based rank with gaps on ties.
 */
export function rank(ti, partitionColId, orderColId, direction = "asc") {
  const partitions = partitionRows(ti, partitionColId);
  const result = new Array(state.tables[ti].rows.length).fill(null);
  partitions.forEach((indices) => {
    const sorted = sortPartition(ti, indices, orderColId, direction);
    let r = 1;
    sorted.forEach((rowIdx, pos) => {
      if (pos > 0) {
        const prev = state.tables[ti].rows[sorted[pos - 1]][orderColId];
        const curr = state.tables[ti].rows[rowIdx][orderColId];
        if (curr !== prev) r = pos + 1;
      }
      result[rowIdx] = r;
    });
  });
  return result;
}

/**
 * DENSE_RANK — rank without gaps on ties.
 */
export function denseRank(ti, partitionColId, orderColId, direction = "asc") {
  const partitions = partitionRows(ti, partitionColId);
  const result = new Array(state.tables[ti].rows.length).fill(null);
  partitions.forEach((indices) => {
    const sorted = sortPartition(ti, indices, orderColId, direction);
    let r = 1;
    sorted.forEach((rowIdx, pos) => {
      if (pos > 0) {
        const prev = state.tables[ti].rows[sorted[pos - 1]][orderColId];
        const curr = state.tables[ti].rows[rowIdx][orderColId];
        if (curr !== prev) r++;
      }
      result[rowIdx] = r;
    });
  });
  return result;
}

/**
 * LAG — value from n rows before in partition/order.
 * Returns null for rows where lag is out of bounds.
 */
export function lag(
  ti,
  targetColId,
  partitionColId,
  orderColId,
  n = 1,
  direction = "asc",
) {
  const partitions = partitionRows(ti, partitionColId);
  const result = new Array(state.tables[ti].rows.length).fill(null);
  partitions.forEach((indices) => {
    const sorted = sortPartition(ti, indices, orderColId, direction);
    sorted.forEach((rowIdx, pos) => {
      result[rowIdx] =
        pos >= n ? state.tables[ti].rows[sorted[pos - n]][targetColId] : null;
    });
  });
  return result;
}

/**
 * LEAD — value from n rows ahead in partition/order.
 */
export function lead(
  ti,
  targetColId,
  partitionColId,
  orderColId,
  n = 1,
  direction = "asc",
) {
  const partitions = partitionRows(ti, partitionColId);
  const result = new Array(state.tables[ti].rows.length).fill(null);
  partitions.forEach((indices) => {
    const sorted = sortPartition(ti, indices, orderColId, direction);
    sorted.forEach((rowIdx, pos) => {
      result[rowIdx] =
        pos + n < sorted.length
          ? state.tables[ti].rows[sorted[pos + n]][targetColId]
          : null;
    });
  });
  return result;
}

/**
 * Running SUM over partition ordered by orderColId.
 */
export function runningSum(
  ti,
  targetColId,
  partitionColId,
  orderColId,
  direction = "asc",
) {
  const partitions = partitionRows(ti, partitionColId);
  const result = new Array(state.tables[ti].rows.length).fill(null);
  partitions.forEach((indices) => {
    const sorted = sortPartition(ti, indices, orderColId, direction);
    let acc = 0;
    sorted.forEach((rowIdx) => {
      acc += Number(state.tables[ti].rows[rowIdx][targetColId]) || 0;
      result[rowIdx] = acc;
    });
  });
  return result;
}
