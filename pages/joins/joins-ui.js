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
    const currentColName = escapeHtml(currentCol ? currentCol.name : "Select column");
    const items = t.columns
      .map(
        (c) =>
          `<button class="dropdown-item${c.id === t.svgColId ? " selected" : ""}" data-value="${c.id}">${escapeHtml(c.name)}</button>`,
      )
      .join("");

    html += `<div class="diagram-col-picker">
      <span class="diagram-col-label" style="color:${pal.text}">${escapeHtml(t.name)}:</span>
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
    // For self-join li===ri===ti, so union both sets to highlight all matched rows
    const isSelfJoin = state.currentOp === "self";
    const matchSet = (isSelfJoin && ti === li)
      ? new Set([...m1, ...m2])
      : ti === li ? m1 : ti === ri ? m2 : new Set();
    const colCount = t.columns.length;
    const gridCols = `18px ${Array(colCount).fill("1fr").join(" ")} 22px`;
    const div = document.createElement("div");
    div.className = "tbl-wrap";

    // Table header with table name
    const escapedTableName = escapeHtml(t.name);
    let html = `
      <div class="tbl-head" style="background:${pal.fill};color:${pal.text};border-bottom:1px solid ${pal.stroke}" aria-label="Table: ${escapedTableName}">
        <span class="table-name" contenteditable="true" data-ti="${ti}"
          tabindex="0"
          role="textbox"
          aria-label="Edit table name: ${escapedTableName}"
          aria-describedby="kb-help-edit-name">${escapedTableName}</span>
        ${
          state.tables.length > 2
            ? `<button class="remove-table-btn" data-ti="${ti}" title="Remove table" aria-label="Remove table ${escapedTableName}">×</button>`
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
        <span class="col-header-name" contenteditable="true" data-ti="${ti}" data-col-id="${col.id}"
          tabindex="0"
          role="textbox"
          aria-label="Edit column name: ${escapedColName}"
          aria-describedby="kb-help-edit-name">${escapedColName}</span>
        ${
          col.isKey
            ? `<span class="key-badge" style="color:${pal.text}">key</span>`
            : `<button class="col-remove-btn" data-ti="${ti}" data-col-id="${col.id}" title="Remove column ${escapedColName}" aria-label="Remove column ${escapedColName}">×</button>`
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
        const escapedColName = escapeHtml(col.name);
        const escapedColVal = escapeHtml(String(colVal ?? ""));
        if (col.type === "boolean") {
          const isChecked = colVal === true || colVal === "true";
          html += `<label class="bool-input" title="Checked = true, Unchecked = false"><input type="checkbox" ${isChecked ? "checked" : ""}
            class="cell-checkbox" data-ti="${ti}" data-ri="${ri2}" data-col-id="${col.id}"
            aria-label="${escapedColName}"
            ${col.isKey ? "disabled" : ""}></label>`;
        } else {
          const keyAttrs = col.isKey ? ' min="1" data-key="true"' : ' data-key="false"';
          html += `<input class="${col.isKey ? "id-input" : "col-input"} cell-input" type="${dt.inputType}"${stepA}${keyAttrs} maxlength="20"
            data-ti="${ti}" data-ri="${ri2}" data-col-id="${col.id}" data-col-type="${col.type}" data-is-key="${col.isKey}"
            value="${escapedColVal}" placeholder="${escapedColName}"
            aria-label="${escapedColName}">`;
        }
      });

      html += `<button class="del-btn" data-ti="${ti}" data-ri="${ri2}" aria-label="Delete row ${ri2 + 1}">×</button></div>`;
    });

    // Footer: add row, add column
    const nonKeyColCount = t.columns.filter((c) => !c.isKey).length;
    const canAddCol = nonKeyColCount < LIMITS.MAX_COLS_PER_TABLE;
    html += `</div>
      <button class="add-row-btn" data-ti="${ti}" aria-label="Add row to ${escapeHtml(t.name)}">+ row</button>
      <button class="add-col-btn" data-ti="${ti}" ${!canAddCol ? `disabled style="opacity:0.5;cursor:not-allowed" title="${LIMIT_MESSAGES.COLUMN_LIMIT}"` : ''} aria-label="Add column to ${escapeHtml(t.name)}">+ column</button>`;

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

  // Set operators and FULL OUTER JOIN don't benefit from the diagram visualization
  const noDiagramOps = ["union", "union_all", "except", "intersect", "full"];
  const isSetOperator = state.currentOp && noDiagramOps.includes(state.currentOp);
  if (isSetOperator) {
    const W = 480, H = 130;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.style.display = "block";
    const isFullOuter = state.currentOp === "full";
    svg.innerHTML = `
      <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="10"
        fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="6 4"/>
      <text x="${W / 2}" y="${H / 2 - 8}" text-anchor="middle" font-size="9"
        font-family="var(--font-main, sans-serif)" fill="rgba(202,202,202,0.5)" dominant-baseline="middle">
        ${isFullOuter ? "Diagram not applicable for FULL OUTER JOIN" : "Diagram not applicable for SET operators"}
      </text>
      <text x="${W / 2}" y="${H / 2 + 10}" text-anchor="middle" font-size="8"
        font-family="var(--font-main, sans-serif)" fill="rgba(202,202,202,0.35)" dominant-baseline="middle">
        ${isFullOuter ? "(All rows appear in result - no connection to visualize)" : "(UNION, EXCEPT, INTERSECT combine/compare entire tables)"}
      </text>`;
    return;
  }

  // Show placeholder when no join type selected yet
  if (!state.currentOp) {
    const W = 480, H = 130;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.style.display = "block";
    svg.innerHTML = `
      <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="10"
        fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="6 4"/>
      <text x="${W / 2}" y="${H / 2 - 12}" text-anchor="middle" font-size="10"
        font-family="var(--font-main, sans-serif)" fill="rgba(202,202,202,0.5)" dominant-baseline="middle">
        Select a join type to see the diagram
      </text>
      <text x="${W / 2}" y="${H / 2 + 10}" text-anchor="middle" font-size="8"
        font-family="var(--font-main, sans-serif)" fill="rgba(202,202,202,0.3)" dominant-baseline="middle">
        Visual diagram of how your tables connect
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

  // Determine if this is a special join type that needs different visualization
  const isAntiJoin = state.currentOp && (state.currentOp === "left_anti" || state.currentOp === "right_anti");
  const isSemiOrExists = state.currentOp && (state.currentOp === "left_semi" || state.currentOp === "right_semi" || state.currentOp === "exists" || state.currentOp === "not_exists");
  const isRightSideOnly = state.currentOp === "right_semi";

  // Connector pairs: only rows where both sides are valid (standard joins only)
  // Anti/semi joins return i1=-1 or i2=-1, so no connector lines are drawn for them
  const pairs = rows.filter((r) => r.i1 >= 0 && r.i2 >= 0);

  // Which row indices actually appear in the result (used for highlighting)
  const resultLeftIndices = new Set(rows.filter(r => r.i1 >= 0).map(r => r.i1));
  const resultRightIndices = new Set(rows.filter(r => r.i2 >= 0).map(r => r.i2));

  // Calculate dimensions
  const lCount = Math.max(state.tables[li].rows.length, 1);
  const rCount = Math.max(state.tables[ri].rows.length, 1);
  const rowH = 34,
    padY = 22,
    W = 480,
    LX = 118,
    RX = 362;
  const extraH = (isAntiJoin || isSemiOrExists) ? 45 : 0; // Extra space for legend
  const H = Math.max(lCount, rCount) * rowH + padY * 2 + 32 + extraH;
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

    let isHighlighted = false;
    let rowOpacity = "";
    let strokeWidth = 0.8;

    if (isAntiJoin) {
      if (state.currentOp === "right_anti") {
        // RIGHT ANTI: left table is not returned — dim all
        rowOpacity = 'opacity="0.3"';
        strokeWidth = 0.5;
      } else {
        // LEFT ANTI: highlight rows that ARE in the result (rows with no match)
        isHighlighted = resultLeftIndices.has(i) && !empty;
        rowOpacity = isHighlighted ? "" : 'opacity="0.35"';
        strokeWidth = isHighlighted ? 2 : 0.5;
      }
    } else if (isSemiOrExists) {
      if (isRightSideOnly) {
        // RIGHT SEMI: left table is not returned — dim all
        rowOpacity = 'opacity="0.3"';
        strokeWidth = 0.5;
      } else {
        // LEFT SEMI / EXISTS / NOT EXISTS: highlight rows that ARE in the result
        isHighlighted = resultLeftIndices.has(i);
        rowOpacity = isHighlighted ? "" : 'opacity="0.3"';
        strokeWidth = isHighlighted ? 1.8 : 0.5;
      }
    } else {
      const isMatch = pairs.some((r) => r.i1 === i);
      rowOpacity = empty ? 'opacity="0.4"' : "";
      strokeWidth = isMatch ? 1.8 : 0.8;
    }
    
    const label = empty
      ? "—"
      : displayVal === "" || displayVal === null || displayVal === undefined
        ? "·"
        : escapeHtml(String(displayVal));
    const rowLabel = empty ? "empty" : isHighlighted || (!isAntiJoin && !isSemiOrExists && pairs.some(r => r.i1 === i)) ? "matched" : "unmatched";
    s += `<rect x="18" y="${lYs[i] - 13}" width="100" height="26" rx="6"
      fill="${palL.fill}" stroke="${palL.stroke}" stroke-width="${strokeWidth}"
      ${rowOpacity} aria-label="${rowLabel} row"/>
    <text x="68" y="${lYs[i]}" text-anchor="middle" font-size="8"
      font-family="var(--font-mono,monospace)" fill="${palL.text}" dominant-baseline="middle" ${rowOpacity}>${label}</text>`;
  });

  // Right table boxes
  state.tables[ri].rows.forEach((_, i) => {
    const displayVal = getSvgValue(ri, i);
    const keyVal = getKeyValue(ri, i);
    const empty = keyVal === "" || keyVal === undefined || keyVal === null;
    
    let isMatch = pairs.some((r) => r.i2 === i);
    let isHighlighted = false;
    let rowOpacity = "";
    let strokeWidth = 0.8;
    
    if (isAntiJoin) {
      if (state.currentOp === "left_anti") {
        // LEFT ANTI: right table is not returned — dim all
        rowOpacity = 'opacity="0.3"';
        strokeWidth = 0.5;
      } else {
        // RIGHT ANTI: highlight rows that ARE in the result (rows with no match)
        isHighlighted = resultRightIndices.has(i) && !empty;
        rowOpacity = isHighlighted ? "" : 'opacity="0.35"';
        strokeWidth = isHighlighted ? 2 : 0.8;
      }
    } else if (isSemiOrExists) {
      if (isRightSideOnly) {
        // RIGHT SEMI: highlight rows that ARE in the result
        isHighlighted = resultRightIndices.has(i);
        rowOpacity = isHighlighted ? "" : 'opacity="0.25"';
        strokeWidth = isHighlighted ? 1.8 : 0.5;
      } else {
        // LEFT SEMI / EXISTS / NOT EXISTS: right table is not returned — dim all
        rowOpacity = 'opacity="0.25"';
        strokeWidth = 0.5;
      }
    } else {
      rowOpacity = empty ? 'opacity="0.4"' : "";
      strokeWidth = isMatch ? 1.8 : 0.8;
    }
    
    const label = empty
      ? "—"
      : displayVal === "" || displayVal === null || displayVal === undefined
        ? "·"
        : escapeHtml(String(displayVal));
    // Self-join alias side gets a dotted stroke to visually distinguish it from the source table
    const aliasDash = isSelfJoin ? ' stroke-dasharray="5 3"' : '';
    s += `<rect x="${W - 118}" y="${rYs[i] - 13}" width="100" height="26" rx="6"
      fill="${palR.fill}" stroke="${palR.stroke}" stroke-width="${strokeWidth}"
      ${rowOpacity}${aliasDash}/>
    <text x="${W - 68}" y="${rYs[i]}" text-anchor="middle" font-size="8"
      font-family="var(--font-mono,monospace)" fill="${palR.text}" dominant-baseline="middle" ${rowOpacity}>${label}</text>`;
  });

  // Connector lines between matched rows
  const seen = new Set();
  pairs.forEach((r) => {
    // Skip rows where one side is -1 (happens in anti/semi joins with one-sided results)
    if (r.i1 < 0 || r.i2 < 0) return;

    const key = `${r.i1}-${r.i2}`;
    if (seen.has(key)) return;
    seen.add(key);
    const y1 = lYs[r.i1],
      y2 = rYs[r.i2],
      mx = (LX + RX) / 2;

    // Use dashed lines for semi/exists joins
    const isDashed = isSemiOrExists;
    const dashAttr = isDashed ? 'stroke-dasharray="4 3"' : '';

    s += `<path d="M${LX} ${y1} C${mx} ${y1} ${mx} ${y2} ${RX} ${y2}"
      fill="none" stroke="${palL.line}" stroke-width="1.8" opacity="0.72" ${dashAttr}/>`;
  });

  // Table labels
  const lSvgCol = getSvgColumn(li);
  const rSvgCol = getSvgColumn(ri);
  const lTableName = escapeHtml(state.tables[li].name);
  const rTableName = escapeHtml(state.tables[ri].name);
  const lColName = escapeHtml(lSvgCol.name);
  const rColName = escapeHtml(rSvgCol.name);
  s += `<text x="68" y="${H - 14 - extraH}" text-anchor="middle" font-size="8"
    font-family="var(--font-main,sans-serif)" fill="${palL.text}">${lTableName}</text>
  <text x="68" y="${H - 4 - extraH}" text-anchor="middle" font-size="9"
    font-family="var(--font-main,sans-serif)" fill="${palL.text}" opacity="0.45">.${lColName}</text>
  <text x="${W - 68}" y="${H - 14 - extraH}" text-anchor="middle" font-size="8"
    font-family="var(--font-main,sans-serif)" fill="${palR.text}">${state.currentOp === "self" ? lTableName + " (alias)" : rTableName}</text>
  <text x="${W - 68}" y="${H - 4 - extraH}" text-anchor="middle" font-size="9"
    font-family="var(--font-main,sans-serif)" fill="${palR.text}" opacity="0.45">.${rColName}</text>`;

  // Add legend for special join types
  if (isAntiJoin || isSemiOrExists) {
    // For right_anti and right_semi, the returned side is the right table
    const returnedColor = (state.currentOp === "right_anti" || state.currentOp === "right_semi")
      ? palR.stroke
      : palL.stroke;
    const legendY = H - 12;
    s += `<line x1="10" y1="${legendY}" x2="40" y2="${legendY}" stroke="${returnedColor}" stroke-width="2"/>
      <text x="48" y="${legendY + 4}" font-size="8" fill="rgba(202,202,202,0.7)" font-family="var(--font-main,sans-serif)">Returned</text>
      <line x1="100" y1="${legendY}" x2="130" y2="${legendY}" stroke="${returnedColor}" stroke-width="0.5" opacity="0.4"/>
      <text x="138" y="${legendY + 4}" font-size="8" fill="rgba(202,202,202,0.5)" font-family="var(--font-main,sans-serif)">Not returned</text>`;
  }

  svg.innerHTML = s;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Renders the result table showing join output.
 * Handles different result formats: standard joins, self joins, set operators,
 * and special joins (ANTI, SEMI, EXISTS).
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
    rows.length > 0 && !rows[0].single && rows[0].li !== undefined && rows[0].c1 === undefined;

  // Detect special join types
  const isLeftAnti = state.currentOp === "left_anti";
  const isRightAnti = state.currentOp === "right_anti";
  const isLeftSemi = state.currentOp === "left_semi" || state.currentOp === "exists";
  const isRightSemi = state.currentOp === "right_semi";
  const isNotExists = state.currentOp === "not_exists";
  const isAntiOrSemi = isLeftAnti || isRightAnti || isLeftSemi || isRightSemi || isNotExists;

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
              const cellContent = val === null || val === undefined || val === "" ? `<span class="null-val">${nullBadge()}</span>` : `${escapeHtml(String(val))}<span style="font-size:0.7em;opacity:0.5">${sideLabel}</span>`;
              return `<div class="rg-cell" role="cell" style="background:${pal.bg}">
              ${cellContent}</div>`;
            });
            return `<div class="rg-data-row" role="row" style="grid-template-columns:${tpl}">${cells.join("")}</div>`;
          })
          .join("")
      : `<p class="empty-state">${emptyState(emptyReason)}</p>`;
  } else if (isAntiOrSemi) {
    // ANTI and SEMI joins — show columns from the side being returned
    const tL = state.tables[li];
    const tR = state.tables[ri];
    
    let resultCols, resultTable, resultSide, pal;
    if (isLeftAnti || isLeftSemi || isNotExists) {
      resultCols = tL.columns.map((c) => ({ ...c, side: "l", ti: li }));
      resultTable = tL;
      resultSide = "l";
      pal = palL;
    } else {
      resultCols = tR.columns.map((c) => ({ ...c, side: "r", ti: ri }));
      resultTable = tR;
      resultSide = "r";
      pal = palR;
    }
    
    const tpl = resultCols.map(() => "1fr").join(" ");
    heads.style.gridTemplateColumns = tpl;
    heads.innerHTML = resultCols
      .map((c) =>
        `<div class="rg-head" role="columnheader" style="border-bottom:2px solid ${pal.line}33">
        ${escapeHtml(resultTable.name)}.${escapeHtml(c.name)}</div>`,
      )
      .join("");
    
    body.innerHTML = rows.length
      ? rows
          .map((r) => {
            const rowIdx = resultSide === "l" ? r.i1 : r.i2;
            const rowData = rowIdx >= 0 ? resultTable.rows[rowIdx] : null;
            const cells = resultCols.map((c) => {
              const val = rowData ? rowData[c.id] : null;
              const cellContent = val === null || val === undefined || val === "" ? `<span class="null-val">${nullBadge()}</span>` : `${escapeHtml(String(val))}`;
              return `<div class="rg-cell" role="cell" style="background:${pal.bg}">${cellContent}</div>`;
            });
            return `<div class="rg-data-row" role="row" style="grid-template-columns:${tpl}">${cells.join("")}</div>`;
          })
          .join("")
      : `<p class="empty-state">${emptyState(emptyReason)}</p>`;
  } else if (rows.length > 0 && rows[0].isSetOp) {
    // Set operators (UNION, EXCEPT, INTERSECT) — show all columns from both tables
    const tL = state.tables[li];
    const tR = state.tables[ri];
    
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
          const rowPal = rowTi === ri ? palR : palL;

          const cells = allCols.map(c => {
            const val = rowData[c.id];
            const cellPal = c.side === 'r' ? palR : (c.side === 'l' ? palL : rowPal);
            const sideLabel = c.side === 'r' ? ' (right)' : (c.side === 'l' ? ' (left)' : '');
            const cellContent = val === null || val === undefined || val === '' ? `<span class="null-val">${nullBadge()}</span>` : `${escapeHtml(String(val))}<span style="font-size:0.7em;opacity:0.5">${sideLabel}</span>`;
            return `<div class="rg-cell" role="cell" style="background:${cellPal.bg}">${cellContent}</div>`;
          }).join('');
          return `<div class="rg-data-row" role="row" style="grid-template-columns:${tpl}">${cells}</div>`;
        }).join("")
      : `<p class="empty-state">${emptyState(emptyReason)}</p>`;
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
              const cellContent = val === null || val === undefined || val === "" ? `<span class="null-val">${nullBadge()}</span>` : `${escapeHtml(String(val))}<span style="font-size:0.7em;opacity:0.5">${sideLabel}</span>`;
              return `<div class="rg-cell" role="cell" style="background:${pal.bg}">
              ${cellContent}</div>`;
            });
            return `<div class="rg-data-row" role="row" style="grid-template-columns:${tpl}">${cells.join("")}</div>`;
          })
          .join("")
      : `<p class="empty-state">${emptyState(emptyReason)}</p>`;
  } else {
    // Fallback for unknown result formats
    heads.style.gridTemplateColumns = "1fr";
    heads.innerHTML = `<div class="rg-head" role="columnheader">Result</div>`;
    body.innerHTML = rows.length
      ? rows.map((r) => `<div class="rg-data-row" role="row" style="grid-template-columns:1fr"><div class="rg-cell" role="cell">${escapeHtml(JSON.stringify(r))}</div></div>`).join("")
      : `<p class="empty-state">${emptyState(emptyReason)}</p>`;
  }
}
