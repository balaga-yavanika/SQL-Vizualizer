/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Joins UI V2 — Rendering
 * ═══════════════════════════════════════════════════════════════════════════════
 * Mirrors: pages/joins/joins-ui.js
 *
 * NEW in V2:
 *   Feature F  — Explain panel (plain-English result summary)
 *   Feature G  — NULL handling toggle per join column
 *   Feature H  — Duplicate key warning inline in tables
 *   Feature P  — Pencil icon affordance for column rename
 *
 * Exports:
 *   renderTablesV2(m1, m2, li, ri, v2State)
 *   renderConnV2()                     — identical to original renderConn
 *   renderResultV2(rows)               — uses precomputed rows from V2 engine
 *   renderExplainPanel(rows, rawRows)  — Feature F
 *   renderDiagramColSelectors()        — re-exported from original
 */

import { state, PALETTE, DATA_TYPES } from '../../js/core/state.js';
import {
  getKeyColumn, getKeyValue, getSvgColumn, getSvgValue,
  getPair, getMatchedIdx, nullBadge, emptyState,
  getEmptyStateReason, getSvgEmptyStateReason, escapeHtml,
} from '../../js/core/utils.js';
import { LIMITS, LIMIT_MESSAGES } from '../../js/core/limits.js';
import { computeResult } from '../../js/engines/joinEngine.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SVG COLUMN SELECTOR (inline, same as v1 renderDiagramColSelectors)
// ═══════════════════════════════════════════════════════════════════════════════

