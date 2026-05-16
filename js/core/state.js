// ── js/core/state.js ──────────────────────────────────────────────────────────

export const PALETTE = [
  {
    fill: "rgba(29,158,117,.15)",
    stroke: "rgba(29,158,117,.6)",
    text: "#5dcaa5",
    line: "#1D9E75",
    bg: "rgba(29,158,117,.07)",
  },
  {
    fill: "rgba(55,138,221,.15)",
    stroke: "rgba(55,138,221,.6)",
    text: "#85b7eb",
    line: "#378ADD",
    bg: "rgba(55,138,221,.07)",
  },
  {
    fill: "rgba(158,255,0,.12)",
    stroke: "rgba(158,255,0,.5)",
    text: "#9eff00",
    line: "#9eff00",
    bg: "rgba(158,255,0,.05)",
  },
  {
    fill: "rgba(216,90,48,.15)",
    stroke: "rgba(216,90,48,.6)",
    text: "#f0997b",
    line: "#D85A30",
    bg: "rgba(216,90,48,.07)",
  },
  {
    fill: "rgba(186,117,23,.15)",
    stroke: "rgba(186,117,23,.6)",
    text: "#fac775",
    line: "#BA7517",
    bg: "rgba(186,117,23,.07)",
  },
];

export const DATA_TYPES = {
  number: { label: "Number", defaultValue: "", inputType: "number", icon: "fa-hashtag" },
  float: { label: "Float", defaultValue: "", inputType: "number", step: "0.1", icon: "fa-arrow-up-9-1" },
  string: { label: "String", defaultValue: "", inputType: "text", icon: "fa-font" },
  boolean: { label: "Boolean", defaultValue: false, inputType: "checkbox", icon: "fa-check-square" },
  date: { label: "Date", defaultValue: "", inputType: "date", icon: "fa-calendar" },
};

export const JOIN_OPS = {
  inner: { label: "INNER JOIN", group: "join" },
  left: { label: "LEFT JOIN", group: "join" },
  right: { label: "RIGHT JOIN", group: "join" },
  full: { label: "FULL OUTER JOIN", group: "join" },
  cross: { label: "CROSS JOIN", group: "join" },
  left_anti: { label: "LEFT ANTI JOIN", group: "join" },
  right_anti: { label: "RIGHT ANTI JOIN", group: "join" },
  left_semi: { label: "LEFT SEMI JOIN", group: "join" },
  right_semi: { label: "RIGHT SEMI JOIN", group: "join" },
  exists: { label: "EXISTS", group: "join" },
  not_exists: { label: "NOT EXISTS", group: "join" },
  self: { label: "SELF JOIN", group: "join" },
  union: { label: "UNION", group: "set" },
  union_all: { label: "UNION ALL", group: "set" },
  except: { label: "EXCEPT", group: "set" },
  intersect: { label: "INTERSECT", group: "set" },
};

export const DESCS = {
  inner:
    "ℹ️ INNER JOIN — only rows where the key exists in BOTH tables. Duplicates multiply: M×N per shared key.",
  left: "LEFT JOIN — all rows from the left table; NULLs where no match in right.",
  right:
    "ℹ️ RIGHT JOIN — all rows from the right table; NULLs where no match in left.",
  full: "ℹ️ FULL OUTER JOIN — all rows from both tables; NULLs on whichever side has no match.",
  cross:
    "ℹ️ CROSS JOIN — every row in left paired with every row in right. Always M×N rows.",
  left_anti:
    "ℹ️ LEFT ANTI JOIN — returns rows from LEFT table with NO match in right. See diagram: highlighted = returned, dimmed = not returned.",
  right_anti:
    "ℹ️ RIGHT ANTI JOIN — returns rows from RIGHT table with NO match in left. See diagram: highlighted = returned, dimmed = not returned.",
  left_semi:
    "ℹ️ LEFT SEMI JOIN — returns LEFT rows where a match exists in RIGHT. Only left columns shown. Dashed line = match exists.",
  right_semi:
    "ℹ️ RIGHT SEMI JOIN — returns RIGHT rows where a match exists in LEFT. Only right columns shown. Dashed line = match exists.",
  exists: "ℹ️ EXISTS — returns LEFT rows where at least one match exists in RIGHT. Standard SQL using correlated subquery.",
  not_exists: "ℹ️ NOT EXISTS — returns LEFT rows where NO match exists in RIGHT. Opposite of EXISTS. Standard SQL using correlated subquery.",
  self: "ℹ️ SELF JOIN — table joined to itself using an alias. Each row matched against other rows with the same key.",
  union: "ℹ️ UNION — combines rows from both tables, removing duplicates.",
  union_all:
    "ℹ️ UNION ALL — combines all rows from both tables including duplicates.",
  except:
    "ℹ️ EXCEPT — rows in the left table that do NOT appear in the right table.",
  intersect:
    "ℹ️ INTERSECT — rows that appear in BOTH tables (distinct values only).",
};

