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
  number: { label: "Number", defaultValue: "", inputType: "number" },
  float: { label: "Float", defaultValue: "", inputType: "number", step: "any" },
  string: { label: "String", defaultValue: "", inputType: "text" },
  boolean: { label: "Boolean", defaultValue: false, inputType: "checkbox" },
  date: { label: "Date", defaultValue: "", inputType: "date" },
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
  self: { label: "SELF JOIN", group: "join" },
  union: { label: "UNION", group: "set" },
  union_all: { label: "UNION ALL", group: "set" },
  except: { label: "EXCEPT", group: "set" },
  intersect: { label: "INTERSECT", group: "set" },
};

export const DESCS = {
  inner:
    "INNER JOIN — only rows where the key exists in BOTH tables. Duplicates multiply: M×N per shared key.",
  left: "LEFT JOIN — all rows from the left table; NULLs where no match in right.",
  right:
    "RIGHT JOIN — all rows from the right table; NULLs where no match in left.",
  full: "FULL OUTER JOIN — all rows from both tables; NULLs on whichever side has no match.",
  cross:
    "CROSS JOIN — every row in left paired with every row in right. Always M×N rows.",
  left_anti:
    "LEFT ANTI JOIN — rows in the LEFT table that have NO match in the right table.",
  right_anti:
    "RIGHT ANTI JOIN — rows in the RIGHT table that have NO match in the left table.",
  left_semi:
    "LEFT SEMI JOIN — rows from the left table where a match EXISTS in the right (no right columns returned).",
  right_semi:
    "RIGHT SEMI JOIN — rows from the right table where a match EXISTS in the left (no left columns returned).",
  self: "SELF JOIN — the table joined to itself. Each row is matched against other rows with the same key but a different position.",
  union: "UNION — combines rows from both tables, removing duplicates.",
  union_all:
    "UNION ALL — combines all rows from both tables including duplicates.",
  except:
    "EXCEPT — rows in the left table that do NOT appear in the right table.",
  intersect:
    "INTERSECT — rows that appear in BOTH tables (distinct values only).",
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
          { col_0: 104, col_1: 5, col_2: 120 },
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
          { id: "col_2", name: "grade", type: "string", isKey: false },
        ],
        rows: [
          { col_0: 101, col_1: "Emma", col_2: "A" },
          { col_0: 102, col_1: "Frank", col_2: "B" },
          { col_0: 103, col_1: "Grace", col_2: "A" },
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
          { col_0: 1, col_1: 101, col_2: "Math" },
          { col_0: 2, col_1: 101, col_2: "Physics" },
          { col_0: 3, col_1: 102, col_2: "Math" },
          { col_0: 4, col_1: 104, col_2: "Chemistry" },
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
};