export function renderDiagramColSelectors() {
  const container = document.getElementById('diagram-col-selectors-container');
  if (!container) return;

  let html = '';
  state.tables.forEach((t, ti) => {
    if (!t.columns.length) return;
    const pal = PALETTE[ti % PALETTE.length];
    if (t.svgColId && !t.columns.find(c => c.id === t.svgColId)) {
      t.svgColId = t.columns[0]?.id || null;
    }
    const currentCol = t.columns.find(c => c.id === t.svgColId);
    const currentColName = escapeHtml(currentCol ? currentCol.name : 'Select column');
    const items = t.columns.map(c => `<button class="dropdown-item${c.id === t.svgColId ? ' selected' : ''}" data-value="${c.id}">${escapeHtml(c.name)}</button>`).join('');
    html += `<div class="diagram-col-picker">
      <span class="diagram-col-label" style="color:${pal.text}">${escapeHtml(t.name)}:</span>
      <div class="custom-dropdown diagram-col-dropdown" id="diagram-col-dropdown-${ti}">
        <button class="dropdown-toggle" id="diagram-col-toggle-${ti}" aria-haspopup="listbox" style="border-color:${pal.stroke};color:${pal.text}">
          <span id="diagram-col-display-${ti}">${currentColName}</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        <div class="dropdown-menu" id="diagram-col-menu-${ti}" style="display:none">${items}</div>
      </div>
    </div>`;
  });
  container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE H — DUPLICATE KEY DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

function getDuplicateKeyWarning(table) {
  const keyCol = table.columns.find(c => c.isKey);
  if (!keyCol) return null;
  const vals = table.rows.map(r => r[keyCol.id]).filter(v => v !== '' && v !== null && v !== undefined);
  const seen = new Set();
  const dupes = new Set();
  vals.forEach(v => { if (seen.has(v)) dupes.add(v); else seen.add(v); });
  if (dupes.size === 0) return null;
  return `⚠️ Duplicate key${dupes.size > 1 ? 's' : ''}: ${[...dupes].join(', ')} — this causes row multiplication in JOIN results`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TABLE RENDERING (V2) — adds pencil icon (P), dup warning (H), null toggle (G)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Renders all data tables.
 * @param {Set} m1 - Matched row indices for left table
 * @param {Set} m2 - Matched row indices for right table
 * @param {number} li - Left table index
 * @param {number} ri - Right table index
 * @param {Object} v2State - V2 state (for nullableJoinCols)
 */
export function renderTablesV2(m1, m2, li, ri, v2State = {}) {
  const area = document.getElementById('tables-area');
  if (!area) return;

  const addBtn = document.querySelector('.add-tbl-btn');
  if (!addBtn) return;

  [...area.querySelectorAll('.tbl-wrap')].forEach(e => e.remove());

  state.tables.forEach((t, ti) => {
    const pal = PALETTE[ti % PALETTE.length];
    const matchSet = ti === li ? m1 : ti === ri ? m2 : new Set();
    const colCount = t.columns.length;
    const gridCols = `18px ${Array(colCount).fill('1fr').join(' ')} 22px`;
    const div = document.createElement('div');
    div.className = 'tbl-wrap';

    const escapedName = escapeHtml(t.name);

    // Feature H: duplicate key warning
    const dupWarning = getDuplicateKeyWarning(t);
    const dupHtml = dupWarning
      ? `<div class="dup-key-warning" title="${escapeHtml(dupWarning)}">
           <i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(dupWarning)}
         </div>`
      : '';

    let html = `
      ${dupHtml}
      <div class="tbl-head" style="background:${pal.fill};color:${pal.text};border-bottom:1px solid ${pal.stroke}" aria-label="Table: ${escapedName}">
        <span class="table-name" contenteditable="true" data-ti="${ti}"
          tabindex="0" role="button"
          aria-label="Edit table name: ${escapedName}">${escapedName}</span>
        ${state.tables.length > 2 ? `<button class="remove-table-btn" data-ti="${ti}" title="Remove table" aria-label="Remove table ${escapedName}">×</button>` : ''}
      </div>
      <div class="col-hr" style="grid-template-columns:${gridCols}">
        <span>#</span>`;

    // Column headers — Feature P: pencil icon on hover
    t.columns.forEach((col, ci) => {
      const isLastCol = ci === t.columns.length - 1;
      const dt = DATA_TYPES[col.type] || DATA_TYPES.string;
      const typeIcon = dt.icon ? `<i class="fa-solid ${dt.icon} col-type-icon" title="${dt.label}"></i>` : '';
      const escapedColName = escapeHtml(col.name);

      // Feature G: nullable toggle (shown in column header for join columns)
      const nullKey = `${ti}_${col.id}`;
      const isNullable = v2State.nullableJoinCols?.[nullKey] || false;
      const nullToggleHtml = !col.isKey
        ? `<button class="null-toggle-btn${isNullable ? ' active' : ''}"
             data-ti="${ti}" data-col-id="${col.id}"
             title="${isNullable ? 'Column marked as nullable (NULLs skip matches)' : 'Click to mark as nullable'}"
             aria-label="${isNullable ? 'Remove nullable flag' : 'Mark column as nullable'}"
             aria-pressed="${isNullable}">
             NULL
           </button>`
        : '';

      html += `<span class="col-header-cell" title="${escapedColName}${col.isKey ? ' (key)' : ''}">
        ${typeIcon}
        <span class="col-header-name-wrapper">
          <span class="col-header-name" contenteditable="true" data-ti="${ti}" data-col-id="${col.id}"
            tabindex="0" role="button"
            aria-label="Edit column name: ${escapedColName}">${escapedColName}</span>
          <button class="col-rename-pencil" data-ti="${ti}" data-col-id="${col.id}"
            title="Rename column ${escapedColName}" aria-label="Rename column ${escapedColName}">
            <i class="fa-solid fa-pencil"></i>
          </button>
        </span>
        ${col.isKey
          ? `<span class="key-badge" style="color:${pal.text}">key</span>`
          : `<button class="col-remove-btn" data-ti="${ti}" data-col-id="${col.id}" title="Remove column ${escapedColName}" aria-label="Remove column ${escapedColName}">×</button>`
        }
        ${nullToggleHtml}
        ${!isLastCol ? '<span class="col-separator"></span>' : ''}
      </span>`;
    });

    html += `<span></span></div><div id="tb-body-${ti}">`;

    // Data rows
    t.rows.forEach((row, ri2) => {
      const isMatch = matchSet.has(ri2);
      html += `<div class="tbl-row${isMatch ? ' matched' : ''}"
        style="grid-template-columns:${gridCols};${isMatch ? `background:${pal.fill};outline-color:${pal.stroke}` : ''}">
        <span class="row-num">${ri2 + 1}</span>`;

      t.columns.forEach(col => {
        const colVal = row[col.id];
        const dt = DATA_TYPES[col.type] || DATA_TYPES.string;
        const stepA = dt.step ? ` step="${dt.step}"` : '';
        const escapedColName = escapeHtml(col.name);
        const escapedColVal = escapeHtml(String(colVal ?? ''));
        if (col.type === 'boolean') {
          const isChecked = colVal === true || colVal === 'true';
          html += `<label class="bool-input" title="Checked = true, Unchecked = false"><input type="checkbox" ${isChecked ? 'checked' : ''}
            class="cell-checkbox" data-ti="${ti}" data-ri="${ri2}" data-col-id="${col.id}"
            aria-label="${escapedColName}" ${col.isKey ? 'disabled' : ''}></label>`;
        } else {
          const keyAttrs = col.isKey ? ' min="1" data-key="true"' : ' data-key="false"';
          html += `<input class="${col.isKey ? 'id-input' : 'col-input'} cell-input" type="${dt.inputType}"${stepA}${keyAttrs} maxlength="20"
            data-ti="${ti}" data-ri="${ri2}" data-col-id="${col.id}" data-col-type="${col.type}" data-is-key="${col.isKey}"
            value="${escapedColVal}" placeholder="${escapedColName}"
            aria-label="${escapedColName}">`;
        }
      });

      html += `<button class="del-btn" data-ti="${ti}" data-ri="${ri2}" aria-label="Delete row ${ri2 + 1}">×</button></div>`;
    });

    const nonKeyColCount = t.columns.filter(c => !c.isKey).length;
    const canAddCol = nonKeyColCount < LIMITS.MAX_COLS_PER_TABLE;
    html += `</div>
      <button class="add-row-btn" data-ti="${ti}" aria-label="Add row to ${escapeHtml(t.name)}">+ row</button>
      <button class="add-col-btn" data-ti="${ti}" ${!canAddCol ? `disabled style="opacity:0.5;cursor:not-allowed" title="${LIMIT_MESSAGES.COLUMN_LIMIT}"` : ''} aria-label="Add column to ${escapeHtml(t.name)}">+ column</button>`;

    div.innerHTML = html;
    area.insertBefore(div, addBtn);
  });

  const atMaxTables = state.tables.length >= 6;
  addBtn.disabled = atMaxTables;
  addBtn.classList.toggle('disabled-btn', atMaxTables);
  addBtn.title = atMaxTables ? 'Max 6 tables allowed' : 'Add a new table';
  if (atMaxTables) addBtn.setAttribute('disabled', 'disabled');
  else addBtn.removeAttribute('disabled');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG DIAGRAM (unchanged from v1 renderConn)
// ═══════════════════════════════════════════════════════════════════════════════

export function renderConnV2() {
  const svg = document.getElementById('conn-svg');
  if (!svg) return;

  svg.setAttribute('role', 'img');
  let [li, ri] = getPair();
  if (state.currentOp === 'self') ri = li;

  const palL = PALETTE[li % PALETTE.length];
  const palR = PALETTE[ri % PALETTE.length];
  const lTable = state.tables[li]?.name || 'Table';
  const rTable = state.tables[ri]?.name || 'Table';
  svg.setAttribute('aria-label', `Diagram showing ${state.currentOp || 'join'} between ${escapeHtml(lTable)} and ${escapeHtml(rTable)}`);

  const isSetOp = state.currentOp && ['union', 'union_all', 'except', 'intersect'].includes(state.currentOp);
  if (isSetOp) {
    const W = 480, H = 130;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.display = 'block';
    svg.innerHTML = `
      <rect x="1" y="1" width="${W-2}" height="${H-2}" rx="10" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="6 4"/>
      <text x="${W/2}" y="${H/2}" text-anchor="middle" font-size="9" font-family="var(--font-main,sans-serif)" fill="rgba(202,202,202,0.5)" dominant-baseline="middle">Diagram not applicable for SET operators</text>
      <text x="${W/2}" y="${H/2+18}" text-anchor="middle" font-size="8" font-family="var(--font-main,sans-serif)" fill="rgba(202,202,202,0.35)" dominant-baseline="middle">(UNION, EXCEPT, INTERSECT combine/compare entire tables)</text>`;
    return;
  }

  const svgEmptyReason = getSvgEmptyStateReason(li, ri);
  if (svgEmptyReason) {
    const W = 480, H = 130;
    const lN = escapeHtml(state.tables[li]?.name || 'Table');
    const rN = escapeHtml(state.tables[ri]?.name || 'Table');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.display = 'block';
    svg.innerHTML = `
      <rect x="1" y="1" width="${W-2}" height="${H-2}" rx="10" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="6 4"/>
      <rect x="18" y="28" width="100" height="${H-56}" rx="8" fill="${palL.fill}" stroke="${palL.stroke}" stroke-width="0.8" stroke-dasharray="4 3"/>
      <rect x="${W-118}" y="28" width="100" height="${H-56}" rx="8" fill="${palR.fill}" stroke="${palR.stroke}" stroke-width="0.8" stroke-dasharray="4 3"/>
      <text x="${W/2}" y="${H/2}" text-anchor="middle" font-size="8" font-family="var(--font-main,sans-serif)" fill="rgba(202,202,202,0.3)" dominant-baseline="middle">${escapeHtml(svgEmptyReason.message)}</text>
      <text x="68" y="${H-10}" text-anchor="middle" font-size="8" font-family="var(--font-main,sans-serif)" fill="${palL.text}" opacity="0.45">${lN}</text>
      <text x="${W-68}" y="${H-10}" text-anchor="middle" font-size="8" font-family="var(--font-main,sans-serif)" fill="${palR.text}" opacity="0.45">${rN}</text>`;
    return;
  }

  const rows = computeResult(state.currentOp);
  const pairs = rows.filter(r => r.i1 >= 0 && r.i2 >= 0);
  const lCount = Math.max(state.tables[li].rows.length, 1);
  const rCount = Math.max(state.tables[ri].rows.length, 1);
  const rowH = 34, padY = 22, W = 480, LX = 118, RX = 362;
  const H = Math.max(lCount, rCount) * rowH + padY * 2 + 32;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.display = 'block';

  const lYs = Array.from({ length: state.tables[li].rows.length }, (_, i) => padY + i * rowH + rowH / 2);
  const rYs = Array.from({ length: state.tables[ri].rows.length }, (_, i) => padY + i * rowH + rowH / 2);

  let s = '';
  state.tables[li].rows.forEach((_, i) => {
    const dv = getSvgValue(li, i);
    const kv = getKeyValue(li, i);
    const empty = kv === '' || kv === undefined || kv === null;
    const isMatch = pairs.some(r => r.i1 === i) || (['exists', 'not_exists'].includes(state.currentOp) && rows.some(r => r.i1 === i));
    const label = empty ? '—' : (dv === '' || dv == null ? '·' : escapeHtml(String(dv)));
    s += `<rect x="18" y="${lYs[i]-13}" width="100" height="26" rx="6" fill="${palL.fill}" stroke="${palL.stroke}" stroke-width="${isMatch ? 1.8 : 0.8}" ${empty ? 'opacity="0.4"' : ''}/>
    <text x="68" y="${lYs[i]}" text-anchor="middle" font-size="8" font-family="var(--font-mono,monospace)" fill="${palL.text}" dominant-baseline="middle" ${empty ? 'opacity="0.35"' : ''}>${label}</text>`;
  });

  state.tables[ri].rows.forEach((_, i) => {
    const dv = getSvgValue(ri, i);
    const kv = getKeyValue(ri, i);
    const empty = kv === '' || kv === undefined || kv === null;
    const isMatch = pairs.some(r => r.i2 === i);
    const label = empty ? '—' : (dv === '' || dv == null ? '·' : escapeHtml(String(dv)));
    s += `<rect x="${W-118}" y="${rYs[i]-13}" width="100" height="26" rx="6" fill="${palR.fill}" stroke="${palR.stroke}" stroke-width="${isMatch ? 1.8 : 0.8}" ${empty ? 'opacity="0.4"' : ''}/>
    <text x="${W-68}" y="${rYs[i]}" text-anchor="middle" font-size="8" font-family="var(--font-mono,monospace)" fill="${palR.text}" dominant-baseline="middle" ${empty ? 'opacity="0.35"' : ''}>${label}</text>`;
  });

  const seen = new Set();
  pairs.forEach(r => {
    const key = `${r.i1}-${r.i2}`;
    if (seen.has(key)) return;
    seen.add(key);
    const y1 = lYs[r.i1], y2 = rYs[r.i2], mx = (LX + RX) / 2;
    s += `<path d="M${LX} ${y1} C${mx} ${y1} ${mx} ${y2} ${RX} ${y2}" fill="none" stroke="${palL.line}" stroke-width="1.8" opacity="0.72"/>`;
  });

  const lSvgCol = getSvgColumn(li);
  const rSvgCol = getSvgColumn(ri);
  s += `<text x="68" y="${H-14}" text-anchor="middle" font-size="8" font-family="var(--font-main,sans-serif)" fill="${palL.text}">${escapeHtml(state.tables[li].name)}</text>
  <text x="68" y="${H-4}" text-anchor="middle" font-size="9" font-family="var(--font-main,sans-serif)" fill="${palL.text}" opacity="0.45">.${escapeHtml(lSvgCol.name)}</text>
  <text x="${W-68}" y="${H-14}" text-anchor="middle" font-size="8" font-family="var(--font-main,sans-serif)" fill="${palR.text}">${state.currentOp === 'self' ? escapeHtml(state.tables[li].name) + ' (alias)' : escapeHtml(state.tables[ri].name)}</text>
  <text x="${W-68}" y="${H-4}" text-anchor="middle" font-size="9" font-family="var(--font-main,sans-serif)" fill="${palR.text}" opacity="0.45">.${escapeHtml(rSvgCol.name)}</text>`;

  svg.innerHTML = s;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT RENDERING (V2) — accepts precomputed rows from V2 engine
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Renders the result grid using rows already processed by computeResultV2.
 * Falls back to computeResult() if no rows provided.
 */
export function renderResultV2(precomputedRows) {
  const rows = precomputedRows !== undefined ? precomputedRows : computeResult(state.currentOp);
  let [li, ri] = getPair();
  if (state.currentOp === 'self') ri = li;

  const palL = PALETTE[li % PALETTE.length];
  const palR = PALETTE[ri % PALETTE.length];
  const isSelfJoin = state.currentOp === 'self';
  const isSingleCol = rows.length > 0 && rows[0].single;
  const isStdJoin = rows.length > 0 && !rows[0].single && rows[0].li !== undefined && rows[0].c1 === undefined;
  const emptyReason = rows.length === 0 ? getEmptyStateReason() : null;

  const rowCountEl = document.getElementById('row-count');
  if (rowCountEl) rowCountEl.textContent = `${rows.length} row${rows.length !== 1 ? 's' : ''}`;

  const heads = document.getElementById('rg-heads');
  const body = document.getElementById('result-body');
  if (!heads || !body) return;

  // Grouped result rendering (Feature C)
  if (rows.length > 0 && rows[0]._isGrouped) {
    renderGroupedResult(rows, heads, body, li, ri, palL, palR);
    return;
  }

  if (isSelfJoin) {
    const t = state.tables[li];
    const allCols = [...t.columns.map(c => ({ ...c, side: 'l', ti: li })), ...t.columns.map(c => ({ ...c, side: 'r', ti: li }))];
    const tpl = allCols.map(() => '1fr').join(' ');
    heads.style.gridTemplateColumns = tpl;
    heads.innerHTML = allCols.map(c => `<div class="rg-head" role="columnheader" style="border-bottom:2px solid ${c.side === 'l' ? palL.line : palR.line}33">${t.name}${c.side === 'r' ? ' (alias)' : ''}.${escapeHtml(c.name)}</div>`).join('');
    body.innerHTML = rows.length
      ? rows.map(r => {
          const lRow = r.i1 >= 0 ? t.rows[r.i1] : null;
          const rRow = r.i2 >= 0 ? t.rows[r.i2] : null;
          const cells = allCols.map(c => {
            const rd = c.side === 'l' ? lRow : rRow;
            const pal = c.side === 'l' ? palL : palR;
            const val = rd ? rd[c.id] : null;
            const sideLabel = c.side === 'l' ? ' (left)' : ' (right)';
            const cellContent = val == null || val === '' ? `<span class="null-val">${nullBadge()}</span>` : `${escapeHtml(String(val))}<span style="font-size:0.7em;opacity:0.5">${sideLabel}</span>`;
            return `<div class="rg-cell" role="cell" style="background:${pal.bg}">${cellContent}</div>`;
          });
          return `<div class="rg-data-row" role="row" style="grid-template-columns:${tpl}">${cells.join('')}</div>`;
        }).join('')
      : `<p class="empty-state">${emptyState(emptyReason)}</p>`;
  } else if (isSingleCol || (rows.length > 0 && rows[0].isSetOp)) {
    const tL = state.tables[li], tR = state.tables[ri];
    const allColIds = [...new Set([...tL.columns.map(c => c.id), ...tR.columns.map(c => c.id)])];
    const allCols = allColIds.map(colId => {
      const inL = tL.columns.find(c => c.id === colId);
      const inR = tR.columns.find(c => c.id === colId);
      return { id: colId, name: (inL || inR)?.name || colId, ti: inL ? li : ri, side: inL && inR ? 'both' : inL ? 'l' : 'r' };
    });
    const tpl = allCols.map(() => '1fr').join(' ');
    heads.style.gridTemplateColumns = tpl;
    heads.innerHTML = allCols.map(c => `<div class="rg-head" role="columnheader" style="border-bottom:2px solid ${c.side === 'r' ? palR.line : palL.line}33">${escapeHtml(c.name)}</div>`).join('');
    body.innerHTML = rows.length
      ? rows.map(r => {
          const table = state.tables[r.ti];
          const rowData = table ? table.rows[r.ri] : {};
          const rowPal = r.ti === ri ? palR : palL;
          const cells = allCols.map(c => {
            const val = rowData[c.id];
            const cellPal = c.side === 'r' ? palR : c.side === 'l' ? palL : rowPal;
            const sideLabel = c.side === 'r' ? ' (right)' : c.side === 'l' ? ' (left)' : '';
            const cellContent = val == null || val === '' ? `<span class="null-val">${nullBadge()}</span>` : `${escapeHtml(String(val))}<span style="font-size:0.7em;opacity:0.5">${sideLabel}</span>`;
            return `<div class="rg-cell" role="cell" style="background:${cellPal.bg}">${cellContent}</div>`;
          }).join('');
          return `<div class="rg-data-row" role="row" style="grid-template-columns:${tpl}">${cells}</div>`;
        }).join('')
      : `<p class="empty-state">${emptyState(emptyReason)}</p>`;
  } else if (isStdJoin) {
    const tL = state.tables[li], tR = state.tables[ri];
    const allCols = [...tL.columns.map(c => ({ ...c, side: 'l', ti: li })), ...tR.columns.map(c => ({ ...c, side: 'r', ti: ri }))];
    const tpl = allCols.map(() => '1fr').join(' ');
    heads.style.gridTemplateColumns = tpl;
    heads.innerHTML = allCols.map(c => `<div class="rg-head" role="columnheader" style="border-bottom:2px solid ${c.side === 'l' ? palL.line : palR.line}33">${escapeHtml(state.tables[c.ti].name)}.${escapeHtml(c.name)}</div>`).join('');
    body.innerHTML = rows.length
      ? rows.map(r => {
          const lRow = r.i1 >= 0 ? tL.rows[r.i1] : null;
          const rRow = r.i2 >= 0 ? tR.rows[r.i2] : null;
          const cells = allCols.map(c => {
            const rd = c.side === 'l' ? lRow : rRow;
            const pal = c.side === 'l' ? palL : palR;
            const val = rd ? rd[c.id] : null;
            const sideLabel = c.side === 'l' ? ' (left)' : ' (right)';
            const cellContent = val == null || val === '' ? `<span class="null-val">${nullBadge()}</span>` : `${escapeHtml(String(val))}<span style="font-size:0.7em;opacity:0.5">${sideLabel}</span>`;
            return `<div class="rg-cell" role="cell" style="background:${pal.bg}">${cellContent}</div>`;
          });
          return `<div class="rg-data-row" role="row" style="grid-template-columns:${tpl}">${cells.join('')}</div>`;
        }).join('')
      : `<p class="empty-state">${emptyState(emptyReason)}</p>`;
  } else {
    heads.style.gridTemplateColumns = '1fr 1fr';
    heads.innerHTML = `<div class="rg-head" role="columnheader">${escapeHtml(state.tables[li].name)}.id</div><div class="rg-head" role="columnheader">${escapeHtml(state.tables[ri].name)}.id</div>`;
    body.innerHTML = rows.length
      ? rows.map(r => `<div class="rg-data-row" role="row" style="grid-template-columns:1fr 1fr">
          <div class="rg-cell" role="cell" style="background:${palL.bg}">${r.c1 === null ? `<span class="null-val">${nullBadge()}</span>` : r.c1 === undefined ? '—' : `${escapeHtml(String(r.c1))}<span style="font-size:0.7em;opacity:0.5"> (left)</span>`}</div>
          <div class="rg-cell" role="cell" style="background:${palR.bg}">${r.c2 === null ? `<span class="null-val">${nullBadge()}</span>` : r.c2 === undefined ? '—' : `${escapeHtml(String(r.c2))}<span style="font-size:0.7em;opacity:0.5"> (right)</span>`}</div>
        </div>`).join('')
      : `<p class="empty-state">${emptyState(emptyReason)}</p>`;
  }
}

function renderGroupedResult(rows, heads, body, li, ri, palL, palR) {
  // Show group key columns + aggregate columns
  const firstRow = rows[0];
  const keyEntries = Object.entries(firstRow._keyVals || {});
  const aggEntries = Object.entries(firstRow._aggResults || {});

  const colDefs = [
    ...keyEntries.map(([k]) => {
      const [side, colId] = k.split('_');
      const tableIdx = side === 'right' ? ri : li;
      const col = state.tables[tableIdx]?.columns.find(c => c.id === colId);
      return { label: col ? `${state.tables[tableIdx].name}.${col.name}` : k, key: k, type: 'group', pal: side === 'right' ? palR : palL };
    }),
    ...aggEntries.map(([k]) => {
      return { label: k.replace(/_/g, '(', 1).replace('_left_', '.').replace('_right_', '.') + ')', key: k, type: 'agg', pal: palL };
    }),
    { label: 'row_count', key: '_groupCount', type: 'meta', pal: palL },
  ];

  const tpl = colDefs.map(() => '1fr').join(' ');
  heads.style.gridTemplateColumns = tpl;
  heads.innerHTML = colDefs.map(c => `<div class="rg-head" role="columnheader" style="border-bottom:2px solid ${c.pal.line}33">${escapeHtml(c.label)}</div>`).join('');
  body.innerHTML = rows.map(row => {
    const cells = colDefs.map(c => {
      let val;
      if (c.type === 'group') val = row._keyVals[c.key];
      else if (c.type === 'agg') val = row._aggResults[c.key];
      else val = row._groupCount;
      const display = val == null ? `<span class="null-val">${nullBadge()}</span>` : escapeHtml(String(typeof val === 'number' ? Math.round(val * 100) / 100 : val));
      return `<div class="rg-cell" role="cell" style="background:${c.pal.bg}">${display}</div>`;
    }).join('');
    return `<div class="rg-data-row" role="row" style="grid-template-columns:${tpl}">${cells}</div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE F — EXPLAIN PANEL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Renders a plain-English explanation of the join result.
 * @param {Array} rows - Final result rows (after V2 pipeline)
 * @param {Array} rawRows - Raw join rows before WHERE/GROUP BY (for comparison)
 */
export function renderExplainPanel(rows, rawRows) {
  const panel = document.getElementById('explain-panel');
  if (!panel) return;

  if (!state.currentOp || state.tables.length < 2) {
    panel.style.display = 'none';
    return;
  }

  const [li, ri] = getPair();
  const leftTable  = state.tables[li];
  const rightTable = state.tables[ri];
  if (!leftTable || !rightTable) { panel.style.display = 'none'; return; }

  const lRows = leftTable.rows.length;
  const rRows = rightTable.rows.length;
  const resultCount = rows.length;
  const rawCount = rawRows ? rawRows.length : resultCount;

  let lines = [];

  // Join-type explanation
  switch (state.currentOp) {
    case 'inner':
      lines.push(`<strong>${resultCount}</strong> row${resultCount !== 1 ? 's' : ''} matched across both tables.`);
      if (lRows > 0 || rRows > 0) {
        const unmatched = (lRows + rRows) - resultCount;
        if (unmatched > 0) lines.push(`${unmatched} row${unmatched !== 1 ? 's' : ''} were dropped — no matching key found on the other side.`);
      }
      break;
    case 'left':
      lines.push(`All <strong>${lRows}</strong> rows from <em>${escapeHtml(leftTable.name)}</em> are kept.`);
      const nullRightRows = rows.filter(r => r.i2 < 0).length;
      if (nullRightRows > 0) lines.push(`<strong>${nullRightRows}</strong> row${nullRightRows !== 1 ? 's' : ''} have NULL on the right (no match in <em>${escapeHtml(rightTable.name)}</em>).`);
      break;
    case 'right':
      lines.push(`All <strong>${rRows}</strong> rows from <em>${escapeHtml(rightTable.name)}</em> are kept.`);
      const nullLeftRows = rows.filter(r => r.i1 < 0).length;
      if (nullLeftRows > 0) lines.push(`<strong>${nullLeftRows}</strong> row${nullLeftRows !== 1 ? 's' : ''} have NULL on the left (no match in <em>${escapeHtml(leftTable.name)}</em>).`);
      break;
    case 'full':
      lines.push(`All rows from both tables are included — <strong>${resultCount}</strong> total.`);
      const fullNulls = rows.filter(r => r.i1 < 0 || r.i2 < 0).length;
      if (fullNulls > 0) lines.push(`<strong>${fullNulls}</strong> row${fullNulls !== 1 ? 's' : ''} have NULL on one side (unmatched).`);
      break;
    case 'cross':
      lines.push(`Cartesian product: <strong>${lRows} × ${rRows} = ${resultCount}</strong> rows.`);
      lines.push('Every row in the left table is paired with every row in the right.');
      break;
    case 'left_anti':
    case 'not_exists':
      lines.push(`<strong>${resultCount}</strong> row${resultCount !== 1 ? 's' : ''} from <em>${escapeHtml(leftTable.name)}</em> have no match in <em>${escapeHtml(rightTable.name)}</em>.`);
      break;
    case 'right_anti':
      lines.push(`<strong>${resultCount}</strong> row${resultCount !== 1 ? 's' : ''} from <em>${escapeHtml(rightTable.name)}</em> have no match in <em>${escapeHtml(leftTable.name)}</em>.`);
      break;
    case 'left_semi':
    case 'exists':
      lines.push(`<strong>${resultCount}</strong> row${resultCount !== 1 ? 's' : ''} from <em>${escapeHtml(leftTable.name)}</em> have at least one match in <em>${escapeHtml(rightTable.name)}</em>.`);
      lines.push('Only left-table columns are shown (semi join returns no right-side columns).');
      break;
    case 'union':
      lines.push(`Combined <strong>${lRows}</strong> + <strong>${rRows}</strong> rows, de-duplicated to <strong>${resultCount}</strong>.`);
      break;
    case 'union_all':
      lines.push(`Combined all <strong>${lRows + rRows}</strong> rows including duplicates.`);
      break;
    case 'except':
      lines.push(`<strong>${resultCount}</strong> row${resultCount !== 1 ? 's' : ''} appear in <em>${escapeHtml(leftTable.name)}</em> but not in <em>${escapeHtml(rightTable.name)}</em>.`);
      break;
    case 'intersect':
      lines.push(`<strong>${resultCount}</strong> row${resultCount !== 1 ? 's' : ''} appear in both tables.`);
      break;
    default:
      lines.push(`Result: <strong>${resultCount}</strong> row${resultCount !== 1 ? 's' : ''}.`);
  }

  // WHERE filter info
  if (rawRows && rawCount !== resultCount) {
    const filtered = rawCount - resultCount;
    lines.push(`<span style="color:var(--color-text-muted)">WHERE filter removed <strong>${filtered}</strong> row${filtered !== 1 ? 's' : ''} (${rawCount} → ${resultCount}).</span>`);
  }

  panel.innerHTML = `
    <div class="explain-panel-inner">
      <span class="explain-icon"><i class="fa-solid fa-lightbulb"></i></span>
      <div class="explain-text">
        ${lines.map(l => `<p>${l}</p>`).join('')}
      </div>
    </div>`;
  panel.style.display = 'block';
}
