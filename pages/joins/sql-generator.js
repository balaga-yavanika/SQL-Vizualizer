/**
 * SQL Generator for Join Visualization
 * Generates SQL statements based on current join configuration
 */

import { state, JOIN_OPS } from "../../js/core/state.js";
import { getPair } from "../../js/core/utils.js";

/**
 * Generate SQL statement based on current state
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

/**
 * Generate JOIN statement
 */
function generateJoinSql() {
  const [li, ri] = getPair();
  const leftTable = state.tables[li];
  const rightTable = state.tables[ri];

  if (!leftTable || !rightTable) {
    return "-- Add tables to generate SQL";
  }

  const opName = getJoinKeyword();
  const condition = state.joinConditions[0];

  // Build SELECT clause
  const selectCols = [
    ...leftTable.columns.map((c) => `${leftTable.name}.${c.name}`),
    ...rightTable.columns.map((c) => `${rightTable.name}.${c.name}`),
  ];

  // Build FROM clause
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
    sql += `CROSS JOIN ${rightTable.name}`;
  } else if (state.currentOp === "self") {
    sql += `INNER JOIN ${leftTable.name} AS ${leftTable.name}2`;
    if (condition && condition.leftCol && condition.rightCol) {
      const leftCol = leftTable.columns.find((c) => c.id === condition.leftCol);
      const rightCol = leftTable.columns.find(
        (c) => c.id === condition.rightCol,
      );
      if (leftCol && rightCol) {
        sql += `\nON ${leftTable.name}.${leftCol.name} ${condition.op || "="} ${leftTable.name}2.${rightCol.name}`;
      }
    }
  } else if (
    state.currentOp.includes("anti") ||
    state.currentOp.includes("semi")
  ) {
    // Anti/Semi joins
    const keyword =
      state.currentOp === "left_anti" || state.currentOp === "left_semi"
        ? "LEFT"
        : "RIGHT";
    const joinType =
      state.currentOp.includes("anti") && !state.currentOp.includes("semi")
        ? "ANTI"
        : "SEMI";
    sql += `${keyword} ${joinType} JOIN ${rightTable.name}`;
    if (condition && condition.leftCol && condition.rightCol) {
      const leftCol = leftTable.columns.find((c) => c.id === condition.leftCol);
      const rightCol = rightTable.columns.find(
        (c) => c.id === condition.rightCol,
      );
      if (leftCol && rightCol) {
        sql += `\nON ${leftTable.name}.${leftCol.name} ${condition.op || "="} ${rightTable.name}.${rightCol.name}`;
      }
    }
  } else {
    // Standard joins (INNER, LEFT, RIGHT, FULL)
    sql += `${opName} ${rightTable.name}`;

    if (condition && condition.leftCol && condition.rightCol) {
      const leftCol = leftTable.columns.find((c) => c.id === condition.leftCol);
      const rightCol = rightTable.columns.find(
        (c) => c.id === condition.rightCol,
      );

      if (leftCol && rightCol) {
        sql += `\nON ${leftTable.name}.${leftCol.name} ${condition.op || "="} ${rightTable.name}.${rightCol.name}`;
      }
    }
  }

  sql += ";";
  return sql;
}

/**
 * Generate SET operation statement (UNION, EXCEPT, INTERSECT)
 */
function generateSetOpSql() {
  const [li, ri] = getPair();
  const leftTable = state.tables[li];
  const rightTable = state.tables[ri];

  if (!leftTable || !rightTable) {
    return "-- Add tables to generate SQL";
  }

  const opKeyword = getSetOpKeyword();

  // For set operations, both tables should have same columns
  const leftCols = leftTable.columns
    .map((c) => `${leftTable.name}.${c.name}`)
    .join(",\n       ");
  const rightCols = rightTable.columns
    .map((c) => `${rightTable.name}.${c.name}`)
    .join(",\n       ");

  const sql =
    `SELECT ${leftCols}\nFROM ${leftTable.name}\n` +
    `${opKeyword}\n` +
    `SELECT ${rightCols}\nFROM ${rightTable.name};`;

  return sql;
}

/**
 * Get the SQL JOIN keyword for current operation
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
 * Get the SQL SET operation keyword for current operation
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
 * Copy SQL to clipboard
 */
export function copySqlToClipboard(sql) {
  navigator.clipboard.writeText(sql).then(
    () => {
      // Show feedback
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

/**
 * Render SQL display panel
 */
export function renderSqlPanel() {
  const sql = generateSql();

  const panel = document.getElementById("sql-panel");
  if (!panel) return;

  const codeBlock = panel.querySelector(".sql-code");
  if (codeBlock) {
    codeBlock.textContent = sql;
  }

  const rawSql = panel.querySelector(".sql-raw");
  if (rawSql) {
    rawSql.textContent = sql;
  }

  // Show panel if there are tables with data
  const [li, ri] = getPair();
  const leftTable = state.tables[li];
  const rightTable = state.tables[ri];
  if (leftTable && rightTable && leftTable.rows.length > 0 && rightTable.rows.length > 0) {
    panel.style.display = "block";
  } else {
    panel.style.display = "none";
  }
}
