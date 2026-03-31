// ── js/engines/joinEngine.js ──────────────────────────────────────────────────
import { validRows, getKeyValue, getPair } from "../core/utils.js";
import { state } from "../core/state.js";

// ── Helper: Evaluate custom join conditions  ───────────────────────────────────
function matchesConditions(li, rowIndexLeft, ri, rowIndexRight) {
  // If custom conditions exist, use them
  if (state.joinConditions.length > 0) {
    return state.joinConditions.every((cond) => {
      // Only evaluate conditions relevant to this table pair
      if (cond.leftTable !== li || cond.rightTable !== ri) return true;

      const leftRow = state.tables[li].rows[rowIndexLeft];
      const rightRow = state.tables[ri].rows[rowIndexRight];
      const leftVal = leftRow?.[cond.leftCol];
      const rightVal = rightRow?.[cond.rightCol];

      // Evaluate comparison operator
      switch (cond.op) {
        case "=":
          return leftVal == rightVal;
        case ">":
          return leftVal > rightVal;
        case "<":
          return leftVal < rightVal;
        case ">=":
          return leftVal >= rightVal;
        case "<=":
          return leftVal <= rightVal;
        default:
          return true;
      }
    });
  }

  // Fallback: use key-based matching
  const kv = (ti, i) => getKeyValue(ti, i);
  return kv(li, rowIndexLeft) == kv(ri, rowIndexRight);
}

export function computeResult(op) {
  let [li, ri] = getPair();
  if (op === "self") ri = li;
  const vl = validRows(li),
    vr = validRows(ri);
  const kv = (ti, i) => getKeyValue(ti, i);

  // ── Set operators ────────────────────────────────────────────────────────────
  if (op === "union")
    return [
      ...new Set([
        ...vl.map((x) => kv(li, x.i)),
        ...vr.map((x) => kv(ri, x.i)),
      ]),
    ].map((v) => ({ c1: v, c2: undefined, i1: -1, i2: -1, single: true }));

  if (op === "union_all")
    return [
      ...vl.map((x) => ({
        c1: kv(li, x.i),
        c2: undefined,
        i1: x.i,
        i2: -1,
        single: true,
      })),
      ...vr.map((x) => ({
        c1: kv(ri, x.i),
        c2: undefined,
        i1: -1,
        i2: x.i,
        single: true,
      })),
    ];

  if (op === "except")
    return vl
      .filter((a) => !vr.some((b) => kv(ri, b.i) == kv(li, a.i)))
      .map((a) => ({
        c1: kv(li, a.i),
        c2: undefined,
        i1: a.i,
        i2: -1,
        single: true,
      }));

  if (op === "intersect") {
    const s = new Set(vr.map((b) => kv(ri, b.i)));
    return [
      ...new Set(vl.filter((a) => s.has(kv(li, a.i))).map((a) => kv(li, a.i))),
    ].map((v) => ({ c1: v, c2: undefined, i1: -1, i2: -1, single: true }));
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
        c1: kv(ri, b.i),
        c2: undefined,
        i1: -1,
        i2: b.i,
        single: true,
      }));

  // ── Self join ────────────────────────────────────────────────────────────────
  if (op === "self") {
    const rows = [];
    vl.forEach((a) =>
      vr
        .filter((b) => b.i !== a.i && matchesConditions(li, b.i, li, a.i))
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
