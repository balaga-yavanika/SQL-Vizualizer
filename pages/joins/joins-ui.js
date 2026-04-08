/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Joins UI Rendering
 * ═══════════════════════════════════════════════════════════════════════════════
 * Handles all visual rendering for the joins page:
 * - Data tables with editable cells
 * - SVG diagram showing join connections
 * - Result table display
 * 
 * Sections:
 * - SVG Column Selector: Build dropdown for diagram column selection
 * - Table Rendering: Render editable data tables
 * - Diagram Rendering: SVG connection visualization
 * - Result Rendering: Display join results
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════
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
  getEmptyStateReason,
  getSvgEmptyStateReason,
  escapeHtml,
} from "../../js/core/utils.js";
import { LIMITS, LIMIT_MESSAGES } from "../../js/core/limits.js";
import { computeResult } from "../../js/engines/joinEngine.js";

// ═════════════════════════════════════════════════════════════════════════════━━
// SVG COLUMN SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Renders all SVG column selector dropdowns in the diagram header.
 * Shows selector for each table, color-coded by table.
 */
export function renderDiagramColSelectors() {
  const container = document.getElementById("diagram-col-selectors-container");
  if (!container) return;

  // Build HTML for all table selectors
  let html = "";
  state.tables.forEach((t, ti) => {
    if (!t.columns.length) return;
    const pal = PALETTE[ti % PALETTE.length];

    // Validate svgColId — ensure it exists in current columns
    // (handles case where column was deleted but svgColId wasn't cleared)
    if (t.svgColId && !t.columns.find((c) => c.id === t.svgColId)) {
      t.svgColId = t.columns[0]?.id || null;
    }

    const currentCol = t.columns.find((c) => c.id === t.svgColId);
    const currentColName = currentCol ? currentCol.name : "Select column";
    const items = t.columns
      .map(
        (c) =>
          `<button class="dropdown-item${c.id === t.svgColId ? " selected" : ""}" data-value="${c.id}">${c.name}</button>`,
      )
      .join("");

    html += `<div class="diagram-col-picker">
      <span class="diagram-col-label" style="color:${pal.text}">${t.name}:</span>
      <div class="custom-dropdown diagram-col-dropdown" id="diagram-col-dropdown-${ti}">
        <button class="dropdown-toggle" id="diagram-col-toggle-${ti}" aria-haspopup="listbox" style="border-color:${pal.stroke};color:${pal.text}">
          <span id="diagram-col-display-${ti}">${currentColName}</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        <div class="dropdown-menu" id="diagram-col-menu-${ti}" style="display: none">
          ${items}
        </div>
      </div>
    </div>`;
  });

  container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Renders all data tables with editable cells.
 * Creates table UI with: headers, rows, add row/column buttons, matched row highlighting.
 * @param {Set} m1 - Set of matched row indices for left table
 * @param {Set} m2 - Set of matched row indices for right table
 * @param {number} li - Left table index
 * @param {number} ri - Right table index
 */
export function renderTables(m1, m2, li, ri) {
  const area = document.getElementById("tables-area");
  if (!area) {
    console.warn("renderTables: tables-area container not found");
    return;
  }

  const addBtn = document.querySelector(".add-tbl-btn");
  if (!addBtn) return;

  [...area.querySelectorAll(".tbl-wrap")].forEach((e) => e.remove());

  state.tables.forEach((t, ti) => {
    const pal = PALETTE[ti % PALETTE.length];
    const matchSet = ti === li ? m1 : ti === ri ? m2 : new Set();
    const colCount = t.columns.length;
    const gridCols = `18px ${Array(colCount).fill("1fr").join(" ")} 22px`;
    const div = document.createElement("div");
    div.className = "tbl-wrap";

    // Table header with table name
    const escapedTableName = escapeHtml(t.name);
    let html = `
      <div class="tbl-head" style="background:${pal.fill};color:${pal.text};border-bottom:1px solid ${pal.stroke}" aria-label="Table: ${escapedTableName}">
        <span class="table-name" contenteditable="true"
          oninput="window.app.handleTableRenameInput(event, ${ti})"
          onblur="window.app.renameTableAndRender(${ti}, this.textContent)"
          onkeydown="if(event.key==='Enter'){this.blur();event.preventDefault()}else if(event.key==='Escape'){this.blur();event.preventDefault()}"
          tabindex="0"
          role="button"
          aria-label="Edit table name: ${escapedTableName}">${escapedTableName}</span>
        ${
          state.tables.length > 2
            ? `<button onclick="app.removeTableAndRender(${ti})" title="Remove table" aria-label="Remove table ${escapedTableName}">×</button>`
            : ""
        }
      </div>
      <div class="col-hr" style="grid-template-columns:${gridCols}">
        <span>#</span>`;

    // Column headers
    t.columns.forEach((col, ci) => {
      const isLastCol = ci === t.columns.length - 1;
      const dt = DATA_TYPES[col.type] || DATA_TYPES.string;
      const typeIcon = dt.icon ? `<i class="fa-solid ${dt.icon} col-type-icon" title="${dt.label}"></i>` : '';
      const escapedColName = escapeHtml(col.name);
      html += `<span class="col-header-cell" title="${escapedColName}${col.isKey ? " (key)" : ""}">
        ${typeIcon}
        <span class="col-header-name" contenteditable="true"
          oninput="window.app.handleColumnRenameInput(event, ${ti}, '${col.id}')"
          onblur="window.app.renameColumnAndRender(${ti}, '${col.id}', this.textContent)"
          onkeydown="if(event.key==='Enter'){this.blur();event.preventDefault()}else if(event.key==='Escape'){this.blur();event.preventDefault()}"
          tabindex="0"
          role="button"
          aria-label="Edit column name: ${escapedColName}">${escapedColName}</span>
        ${
          col.isKey
            ? `<span class="key-badge" style="color:${pal.text}">key</span>`
            : `<button class="col-remove-btn" onclick="app.removeColAndRender(${ti},'${col.id}')" title="Remove column ${escapedColName}" aria-label="Remove column ${escapedColName}">×</button>`
        }
        ${!isLastCol ? '<span class="col-separator"></span>' : ''}
      </span>`;
    });

    html += `<span></span></div><div id="tb-body-${ti}">`;

    // Data rows
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
          const isChecked = colVal === true || colVal === "true";
          html += `<label class="bool-input" title="Checked = true, Unchecked = false"><input type="checkbox" ${isChecked ? "checked" : ""}
            onchange="app.updateValAndRefresh(${ti},${ri2},'${col.id}',this.checked)"
            aria-label="${col.name}"
            ${col.isKey ? "disabled" : ""}></label>`;
        } else {
          const keyAttrs = col.isKey ? ' min="1" data-key="true"' : ' data-key="false"';
          html += `<input class="${col.isKey ? "id-input" : "col-input"}" type="${dt.inputType}"${stepA}${keyAttrs} maxlength="20"
            value="${colVal ?? ""}" placeholder="${col.name}"
            aria-label="${col.name}"
            oninput="app.handleKeyInput(event, ${ti}, ${ri2}, '${col.id}', ${col.isKey}, '${col.type}')"
            onchange="app.handleKeyChange(event, ${ti}, ${ri2}, '${col.id}', ${col.isKey}, '${col.type}')"
            onkeydown="if(event.key==='Escape'){this.blur();event.preventDefault()}">`;
        }
      });

      html += `<button class="del-btn" onclick="app.delRowAndRender(${ti},${ri2})" aria-label="Delete row ${ri2 + 1}">×</button></div>`;
    });

    // Footer: add row, add column
    const nonKeyColCount = t.columns.filter((c) => !c.isKey).length;
    const canAddCol = nonKeyColCount < LIMITS.MAX_COLS_PER_TABLE;
    html += `</div>
      <button class="add-row-btn" onclick="app.addRowAndFocus(${ti})" aria-label="Add row to ${t.name}">+ row</button>
      <button class="add-col-btn" onclick="app.showColModal(${ti})" ${!canAddCol ? `disabled style="opacity:0.5;cursor:not-allowed" title="${LIMIT_MESSAGES.COLUMN_LIMIT}"` : ''} aria-label="Add column to ${t.name}">+ column</button>`;

    div.innerHTML = html;
    area.insertBefore(div, addBtn);
  });

  // Disable add table button if at max tables (6)
  const atMaxTables = state.tables.length >= 6;
  if (atMaxTables) {
    addBtn.disabled = true;
    addBtn.setAttribute("disabled", "disabled");
    addBtn.classList.add("disabled-btn");
    addBtn.title = "Max 6 tables allowed";
  } else {
    addBtn.disabled = false;
    addBtn.removeAttribute("disabled");
    addBtn.classList.remove("disabled-btn");
    addBtn.title = "Add a new table";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIAGRAM RENDERING — SVG Connection Visualization
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Renders SVG diagram showing join relationships between tables.
 * Shows: placeholder when empty, table boxes with values, connector lines between matches
 */
export function renderConn() {
  const svg = document.getElementById("conn-svg");
  if (!svg) {
    console.warn("renderConn: conn-svg element not found");
    return;
  }

  // Set ARIA attributes for accessibility
  svg.setAttribute("role", "img");

  let [li, ri] = getPair();
  const isSelfJoin = state.currentOp === "self";
  if (isSelfJoin) ri = li;

  const palL = PALETTE[li % PALETTE.length];
  const palR = PALETTE[ri % PALETTE.length];

  // Set aria-label for screen readers
  const lTable = state.tables[li]?.name || "Table";
  const rTable = state.tables[ri]?.name || "Table";
  const opType = state.currentOp === "self" ? "self-join" : (state.currentOp || "join");
  svg.setAttribute("aria-label", `Diagram showing ${opType} between ${escapeHtml(lTable)} and ${escapeHtml(rTable)}`);

  // Set operators don't show diagrams - they combine/compare tables at row level
  const isSetOperator = state.currentOp && ["union", "union_all", "except", "intersect"].includes(state.currentOp);
  if (isSetOperator) {
    const W = 480, H = 130;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.style.display = "block";
    svg.innerHTML = `
      <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="10"
        fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="6 4"/>
      <text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="9"
        font-family="var(--font-main, sans-serif)" fill="rgba(202,202,202,0.5)" dominant-baseline="middle">
        Diagram not applicable for SET operators
      </text>
      <text x="${W / 2}" y="${H / 2 + 18}" text-anchor="middle" font-size="8"
        font-family="var(--font-main, sans-serif)" fill="rgba(202,202,202,0.35)" dominant-baseline="middle">
        (UNION, EXCEPT, INTERSECT combine/compare entire tables)
      </text>`;
    return;
  }

  // Check for specific empty state reason
  const svgEmptyReason = getSvgEmptyStateReason(li, ri);

  // Render placeholder when no data
  if (svgEmptyReason) {
    const W = 480,
      H = 130;
    const lTableName = escapeHtml(state.tables[li]?.name || 'Table');
    const rTableName = escapeHtml(state.tables[ri]?.name || 'Table');
    const emptyMsg = escapeHtml(svgEmptyReason.message);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.style.display = "block";
    svg.innerHTML = `
      <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="10"
        fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="6 4"/>
      <rect x="18" y="28" width="100" height="${H - 56}" rx="8"
        fill="${palL.fill}" stroke="${palL.stroke}" stroke-width="0.8" stroke-dasharray="4 3"/>
      <rect x="${W - 118}" y="28" width="100" height="${H - 56}" rx="8"
        fill="${palR.fill}" stroke="${palR.stroke}" stroke-width="0.8" stroke-dasharray="4 3"/>
      <text x="${W / 2}" y="${H / 2}" text-anchor="middle" font-size="8"
        font-family="var(--font-main, sans-serif)" fill="rgba(202,202,202,0.3)" dominant-baseline="middle">
        ${emptyMsg}
      </text>
      <text x="68" y="${H - 10}" text-anchor="middle" font-size="8"
        font-family="var(--font-main, sans-serif)" fill="${palL.text}" opacity="0.45">${lTableName}</text>
      <text x="${W - 68}" y="${H - 10}" text-anchor="middle" font-size="8"
        font-family="var(--font-main, sans-serif)" fill="${palR.text}" opacity="0.45">${rTableName}</text>`;
    return;
  }

  // Full diagram with connections
  const rows = computeResult(state.currentOp);
  const pairs = rows.filter((r) => r.i1 >= 0 && r.i2 >= 0);

  // Calculate dimensions
  const lCount = Math.max(state.tables[li].rows.length, 1);
  const rCount = Math.max(state.tables[ri].rows.length, 1);
  const rowH = 34,
    padY = 22,
    W = 480,
    LX = 118,
    RX = 362;
  const H = Math.max(lCount, rCount) * rowH + padY * 2 + 32;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.display = "block";

  // Calculate Y positions for each row
  const lYs = Array.from(
    { length: state.tables[li].rows.length },
    (_, i) => padY + i * rowH + rowH / 2,
  );
  const rYs = Array.from(
    { length: state.tables[ri].rows.length },
    (_, i) => padY + i * rowH + rowH / 2,
  );

  let s = "";

  // Left table boxes
  state.tables[li].rows.forEach((_, i) => {
    const displayVal = getSvgValue(li, i);
    const keyVal = getKeyValue(li, i);
    const empty = keyVal === "" || keyVal === undefined || keyVal === null;
    const isMatch = pairs.some((r) => r.i1 === i) ||
      ((state.currentOp === "exists" || state.currentOp === "not_exists") && rows.some((r) => r.i1 === i));
    const label = empty
      ? "—"
      : displayVal === "" || displayVal === null || displayVal === undefined
        ? "·"
        : escapeHtml(String(displayVal));
    s += `<rect x="18" y="${lYs[i] - 13}" width="100" height="26" rx="6"
      fill="${palL.fill}" stroke="${palL.stroke}" stroke-width="${isMatch ? 1.8 : 0.8}"
      ${empty ? 'opacity="0.4"' : ""}/>
    <text x="68" y="${lYs[i]}" text-anchor="middle" font-size="8"
      font-family="var(--font-mono,monospace)" fill="${palL.text}" dominant-baseline="middle" ${empty ? 'opacity="0.35"' : ""}>${label}</text>`;
  });

  // Right table boxes
  state.tables[ri].rows.forEach((_, i) => {
    const displayVal = getSvgValue(ri, i);
    const keyVal = getKeyValue(ri, i);
    const empty = keyVal === "" || keyVal === undefined || keyVal === null;
    const isMatch = pairs.some((r) => r.i2 === i);
    const label = empty
      ? "—"
      : displayVal === "" || displayVal === null || displayVal === undefined
        ? "·"
        : escapeHtml(String(displayVal));
    s += `<rect x="${W - 118}" y="${rYs[i] - 13}" width="100" height="26" rx="6"
      fill="${palR.fill}" stroke="${palR.stroke}" stroke-width="${isMatch ? 1.8 : 0.8}"
      ${empty ? 'opacity="0.4"' : ""}/>
    <text x="${W - 68}" y="${rYs[i]}" text-anchor="middle" font-size="8"
      font-family="var(--font-mono,monospace)" fill="${palR.text}" dominant-baseline="middle" ${empty ? 'opacity="0.35"' : ""}>${label}</text>`;
  });

  // Connector lines between matched rows
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

  // Table labels
  const lSvgCol = getSvgColumn(li);
  const rSvgCol = getSvgColumn(ri);
  const lTableName = escapeHtml(state.tables[li].name);
  const rTableName = escapeHtml(state.tables[ri].name);
  const lColName = escapeHtml(lSvgCol.name);
  const rColName = escapeHtml(rSvgCol.name);
  s += `<text x="68" y="${H - 14}" text-anchor="middle" font-size="8"
    font-family="var(--font-main,sans-serif)" fill="${palL.text}">${lTableName}</text>
  <text x="68" y="${H - 4}" text-anchor="middle" font-size="9"
    font-family="var(--font-main,sans-serif)" fill="${palL.text}" opacity="0.45">.${lColName}</text>
  <text x="${W - 68}" y="${H - 14}" text-anchor="middle" font-size="8"
    font-family="var(--font-main,sans-serif)" fill="${palR.text}">${state.currentOp === "self" ? lTableName + " (alias)" : rTableName}</text>
  <text x="${W - 68}" y="${H - 4}" text-anchor="middle" font-size="9"
    font-family="var(--font-main,sans-serif)" fill="${palR.text}" opacity="0.45">.${rColName}</text>`;

  svg.innerHTML = s;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Renders the result table showing join output.
 * Handles different result formats: single column (set ops), standard joins, anti joins
 */
export function renderResult() {
  const rows = computeResult(state.currentOp);
  let [li, ri] = getPair();
  if (state.currentOp === "self") ri = li;

  const palL = PALETTE[li % PALETTE.length];
  const palR = PALETTE[ri % PALETTE.length];
  const isSelfJoin = state.currentOp === "self";
  const isSingleCol = rows.length > 0 && rows[0].single;
  const isStdJoin =
    rows.length > 0 && !rows[0].single && rows[0].li !== undefined;

  // Get empty state reason only when there are no rows
  const emptyReason = rows.length === 0 ? getEmptyStateReason() : null;

  // Update row count
  const rowCountEl = document.getElementById("row-count");
  if (rowCountEl) {
    rowCountEl.textContent =
      rows.length + " row" + (rows.length !== 1 ? "s" : "");
  }

  const heads = document.getElementById("rg-heads");
  const body = document.getElementById("result-body");
  if (!heads || !body) {
    console.warn("renderResult: rg-heads or result-body element not found");
    return;
  }

  // Render based on result type
  if (isSelfJoin) {
    // Self join — all columns from the single table (both sides of join)
    const t = state.tables[li];
    // Show columns twice: once for left side, once for right side (with alias)
    const allCols = [
      ...t.columns.map((c) => ({ ...c, side: "l", ti: li })),
      ...t.columns.map((c) => ({ ...c, side: "r", ti: li })),
    ];
    const tpl = allCols.map(() => "1fr").join(" ");
    heads.style.gridTemplateColumns = tpl;
    heads.innerHTML = allCols
      .map(
        (c) =>
          `<div class="rg-head" role="columnheader" style="border-bottom:2px solid ${c.side === "l" ? palL.line : palR.line}33">
        ${t.name}${c.side === "r" ? " (alias)" : ""}.${escapeHtml(c.name)}</div>`,
      )
      .join("");
    body.innerHTML = rows.length
      ? rows
          .map((r) => {
            const lRow = r.i1 >= 0 ? t.rows[r.i1] : null;
            const rRow = r.i2 >= 0 ? t.rows[r.i2] : null;
            const cells = allCols.map((c) => {
              const rd = c.side === "l" ? lRow : rRow;
              const pal = c.side === "l" ? palL : palR;
              const val = rd ? rd[c.id] : null;
              const sideLabel = c.side === "l" ? " (left)" : " (right)";
              const cellContent = val === null || val === undefined || val === "" ? nullBadge() : `${escapeHtml(String(val))}<span style="font-size:0.7em;opacity:0.5">${sideLabel}</span>`;
              return `<div class="rg-cell" role="cell" style="background:${pal.bg}">
              ${cellContent}</div>`;
            });
            return `<div class="rg-data-row" role="row" style="grid-template-columns:${tpl}">${cells.join("")}</div>`;
          })
          .join("")
      : emptyState(emptyReason);
  } else if (isSingleCol || (rows.length > 0 && rows[0].isSetOp)) {
    // Set operators (UNION, EXCEPT, INTERSECT) — show all columns from both tables
    const tL = state.tables[li];
    const tR = state.tables[ri];
    
    // Get all unique columns from both tables
    const leftColIds = tL.columns.map(c => c.id);
    const rightColIds = tR.columns.map(c => c.id);
    const allColIds = [...new Set([...leftColIds, ...rightColIds])];
    
    const allCols = allColIds.map(colId => {
      const inLeft = tL.columns.find(c => c.id === colId);
      const inRight = tR.columns.find(c => c.id === colId);
      return {
        id: colId,
        name: (inLeft || inRight)?.name || colId,
        ti: inLeft ? li : ri,
        side: inLeft && inRight ? 'both' : (inLeft ? 'l' : 'r')
      };
    });
    
    const tpl = allCols.map(() => "1fr").join(" ");
    heads.style.gridTemplateColumns = tpl;
    heads.innerHTML = allCols
      .map((c) => `<div class="rg-head" role="columnheader" style="border-bottom:2px solid ${c.side === 'r' ? palR.line : palL.line}33">${escapeHtml(c.name)}</div>`)
      .join("");
    
    body.innerHTML = rows.length
      ? rows.map((r) => {
          const rowTi = r.ti;
          const rowRi = r.ri;
          const table = state.tables[rowTi];
          const rowData = table ? table.rows[rowRi] : {};
          // Determine row's source palette for "both" columns
          const rowPal = rowTi === ri ? palR : palL;

          const cells = allCols.map(c => {
            const val = rowData[c.id];
            // Column color based on which table the column comes from, not the row's source
            // Left-only columns: always palL, Right-only: always palR, Both: use row's source
            const cellPal = c.side === 'r' ? palR : (c.side === 'l' ? palL : rowPal);
            const sideLabel = c.side === 'r' ? ' (right)' : (c.side === 'l' ? ' (left)' : '');
            const cellContent = val === null || val === undefined || val === '' ? nullBadge() : `${escapeHtml(String(val))}<span style="font-size:0.7em;opacity:0.5">${sideLabel}</span>`;
            return `<div class="rg-cell" role="cell" style="background:${cellPal.bg}">${cellContent}</div>`;
          }).join('');
          return `<div class="rg-data-row" style="grid-template-columns:${tpl}">${cells}</div>`;
        }).join("")
      : emptyState(emptyReason);
  } else if (isStdJoin) {
    // Standard join — all columns from both tables
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
          `<div class="rg-head" role="columnheader" style="border-bottom:2px solid ${c.side === "l" ? palL.line : palR.line}33">
        ${escapeHtml(state.tables[c.ti].name)}.${escapeHtml(c.name)}</div>`,
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
              const sideLabel = c.side === "l" ? " (left)" : " (right)";
              const cellContent = val === null || val === undefined || val === "" ? nullBadge() : `${escapeHtml(String(val))}<span style="font-size:0.7em;opacity:0.5">${sideLabel}</span>`;
              return `<div class="rg-cell" role="cell" style="background:${pal.bg}">
              ${cellContent}</div>`;
            });
            return `<div class="rg-data-row" role="row" style="grid-template-columns:${tpl}">${cells.join("")}</div>`;
          })
          .join("")
      : emptyState(emptyReason);
  } else {
    // Anti joins — show IDs from both tables
    heads.style.gridTemplateColumns = "1fr 1fr";
    heads.innerHTML = `<div class="rg-head" role="columnheader">${escapeHtml(state.tables[li].name)}.id</div>
      <div class="rg-head" role="columnheader">${escapeHtml(state.tables[ri].name)}.id</div>`;
    body.innerHTML = rows.length
      ? rows
          .map(
            (
              r,
            ) => `<div class="rg-data-row" role="row" style="grid-template-columns:1fr 1fr">
          <div class="rg-cell" role="cell" style="background:${palL.bg}">${r.c1 === null ? nullBadge() : `${escapeHtml(String(r.c1))}<span style="font-size:0.7em;opacity:0.5"> (left)</span>`}</div>
          <div class="rg-cell" role="cell" style="background:${palR.bg}">${r.c2 === null ? nullBadge() : r.c2 === undefined ? "—" : `${escapeHtml(String(r.c2))}<span style="font-size:0.7em;opacity:0.5"> (right)</span>`}</div>
        </div>`,
          )
          .join("")
      : emptyState(emptyReason);
  }
}
