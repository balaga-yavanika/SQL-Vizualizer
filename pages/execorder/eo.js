const STEPS = [
  {
    num: "1",
    label: "Query planner",
    cat: "planner",
    catLabel: "planner",
    title: "Query planner",
    body: "Before a single row is touched, the database reads your entire query and builds an execution plan. It picks which indexes to use and the cheapest join order.",
    tip: "This is why adding an index can magically speed up a slow query — the planner notices it here.",
    note: "before execution begins",
  },
  {
    num: "2",
    label: "FROM & JOIN",
    cat: "source",
    catLabel: "data source",
    title: "FROM & JOIN",
    body: "The database fetches your tables and combines them. CTEs and subqueries run at this point too. The result is a big, unfiltered working dataset.",
    tip: "A query with no WHERE clause still runs this step — you get every row from every joined table.",
    note: "views & CTEs expand here",
  },
  {
    num: "3",
    label: "ON",
    cat: "filter",
    catLabel: "filter",
    title: "ON condition",
    body: "The ON clause filters which row pairs from the join survive. Only matching pairs move forward. This is different from WHERE — it applies during the join itself.",
    tip: "Putting extra filters in ON vs WHERE gives different results for OUTER JOINs. ON filters during joining; WHERE filters after.",
  },
  {
    num: "4",
    label: "OUTER JOIN",
    cat: "source",
    catLabel: "data source",
    title: "OUTER JOIN",
    body: "If you used LEFT, RIGHT, or FULL OUTER JOIN, unmatched rows are added back into the result here, with NULLs filling the columns from the missing side.",
    tip: "This is why OUTER JOINs produce NULLs — the database deliberately re-inserts the unmatched rows at this step.",
  },
  {
    num: "5",
    label: "WHERE",
    cat: "filter",
    catLabel: "filter",
    title: "WHERE clause",
    body: "Rows that don't match the condition are removed. Because this runs before SELECT, you cannot reference column aliases defined in SELECT — they haven't been created yet.",
    tip: "Indexes work here. A well-indexed WHERE clause lets the database skip millions of rows without reading them.",
    note: "indexes help here",
  },
  {
    num: "6",
    label: "GROUP BY",
    cat: "shape",
    catLabel: "shape",
    title: "GROUP BY",
    body: "Rows sharing the same GROUP BY value(s) are collapsed into one group each. After this step, individual row values are gone — only group-level data remains.",
    tip: "Once you GROUP BY, you can only SELECT the grouped columns and aggregate functions. Anything else is ambiguous.",
  },
  {
    num: "7",
    label: "Aggregate functions",
    cat: "shape",
    catLabel: "shape",
    title: "Aggregate functions",
    body: "SUM, COUNT, AVG, MIN, MAX are calculated across each group. One output row is produced per group.",
    tip: "Aggregates run after grouping, which is why COUNT(*) counts rows per group — not across the whole table.",
  },
  {
    num: "8",
    label: "HAVING",
    cat: "filter",
    catLabel: "filter",
    title: "HAVING clause",
    body: "HAVING filters groups, just like WHERE filters rows. It runs after aggregation, so you can write conditions like HAVING COUNT(*) > 5 or HAVING SUM(sales) > 1000.",
    tip: "If you're filtering on a non-aggregate column and don't need grouping, use WHERE instead — it's faster.",
  },
  {
    num: "9",
    label: "SELECT",
    cat: "output",
    catLabel: "output",
    title: "SELECT",
    body: "Now — finally — the columns you asked for are selected and aliases are assigned. This is step 8, not step 1, which is why aliases can't be used earlier.",
    tip: "This is the most misunderstood step. Writing SELECT first is just syntax. It executes here, near the end.",
    note: "aliases are born here",
  },
  {
    num: "10",
    label: "DISTINCT",
    cat: "dedup",
    catLabel: "dedup",
    title: "DISTINCT",
    body: "Duplicate rows are removed from the result. It runs after SELECT so it compares the final column values you've selected, not raw table data.",
    tip: "DISTINCT is expensive on large datasets because it must compare every row. A GROUP BY can sometimes do the same job faster.",
  },
  {
    num: "11",
    label: "ORDER BY",
    cat: "output",
    catLabel: "output",
    title: "ORDER BY",
    body: "The result is sorted. Because ORDER BY runs after SELECT, it can reference aliases you created in step 8. Indexes can sometimes eliminate this sort entirely.",
    tip: "ORDER BY without LIMIT forces the database to sort the entire result set. Always pair them.",
    note: "SELECT aliases usable here",
  },
  {
    num: "12",
    label: "LIMIT / OFFSET",
    cat: "output",
    catLabel: "output",
    title: "LIMIT / OFFSET",
    body: "The final result is trimmed to the requested slice. Crucially, all prior steps still ran over every qualifying row — LIMIT only cuts at the very end.",
    tip: "LIMIT doesn't make earlier steps faster. To genuinely reduce work, filter with WHERE earlier in the pipeline.",
  },
];

let active = null;
const pipeline = document.getElementById("pipeline");
const panel = document.getElementById("panel");

STEPS.forEach((s, i) => {
  if (i > 0) {
    const c = document.createElement("div");
    c.className = "conn";
    pipeline.appendChild(c);
  }
  if (s.note) {
    const n = document.createElement("div");
    n.className = "side-note";
    n.textContent = s.note;
    pipeline.appendChild(n);
  }
  const row = document.createElement("div");
  row.className = "step";
  row.innerHTML = `<span class="step-num">${s.num}</span>
    <span class="step-pill c-${s.cat}">${s.label}</span>
    <span class="step-arrow c-${s.cat}">▶</span>`;
  row.onclick = () => {
    if (active === i) {
      row.classList.remove("active");
      active = null;
      panel.innerHTML =
        '<div class="panel-empty"><svg class="panel-empty-border" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><rect rx="10"/></svg><span class="panel-hint">← click any step</span></div>';
      return;
    }
    document
      .querySelectorAll(".step")
      .forEach((el) => el.classList.remove("active"));
    row.classList.add("active");
    active = i;
    panel.innerHTML = `<div class="panel panel-${s.cat}">
      <div class="panel-header">
        <div class="panel-meta">
          <span class="panel-step-num c-${s.cat}">STEP ${s.num}</span>
          <span class="panel-badge c-${s.cat}">${s.catLabel}</span>
        </div>
        <div class="panel-title">${s.title}</div>
      </div>
      <div class="panel-body">${s.body}</div>
      <div class="panel-footer c-${s.cat}">
        <div class="panel-tip-label">why it matters</div>
        <div class="panel-tip" style="color:#aaa">${s.tip}</div>
      </div>
    </div>`;
  };
  pipeline.appendChild(row);
});
