/**
 * Joins-specific UI rendering functions
 * Used by pages/joins/joins.js
 */
import { state, PALETTE, DATA_TYPES } from "../../js/core/state.js";
import {
  getKeyColumn,
  getKeyValue,
  getSvgColumn,
  getSvgValue,
  getPair,
  getMatchedIdx,
  nullBadge,
  emptyState,
} from "../../js/core/utils.js";
import { computeResult } from "../../js/engines/joinEngine.js";

/**
 * Build SVG column selector dropdown for a table
 */
export function buildSvgColSelector(ti) {
  const t = state.tables[ti];
  if (t.columns.length <= 1) return "";
  const pal = PALETTE[ti % PALETTE.length];
  const currentCol = t.columns.find((c) => c.id === t.svgColId);
  const currentColName = currentCol ? currentCol.name : "Select column";
  const items = t.columns
    .map(
      (c) =>
        `<button class="dropdown-item${c.id === t.svgColId ? " selected" : ""}" data-value="${c.id}">${c.name}</button>`,
    )
    .join("");
  return `<div class="svg-col-selector">
    <span class="svg-col-label" style="color:${pal.text}">diagram shows:</span>
    <div class="custom-dropdown svg-col-dropdown" id="svg-col-dropdown-${ti}">
      <button class="dropdown-toggle" id="svg-col-toggle-${ti}" aria-haspopup="listbox" style="border-color:${pal.stroke};color:${pal.text}">
        <span id="svg-col-display-${ti}">${currentColName}</span>
        <span class="dropdown-arrow">▼</span>
      </button>
      <div class="dropdown-menu" id="svg-col-menu-${ti}" style="display: none">
        ${items}
      </div>
    </div>
  </div>`;
}

/**
 * Render data tables with editable cells
 */
export function renderTables(m1, m2, li, ri) {
  const area = document.getElementById("tables-area");
  const addBtn = area.querySelector(".add-tbl-btn");
  [...area.querySelectorAll(".tbl-wrap")].forEach((e) => e.remove());

  state.tables.forEach((t, ti) => {
    const pal = PALETTE[ti % PALETTE.length];
    const matchSet = ti === li ? m1 : ti === ri ? m2 : new Set();
    const colCount = t.columns.length;
    const gridCols = `18px ${Array(colCount).fill("1fr").join(" ")} 22px`;
    const div = document.createElement("div");
    div.className = "tbl-wrap";

    let html = `
      <div class="tbl-head" style="background:${pal.fill};color:${pal.text};border-bottom:1px solid ${pal.stroke}">
        <span>${t.name}</span>
        ${
          state.tables.length > 2
            ? `<button onclick="app.removeTableAndRender(${ti})" title="Remove table">×</button>`
            : ""
        }
      </div>
      <div class="col-hr" style="grid-template-columns:${gridCols}">
        <span>#</span>`;

    t.columns.forEach((col) => {
      html += `<span class="col-header-cell" title="${col.name}${col.isKey ? " (key)" : ""}">
        <span class="col-header-name">${col.name}</span>
        ${
          col.isKey
            ? `<span class="key-badge" style="color:${pal.text}">key</span>`
            : `<button class="col-remove-btn" onclick="app.removeColAndRender(${ti},'${col.id}')" title="Remove">×</button>`
        }
      </span>`;
    });

    html += `<span></span></div><div id="tb-body-${ti}">`;

    t.rows.forEach((row, ri2) => {
      const isMatch = matchSet.has(ri2);
      html += `<div class="tbl-row${isMatch ? " matched" : ""}"
        style="grid-template-columns:${gridCols};${isMatch ? `background:${pal.fill};outline-color:${pal.stroke}` : ""}">
        <span class="row-num">${ri2 + 1}</span>`;

      t.columns.forEach((col) => {
        const colVal = row[col.id];
        const dt = DATA_TYPES[col.type] || DATA_TYPES.string;
        const stepA = dt.step ? ` step="${dt.step}"` : "";
        if (col.type === "boolean") {
          html += `<label class="bool-input"><input type="checkbox" ${colVal ? "checked" : ""}
            onchange="app.updateValAndRefresh(${ti},${ri2},'${col.id}',this.checked)"
            ${col.isKey ? "disabled" : ""}></label>`;
        } else {
          html += `<input class="${col.isKey ? "id-input" : "col-input"}" type="${dt.inputType}"${stepA}
            value="${colVal ?? ""}" placeholder="${col.name}"
            oninput="app.updateValAndRefresh(${ti},${ri2},'${col.id}',this.value)"
            onchange="app.updateValAndRefresh(${ti},${ri2},'${col.id}',this.value)"
            ${col.isKey ? 'data-key="true"' : ""}>`;
        }
      });

      html += `<button class="del-btn" onclick="app.delRowAndRender(${ti},${ri2})">×</button></div>`;
    });

    html += `</div>
      <button class="add-row-btn" onclick="app.addRowAndFocus(${ti})">+ row</button>
      <button class="add-col-btn" onclick="app.showColModal(${ti})">+ column</button>
      ${buildSvgColSelector(ti)}`;

    div.innerHTML = html;
    area.insertBefore(div, addBtn);
  });

  // Disable "Add Table" button if limit reached (2 defaults + 4 new = 6 total)
  if (addBtn) {
    const isLimited = state.tables.length >= 6;
    addBtn.disabled = isLimited;
    addBtn.title = isLimited ? "Maximum 6 tables (2 defaults + 4 new)" : "Add a new table";
    addBtn.style.opacity = isLimited ? "0.5" : "1";
    addBtn.style.cursor = isLimited ? "not-allowed" : "pointer";
  }
}

