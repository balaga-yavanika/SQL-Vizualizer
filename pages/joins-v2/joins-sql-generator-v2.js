/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SQL Generator V2
 * ═══════════════════════════════════════════════════════════════════════════════
 * Mirrors: pages/joins/sql-generator.js
 *
 * NEW in V2:
 *   Feature A  — Appends WHERE clause to generated SQL
 *   Feature B  — Appends ORDER BY clause
 *   Feature C  — Appends GROUP BY + aggregates in SELECT
 *   Feature D  — Appends HAVING clause
 *   Feature L  — Shows OR between ON conditions when conditionLogic === 'OR'
 *
 * Usage: import { generateSqlV2, renderSqlPanelV2, copySqlToClipboard } from './joins-sql-generator-v2.js'
 * Call renderSqlPanelV2(v2State) instead of renderSqlPanel()
 */

import { state, JOIN_OPS } from '../../js/core/state.js';
import { getPair } from '../../js/core/utils.js';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY
// ═══════════════════════════════════════════════════════════════════════════════

export function generateSqlV2(v2State = {}) {
  const currentOp = state.currentOp;
  const opConfig = JOIN_OPS[currentOp];
  if (!opConfig) return '-- Select an operation';

  if (opConfig.group === 'join') return generateJoinSqlV2(v2State);
  if (opConfig.group === 'set')  return generateSetOpSqlV2(v2State);
  return '-- Unknown operation';
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE L — OR CONDITION SUPPORT
// ON clause builder that respects conditionLogic
// ═══════════════════════════════════════════════════════════════════════════════

function buildOnClauseV2(li, ri, conditionLogic = 'AND') {
  const leftTable  = state.tables[li];
  const rightTable = state.tables[ri];
  const valid = state.joinConditions.filter(c => c && c.leftCol && c.rightCol);
  if (valid.length === 0) return '';

  const parts = valid.map(cond => {
    const lCol = leftTable.columns.find(c => c.id === cond.leftCol);
    const rCol = rightTable.columns.find(c => c.id === cond.rightCol);
    if (!lCol || !rCol) return null;
    return `${leftTable.name}.${lCol.name} ${cond.op || '='} ${rightTable.name}.${rCol.name}`;
  }).filter(Boolean);

  const joiner = conditionLogic === 'OR' ? '\n  OR ' : '\n   AND ';
  return parts.join(joiner);
}

function buildSelfJoinOnClauseV2(li, conditionLogic = 'AND') {
  const leftTable = state.tables[li];
  const valid = state.joinConditions.filter(c => c && c.leftCol && c.rightCol);
  if (valid.length === 0) return '';

  const parts = valid.map(cond => {
    const lCol = leftTable.columns.find(c => c.id === cond.leftCol);
    const rCol = leftTable.columns.find(c => c.id === cond.rightCol);
    if (!lCol || !rCol) return null;
    return `${leftTable.name}.${lCol.name} ${cond.op || '='} t2.${rCol.name}`;
  }).filter(Boolean);

  const joiner = conditionLogic === 'OR' ? '\n  OR ' : '\n   AND ';
  return parts.join(joiner);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE A — WHERE CLAUSE
// ═══════════════════════════════════════════════════════════════════════════════

function buildWhereClause(whereFilters) {
  if (!whereFilters || whereFilters.length === 0) return '';
  const [li, ri] = getPair();
  const active = whereFilters.filter(f => f.colId && f.val !== '' && f.val !== undefined && f.val !== null);
  if (active.length === 0) return '';

  const parts = active.map(f => {
    const tableIdx = f.side === 'right' ? ri : li;
    const table = state.tables[tableIdx];
    const col = table?.columns.find(c => c.id === f.colId);
    if (!col) return null;
    const tableRef = f.side === 'right' ? table.name : state.tables[li].name;
    const valStr = isNaN(f.val) || f.val === '' ? `'${f.val}'` : f.val;
    if (f.op === 'contains') return `${tableRef}.${col.name} LIKE '%${f.val}%'`;
    if (f.op === '!=') return `${tableRef}.${col.name} <> ${valStr}`;
    return `${tableRef}.${col.name} ${f.op} ${valStr}`;
  }).filter(Boolean);

  return parts.length ? `WHERE ${parts.join('\n  AND ')}` : '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE C — GROUP BY + SELECT AGGREGATES
// ═══════════════════════════════════════════════════════════════════════════════

function buildGroupByClause(groupBy) {
  if (!groupBy || groupBy.length === 0) return '';
  const [li, ri] = getPair();
  const active = groupBy.filter(g => g.colId);
  if (active.length === 0) return '';

  const parts = active.map(g => {
    const tableIdx = g.side === 'right' ? ri : li;
    const table = state.tables[tableIdx];
    const col = table?.columns.find(c => c.id === g.colId);
    if (!col) return null;
    return `${table.name}.${col.name}`;
  }).filter(Boolean);

  return parts.length ? `GROUP BY ${parts.join(', ')}` : '';
}

function buildAggregateSelectCols(aggregates) {
  if (!aggregates || aggregates.length === 0) return [];
  const [li, ri] = getPair();

  return aggregates.filter(a => a.func && a.colId).map(agg => {
    const tableIdx = agg.side === 'right' ? ri : li;
    const table = state.tables[tableIdx];
    const col = table?.columns.find(c => c.id === agg.colId);
    if (!col) return null;
    const alias = agg.alias || `${agg.func.toLowerCase()}_${col.name}`;
    const colRef = agg.func === 'COUNT' && agg.colId === '_star' ? '*' : `${table.name}.${col.name}`;
    return `${agg.func}(${colRef}) AS ${alias}`;
  }).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE D — HAVING
// ═══════════════════════════════════════════════════════════════════════════════

function buildHavingClause(havingFilters) {
  if (!havingFilters || havingFilters.length === 0) return '';
  const [li, ri] = getPair();
  const active = havingFilters.filter(h => h.func && h.colId && h.val !== '' && h.val !== undefined);
  if (active.length === 0) return '';

  const parts = active.map(h => {
    const tableIdx = h.side === 'right' ? ri : li;
    const table = state.tables[tableIdx];
    const col = table?.columns.find(c => c.id === h.colId);
    if (!col) return null;
    const alias = h.alias || `${h.func.toLowerCase()}_${col.name}`;
    const valStr = isNaN(h.val) || h.val === '' ? `'${h.val}'` : h.val;
    const op = h.op === '!=' ? '<>' : h.op;
    return `${alias} ${op} ${valStr}`;
  }).filter(Boolean);

  return parts.length ? `HAVING ${parts.join('\n   AND ')}` : '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE B — ORDER BY
// ═══════════════════════════════════════════════════════════════════════════════

function buildOrderByClause(orderBy, groupBy, aggregates) {
  if (!orderBy || orderBy.length === 0) return '';
  const [li, ri] = getPair();
  const active = orderBy.filter(o => o.colId);
  if (active.length === 0) return '';

  const parts = active.map(o => {
    // Check if this is an aggregate reference
    if (o.isAggregate && o.alias) {
      return `${o.alias} ${o.dir || 'ASC'}`;
    }
    const tableIdx = o.side === 'right' ? ri : li;
    const table = state.tables[tableIdx];
    const col = table?.columns.find(c => c.id === o.colId);
    if (!col) return null;
    return `${table.name}.${col.name} ${o.dir || 'ASC'}`;
  }).filter(Boolean);

  return parts.length ? `ORDER BY ${parts.join(', ')}` : '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOIN SQL GENERATOR (V2)
// ═══════════════════════════════════════════════════════════════════════════════

function generateJoinSqlV2(v2State) {
  const { conditionLogic = 'AND', whereFilters = [], orderBy = [], groupBy = [], aggregates = [], havingFilters = [] } = v2State;
  const [li, ri] = getPair();
  const leftTable  = state.tables[li];
  const rightTable = state.tables[ri];
  if (!leftTable || !rightTable) return '-- Add tables to generate SQL';

  const hasGroupBy = groupBy.some(g => g.colId);
  const hasAgg = aggregates.some(a => a.func && a.colId);

  // Build SELECT columns
  let selectCols;
  if (hasGroupBy || hasAgg) {
    const groupCols = groupBy.filter(g => g.colId).map(g => {
      const tableIdx = g.side === 'right' ? ri : li;
      const table = state.tables[tableIdx];
      const col = table?.columns.find(c => c.id === g.colId);
      return col ? `${table.name}.${col.name}` : null;
    }).filter(Boolean);
    const aggCols = buildAggregateSelectCols(aggregates);
    selectCols = [...groupCols, ...aggCols];
  } else {
    selectCols = [
      ...leftTable.columns.map(c => `${leftTable.name}.${c.name}`),
      ...rightTable.columns.map(c => `${rightTable.name}.${c.name}`),
    ];
  }

  let sql = selectCols.length === 1
    ? `SELECT ${selectCols[0]}\n`
    : `SELECT ${selectCols[0]},\n       ${selectCols.slice(1).join(',\n       ')}\n`;

  sql += `FROM ${leftTable.name}\n`;

  const getKeyword = () => ({ inner: 'INNER JOIN', left: 'LEFT OUTER JOIN', right: 'RIGHT OUTER JOIN', full: 'FULL OUTER JOIN' }[state.currentOp] || 'INNER JOIN');

  if (state.currentOp === 'cross') {
    sql += `CROSS JOIN ${rightTable.name}`;
  } else if (state.currentOp === 'self') {
    sql = `-- SELF JOIN: implemented as INNER JOIN with alias\n` + sql;
    sql += `INNER JOIN ${leftTable.name} AS t2`;
    const onClause = buildSelfJoinOnClauseV2(li, conditionLogic);
    if (onClause) sql += `\nON ${onClause}`;
  } else if (state.currentOp.includes('anti') || state.currentOp.includes('semi')) {
    const kw = (state.currentOp.startsWith('left') ? 'LEFT' : 'RIGHT');
    const jt = state.currentOp.includes('anti') ? 'ANTI' : 'SEMI';
    sql += `${kw} ${jt} JOIN ${rightTable.name}`;
    const onClause = buildOnClauseV2(li, ri, conditionLogic);
    if (onClause) sql += `\nON ${onClause}`;
  } else if (state.currentOp === 'exists' || state.currentOp === 'not_exists') {
    const kw = state.currentOp === 'not_exists' ? 'NOT EXISTS' : 'EXISTS';
    const leftCols = leftTable.columns.map(c => `${leftTable.name}.${c.name}`);
    sql = `SELECT ${leftCols.join(',\n       ')}`;
    sql += `\nFROM ${leftTable.name}\nWHERE ${kw} (\n  SELECT 1\n  FROM ${rightTable.name}`;
    const onClause = buildOnClauseV2(li, ri, conditionLogic);
    if (onClause) sql += `\n  WHERE ${onClause}`;
    sql += '\n);';
    return sql;
  } else {
    sql += `${getKeyword()} ${rightTable.name}`;
    const onClause = buildOnClauseV2(li, ri, conditionLogic);
    if (onClause) sql += `\nON ${onClause}`;
  }

  // Append post-join clauses (Features A–D)
  const whereSql   = buildWhereClause(whereFilters);
  const groupBySql = buildGroupByClause(groupBy);
  const havingSql  = buildHavingClause(havingFilters);
  const orderBySql = buildOrderByClause(orderBy, groupBy, aggregates);

  if (whereSql)   sql += `\n${whereSql}`;
  if (groupBySql) sql += `\n${groupBySql}`;
  if (havingSql)  sql += `\n${havingSql}`;
  if (orderBySql) sql += `\n${orderBySql}`;

  sql += ';';
  return sql;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SET OPERATION GENERATOR (unchanged from v1, no post-join clauses for set ops)
// ═══════════════════════════════════════════════════════════════════════════════

function generateSetOpSqlV2(v2State) {
  const [li, ri] = getPair();
  const leftTable  = state.tables[li];
  const rightTable = state.tables[ri];
  if (!leftTable || !rightTable) return '-- Add tables to generate SQL';

  const opKeyword = { union: 'UNION', union_all: 'UNION ALL', except: 'EXCEPT', intersect: 'INTERSECT' }[state.currentOp] || 'UNION';

  const leftColIds  = leftTable.columns.map(c => c.id);
  const rightColIds = rightTable.columns.map(c => c.id);
  const allColIds = [...new Set([...leftColIds, ...rightColIds])];

  const leftSelect = allColIds.map(id => {
    const col = leftTable.columns.find(c => c.id === id);
    return col ? col.name : 'NULL';
  }).join(',\n       ');

  const rightSelect = allColIds.map(id => {
    const lCol = leftTable.columns.find(c => c.id === id);
    const rCol = rightTable.columns.find(c => c.id === id);
    const alias = lCol ? lCol.name : 'col_' + id;
    return rCol ? `${rCol.name} AS ${alias}` : `NULL AS ${alias}`;
  }).join(',\n       ');

  return `SELECT ${leftSelect}\nFROM ${leftTable.name}\n${opKeyword}\nSELECT ${rightSelect}\nFROM ${rightTable.name};`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNTAX HIGHLIGHTING (unchanged from v1)
// ═══════════════════════════════════════════════════════════════════════════════

function highlightSql(sql) {
  let escaped = sql.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const comments = [];
  let ci = 0;
  escaped = escaped.replace(/(--[^\n]*)|(\/\*[\s\S]*?\*\/)/g, m => {
    comments.push(m);
    return `__CMT_${ci++}__`;
  });

  escaped = escaped.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="sql-string">$1</span>');
  escaped = escaped.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-number">$1</span>');
  escaped = escaped.replace(/\b(COUNT|SUM|AVG|MIN|MAX|COALESCE|NULLIF|IFNULL|CAST|CONVERT|UPPER|LOWER|LENGTH|TRIM|ROUND|FLOOR|CEIL|ABS|CONCAT|SUBSTRING)\b/gi, '<span class="sql-function">$1</span>');
  escaped = escaped.replace(/\b(SELECT|FROM|WHERE|JOIN|INNER|LEFT|RIGHT|FULL|OUTER|ON|CROSS|UNION|EXCEPT|INTERSECT|EXISTS|AS|AND|OR|NOT|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|ALL|DISTINCT|NULL|IS|IN|LIKE|BETWEEN|CASE|WHEN|THEN|ELSE|END)\b/gi, '<span class="sql-keyword">$1</span>');
  escaped = escaped.replace(/__CMT_(\d+)__/g, (_, i) => `<span class="sql-comment">${comments[parseInt(i)]}</span>`);

  return escaped;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PANEL RENDERING
// ═══════════════════════════════════════════════════════════════════════════════

export function copySqlToClipboard(sql) {
  navigator.clipboard.writeText(sql).then(() => {
    const btn = document.getElementById('sql-copy-btn');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fa-regular fa-clipboard"></i> Copied!';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }
  }).catch(err => console.error('Failed to copy SQL:', err));
}

export function renderSqlPanelV2(v2State = {}) {
  try {
    const sql = generateSqlV2(v2State);
    const panel = document.getElementById('sql-panel');
    if (!panel) return;

    const codeBlock = panel.querySelector('pre code');
    if (codeBlock) {
      try {
        codeBlock.innerHTML = highlightSql(sql);
      } catch (e) {
        codeBlock.textContent = sql;
      }
    }

    const [li, ri] = getPair();
    const lTable = state.tables[li];
    const rTable = state.tables[ri];
    panel.style.display = (lTable && rTable && lTable.rows.length > 0 && rTable.rows.length > 0) ? 'block' : 'none';
  } catch (err) {
    console.error('[Error] renderSqlPanelV2 failed:', err);
    const panel = document.getElementById('sql-panel');
    const codeBlock = panel?.querySelector('pre code');
    if (codeBlock) codeBlock.textContent = '-- Error generating SQL. Please check your data.';
  }
}
