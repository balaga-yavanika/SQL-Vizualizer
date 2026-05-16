# Automation Journey

## Why We Started

I have 3 apps I'm building. Each has a profile document that describes the app — features, tech stack, interview pitch, resume bullets.

The problem: every time I ship a release, the profile goes out of date. I'd have to manually copy-paste changelog entries into the profile. That's tedious. I won't do it consistently. The profile becomes stale, and when I need it for an interview, the info is wrong.

No existing plugin in OpenCode solved this. The cloud IDE Anthropic builds has "routines" for this kind of event-driven automation, but OpenCode didn't have a plugin for my specific workflow.

So I built a lightweight workaround.

## What I Built

A PowerShell script called `sync-profile.ps1` that:

1. Reads the latest released version from `CHANGELOG.md`
2. Extracts all changes under that version
3. Appends them to the app profile's Revision History section
4. Updates the Current Version and Current Status fields
5. Re-adds `[Unreleased]` for ongoing development
6. Detects duplicates — safe to run multiple times
7. Uses temp-file swap so a crash never corrupts your files
8. Fails gracefully with clear error messages

## How the Script Reads CHANGELOG.md (Plain Language)

The script opens CHANGELOG.md and reads it line by line. Here's what it looks for:

```
# Changelog                 ← SKIP this (the title)

## [Unreleased]              ← SKIP this (work in progress, not released yet)
### Added
- New feature being built

## [0.3.0] - 2026-04-01       ← READ this (the latest release)
### Added                    ← READ everything until the next ## heading
- Quiz feature
### Fixed                    ← READ everything, keep the section names
- Thai encoding bug
```

- It skips the `# Changelog` title
- It skips the first `##` heading if it says `[Unreleased]`
- It reads the next `##` heading — that's the latest release
- It grabs the version number (like `0.3.0`) from the heading
- It grabs all the content underneath until the next `##` or end of file
- It adds that content to the profile file's Revision History

## What the Script Checks (Detection Logic)

| What's in your files | Script says | Files changed? |
|----------------------|-------------|----------------|
| Everything is correct, version is new | "Done! Version X added to your profile." | Yes |
| Version X is already in your profile | "Version X is already in your profile — nothing changed." | No |
| Only [Unreleased] exists, no release | "No released version found. Did you rename [Unreleased] to a version number?" | No |
| Version number has a typo (1.o.0, l.0.0, I.0.0) | "Could not read version number from '1.o.0'. Expected format like [1.0.0]. Check for typos (O instead of 0, l instead of 1)." | No |
| Same version appears twice in CHANGELOG | "Found 2 entries for version X in CHANGELOG. Remove the duplicate and try again." | No |
| Profile file doesn't exist | "Profile file not found: ..." | No |
| CHANGELOG file doesn't exist | "CHANGELOG file not found: ..." | No |

## Example: Running the Script (What You See)

### Scenario 1: Happy Path (version 0.3.0 is new)

```
.\sync-profile.ps1 -AppName _sandbox

Reading CHANGELOG: ...\_sandbox-changelog.md
Target profile:    ...\_sandbox-profile.md
Found version: 0.3.0
  Revision History updated
  Current Version updated to: 0.3.0
  Current Status unchanged
  Profile file written safely
✓ Done! Version 0.3.0 added to your profile.
```

### Scenario 2: Already Recorded (running again for 0.3.0)

```
.\sync-profile.ps1 -AppName _sandbox

Reading CHANGELOG: ...\_sandbox-changelog.md
Target profile:    ...\_sandbox-profile.md
Found version: 0.3.0
✗ Version 0.3.0 is already in your profile — nothing changed.
```

### Scenario 3: Major Bump (0.9.0 → 1.0.0)

```
.\sync-profile.ps1 -AppName _sandbox

Reading CHANGELOG: ...\_sandbox-changelog.md
Target profile:    ...\_sandbox-profile.md
Found version: 1.0.0
  Revision History updated
  Current Version updated to: 1.0.0
  Status updated to: Live (major version bump)
  Profile file written safely
✓ Done! Version 1.0.0 added to your profile.
```

### Scenario 4: Invalid Version (typo like 1.o.0)

```
.\sync-profile.ps1 -AppName _sandbox

Reading CHANGELOG: ...\_sandbox-changelog.md
Target profile:    ...\_sandbox-profile.md
✗ Could not read version number from '1.o.0'. Expected format like [1.0.0]. 
  Check for typos (O instead of 0, l instead of 1).
```

### Scenario 5: No Released Version (only [Unreleased])

