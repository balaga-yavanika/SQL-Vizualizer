/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SQL Joins Visualizer V2 — Main Orchestrator
 * ═══════════════════════════════════════════════════════════════════════════════
 * Mirrors: pages/joins/joins.js
 *
 * NEW in V2:
 *   Feature A  — WHERE filter panel
 *   Feature B  — ORDER BY panel
 *   Feature C  — GROUP BY + aggregate panel
 *   Feature D  — HAVING panel
 *   Feature F  — Explain panel
 *   Feature G  — NULL handling toggle per column
 *   Feature H  — Duplicate key warning (handled in joins-ui-v2.js)
 *   Feature J  — Additional preset datasets (employees, products)
 *   Feature L  — OR condition logic toggle for ON clause
 *   Feature P  — Pencil icon column rename (handled in joins-ui-v2.js)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════
import {
  state, JOIN_OPS, DESCS, PRESET_DATASETS, INITIAL_STATE, DATA_TYPES,
} from '../../js/core/state.js';
import {
  rebuildPairSelect, getMatchedIdx, addTable, removeTable, addRow, delRow,
  updateVal, renameTable, renameColumn, addColumn, removeColumn, setSvgColumn,
  setJoinCondition, loadPreset, getJoinConditionDisplay, getPair, addJoinCondition,
  removeJoinCondition, updateJoinCondition, validateName,
} from '../../js/core/utils.js';
import { LIMITS, LIMIT_MESSAGES } from '../../js/core/limits.js';
import { computeResultV2, validateSetOperatorCompatibility } from './joinEngineV2.js';
import { ModalHandler } from '../../js/components/modal-handler.js';
import { DropdownHandler } from '../../js/components/dropdown-handler.js';
import {
  renderTablesV2,
  renderConnV2,
  renderResultV2,
  renderExplainPanel,
  renderDiagramColSelectors,
} from './joins-ui-v2.js';
import {
  generateSqlV2, renderSqlPanelV2, copySqlToClipboard,
} from './joins-sql-generator-v2.js';
import { initBanner } from '../../global/banner.js';
import {
  parseUrlParams, generateShareUrl, copyShareLinkWithToast, stopBellAnimation,
  updateShareButtonVisibility, makeEditableCopy, showToast,
} from '../../js/core/url-state.js';

// ═══════════════════════════════════════════════════════════════════════════════
// V2 STATE — extends base state with new feature state
// ═══════════════════════════════════════════════════════════════════════════════

export const v2State = {
  // Feature L: OR condition logic
  conditionLogic: 'AND',

  // Feature A: WHERE filters [{side:'left'|'right', colId, op, val}]
  whereFilters: [],

  // Feature B: ORDER BY [{side, colId, dir:'ASC'|'DESC'}]
  orderBy: [],

  // Feature C: GROUP BY + aggregates
  groupBy: [],
  aggregates: [],

  // Feature D: HAVING [{func, side, colId, op, val}]
  havingFilters: [],

  // Feature G: nullable join columns {ti_colId: boolean}
  nullableJoinCols: {},
};

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE J — ADDITIONAL PRESET DATASETS
// ═══════════════════════════════════════════════════════════════════════════════

