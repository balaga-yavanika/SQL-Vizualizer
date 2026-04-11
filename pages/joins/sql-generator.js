/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SQL Generator for Join Visualization
 * ═══════════════════════════════════════════════════════════════════════════════
 * Generates SQL statements based on current join configuration.
 * Handles all join types, set operations, and syntax highlighting.
 * 
 * Sections:
 * - Main Entry: generateSql() - routes to appropriate generator
 * - JOIN Generator: Creates SQL for all join types
 * - SET Generator: Creates SQL for UNION/EXCEPT/INTERSECT
 * - Helpers: Keyword mappings, clipboard
 * - Display: Panel rendering with syntax highlighting
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════
import { state, JOIN_OPS } from "../../js/core/state.js";
import { getPair } from "../../js/core/utils.js";

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Main entry point — generates SQL based on current operation type.
 * Routes to join or set operation generator.
 * @returns {string} Generated SQL statement
 */
export function generateSql() {
  const currentOp = state.currentOp;
  const opConfig = JOIN_OPS[currentOp];

  if (!opConfig) return "-- Select an operation";

  if (opConfig.group === "join") {
    return generateJoinSql();
  } else if (opConfig.group === "set") {
    return generateSetOpSql();
  }

  return "-- Unknown operation";
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Build ON clause from multiple conditions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds the ON clause SQL from all join conditions (with AND logic)
 * @param {number} li - Left table index
 * @param {number} ri - Right table index
 * @returns {string} ON clause conditions or empty string
 */
function buildOnClause(li, ri) {
  const leftTable = state.tables[li];
  const rightTable = state.tables[ri];

  // Filter out invalid/empty conditions
  const validConditions = state.joinConditions.filter(
    (c) => c && c.leftCol && c.rightCol
  );

  if (validConditions.length === 0) return "";

  const conditions = validConditions.map((cond) => {
    const leftCol = leftTable.columns.find((c) => c.id === cond.leftCol);
    const rightCol = rightTable.columns.find((c) => c.id === cond.rightCol);

    if (!leftCol || !rightCol) return null;
    return `${leftTable.name}.${leftCol.name} ${cond.op || "="} ${rightTable.name}.${rightCol.name}`;
  }).filter(Boolean);

  return conditions.join(" AND ");
}

/**
 * Builds the ON clause for SELF JOIN (uses table alias t2)
 * @param {number} li - Table index
 * @returns {string} ON clause conditions or empty string
 */
function buildSelfJoinOnClause(li) {
  const leftTable = state.tables[li];

  // Filter out invalid/empty conditions
  const validConditions = state.joinConditions.filter(
    (c) => c && c.leftCol && c.rightCol
  );

  if (validConditions.length === 0) return "";

  const conditions = validConditions.map((cond) => {
    const leftCol = leftTable.columns.find((c) => c.id === cond.leftCol);
    const rightCol = leftTable.columns.find((c) => c.id === cond.rightCol);

    if (!leftCol || !rightCol) return null;
    return `${leftTable.name}.${leftCol.name} ${cond.op || "="} t2.${rightCol.name}`;
  }).filter(Boolean);

  return conditions.join(" AND ");
}

// ═══════════════════════════════════════════════════════════════════════════════
// JOIN GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates SQL for JOIN operations (INNER, LEFT, RIGHT, FULL, CROSS, ANTI, SEMI, SELF)
 * Builds SELECT, FROM, and ON clauses based on current tables and conditions.
 * Supports multiple join conditions with AND logic.
 * @returns {string} SQL JOIN statement
 */
function generateJoinSql() {
  const [li, ri] = getPair();
  const leftTable = state.tables[li];
  const rightTable = state.tables[ri];

  if (!leftTable || !rightTable) {
    return "-- Add tables to generate SQL";
  }

  const opName = getJoinKeyword();

  // Build SELECT clause — all columns from both tables
  const selectCols = [
    ...leftTable.columns.map((c) => `${leftTable.name}.${c.name}`),
    ...rightTable.columns.map((c) => `${rightTable.name}.${c.name}`),
  ];

  // Build SELECT and FROM
  let sql = `SELECT ${selectCols[0]}\n`;

  if (selectCols.length > 1) {
    sql =
      `SELECT ${selectCols[0]},\n       ` +
      selectCols.slice(1).join(",\n       ") +
      "\n";
  }

  sql += `FROM ${leftTable.name}\n`;

  // Handle different join types
  if (state.currentOp === "cross") {
    // CROSS JOIN — no ON clause needed
    sql += `CROSS JOIN ${rightTable.name}`;
  } else if (state.currentOp === "self") {
    // SELF JOIN — join table to itself with alias
    sql = `-- SELF JOIN is not a SQL keyword. It's implemented using INNER JOIN with a table alias.\n` + sql;
    sql += `INNER JOIN ${leftTable.name} AS t2`;
    const onClause = buildSelfJoinOnClause(li);
    if (onClause) {
      sql += `\nON ${onClause}`;
    }
  } else if (
    state.currentOp.includes("anti") ||
    state.currentOp.includes("semi")
  ) {
    // Anti/Semi joins (non-standard SQL, shown as LEFT/RIGHT ANTI/SEMI JOIN)
    const keyword =
      state.currentOp === "left_anti" || state.currentOp === "left_semi"
        ? "LEFT"
        : "RIGHT";
    const joinType =
      state.currentOp.includes("anti") && !state.currentOp.includes("semi")
        ? "ANTI"
        : "SEMI";
    sql += `${keyword} ${joinType} JOIN ${rightTable.name}`;
    const onClause = buildOnClause(li, ri);
    if (onClause) {
      sql += `\nON ${onClause}`;
    }
  } else if (state.currentOp === "exists" || state.currentOp === "not_exists") {
    // EXISTS / NOT EXISTS — correlated subquery pattern
    const keyword = state.currentOp === "not_exists" ? "NOT EXISTS" : "EXISTS";
    const leftCols = leftTable.columns.map((c) => `${leftTable.name}.${c.name}`);
    sql = `SELECT ${leftCols.join(",\n       ")}`;
    sql += `\nFROM ${leftTable.name}\nWHERE ${keyword} (\n  SELECT 1\n  FROM ${rightTable.name}`;
    const onClause = buildOnClause(li, ri);
    if (onClause) {
      sql += `\n  WHERE ${onClause}`;
    }
    sql += "\n);";
    return sql;
  } else {
    // Standard joins (INNER, LEFT, RIGHT, FULL)
    sql += `${opName} ${rightTable.name}`;

    const onClause = buildOnClause(li, ri);
    if (onClause) {
      sql += `\nON ${onClause}`;
    }
  }

  sql += ";";
  return sql;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SET OPERATION GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates SQL for SET operations (UNION, EXCEPT, INTERSECT)
 * Creates two SELECT statements combined with the set operator.
 * @returns {string} SQL set operation statement
 */
function generateSetOpSql() {
  const [li, ri] = getPair();
  const leftTable = state.tables[li];
  const rightTable = state.tables[ri];

  if (!leftTable || !rightTable) {
    return "-- Add tables to generate SQL";
  }

  const opKeyword = getSetOpKeyword();

  // For set operations, align columns by ID not position
  // This ensures consistent alignment even if columns are reordered
  const leftColIds = leftTable.columns.map(c => c.id);
  const rightColIds = rightTable.columns.map(c => c.id);

  // Get all unique columns from both tables (by ID)
  const allColIds = [...new Set([...leftColIds, ...rightColIds])];

  // Create SELECT clause for left table (use column names in ID order)
  const leftSelect = allColIds.map(colId => {
    const col = leftTable.columns.find(c => c.id === colId);
    return col ? col.name : "NULL";
  }).join(",\n       ");

  // Create SELECT clause for right table (align by ID, use left table's names as aliases)
  const rightSelect = allColIds.map(colId => {
    const leftCol = leftTable.columns.find(c => c.id === colId);
    const rightCol = rightTable.columns.find(c => c.id === colId);
    const colName = leftCol ? leftCol.name : "col_" + colId;
    if (rightCol) {
      return `${rightCol.name} AS ${colName}`;
    }
    return `NULL AS ${colName}`;
  }).join(",\n       ");

  const sql =
    `SELECT ${leftSelect}\nFROM ${leftTable.name}\n` +
    `${opKeyword}\n` +
    `SELECT ${rightSelect}\nFROM ${rightTable.name};`;

  return sql;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps internal operation names to SQL JOIN keywords.
 * @returns {string} SQL keyword for current operation
 */
function getJoinKeyword() {
  const keywords = {
    inner: "INNER JOIN",
    left: "LEFT OUTER JOIN",
    right: "RIGHT OUTER JOIN",
    full: "FULL OUTER JOIN",
  };
  return keywords[state.currentOp] || "INNER JOIN";
}

/**
 * Maps internal operation names to SQL SET operation keywords.
 * @returns {string} SQL keyword for current set operation
 */
function getSetOpKeyword() {
  const keywords = {
    union: "UNION",
    union_all: "UNION ALL",
    except: "EXCEPT",
    intersect: "INTERSECT",
  };
  return keywords[state.currentOp] || "UNION";
}

/**
 * Copies SQL to clipboard and shows feedback on the button.
 * @param {string} sql - SQL statement to copy
 */
export function copySqlToClipboard(sql) {
  navigator.clipboard.writeText(sql).then(
    () => {
      // Show "Copied!" feedback, revert after 2 seconds
      const btn = document.getElementById("sql-copy-btn");
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }
    },
    (err) => {
      console.error("Failed to copy:", err);
    },
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNTAX HIGHLIGHTING & DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Applies comprehensive syntax highlighting to SQL code.
 * Highlights: keywords, strings, numbers, comments, functions.
 * @param {string} sql - Raw SQL string
 * @returns {string} HTML string with highlighted elements
 */
function highlightSql(sql) {
  // Escape HTML first to prevent XSS
  let escaped = sql
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Extract and protect comments first (before other highlighting)
  const commentPlaceholders = [];
  let commentIndex = 0;
  escaped = escaped.replace(/(--[^\n]*)|(\/\*[\s\S]*?\*\/)/g, (match) => {
    commentPlaceholders.push(match);
    return `__COMMENT_${commentIndex++}__`;
  });

  // Strings (single quotes)
  escaped = escaped.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="sql-string">$1</span>');

  // Numbers
  escaped = escaped.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-number">$1</span>');

  // Functions
  const functions = /\b(COUNT|SUM|AVG|MIN|MAX|COALESCE|NULLIF|IFNULL|CAST|CONVERT|UPPER|LOWER|LENGTH|TRIM|ROUND|FLOOR|CEIL|ABS|CAST|CONCAT|SUBSTRING|COALESCE|NULLIF)\b/gi;
  escaped = escaped.replace(functions, '<span class="sql-function">$1</span>');

  // SQL Keywords
  const keywords = /\b(SELECT|FROM|WHERE|JOIN|INNER|LEFT|RIGHT|FULL|OUTER|ON|CROSS|UNION|EXCEPT|INTERSECT|EXISTS|AS|AND|OR|NOT|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|ALL|DISTINCT|NULL|IS|IN|LIKE|BETWEEN|CASE|WHEN|THEN|ELSE|END)\b/gi;
  escaped = escaped.replace(keywords, '<span class="sql-keyword">$1</span>');

  // Restore comments with green highlight
  escaped = escaped.replace(/__COMMENT_(\d+)__/g, (match, index) => {
    return `<span class="sql-comment">${commentPlaceholders[parseInt(index)]}</span>`;
  });

  return escaped;
}

/**
 * Renders the SQL panel with generated SQL and syntax highlighting.
 * Shows panel only when both tables have data.
 * Wrapped with error handling to prevent SQL errors from breaking the UI.
 */
export function renderSqlPanel() {
  try {
    const sql = generateSql();

    const panel = document.getElementById("sql-panel");
    if (!panel) return;

    const codeBlock = panel.querySelector("pre code");
    if (codeBlock) {
      try {
        codeBlock.innerHTML = highlightSql(sql);
      } catch (highlightErr) {
        console.error("Error highlighting SQL:", highlightErr);
        codeBlock.textContent = sql; // Fallback to plain text
      }
    }

    // Show panel only if both tables have data
    const [li, ri] = getPair();
    const leftTable = state.tables[li];
    const rightTable = state.tables[ri];
    if (leftTable && rightTable && leftTable.rows.length > 0 && rightTable.rows.length > 0) {
      panel.style.display = "block";
    } else {
      panel.style.display = "none";
    }
  } catch (err) {
    console.error("[Error] renderSqlPanel failed:", err);
    // Keep the panel visible but show error in code block if possible
    const panel = document.getElementById("sql-panel");
    const codeBlock = panel?.querySelector("pre code");
    if (codeBlock) {
      codeBlock.textContent = "-- Error generating SQL. Please check your data.";
    }
  }
}