// ── Preset Datasets ──────────────────────────────────────────────────────────
export const PRESET_DATASETS = {
  users_orders: {
    tables: [
      {
        name: "users",
        columns: [
          { id: "col_0", name: "user_id", type: "number", isKey: true },
          { id: "col_1", name: "name", type: "string", isKey: false },
          { id: "col_2", name: "city", type: "string", isKey: false },
        ],
        rows: [
          { col_0: 1, col_1: "Alice", col_2: "NYC" },
          { col_0: 2, col_1: "Bob", col_2: "LA" },
          { col_0: 3, col_1: "Charlie", col_2: "NYC" },
          { col_0: 4, col_1: "Diana", col_2: "SF" },
          { col_0: 5, col_1: "Eve", col_2: "LA" },
        ],
        svgColId: "col_0",
      },
      {
        name: "orders",
        columns: [
          { id: "col_0", name: "order_id", type: "number", isKey: true },
          { id: "col_1", name: "user_id", type: "number", isKey: false },
          { id: "col_2", name: "amount", type: "float", isKey: false },
        ],
        rows: [
          { col_0: 101, col_1: 1, col_2: 150 },
          { col_0: 102, col_1: 2, col_2: 200 },
          { col_0: 103, col_1: 1, col_2: 75 },
          { col_0: 104, col_1: 3, col_2: 90 },
          { col_0: 105, col_1: 99, col_2: 120 },
        ],
        svgColId: "col_0",
      },
    ],
    joinConditions: [
      {
        leftTable: 0,
        leftCol: "col_0",
        op: "=",
        rightTable: 1,
        rightCol: "col_1",
      },
    ],
  },
  students_courses: {
    tables: [
      {
        name: "students",
        columns: [
          { id: "col_0", name: "student_id", type: "number", isKey: true },
          { id: "col_1", name: "name", type: "string", isKey: false },
          { id: "col_2", name: "major", type: "string", isKey: false },
        ],
        rows: [
          { col_0: 1, col_1: "Emma", col_2: "Science" },
          { col_0: 2, col_1: "Frank", col_2: "Arts" },
          { col_0: 3, col_1: "Grace", col_2: "Science" },
          { col_0: 4, col_1: "Henry", col_2: "Arts" },
          { col_0: 5, col_1: "Ivan", col_2: "Science" },
        ],
        svgColId: "col_0",
      },
      {
        name: "enrollments",
        columns: [
          { id: "col_0", name: "enrollment_id", type: "number", isKey: true },
          { id: "col_1", name: "student_id", type: "number", isKey: false },
          { id: "col_2", name: "course", type: "string", isKey: false },
        ],
        rows: [
          { col_0: 1, col_1: 1, col_2: "Math" },
          { col_0: 2, col_1: 1, col_2: "Physics" },
          { col_0: 3, col_1: 2, col_2: "Literature" },
          { col_0: 4, col_1: 3, col_2: "Math" },
          { col_0: 5, col_1: 99, col_2: "Chemistry" },
        ],
        svgColId: "col_0",
      },
    ],
    joinConditions: [
      {
        leftTable: 0,
        leftCol: "col_0",
        op: "=",
        rightTable: 1,
        rightCol: "col_1",
      },
    ],
  },
  warehouse_products: {
    tables: [
      {
        name: "warehouse_a",
        columns: [
          { id: "col_0", name: "product_id", type: "number", isKey: true },
          { id: "col_1", name: "name", type: "string", isKey: false },
          { id: "col_2", name: "quantity", type: "number", isKey: false },
        ],
        rows: [
          { col_0: 1, col_1: "Laptop", col_2: 5 },
          { col_0: 2, col_1: "Mouse", col_2: 15 },
          { col_0: 3, col_1: "Keyboard", col_2: 8 },
        ],
        svgColId: "col_0",
      },
      {
        name: "warehouse_b",
        columns: [
          { id: "col_0", name: "product_id", type: "number", isKey: true },
          { id: "col_1", name: "name", type: "string", isKey: false },
          { id: "col_2", name: "quantity", type: "number", isKey: false },
        ],
        rows: [
          { col_0: 2, col_1: "Mouse", col_2: 15 },
          { col_0: 3, col_1: "Keyboard", col_2: 6 },
          { col_0: 4, col_1: "Monitor", col_2: 3 },
        ],
        svgColId: "col_0",
      },
    ],
    joinConditions: [],
  },
};

// ── Mutable app state ──────────────────────────────────────────────────────────

// Initial/placeholder state — two tables with just id column, no rows
export const INITIAL_STATE = {
  tables: [
    {
      name: "table_1",
      columns: [{ id: "col_0", name: "id", type: "number", isKey: true }],
      rows: [],
      svgColId: "col_0",
    },
    {
      name: "table_2",
      columns: [{ id: "col_0", name: "id", type: "number", isKey: true }],
      rows: [],
      svgColId: "col_0",
    },
  ],
  currentOp: null,
  joinConditions: [],
};

// Tables start blank — no rows, just the two outlines
export const state = {
  tables: [
    {
      name: "table_1",
      columns: [{ id: "col_0", name: "id", type: "number", isKey: true }],
      rows: [],
      svgColId: "col_0",
    },
    {
      name: "table_2",
      columns: [{ id: "col_0", name: "id", type: "number", isKey: true }],
      rows: [],
      svgColId: "col_0",
    },
  ],
  currentOp: null,
  joinConditions: [],
  selectedPair: "0-1",
  isSharedView: false,
};