const PRESET_DATASETS_V2 = {
  ...PRESET_DATASETS,

  employees_departments: {
    tables: [
      {
        name: 'employees',
        columns: [
          { id: 'col_0', name: 'emp_id', type: 'number', isKey: true },
          { id: 'col_1', name: 'name', type: 'string', isKey: false },
          { id: 'col_2', name: 'dept_id', type: 'number', isKey: false },
          { id: 'col_3', name: 'salary', type: 'float', isKey: false },
        ],
        rows: [
          { col_0: 1, col_1: 'Alice', col_2: 10, col_3: 95000 },
          { col_0: 2, col_1: 'Bob', col_2: 20, col_3: 72000 },
          { col_0: 3, col_1: 'Carol', col_2: 10, col_3: 88000 },
          { col_0: 4, col_1: 'Dan', col_2: 30, col_3: 61000 },
          { col_0: 5, col_1: 'Eve', col_2: null, col_3: 55000 },
        ],
        svgColId: 'col_0',
      },
      {
        name: 'departments',
        columns: [
          { id: 'col_0', name: 'dept_id', type: 'number', isKey: true },
          { id: 'col_1', name: 'dept_name', type: 'string', isKey: false },
          { id: 'col_2', name: 'budget', type: 'float', isKey: false },
        ],
        rows: [
          { col_0: 10, col_1: 'Engineering', col_2: 500000 },
          { col_0: 20, col_1: 'Marketing', col_2: 200000 },
          { col_0: 40, col_1: 'HR', col_2: 150000 },
        ],
        svgColId: 'col_0',
      },
    ],
    joinConditions: [{ leftTable: 0, leftCol: 'col_2', op: '=', rightTable: 1, rightCol: 'col_0' }],
  },

  products_sales: {
    tables: [
      {
        name: 'products',
        columns: [
          { id: 'col_0', name: 'product_id', type: 'number', isKey: true },
          { id: 'col_1', name: 'name', type: 'string', isKey: false },
          { id: 'col_2', name: 'price', type: 'float', isKey: false },
          { id: 'col_3', name: 'category', type: 'string', isKey: false },
        ],
        rows: [
          { col_0: 1, col_1: 'Laptop', col_2: 999, col_3: 'Electronics' },
          { col_0: 2, col_1: 'Mouse', col_2: 29, col_3: 'Electronics' },
          { col_0: 3, col_1: 'Desk', col_2: 349, col_3: 'Furniture' },
          { col_0: 4, col_1: 'Chair', col_2: 249, col_3: 'Furniture' },
        ],
        svgColId: 'col_0',
      },
      {
        name: 'sales',
        columns: [
          { id: 'col_0', name: 'sale_id', type: 'number', isKey: true },
          { id: 'col_1', name: 'product_id', type: 'number', isKey: false },
          { id: 'col_2', name: 'qty', type: 'number', isKey: false },
          { id: 'col_3', name: 'region', type: 'string', isKey: false },
        ],
        rows: [
          { col_0: 101, col_1: 1, col_2: 3, col_3: 'West' },
          { col_0: 102, col_1: 2, col_2: 10, col_3: 'East' },
          { col_0: 103, col_1: 1, col_2: 2, col_3: 'East' },
          { col_0: 104, col_1: 5, col_2: 1, col_3: 'West' },
        ],
        svgColId: 'col_0',
      },
    ],
    joinConditions: [{ leftTable: 0, leftCol: 'col_0', op: '=', rightTable: 1, rightCol: 'col_1' }],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER CACHE
// ═══════════════════════════════════════════════════════════════════════════════
const renderCache = {
  lastOp: null, lastPair: null, lastTablesCount: 0,
  lastConditions: null, lastValidation: null,
};

// ═══════════════════════════════════════════════════════════════════════════════
// JOIN CONDITION EDITOR (V2) — adds OR toggle (Feature L)
// ═══════════════════════════════════════════════════════════════════════════════

const JOIN_COND_OPS = [
  { value: '=', label: '=' }, { value: '>', label: '>' }, { value: '<', label: '<' },
  { value: '>=', label: '>=' }, { value: '<=', label: '<=' },
];

function buildJoinConditionEditorV2() {
  const [li, ri] = getPair();
  if (li === undefined || ri === undefined) return '';
  const rightTableIdx = state.currentOp === 'self' ? li : ri;
  const leftTable = state.tables[li];
  const rightTable = state.tables[rightTableIdx];
  if (!leftTable || !rightTable) return '';

  const getColName = (table, colId) => table.columns.find(c => c.id === colId)?.name || 'Select column';
  const buildColItems = cols => cols.map(c => `<button class="dropdown-item" data-value="${c.id}">${c.name}</button>`).join('');
  const leftColItems = buildColItems(leftTable.columns);
  const rightColItems = buildColItems(rightTable.columns);
  const opItems = JOIN_COND_OPS.map(o => `<button class="dropdown-item" data-value="${o.value}">${o.label}</button>`).join('');
  const isSelf = state.currentOp === 'self';
  const tableName = isSelf ? `${leftTable.name} (T1)` : leftTable.name;
  const aliasName = isSelf ? `${leftTable.name} (T2)` : rightTable.name;

  // Feature L: OR/AND logic toggle
  const logicToggle = state.joinConditions.length > 1
    ? `<div class="condition-logic-toggle">
         <button class="logic-btn${v2State.conditionLogic === 'AND' ? ' active' : ''}" data-logic="AND">AND</button>
         <button class="logic-btn${v2State.conditionLogic === 'OR' ? ' active' : ''}" data-logic="OR">OR</button>
         <span class="logic-hint">how conditions combine</span>
       </div>`
    : '';

  const conditionRows = state.joinConditions.map((cond, idx) => {
    const leftColName = getColName(leftTable, cond.leftCol);
    const rightColName = getColName(rightTable, cond.rightCol);
    const isFirst = idx === 0;
    const canRemove = state.joinConditions.length > 1;
    const isComplete = !!(cond.leftCol && cond.rightCol);
    const statusClass = isComplete ? 'complete' : 'incomplete';

    const connector = isFirst ? 'ON' : v2State.conditionLogic;

    return `
      <div class="join-condition-row ${statusClass}" data-cond-index="${idx}">
        <span class="join-cond-label">${connector}</span>
        ${isSelf && isFirst ? `<span class="self-join-hint">${tableName}</span>` : ''}

        <div class="custom-dropdown join-condition-dropdown" id="join-left-col-wrapper-${idx}">
          <button class="dropdown-toggle" aria-expanded="false">
            <span>${leftColName}</span><span class="dropdown-arrow">▼</span>
          </button>
          <div class="dropdown-menu" style="display:none">${leftColItems}</div>
        </div>

        <div class="custom-dropdown join-condition-dropdown" id="join-op-wrapper-${idx}">
          <button class="dropdown-toggle" aria-expanded="false">
            <span>${cond.op || '='}</span><span class="dropdown-arrow">▼</span>
          </button>
          <div class="dropdown-menu" style="display:none">${opItems}</div>
        </div>

        <div class="custom-dropdown join-condition-dropdown" id="join-right-col-wrapper-${idx}">
          <button class="dropdown-toggle" aria-expanded="false">
            <span>${rightColName}</span><span class="dropdown-arrow">▼</span>
          </button>
          <div class="dropdown-menu" style="display:none">${rightColItems}</div>
        </div>

        ${isSelf && isFirst ? `<span class="self-join-hint">${aliasName}</span>` : ''}
        <span class="condition-status ${statusClass}" title="${isComplete ? 'Complete' : 'Select both columns'}">${isComplete ? '✓' : '⚠'}</span>
        ${canRemove ? `<button class="remove-condition-btn" title="Remove condition" aria-label="Remove condition ${idx + 1}">×</button>` : ''}

        <input type="hidden" id="join-left-col-${idx}" value="${cond.leftCol || ''}">
        <input type="hidden" id="join-op-${idx}" value="${cond.op || '='}">
        <input type="hidden" id="join-right-col-${idx}" value="${cond.rightCol || ''}">
      </div>`;
  }).join('');

  const lastCond = state.joinConditions[state.joinConditions.length - 1];
  const lastComplete = lastCond && lastCond.leftCol && lastCond.rightCol;

  return `
    <div class="join-condition-editor">
      ${conditionRows}
      ${logicToggle}
      <button class="add-condition-btn" id="add-condition-btn" ${!lastComplete ? 'disabled' : ''} title="${lastComplete ? 'Add another condition' : 'Complete current condition first'}">+ AND/OR condition</button>
    </div>`;
}

function setupJoinConditionDropdownsV2() {
  state.joinConditions.forEach((_, idx) => {
    DropdownHandler.setup(`join-left-col-wrapper-${idx}`, value => {
      document.getElementById(`join-left-col-${idx}`).value = value;
      updateJoinConditionAtV2(idx);
    });
    DropdownHandler.setup(`join-op-wrapper-${idx}`, value => {
      document.getElementById(`join-op-${idx}`).value = value;
      updateJoinConditionAtV2(idx);
    });
    DropdownHandler.setup(`join-right-col-wrapper-${idx}`, value => {
      document.getElementById(`join-right-col-${idx}`).value = value;
      updateJoinConditionAtV2(idx);
    });
  });

  const addBtn = document.getElementById('add-condition-btn');
  if (addBtn) {
    addBtn.onclick = () => {
      const last = state.joinConditions[state.joinConditions.length - 1];
      if (last && (!last.leftCol || !last.rightCol)) {
        showToast('⚠️ Complete the current condition first', 'error');
        return;
      }
      addJoinCondition();
      render();
    };
  }

  // Feature L: logic toggle buttons
  document.querySelectorAll('.logic-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      v2State.conditionLogic = btn.dataset.logic;
      render();
    });
  });

  document.querySelectorAll('.remove-condition-btn').forEach(btn => {
    btn.onclick = () => {
      const row = btn.closest('.join-condition-row');
      if (!row) return;
      const idx = parseInt(row.getAttribute('data-cond-index'));
      if (!Number.isInteger(idx) || idx < 0) return;
      removeJoinCondition(idx);
      render();
    };
  });
}