/**
 * Render SVG diagram showing join relationships
 */
export function renderConn() {
  const svg = document.getElementById("conn-svg");
  let [li, ri] = getPair();
  if (state.currentOp === "self") ri = li;

  const palL = PALETTE[li % PALETTE.length];
  const palR = PALETTE[ri % PALETTE.length];

  const hasData = (ti) =>
    state.tables[ti].rows.some((row) => {
      const v = row[getKeyColumn(ti).id];
      return v !== "" && v !== undefined && v !== null;
    });

  if (!hasData(li) && !hasData(ri)) {
    // Placeholder when no data
    const W = 480,
      H = 130;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.style.display = "block";
    svg.innerHTML = `
      <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="10"
        fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="6 4"/>
      <rect x="20" y="28" width="96" height="${H - 56}" rx="8"
        fill="${palL.fill}" stroke="${palL.stroke}" stroke-width="0.8" stroke-dasharray="4 3"/>
      <rect x="${W - 116}" y="28" width="96" height="${H - 56}" rx="8"
        fill="${palR.fill}" stroke="${palR.stroke}" stroke-width="0.8" stroke-dasharray="4 3"/>
      <text x="${W / 2}" y="${H / 2 - 4}" text-anchor="middle" font-size="9"
        font-family="var(--font-main, sans-serif)" fill="rgba(202,202,202,0.3)">
        fill in values to see the diagram
      </text>
      <text x="68" y="${H - 10}" text-anchor="middle" font-size="9"
        font-family="var(--font-main, sans-serif)" fill="${palL.text}" opacity="0.45">${state.tables[li].name}</text>
      <text x="${W - 68}" y="${H - 10}" text-anchor="middle" font-size="9"
        font-family="var(--font-main, sans-serif)" fill="${palR.text}" opacity="0.45">${state.tables[ri].name}</text>`;
    return;
  }

  // Full diagram with connections
  const rows = computeResult(state.currentOp);
  const pairs = rows.filter((r) => r.i1 >= 0 && r.i2 >= 0);

  const lCount = Math.max(state.tables[li].rows.length, 1);
  const rCount = Math.max(state.tables[ri].rows.length, 1);
  const rowH = 34,
    padY = 22,
    W = 480,
    LX = 106,
    RX = 374;
  const H = Math.max(lCount, rCount) * rowH + padY * 2 + 32;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.display = "block";

  const lYs = Array.from(
    { length: state.tables[li].rows.length },
    (_, i) => padY + i * rowH + rowH / 2,
  );
  const rYs = Array.from(
    { length: state.tables[ri].rows.length },
    (_, i) => padY + i * rowH + rowH / 2,
  );

  let s = "";

  // Left boxes
  state.tables[li].rows.forEach((row, i) => {
    const displayVal = getSvgValue(li, i);
    const keyVal = getKeyValue(li, i);
    const empty = keyVal === "" || keyVal === undefined || keyVal === null;
    const isMatch = pairs.some((r) => r.i1 === i);
    const label = empty
      ? "—"
      : displayVal === "" || displayVal == null
        ? "·"
        : displayVal;
    s += `<rect x="22" y="${lYs[i] - 13}" width="84" height="26" rx="6"
      fill="${palL.fill}" stroke="${palL.stroke}" stroke-width="${isMatch ? 1.8 : 0.8}"
      ${empty ? 'opacity="0.4" stroke-dasharray="3 2"' : ""}/>
    <text x="64" y="${lYs[i] + 5}" text-anchor="middle" font-size="10"
      font-family="var(--font-mono,monospace)" fill="${palL.text}" ${empty ? 'opacity="0.35"' : ""}>${label}</text>`;
  });

  // Right boxes
  state.tables[ri].rows.forEach((row, i) => {
    const displayVal = getSvgValue(ri, i);
    const keyVal = getKeyValue(ri, i);
    const empty = keyVal === "" || keyVal === undefined || keyVal === null;
    const isMatch = pairs.some((r) => r.i2 === i);
    const isSelf = state.currentOp === "self";
    const label = empty
      ? "—"
      : displayVal === "" || displayVal == null
        ? "·"
        : displayVal;
    s += `<rect x="${W - 106}" y="${rYs[i] - 13}" width="84" height="26" rx="6"
      fill="${palR.fill}" stroke="${palR.stroke}" stroke-width="${isMatch ? 1.8 : 0.8}"
      ${isSelf ? 'stroke-dasharray="4 2"' : ""}
      ${empty ? 'opacity="0.4"' : ""}/>
    <text x="${W - 64}" y="${rYs[i] + 5}" text-anchor="middle" font-size="10"
      font-family="var(--font-mono,monospace)" fill="${palR.text}" ${empty ? 'opacity="0.35"' : ""}>${label}</text>`;
  });

  // Connector lines
  const seen = new Set();
  pairs.forEach((r) => {
    const key = `${r.i1}-${r.i2}`;
    if (seen.has(key)) return;
    seen.add(key);
    const y1 = lYs[r.i1],
      y2 = rYs[r.i2],
      mx = (LX + RX) / 2;
    s += `<path d="M${LX} ${y1} C${mx} ${y1} ${mx} ${y2} ${RX} ${y2}"
      fill="none" stroke="${palL.line}" stroke-width="1.8" opacity="0.72"/>`;
  });

  // Labels
  const lSvgCol = getSvgColumn(li);
  const rSvgCol = getSvgColumn(ri);
  s += `<text x="64" y="${H - 14}" text-anchor="middle" font-size="8"
    font-family="var(--font-main,sans-serif)" fill="${palL.text}">${state.tables[li].name}</text>
  <text x="64" y="${H - 4}" text-anchor="middle" font-size="9"
    font-family="var(--font-main,sans-serif)" fill="${palL.text}" opacity="0.45">.${lSvgCol.name}</text>
  <text x="${W - 64}" y="${H - 14}" text-anchor="middle" font-size="8"
    font-family="var(--font-main,sans-serif)" fill="${palR.text}">${state.currentOp === "self" ? state.tables[li].name + " (alias)" : state.tables[ri].name}</text>
  <text x="${W - 64}" y="${H - 4}" text-anchor="middle" font-size="9"
    font-family="var(--font-main,sans-serif)" fill="${palR.text}" opacity="0.45">.${rSvgCol.name}</text>`;

  svg.innerHTML = s;
}

