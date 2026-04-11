# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project Overview
- Static HTML/CSS/JS site for interactive SQL visualization.
- No frameworks, no package manager, no build system beyond the project Python scripts.
- Browser-based only.

## Core Rules
- Never manually edit generated `.html` files in `pages/` or `main.html`.
- Always edit source files and regenerate with `python global/template/build.py`.
- Keep changes small, safe, and local to the file/page the user names.
- Do not refactor, restructure, rename, or add libraries unless explicitly asked.

## Source of Truth
- Config: `global/config/*.json`
- Content: `global/content/*-content.html`
- Template: `global/template/base.html`

## Project Structure
- `global/` — shared template, config, content, design tokens
- `pages/PAGENAME/` — page-specific JS, CSS, generated HTML
- `js/core/` — shared JavaScript utilities
- `styles/` — shared CSS
- `Assets/` — static assets

## Rules Files
Use the focused rule files for detailed guidance:
- `rules/build-pipeline.md`
- `rules/security.md`
- `rules/javascript.md`
- `rules/known-constraints.md`

## Skills
- Use `/update-structure` when new `.js`, `.py`, or `.css` files are added and `FILE_STRUCTURE.md` needs updating.

## Important Notes
- The app uses `window.ysqlvizApp` as the JavaScript namespace.
- Shared vs standalone behavior depends on `state.isSharedView`.
- Respect existing security helpers and CSP configuration.