function updateJoinConditionAtV2(idx) {
  const leftColId  = document.getElementById(`join-left-col-${idx}`)?.value;
  const rightColId = document.getElementById(`join-right-col-${idx}`)?.value;
  const op         = document.getElementById(`join-op-${idx}`)?.value || '=';
  if (leftColId && rightColId) {
    updateJoinCondition(idx, { leftCol: leftColId, op, rightCol: rightColId });
  } else if (!leftColId && !rightColId) {
    // Both cleared — reset condition to empty
    updateJoinCondition(idx, null);
  }
  render();
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE A–D — REFINE RESULTS PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function buildRefinePanel() {
  const panel   = document.getElementById('refine-results-panel');
  const wrapper = document.getElementById('refine-results-wrapper');
  if (!panel) return;

  const [li, ri] = getPair();
  const lTable = state.tables[li];
  const rTable = state.tables[ri];
  if (!lTable || !rTable || !state.currentOp) {
    if (wrapper) wrapper.style.display = 'none';
    return;
  }
  if (wrapper) wrapper.style.display = 'block';

  const isSetOp = JOIN_OPS[state.currentOp]?.group === 'set';
  panel.style.display = 'block';

  // Build column options for left + right tables
  const buildColOptions = (tableIdx, side) => {
    const t = state.tables[tableIdx];
    if (!t) return '';
    return t.columns.map(c => `<option value="${c.id}" data-side="${side}">${t.name}.${c.name}</option>`).join('');
  };

  const colPlaceholder = '<option value="">— select column —</option>';
  const allColOptions = `${colPlaceholder}<optgroup label="${lTable.name} (left)">${buildColOptions(li, 'left')}</optgroup>
    ${!isSetOp ? `<optgroup label="${rTable.name} (right)">${buildColOptions(ri, 'right')}</optgroup>` : ''}`;

  const opOptions = ['=', '!=', '>', '<', '>=', '<=', 'contains'].map(o => `<option value="${o}">${o}</option>`).join('');

  // WHERE filters (Feature A)
  const whereRows = v2State.whereFilters.map((f, i) => `
    <div class="refine-row" data-where-idx="${i}">
      <div class="refine-field">
        <span class="refine-field-label">Column</span>
        <select class="refine-select where-col-select" data-idx="${i}">${allColOptions}</select>
      </div>
      <div class="refine-field">
        <span class="refine-field-label">Operator</span>
        <select class="refine-select where-op-select" data-idx="${i}">${opOptions}</select>
      </div>
      <div class="refine-field refine-field--flex">
        <span class="refine-field-label">Value</span>
        <input class="refine-input where-val-input" type="text" placeholder="e.g. 42 or Alice" value="${f.val || ''}" data-idx="${i}">
      </div>
      <button class="refine-remove-btn" data-where-idx="${i}" title="Remove filter">×</button>
    </div>`).join('');

  // ORDER BY (Feature B)
  const orderRows = v2State.orderBy.map((o, i) => `
    <div class="refine-row" data-order-idx="${i}">
      <div class="refine-field refine-field--flex">
        <span class="refine-field-label">Column</span>
        <select class="refine-select order-col-select" data-idx="${i}">${allColOptions}</select>
      </div>
      <div class="refine-field">
        <span class="refine-field-label">Direction</span>
        <select class="refine-select order-dir-select" data-idx="${i}">
          <option value="ASC" ${o.dir === 'ASC' ? 'selected' : ''}>ASC ↑ (A→Z, 1→9)</option>
          <option value="DESC" ${o.dir === 'DESC' ? 'selected' : ''}>DESC ↓ (Z→A, 9→1)</option>
        </select>
      </div>
      <button class="refine-remove-btn" data-order-idx="${i}" title="Remove">×</button>
    </div>`).join('');

  // GROUP BY (Feature C)
  const aggOptions = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].map(a => `<option value="${a}">${a}</option>`).join('');
  const groupRows = v2State.groupBy.map((g, i) => `
    <div class="refine-row" data-group-idx="${i}">
      <div class="refine-field refine-field--flex">
        <span class="refine-field-label">Group by column</span>
        <select class="refine-select group-col-select" data-idx="${i}">${allColOptions}</select>
      </div>
      <button class="refine-remove-btn" data-group-idx="${i}" title="Remove">×</button>
    </div>`).join('');

  const aggRows = v2State.aggregates.map((a, i) => `
    <div class="refine-row refine-row--agg" data-agg-idx="${i}">
      <div class="refine-field">
        <span class="refine-field-label">Function</span>
        <select class="refine-select agg-func-select" data-idx="${i}">${aggOptions}</select>
      </div>
      <div class="refine-field refine-field--flex">
        <span class="refine-field-label">Column</span>
        <select class="refine-select agg-col-select" data-idx="${i}">${allColOptions}</select>
      </div>
      <div class="refine-field">
        <span class="refine-field-label">Alias (optional)</span>
        <input class="refine-input agg-alias-input" type="text" placeholder="e.g. total_sales" value="${a.alias || ''}" data-idx="${i}">
      </div>
      <button class="refine-remove-btn" data-agg-idx="${i}" title="Remove">×</button>
    </div>`).join('');

  // HAVING (Feature D) — enabled only when GROUP BY is active
  const hasActiveGroup = v2State.groupBy.some(g => g.colId);
  const havingRows = hasActiveGroup ? v2State.havingFilters.map((h, i) => `
    <div class="refine-row" data-having-idx="${i}">
      <div class="refine-field">
        <span class="refine-field-label">Function</span>
        <select class="refine-select having-func-select" data-idx="${i}">${aggOptions}</select>
      </div>
      <div class="refine-field refine-field--flex">
        <span class="refine-field-label">Column</span>
        <select class="refine-select having-col-select" data-idx="${i}">${allColOptions}</select>
      </div>
      <div class="refine-field">
        <span class="refine-field-label">Operator</span>
        <select class="refine-select having-op-select" data-idx="${i}">${opOptions}</select>
      </div>
      <div class="refine-field">
        <span class="refine-field-label">Value</span>
        <input class="refine-input having-val-input" type="text" placeholder="e.g. 5" value="${h.val || ''}" data-idx="${i}">
      </div>
      <button class="refine-remove-btn" data-having-idx="${i}" title="Remove">×</button>
    </div>`).join('') : '<p class="refine-hint">Add a GROUP BY column first to enable HAVING.</p>';

  panel.innerHTML = `
    <div class="refine-section refine-section--where">
      <div class="refine-section-header">
        <span class="refine-section-title">WHERE</span>
        <span class="refine-section-hint">Filter rows after join</span>
        <button class="refine-add-btn" id="add-where-btn"><i class="fa fa-plus"></i> Add filter</button>
      </div>
      <div class="refine-rows" id="where-rows">${whereRows || '<p class="refine-hint">No filters yet — click <strong>Add filter</strong> to start.</p>'}</div>
    </div>

    <div class="refine-section refine-section--order">
      <div class="refine-section-header">
        <span class="refine-section-title">ORDER BY</span>
        <span class="refine-section-hint">Sort results</span>
        <button class="refine-add-btn" id="add-order-btn"><i class="fa fa-plus"></i> Add sort</button>
      </div>
      <div class="refine-rows" id="order-rows">${orderRows || '<p class="refine-hint">No sort rules yet — click <strong>Add sort</strong> to start.</p>'}</div>
    </div>

    <div class="refine-section refine-section--group">
      <div class="refine-section-header">
        <span class="refine-section-title">GROUP BY</span>
        <span class="refine-section-hint">Group rows and compute aggregates</span>
        <button class="refine-add-btn" id="add-group-btn"><i class="fa fa-plus"></i> Add group</button>
        <button class="refine-add-btn" id="add-agg-btn"><i class="fa fa-plus"></i> Add aggregate</button>
      </div>
      <div class="refine-rows" id="group-rows">${groupRows || '<p class="refine-hint">No groups yet — click <strong>Add group</strong> to start.</p>'}</div>
      ${aggRows ? `<div class="refine-agg-divider">Aggregates</div><div class="refine-rows" id="agg-rows">${aggRows}</div>` : `<div class="refine-rows" id="agg-rows"></div>`}
    </div>

    <div class="refine-section refine-section--having ${!hasActiveGroup ? 'refine-section--disabled' : ''}">
      <div class="refine-section-header">
        <span class="refine-section-title">HAVING</span>
        <span class="refine-section-hint">Filter aggregated groups</span>
        ${hasActiveGroup ? '<button class="refine-add-btn" id="add-having-btn"><i class="fa fa-plus"></i> Add filter</button>' : ''}
      </div>
      <div class="refine-rows" id="having-rows">${havingRows}</div>
    </div>`;

  // Restore select values (after innerHTML replaces DOM)
  restoreRefineSelects();
  setupRefineListeners();
}