/**
 * Render result table
 */
export function renderResult() {
  const rows = computeResult(state.currentOp);
  let [li, ri] = getPair();
  if (state.currentOp === "self") ri = li;

  const palL = PALETTE[li % PALETTE.length];
  const palR = PALETTE[ri % PALETTE.length];
  const isSingleCol = rows.length > 0 && rows[0].single;
  const isStdJoin =
    rows.length > 0 && !rows[0].single && rows[0].li !== undefined;

  document.getElementById("row-count").textContent =
    rows.length + " row" + (rows.length !== 1 ? "s" : "");

  const heads = document.getElementById("rg-heads");
  const body = document.getElementById("result-body");

  if (isSingleCol) {
    heads.style.gridTemplateColumns = "1fr";
    heads.innerHTML = `<div class="rg-head">id</div>`;
    body.innerHTML = rows.length
      ? rows
          .map(
            (r) => `<div class="rg-data-row" style="grid-template-columns:1fr">
          <div class="rg-cell" style="background:${palL.bg}">
            ${r.c1 === null || r.c1 === undefined ? nullBadge() : r.c1}
          </div></div>`,
          )
          .join("")
      : emptyState();
  } else if (isStdJoin) {
    const tL = state.tables[li],
      tR = state.tables[ri];
    const allCols = [
      ...tL.columns.map((c) => ({ ...c, side: "l", ti: li })),
      ...tR.columns.map((c) => ({ ...c, side: "r", ti: ri })),
    ];
    const tpl = allCols.map(() => "1fr").join(" ");
    heads.style.gridTemplateColumns = tpl;
    heads.innerHTML = allCols
      .map(
        (c) =>
          `<div class="rg-head" style="border-bottom:2px solid ${c.side === "l" ? palL.line : palR.line}33">
        ${state.tables[c.ti].name}.${c.name}</div>`,
      )
      .join("");
    body.innerHTML = rows.length
      ? rows
          .map((r) => {
            const lRow = r.i1 >= 0 ? tL.rows[r.i1] : null;
            const rRow = r.i2 >= 0 ? tR.rows[r.i2] : null;
            const cells = allCols.map((c) => {
              const rd = c.side === "l" ? lRow : rRow;
              const pal = c.side === "l" ? palL : palR;
              const val = rd ? rd[c.id] : null;
              return `<div class="rg-cell" style="background:${pal.bg}">
              ${val === null || val === undefined || val === "" ? nullBadge() : val}</div>`;
            });
            return `<div class="rg-data-row" style="grid-template-columns:${tpl}">${cells.join("")}</div>`;
          })
          .join("")
      : emptyState();
  } else {
    // Anti joins
    heads.style.gridTemplateColumns = "1fr 1fr";
    heads.innerHTML = `<div class="rg-head">${state.tables[li].name}.id</div>
      <div class="rg-head">${state.tables[ri].name}.id</div>`;
    body.innerHTML = rows.length
      ? rows
          .map(
            (
              r,
            ) => `<div class="rg-data-row" style="grid-template-columns:1fr 1fr">
          <div class="rg-cell" style="background:${palL.bg}">${r.c1 === null ? nullBadge() : r.c1}</div>
          <div class="rg-cell" style="background:${palR.bg}">${r.c2 === null ? nullBadge() : r.c2 === undefined ? "—" : r.c2}</div>
        </div>`,
          )
          .join("")
      : emptyState();
  }
}
