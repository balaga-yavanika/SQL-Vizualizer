# App Profile — SQL Visualizer

## Section 0: My Contribution (For You, The Creator)

### What I Did vs What AI Did

| My Work (100% mine) | AI's Role (Under My Direction) |
|---------------------|-------------------------------|
| Problem identification — what needed fixing and why | Translating my specifications into working code |
| Solution design — features, UX flow, UI decisions | Debugging and fixing errors I flagged |
| App icon and visual design | Answering technical implementation questions |
| Writing structured, detailed agent instructions | |
| Feature planning and prioritization | |
| Testing, verifying correctness, ensuring quality | |

### Interview Framing — How to Talk About AI-Assisted Building

**Full version (when someone digs deeper):**

> "I used AI as my engineering team — the same way modern engineers use Cursor and Copilot. Every product decision, design choice, and user flow was mine. AI translated my specifications into code, and I verified everything works correctly. The product thinking is entirely mine. AI helped me build it faster."

**Short version (when someone says "so AI built it?"):**

> "AI helped me code, but I designed, planned, and directed every aspect. That's how software is built at top companies today — I just don't hide it."

### The Master Narrative

> "I identify gaps in existing products that I personally experience. I plan the solution, design the experience, and use modern AI tools to implement the code. The product thinking is entirely mine — I decide what to build and why. AI helps me build it faster."

---

## Section 1: Instructions for the Coding Agent

You are a coding agent working on the app described in this file. Follow these rules strictly:

1. **Read this entire file** — it contains the full project specification.

2. **Maintain `CHANGELOG.md`** — Log every change you make under `## [Unreleased]` with standard sub-headings:
   - `### Added` for new features
   - `### Fixed` for bug fixes
   - `### Changed` for modifications to existing functionality
   - `### Removed` for features taken out
   - `### Security` for security improvements

3. **When you complete all planned work for the current version**, autonomously rename `## [Unreleased]` to `## [0.x.0] - YYYY-MM-DD`. Increment the version based on scope:
   - **Patch** (0.0.x) — only bug fixes, no new features
   - **Minor** (0.x.0) — new features, backward compatible
   - **Major** (x.0.0) — breaking changes or official release (1.0.0)

4. **Flag missing information** — If any section below is incomplete or unclear, state what's missing and ask the user. Do not hallucinate or guess.

5. **Never fabricate facts, APIs, or behavior.** If you are unsure, say: "I am not confident about this."

6. **Update this file** when major decisions change during development.

---

## Section 2: App Identity

### One-Line Pitch

"Visualizing SQL so anyone can understand how queries work."

### Two-Line Pitch

An interactive tool that visualizes SQL query execution step by step. Designed for beginners who struggle to connect abstract query syntax to actual results.

### 3-4 Line Pitch

[Fill: Expand with more detail about what makes the visualization unique]

### Full Paragraph

[Fill: Complete paragraph covering the problem, approach, and target user]

### Target User

SQL beginners (including the creator) who find abstract syntax hard to grasp. Anyone learning databases who wants to see what their query actually does.

### Platform

[Fill: Web / Desktop — not specified yet]

### Current Status

[Fill: Ideation / In Progress / MVP Complete / Live]

### Project Links

- GitHub repo: [Fill: URL]
- Live demo: [Fill: URL or N/A]
- Screenshots: [Fill: URL or N/A]

### Key Metrics

- Users: [Fill]
- Testers: [Fill]

---

## Section 3: Constraints & Preferences

[Fill: Any constraints — free hosting, specific language, etc.]

---

## Section 4: Your Role

- [ ] Planning only (research, architecture, spec)
- [x] Planning + Implementation (recommended default)
- [ ] Implement from existing specifications

---

## Section 5: Complexity Level

- [ ] Simple (single page, no backend, no auth)
- [ ] Medium (multi-page, some backend, basic auth)
- [x] Complex (real-time features, database, user accounts, APIs)

Note: SQL execution requires a backend to actually run queries. This adds complexity.

---

## Section 6: Problem & Motivation

### What Problem Does This Solve?

- SQL is taught as abstract syntax — hard to visualize what's happening
- Beginners struggle to connect query logic to actual output
- Existing tools are complex or require setup

### Why Does This Matter?

Understanding SQL visually makes it click faster. A step-by-step visualization shows exactly what SELECT, JOIN, GROUP BY, etc. do to the data.

### What Existing Solutions Fall Short?

- SQL Fiddle/DB Fiddle: execution only, no visualization
- Database GUIs (DBeaver, DataGrip): for professionals, not learners
- Tutorials: static diagrams, not interactive

---

## Section 7: Core Features & User Flow

### Feature List

- [Feature 1]: [Fill — e.g., step-through query execution]
- [Feature 2]: [Fill — e.g., visual table transformations]
- [Feature 3]: [Fill — e.g., built-in sample datasets]

### Primary User Journey

[Fill: step-by-step — user types a query → sees tables transform step by step → understands each clause's effect]

### MVP vs Future

**MVP (must have):**
- [ ] [Fill: basic query execution with visualization]
- [ ] [Fill: support for SELECT, WHERE, JOIN]

**Future (nice to have):**
- [ ] [Fill: advanced SQL features]
- [ ] [Fill: custom dataset upload]

---

## Section 8: Architecture & Tech Stack

### Recommended Tech Stack

[Fill: to be determined — agent should recommend with reasoning]

Note: SQL execution requires a sandboxed database engine.

### High-Level Architecture

[Fill: to be determined]

### Key Data Models

[Fill: to be determined]

---

## Section 9: Interview Prep

### 1-Minute Pitch

[Fill: practice-ready pitch]

### "Why Did You Build This?"

The creator was learning SQL and found it hard to visualize what queries were actually doing. They wanted a tool that makes SQL click visually.

### "How Was It Built?" (Your Contribution vs AI)

The user identified the problem, designed the UX, planned every feature, and directed the implementation. AI helped code the application under their specifications.

### Challenges Faced

[Fill: to be determined]

---

## Section 10: Resume Summary

- [Fill: bullet point 1 — action-oriented]
- [Fill: bullet point 2 — action-oriented]
- [Fill: bullet point 3 — action-oriented]

---

## Section 11: Implementation Roadmap

### Phase 1 — MVP

- [ ] [Fill: core visualization engine]
- [ ] [Fill: basic SQL parser]
- [ ] [Fill: sample datasets]

### Phase 2 — Enhancement

- [ ] [Fill: advanced SQL features]
- [ ] [Fill: better UI/UX]

### Phase 3 — Scale

- [ ] [Fill: user accounts]
- [ ] [Fill: saved queries]

---

## Section 12: Open Questions

The following information is not yet specified. Each needs your input:

1. **Platform** — Web app? Desktop tool?
2. **Tech Stack** — No preferences stated. Any constraints?
3. **SQL Engine** — SQLite? PostgreSQL subset? Custom parser?
4. **Core Features** — What specific visualizations do you want?
5. **Current Status** — Where are you in development?
6. **GitHub Repo Link** — Not yet provided.

---

## Section 13: Revision History

(Start empty — the automation script and coding agent will populate this)