function restoreRefineSelects() {
  // WHERE
  v2State.whereFilters.forEach((f, i) => {
    const colSel = document.querySelector(`.where-col-select[data-idx="${i}"]`);
    const opSel  = document.querySelector(`.where-op-select[data-idx="${i}"]`);
    if (colSel) colSel.value = f.colId || '';
    if (opSel)  opSel.value  = f.op || '=';
  });
  // ORDER BY
  v2State.orderBy.forEach((o, i) => {
    const colSel = document.querySelector(`.order-col-select[data-idx="${i}"]`);
    if (colSel) colSel.value = o.colId || '';
  });
  // GROUP BY
  v2State.groupBy.forEach((g, i) => {
    const colSel = document.querySelector(`.group-col-select[data-idx="${i}"]`);
    if (colSel) colSel.value = g.colId || '';
  });
  // Aggregates
  v2State.aggregates.forEach((a, i) => {
    const funcSel = document.querySelector(`.agg-func-select[data-idx="${i}"]`);
    const colSel  = document.querySelector(`.agg-col-select[data-idx="${i}"]`);
    if (funcSel) funcSel.value = a.func || 'COUNT';
    if (colSel)  colSel.value  = a.colId || '';
  });
  // HAVING
  v2State.havingFilters.forEach((h, i) => {
    const funcSel = document.querySelector(`.having-func-select[data-idx="${i}"]`);
    const colSel  = document.querySelector(`.having-col-select[data-idx="${i}"]`);
    const opSel   = document.querySelector(`.having-op-select[data-idx="${i}"]`);
    if (funcSel) funcSel.value = h.func || 'COUNT';
    if (colSel)  colSel.value  = h.colId || '';
    if (opSel)   opSel.value   = h.op || '>';
  });
}

function getSideFromSelect(selectEl) {
  const selected = selectEl.options[selectEl.selectedIndex];
  return selected?.getAttribute('data-side') || 'left';
}

