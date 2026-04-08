# GitHub Issue: Modal Dropdown Shows Unwanted Scrollbar

## SIMPLE SUMMARY

**Title**: 🐛 Modal datatype dropdown shows scrollbar instead of expanding cleanly

**Description**: 
Opening the "Add Column" modal and clicking the Data Type dropdown causes an unwanted scrollbar to appear on the modal. The dropdown should expand cleanly below the button without any scrollbars.

**Expected**: Dropdown expands, no scrollbar on modal
**Actual**: Dropdown expands, modal shows unwanted scrollbar

**Testing**:
- [ ] Open "Add Column" modal
- [ ] Click Data Type dropdown
- [ ] Verify: Dropdown fully visible, NO scrollbar on modal

---

## DETAILED INFORMATION

### Root Cause
`.modal-box` has `overflow: auto` which catches the dropdown's overflow when it expands absolutely. This triggers a scrollbar even though the dropdown is positioned absolutely.

### Visual Impact
```
CURRENT (Bad):
┌─────────────────────┐
│ Add Column          │
│ Column Name: [____] │ ← unwanted scrollbar!
│ Data Type: [v]      │↓
│    ├─ Integer       │
│    ├─ String        │
│    └─ Float         │↓
└─────────────────────┘

EXPECTED (Good):
┌─────────────────────┐
│ Add Column          │
│ Column Name: [____] │
│ Data Type: [v]      │
│    ├─ Integer       │
│    ├─ String        │
│    ├─ Float         │
│    └─ Boolean       │
└─────────────────────┘
(No scrollbar)
```

### Solution
Move overflow handling from `.modal-box` to `.modal-body`:

**Changes needed in `styles/modal.css`**:
1. `.modal-box`: Change `overflow: auto` → `overflow: hidden`
2. `.modal-body`: Add `overflow-y: auto` + `flex: 1`
3. `.modal-header, .modal-footer`: Add `flex-shrink: 0`

**Why**:
- Only the body scrolls, not the entire modal
- Dropdown stays absolutely positioned and doesn't trigger scrollbar
- Header/footer always visible

### Files Affected
- `styles/modal.css` - CSS changes only

### Impact
✅ Low Risk (CSS only)
✅ Improves UX (no unwanted scrollbars)
✅ Maintains functionality

### Related
Previous fix: diagram-col-dropdown positioning (similar issue)