```
.\sync-profile.ps1 -AppName _sandbox

Reading CHANGELOG: ...\_sandbox-changelog.md
Target profile:    ...\_sandbox-profile.md
✗ No released version found. Did you rename [Unreleased] to a version number?
```

### Scenario 6: Duplicate Version in CHANGELOG

```
.\sync-profile.ps1 -AppName _sandbox

Reading CHANGELOG: ...\_sandbox-changelog.md
Target profile:    ...\_sandbox-profile.md
✗ Found 2 entries for version 1.0.0 in CHANGELOG. Remove the duplicate and try again.
```

### Scenario 7: File Not Found

```
.\sync-profile.ps1 -AppName nonexistent

✗ Profile file not found: ...\nonexistent-profile.md
```

## How the Coding Agent Fits

The profile file (e.g., `polyglot-quiz-profile.md`) contains instructions in Section 1 that tell the coding agent:

> "Maintain CHANGELOG.md under `[Unreleased]`. When you complete a version, rename `[Unreleased]` to `[0.x.0]`."

The agent does this autonomously. I never type version numbers or changelog entries manually.

## My Role (Minimal)

| Phase | What I Do |
|-------|-----------|
| Development | Tell the agent: "Build feature X" |
| Release day | Run: `.\sync-profile.ps1` |

Two manual actions per app lifecycle.

## How to Set Up a New Project

1. Copy `app-profile-template.md` into your project's `docs/` folder
2. Rename it to match your app: `yourapp-profile.md`
3. Fill in the sections about your app (identity, features, platform, etc.)
4. Give the file to your coding agent and tell it to read it
5. The agent will start maintaining `CHANGELOG.md` under `[Unreleased]`
6. When it's time to release, run the script

## How to Run the Script (No Confusion)

The script looks for `*-profile.md` in the **current folder**. For `CHANGELOG.md`, it checks the current folder first, then the **parent folder** — so it works whether your CHANGELOG is in `docs/` or the project root.

**Setup A: Script + profile + CHANGELOG all in docs/**
```
cd docs
..\sync-profile.ps1
```
No -AppName needed. Script finds everything in docs/.

**Setup B: Script and profile in docs/, CHANGELOG in project root (most common)**
```
cd docs
..\sync-profile.ps1
```
Script finds profile in docs/, then looks for CHANGELOG in docs/ → not found → checks parent (root) → found. Works.

**Setup C: Testing with sandbox files (like in Career Launchpad)**
```
.\sync-profile.ps1 -AppName _sandbox
```
- AppName tells the script which files to use
- It looks for `_sandbox-profile.md` and `_sandbox-changelog.md`

**The rule:** `cd` into the folder where your profile file lives, then run the script. CHANGELOG can be in the same folder or one level up.

## What Makes It Like an Event-Driven Routine

- **Event-driven**: a release is the trigger — the script fires in response
- **Idempotent**: running twice does nothing the second time
- **Safe**: temp-file swap pattern prevents partial writes
- **Portable**: pure PowerShell 7+, works on Windows, macOS, Linux
- **Self-contained**: one script, one command, everything else is derived from existing files

## The Architecture

```
Coding Agent builds features
        │
        ▼
Agent logs changes under [Unreleased] in CHANGELOG.md
        │
        ▼
Agent renames [Unreleased] → [0.x.0] (autonomous)
        │
        ▼
User runs: .\sync-profile.ps1
        │
        ▼
Script reads CHANGELOG → updates profile
        │
        ▼
Profile stays in sync with actual app state
```

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Input method | Reads CHANGELOG.md, not command-line params | Zero manual data entry |
| Version source | Second ## heading in CHANGELOG | Reliable, standard format |
| Safety | Temp-file swap | Original never lost on crash |
| Status updates | Only on major bumps (0→1, 1→2) | Meaningful milestones only |
| Duplicate handling | Check in CHANGELOG + check in profile | Safe to run multiple times |
| File location | `docs/` folder in each project | Keeps automation separate from source code |

## Comparison: Before vs After

**Before this automation:**
- Build app features
- Manually update profile doc
- Miss updates → profile goes stale
- Interview comes → realize info is outdated

**After this automation:**
- Build app features
- Coding agent logs everything in CHANGELOG
- One command on release → profile auto-updates
- Profile is always current

## What It Demonstrates for Interviews

This automation itself is a project I can talk about:

> *"I needed profile documents to stay in sync with app releases. OpenCode didn't have a plugin for my workflow, so I built a PowerShell automation — event-driven, idempotent, and portable. The coding agent maintains the changelog, and I run one command on release. It works like the 'routines' feature in Anthropic's cloud IDE, but as a lightweight local script."*