function setupRefineListeners() {
  const panel = document.getElementById('refine-results-panel');
  if (!panel) return;

  // Add WHERE filter
  panel.querySelector('#add-where-btn')?.addEventListener('click', () => {
    v2State.whereFilters.push({ side: 'left', colId: '', op: '=', val: '' });
    render();
  });
  // Add ORDER BY
  panel.querySelector('#add-order-btn')?.addEventListener('click', () => {
    v2State.orderBy.push({ side: 'left', colId: '', dir: 'ASC' });
    render();
  });
  // Add GROUP BY
  panel.querySelector('#add-group-btn')?.addEventListener('click', () => {
    v2State.groupBy.push({ side: 'left', colId: '' });
    render();
  });
  // Add aggregate
  panel.querySelector('#add-agg-btn')?.addEventListener('click', () => {
    v2State.aggregates.push({ func: 'COUNT', side: 'left', colId: '', alias: '' });
    render();
  });
  // Add HAVING
  panel.querySelector('#add-having-btn')?.addEventListener('click', () => {
    v2State.havingFilters.push({ func: 'COUNT', side: 'left', colId: '', op: '>', val: '' });
    render();
  });

  // Remove buttons
  panel.querySelectorAll('.refine-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wi = btn.dataset.whereIdx !== undefined ? parseInt(btn.dataset.whereIdx) : -1;
      const oi = btn.dataset.orderIdx !== undefined ? parseInt(btn.dataset.orderIdx) : -1;
      const gi = btn.dataset.groupIdx !== undefined ? parseInt(btn.dataset.groupIdx) : -1;
      const ai = btn.dataset.aggIdx   !== undefined ? parseInt(btn.dataset.aggIdx)   : -1;
      const hi = btn.dataset.havingIdx !== undefined ? parseInt(btn.dataset.havingIdx) : -1;
      if (wi >= 0) v2State.whereFilters.splice(wi, 1);
      if (oi >= 0) v2State.orderBy.splice(oi, 1);
      if (gi >= 0) v2State.groupBy.splice(gi, 1);
      if (ai >= 0) v2State.aggregates.splice(ai, 1);
      if (hi >= 0) v2State.havingFilters.splice(hi, 1);
      render();
    });
  });

  // WHERE changes
  panel.querySelectorAll('.where-col-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const i = parseInt(sel.dataset.idx);
      v2State.whereFilters[i].colId = sel.value;
      v2State.whereFilters[i].side = getSideFromSelect(sel);
      render();
    });
  });
  panel.querySelectorAll('.where-op-select').forEach(sel => {
    sel.addEventListener('change', () => {
      v2State.whereFilters[parseInt(sel.dataset.idx)].op = sel.value;
      render();
    });
  });
  panel.querySelectorAll('.where-val-input').forEach(inp => {
    // Use change event to avoid rebuilding the panel on every keystroke (kills cursor)
    inp.addEventListener('change', () => {
      v2State.whereFilters[parseInt(inp.dataset.idx)].val = inp.value;
      render();
    });
  });

  // ORDER BY changes
  panel.querySelectorAll('.order-col-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const i = parseInt(sel.dataset.idx);
      v2State.orderBy[i].colId = sel.value;
      v2State.orderBy[i].side = getSideFromSelect(sel);
      render();
    });
  });
  panel.querySelectorAll('.order-dir-select').forEach(sel => {
    sel.addEventListener('change', () => {
      v2State.orderBy[parseInt(sel.dataset.idx)].dir = sel.value;
      render();
    });
  });

  // GROUP BY changes
  panel.querySelectorAll('.group-col-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const i = parseInt(sel.dataset.idx);
      v2State.groupBy[i].colId = sel.value;
      v2State.groupBy[i].side = getSideFromSelect(sel);
      render();
    });
  });

  // Aggregate changes
  panel.querySelectorAll('.agg-func-select').forEach(sel => {
    sel.addEventListener('change', () => {
      v2State.aggregates[parseInt(sel.dataset.idx)].func = sel.value;
      render();
    });
  });
  panel.querySelectorAll('.agg-col-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const i = parseInt(sel.dataset.idx);
      v2State.aggregates[i].colId = sel.value;
      v2State.aggregates[i].side = getSideFromSelect(sel);
      render();
    });
  });
  panel.querySelectorAll('.agg-alias-input').forEach(inp => {
    inp.addEventListener('change', () => {
      v2State.aggregates[parseInt(inp.dataset.idx)].alias = inp.value;
      render();
    });
  });

  // HAVING changes
  panel.querySelectorAll('.having-func-select').forEach(sel => {
    sel.addEventListener('change', () => {
      v2State.havingFilters[parseInt(sel.dataset.idx)].func = sel.value;
      render();
    });
  });
  panel.querySelectorAll('.having-col-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const i = parseInt(sel.dataset.idx);
      v2State.havingFilters[i].colId = sel.value;
      v2State.havingFilters[i].side = getSideFromSelect(sel);
      render();
    });
  });
  panel.querySelectorAll('.having-op-select').forEach(sel => {
    sel.addEventListener('change', () => {
      v2State.havingFilters[parseInt(sel.dataset.idx)].op = sel.value;
      render();
    });
  });
  panel.querySelectorAll('.having-val-input').forEach(inp => {
    inp.addEventListener('change', () => {
      v2State.havingFilters[parseInt(inp.dataset.idx)].val = inp.value;
      render();
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATION DROPDOWNS (unchanged from v1)
// ═══════════════════════════════════════════════════════════════════════════════

function populateDropdownMenu(menuId, group) {
  const menu = document.getElementById(menuId);
  if (!menu) return;
  Object.entries(JOIN_OPS).filter(([, v]) => v.group === group).forEach(([key, cfg]) => {
    const btn = document.createElement('button');
    btn.className = 'dropdown-item';
    btn.textContent = cfg.label;
    btn.setAttribute('data-value', key);
    menu.appendChild(btn);
  });
  menu.style.display = 'none';
}

function initOperationDropdowns() {
  populateDropdownMenu('join-type-menu', 'join');
  DropdownHandler.setup('join-type-dropdown-wrapper', value => {
    state.currentOp = value;
    if (value === 'self') {
      const [leftIdx] = (state.selectedPair || '0-0').split('-').map(Number);
      state.selectedPair = `${leftIdx}-${leftIdx}`;
    } else if (value === 'cross') {
      state.joinConditions = [];
    } else if (state.selectedPair?.split('-')[0] === state.selectedPair?.split('-')[1]) {
      if (state.tables.length >= 2) state.selectedPair = '0-1';
    }
    if (value !== 'cross' && state.joinConditions.length === 0) addJoinCondition();
    updateOperationDisplay();
    render();
  });

  populateDropdownMenu('set-op-menu', 'set');
  DropdownHandler.setup('set-op-dropdown-wrapper', value => {
    state.currentOp = value;
    if (['union', 'union_all', 'except', 'intersect'].includes(value)) state.joinConditions = [];
    updateOperationDisplay();
    render();
  });
}

function updateOperationDisplay() {
  const joinDisplay = document.getElementById('join-type-display');
  const setDisplay  = document.getElementById('set-op-display');
  if (!state.currentOp) {
    if (joinDisplay) joinDisplay.textContent = 'Select a join type...';
    if (setDisplay)  setDisplay.textContent  = 'Select a set operator...';
    document.querySelectorAll('#join-type-menu .dropdown-item, #set-op-menu .dropdown-item').forEach(i => i.classList.remove('selected'));
    return;
  }
  const cfg = JOIN_OPS[state.currentOp];
  if (!cfg) return;
  if (cfg.group === 'join' && joinDisplay) {
    joinDisplay.textContent = cfg.label;
    document.querySelectorAll('#join-type-menu .dropdown-item').forEach(i => i.classList.toggle('selected', i.getAttribute('data-value') === state.currentOp));
    if (setDisplay) setDisplay.textContent = 'Select a set operator...';
    document.querySelectorAll('#set-op-menu .dropdown-item').forEach(i => i.classList.remove('selected'));
  }
  if (cfg.group === 'set' && setDisplay) {
    setDisplay.textContent = cfg.label;
    document.querySelectorAll('#set-op-menu .dropdown-item').forEach(i => i.classList.toggle('selected', i.getAttribute('data-value') === state.currentOp));
    if (joinDisplay) joinDisplay.textContent = 'Select a join type...';
    document.querySelectorAll('#join-type-menu .dropdown-item').forEach(i => i.classList.remove('selected'));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SVG COLUMN SELECTORS
// ═══════════════════════════════════════════════════════════════════════════════

function setupSvgColSelectors() {
  const isSetOp = state.currentOp && ['union', 'union_all', 'except', 'intersect'].includes(state.currentOp);
  state.tables.forEach((t, ti) => {
    const wrapper = document.getElementById(`diagram-col-dropdown-${ti}`);
    if (!wrapper) return;
    const toggle = wrapper.querySelector('.dropdown-toggle');
    if (isSetOp) {
      if (toggle) { toggle.disabled = true; toggle.style.opacity = '0.5'; toggle.style.cursor = 'not-allowed'; toggle.style.pointerEvents = 'none'; }
    } else {
      if (toggle) { toggle.disabled = false; toggle.removeAttribute('style'); }
      DropdownHandler.setup(`diagram-col-dropdown-${ti}`, value => { setSvgColumn(ti, value); renderConnV2(); });
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED VIEW BANNER (unchanged from v1)
// ═══════════════════════════════════════════════════════════════════════════════

function updateSharedViewBanner() {
  let banner = document.getElementById('shared-view-banner');
  const beforeStart = document.getElementById('before-start-banner');
  if (state.isSharedView) {
    if (beforeStart) beforeStart.style.display = 'none';
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'shared-view-banner';
      const heading = document.querySelector('.heading-wrapper');
      if (heading) heading.parentNode.insertBefore(banner, heading.nextSibling);
    }
    banner.innerHTML = `
      <div>
        <div class="banner-title"><i class="fa-solid fa-lock"></i> <strong>📖 Viewing a Shared Example</strong></div>
        <p class="banner-text">This data is read-only. Make a copy below to edit and explore.</p>
      </div>
      <button class="copy-btn" data-action="make-editable-copy">Make a Copy to Edit</button>`;
    banner.style.display = 'flex';
  } else {
    if (banner) banner.style.display = 'none';
    if (beforeStart) beforeStart.style.display = 'block';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RENDER PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export function render() {
  try {
    rebuildPairSelect();

    DropdownHandler.setup('join-pair-select-wrapper', value => {
      const [li, ri] = value.split('-').map(Number);
      if (li >= 0 && li < state.tables.length && ri >= 0 && ri < state.tables.length) {
        if (state.selectedPair !== value) state.joinConditions = [];
        state.selectedPair = value;
        render();
      } else {
        showToast(`⚠️ Invalid pair: ${li}-${ri}`, 'error');
      }
    });

    const isSelf = state.currentOp === 'self';
    document.getElementById('pair-row').style.display =
      (state.tables.length > 2 || (isSelf && state.tables.length >= 1)) ? 'flex' : 'none';

    const joinCondPanel = document.querySelector('.join-condition-panel');
    const isSetOp = state.currentOp && JOIN_OPS[state.currentOp]?.group === 'set';
    if (joinCondPanel) joinCondPanel.style.display = (isSetOp || !state.currentOp) ? 'none' : 'block';

    if (isSetOp) {
      const [li, ri] = getPair();
      const vKey = `${state.currentOp}-${li}-${ri}-${state.tables.length}`;
      if (renderCache.lastValidation !== vKey) {
        renderCache.lastValidation = vKey;
        const v = validateSetOperatorCompatibility(li, ri);
        if (!v.valid) showToast(`⚠️ ${v.error}`, 'error', 4000);
      }
    } else {
      renderCache.lastValidation = null;
    }

    const condEditor = document.getElementById('join-cond-container');
    const isCross = state.currentOp === 'cross';
    if (condEditor) {
      const [li, ri] = getPair();
      const currentPair = `${li}-${ri}`;
      const currentConds = JSON.parse(JSON.stringify(state.joinConditions));
      const needsRebuild =
        renderCache.lastOp !== state.currentOp ||
        renderCache.lastPair !== currentPair ||
        renderCache.lastTablesCount !== state.tables.length ||
        JSON.stringify(renderCache.lastConditions) !== JSON.stringify(currentConds);

      if (needsRebuild) {
        renderCache.lastOp = state.currentOp;
        renderCache.lastPair = currentPair;
        renderCache.lastTablesCount = state.tables.length;
        renderCache.lastConditions = currentConds;

        if (!isSetOp) {
          condEditor.innerHTML = isCross
            ? `<div class="cross-join-note"><strong>⚠️ CROSS JOIN:</strong> Produces a Cartesian product — no ON condition needed.</div>`
            : buildJoinConditionEditorV2();
          if (!isCross) setupJoinConditionDropdownsV2();
        } else {
          condEditor.innerHTML = '';
        }
      }
    }

    const condSummary = document.getElementById('join-condition-summary');
    if (condSummary) condSummary.textContent = 'Current condition: ' + (isCross ? 'Not applicable (Cartesian product)' : getJoinConditionDisplay());

    const desc = document.getElementById('desc');
    if (desc) {
      desc.textContent = state.currentOp ? DESCS[state.currentOp] : 'Select a type or operator to view its meaning.';
    }

    // Compute V2 result
    const [li, ri] = getPair();
    const rawRows = computeResultV2(state.currentOp, { ...v2State, whereFilters: [], orderBy: [], groupBy: [], aggregates: [], havingFilters: [] });
    const rows = computeResultV2(state.currentOp, v2State);
    const { m1, m2 } = getMatchedIdx(rawRows);

    try { renderTablesV2(m1, m2, li, ri, v2State); } catch (e) { console.error('Error rendering tables:', e); }
    try { renderDiagramColSelectors(); setupSvgColSelectors(); } catch (e) { console.error('Error rendering diagram selectors:', e); }
    try { renderConnV2(); } catch (e) { console.error('Error rendering connections:', e); }
    try { renderResultV2(rows); } catch (e) { console.error('Error rendering results:', e); }
    try { renderExplainPanel(rows, rawRows); } catch (e) { console.error('Error rendering explain panel:', e); }
    try { renderSqlPanelV2(v2State); } catch (e) { console.error('Error rendering SQL:', e); }
    try { buildRefinePanel(); } catch (e) { console.error('Error rendering refine panel:', e); }
    try { updateOperationDisplay(); updateShareButtonVisibility(); updateSharedViewBanner(); } catch (e) { console.error('Error updating UI state:', e); }

  } catch (err) {
    console.error('[Critical] Render failed:', err);
    showToast('❌ Critical render error. Please refresh.', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

const colModal = ModalHandler.setup('col-modal', ({ dataValue, name, type }) => {
  try {
    const ti = parseInt(dataValue);
    if (!Number.isInteger(ti) || ti < 0 || ti >= state.tables.length) { showToast('❌ Invalid table', 'error'); return; }
    const validation = validateName(name);
    if (!validation.valid) { showToast(validation.error, 'error'); return; }
    if (!type || !DATA_TYPES[type]) { showToast('❌ Invalid data type', 'error'); return; }
    if (!addColumn(ti, validation.value, type)) { showToast('❌ Failed to add column', 'error'); return; }
    showToast('Column added');
    render();
  } catch (e) { showToast('❌ Failed to add column', 'error'); }
});

window.ysqlvizApp = window.ysqlvizApp || {};
window.ysqlvizApp.joinsV2 = {
  render,
  v2State,
  showColModal: ti => {
    const nonKey = state.tables[ti].columns.filter(c => !c.isKey).length;
    if (nonKey >= LIMITS.MAX_COLS_PER_TABLE) { showToast(LIMIT_MESSAGES.COLUMN_LIMIT, 'error'); return; }
    colModal.show(ti);
    document.getElementById('col-modal-error').style.display = 'none';
  },
  handleColModalInput: event => {
    const text = event.target.value;
    const err = document.getElementById('col-modal-error');
    if (!text) { if (err) err.style.display = 'none'; return; }
    const v = validateName(text);
    if (err) { err.textContent = v.valid ? '' : v.error; err.style.display = v.valid ? 'none' : 'block'; }
  },
  addTableAndRender: () => {
    if (state.tables.length >= LIMITS.MAX_TABLES) return;
    if (addTable()) { showToast('Table added'); render(); } else showToast('Add data to the previous table first');
  },
  removeTableAndRender: ti => { if (removeTable(ti)) { showToast('Table removed'); render(); } },
  addRowAndFocus: ti => {
    if (state.tables[ti].rows.length >= LIMITS.MAX_ROWS_PER_TABLE) { showToast(LIMIT_MESSAGES.ROW_LIMIT, 'error'); return; }
    addRow(ti); showToast('Row added'); render();
    setTimeout(() => {
      const b = document.getElementById(`tb-body-${ti}`);
      if (b) { const ins = b.querySelectorAll('input'); if (ins.length) ins[ins.length - 1].focus(); }
    }, 50);
  },
  delRowAndRender: (ti, ri) => { delRow(ti, ri); showToast('Row deleted'); render(); },
  updateValAndRefresh: (ti, ri, colId, val) => {
    const result = updateVal(ti, ri, colId, val);
    if (!result.valid) { showToast(`❌ ${result.error || 'Invalid value'}`, 'error'); return; }
    renderConnV2(); renderResultV2();
  },
  handleKeyInput: (event, ti, ri, colId, isKey, colType) => {
    let val = event.target.value;
    if (isKey && (val === '-' || val.startsWith('-'))) {
      event.target.value = val.replace(/-/g, '');
      showToast('⚠️ ID cannot be negative', 'error');
    }
    const result = updateVal(ti, ri, colId, event.target.value);
    if (result.valid) { renderConnV2(); renderResultV2(); }
  },
  handleKeyChange: (event, ti, ri, colId, isKey, colType) => {
    let val = event.target.value;
    if (isKey) {
      const num = parseInt(val);
      if (isNaN(num) || num < 1) { event.target.value = '1'; updateVal(ti, ri, colId, '1'); showToast(`⚠️ Invalid ID: reset to 1`, 'error'); return; }
      const dup = state.tables[ti].rows.findIndex((row, idx) => idx !== ri && String(row[colId]) === String(num));
      if (dup !== -1) { event.target.value = '1'; updateVal(ti, ri, colId, '1'); showToast(`⚠️ Duplicate ID: ${num}`, 'error'); return; }
      updateVal(ti, ri, colId, String(num));
    } else if (colType === 'float') {
      const num = parseFloat(val);
      event.target.value = isNaN(num) ? '' : String(num);
      updateVal(ti, ri, colId, isNaN(num) ? '' : String(num));
    } else {
      updateVal(ti, ri, colId, val);
    }
    renderConnV2(); renderResultV2();
  },
  renameTableAndRender: (ti, newName) => {
    const v = validateName(newName);
    if (!v.valid) { showToast(v.error, 'error'); render(); return; }
    renameTable(ti, v.value); render();
  },
  handleTableRenameInput: (event, ti) => {
    if (event.target._isHandlingRename) return;
    event.target._isHandlingRename = true;
    let text = event.target.textContent;
    let msg = '';
    if (/\s/.test(text)) { msg = 'Name cannot contain spaces'; text = text.replace(/\s/g, ''); }
    else if (/[^a-zA-Z0-9_]/.test(text)) { msg = 'Only letters, numbers, underscores'; text = text.replace(/[^a-zA-Z0-9_]/g, ''); }
    else if (/^[0-9]/.test(text)) { msg = 'Must start with a letter'; text = text.replace(/^[0-9]+/, ''); }
    else if (text.length > LIMITS.MAX_NAME_LENGTH) { msg = LIMIT_MESSAGES.NAME_LENGTH; text = text.substring(0, LIMITS.MAX_NAME_LENGTH); }
    if (msg) {
      event.target.textContent = text;
      showToast(msg, 'error');
      const range = document.createRange(), sel = window.getSelection();
      range.selectNodeContents(event.target); range.collapse(false);
      sel.removeAllRanges(); sel.addRange(range);
    }
    setTimeout(() => { event.target._isHandlingRename = false; }, 0);
  },
  renameColumnAndRender: (ti, colId, newName) => {
    const v = validateName(newName);
    if (!v.valid) { showToast(v.error, 'error'); render(); return; }
    renameColumn(ti, colId, v.value); render();
  },
  handleColumnRenameInput: (event, ti, colId) => {
    if (event.target._isHandlingRename) return;
    event.target._isHandlingRename = true;
    let text = event.target.textContent;
    let msg = '';
    if (/\s/.test(text)) { msg = 'Name cannot contain spaces'; text = text.replace(/\s/g, ''); }
    else if (/[^a-zA-Z0-9_]/.test(text)) { msg = 'Only letters, numbers, underscores'; text = text.replace(/[^a-zA-Z0-9_]/g, ''); }
    else if (/^[0-9]/.test(text)) { msg = 'Must start with a letter'; text = text.replace(/^[0-9]+/, ''); }
    else if (text.length > LIMITS.MAX_NAME_LENGTH) { msg = LIMIT_MESSAGES.NAME_LENGTH; text = text.substring(0, LIMITS.MAX_NAME_LENGTH); }
    if (msg) {
      event.target.textContent = text;
      showToast(msg, 'error');
      const range = document.createRange(), sel = window.getSelection();
      range.selectNodeContents(event.target); range.collapse(false);
      sel.removeAllRanges(); sel.addRange(range);
    }
    setTimeout(() => { event.target._isHandlingRename = false; }, 0);
  },
  removeColAndRender: (ti, colId) => { if (removeColumn(ti, colId)) { showToast('Column removed'); render(); } },
  // Feature G: NULL toggle handler
  toggleNullableCol: (ti, colId) => {
    const key = `${ti}_${colId}`;
    v2State.nullableJoinCols[key] = !v2State.nullableJoinCols[key];
    showToast(v2State.nullableJoinCols[key] ? `${colId} marked as nullable` : `${colId} nullable removed`);
    render();
  },
  loadPresetAndRender: (presetName, isAutoSwitch = false) => {
    const dataset = PRESET_DATASETS_V2[presetName];
    if (dataset) {
      loadPreset(dataset, isAutoSwitch);
      if (!isAutoSwitch) {
        state.currentOp = presetName === 'warehouse_products' ? 'union' : 'inner';
        if (presetName === 'warehouse_products') showToast('ℹ️ Warehouse dataset works best with SET operators', 'success', 5000);
      }
      render();
    }
  },
  resetAllAndRender: () => {
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) { shareBtn.classList.remove('animate-bell'); shareBtn.classList.add('disabled'); shareBtn.disabled = true; }
    state.tables = JSON.parse(JSON.stringify(INITIAL_STATE.tables));
    state.currentOp = null;
    state.joinConditions = [];
    state.selectedPair = '0-1';
    // Reset V2 state
    v2State.conditionLogic = 'AND';
    v2State.whereFilters = [];
    v2State.orderBy = [];
    v2State.groupBy = [];
    v2State.aggregates = [];
    v2State.havingFilters = [];
    v2State.nullableJoinCols = {};
    DropdownHandler.resetAll();
    stopBellAnimation();
    showToast('Reset complete');
    render();
  },
  copyShareLink: () => copyShareLinkWithToast(),
  makeEditableCopy: () => { makeEditableCopy(); render(); },
  showToast,
};

window.copySqlButtonClicked = () => {
  copySqlToClipboard(generateSqlV2(v2State));
  showToast('SQL copied!');
};

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT DELEGATION
// ═══════════════════════════════════════════════════════════════════════════════

function setupEventDelegation() {
  const area = document.getElementById('tables-area');
  if (!area) return;

  area.addEventListener('click', e => {
    const app = window.ysqlvizApp.joinsV2;
    if (e.target.classList.contains('col-remove-btn')) {
      const ti = parseInt(e.target.dataset.ti), colId = e.target.dataset.colId;
      if (Number.isInteger(ti) && colId) app.removeColAndRender(ti, colId);
    }
    if (e.target.classList.contains('add-row-btn')) app.addRowAndFocus(parseInt(e.target.dataset.ti));
    if (e.target.classList.contains('add-col-btn')) app.showColModal(parseInt(e.target.dataset.ti));
    if (e.target.classList.contains('del-btn')) app.delRowAndRender(parseInt(e.target.dataset.ti), parseInt(e.target.dataset.ri));
    if (e.target.classList.contains('remove-table-btn')) app.removeTableAndRender(parseInt(e.target.dataset.ti));
    // Feature P: pencil icon triggers focus on the contenteditable column name
    if (e.target.closest('.col-rename-pencil')) {
      const btn = e.target.closest('.col-rename-pencil');
      const nameEl = btn.closest('.col-header-name-wrapper')?.querySelector('.col-header-name');
      if (nameEl) { nameEl.focus(); const range = document.createRange(), sel = window.getSelection(); range.selectNodeContents(nameEl); range.collapse(false); sel.removeAllRanges(); sel.addRange(range); }
    }
    // Feature G: NULL toggle
    if (e.target.classList.contains('null-toggle-btn')) {
      app.toggleNullableCol(parseInt(e.target.dataset.ti), e.target.dataset.colId);
    }
  });

  area.addEventListener('input', e => {
    if (e.target.classList.contains('cell-input')) {
      const { ti, ri, colId, isKey, colType } = e.target.dataset;
      window.ysqlvizApp.joinsV2.handleKeyInput(e, parseInt(ti), parseInt(ri), colId, isKey === 'true', colType);
    }
    if (e.target.classList.contains('table-name')) window.ysqlvizApp.joinsV2.handleTableRenameInput(e, parseInt(e.target.dataset.ti));
    if (e.target.classList.contains('col-header-name')) window.ysqlvizApp.joinsV2.handleColumnRenameInput(e, parseInt(e.target.dataset.ti), e.target.dataset.colId);
  }, true);

  area.addEventListener('change', e => {
    if (e.target.classList.contains('cell-input')) {
      const { ti, ri, colId, isKey, colType } = e.target.dataset;
      window.ysqlvizApp.joinsV2.handleKeyChange(e, parseInt(ti), parseInt(ri), colId, isKey === 'true', colType);
    }
    if (e.target.classList.contains('cell-checkbox')) {
      const { ti, ri, colId } = e.target.dataset;
      window.ysqlvizApp.joinsV2.updateValAndRefresh(parseInt(ti), parseInt(ri), colId, e.target.checked);
    }
  });

  area.addEventListener('focus', e => {
    if (e.target.classList.contains('cell-input')) e.target._originalValue = e.target.value;
    if (e.target.classList.contains('table-name') || e.target.classList.contains('col-header-name')) e.target.dataset.originalValue = e.target.textContent;
  }, true);

  area.addEventListener('blur', e => {
    if (e.target.classList.contains('table-name')) window.ysqlvizApp.joinsV2.renameTableAndRender(parseInt(e.target.dataset.ti), e.target.textContent);
    if (e.target.classList.contains('col-header-name')) window.ysqlvizApp.joinsV2.renameColumnAndRender(parseInt(e.target.dataset.ti), e.target.dataset.colId, e.target.textContent);
  }, true);

  area.addEventListener('keydown', e => {
    if (e.target.classList.contains('cell-input') && e.key === 'Escape') { e.target.value = e.target._originalValue || ''; e.target.blur(); e.preventDefault(); }
    if ((e.target.classList.contains('table-name') || e.target.classList.contains('col-header-name'))) {
      if (e.key === 'Enter') { e.target.blur(); e.preventDefault(); }
      if (e.key === 'Escape') { e.target.textContent = e.target.dataset.originalValue || ''; e.target.blur(); e.preventDefault(); }
    }
  }, true);
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON LISTENERS & INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

function setupButtonListeners() {
  document.getElementById('share-btn')?.addEventListener('click', () => window.ysqlvizApp.joinsV2.copyShareLink());
  document.addEventListener('click', e => { if (e.target.closest('[data-action="make-editable-copy"]')) window.ysqlvizApp.joinsV2.makeEditableCopy(); });
  document.getElementById('reset-all-btn')?.addEventListener('click', () => window.ysqlvizApp.joinsV2.resetAllAndRender());
  document.getElementById('add-table-btn')?.addEventListener('click', () => window.ysqlvizApp.joinsV2.addTableAndRender());
  document.getElementById('col-modal-close')?.addEventListener('click', () => { document.getElementById('col-modal').style.display = 'none'; });
  document.getElementById('col-modal-name')?.addEventListener('input', e => window.ysqlvizApp.joinsV2.handleColModalInput(e));
  document.getElementById('sql-copy-btn')?.addEventListener('click', () => window.copySqlButtonClicked());

  // Preset dropdown — also handles new V2 presets
  DropdownHandler.setup('preset-dropdown-wrapper', value => window.ysqlvizApp.joinsV2.loadPresetAndRender(value));

  // Column type dropdown in modal
  DropdownHandler.setup('col-modal-type-dropdown', value => {
    document.getElementById('col-modal-type-value').value = value;
    const labels = { number: 'Integer', string: 'String', float: 'Float', date: 'Date', boolean: 'Boolean' };
    document.getElementById('col-modal-type-display').textContent = labels[value] || value;
  });
}

// Refine panel collapse toggle
document.getElementById('refine-collapse-btn')?.addEventListener('click', () => {
  const panel = document.getElementById('refine-results-panel');
  const btn   = document.getElementById('refine-collapse-btn');
  if (!panel || !btn) return;
  const isCollapsed = panel.style.display === 'none';
  panel.style.display = isCollapsed ? 'block' : 'none';
  btn.setAttribute('aria-expanded', String(isCollapsed));
  const icon = btn.querySelector('i');
  if (icon) icon.className = isCollapsed ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
});

// Initialize
initBanner();
initOperationDropdowns();
setupButtonListeners();
setupEventDelegation();
parseUrlParams();
render();
