# Keyboard Accessibility Checklist

## ✅ FIXED/WORKING

- [x] Tab navigation between all table cells and inputs
- [x] Enter key saves table/column name edits
- [x] Escape key cancels table/column name edits (reverts to original)
- [x] Escape key cancels data cell edits (reverts value)
- [x] Focus outline visible on all interactive elements (2px primary color)
- [x] Boolean checkboxes toggle with Space/Enter
- [x] Ctrl+Enter: Add row to table
- [x] Ctrl+N: Add new table
- [x] Ctrl+Shift+R: Reset all data
- [x] Delete button clickable (× buttons on rows/columns/tables)
- [x] Screen reader help text for edit mode (aria-describedby)

## ⚠️ PENDING/TODO

- [ ] Keyboard shortcut to delete row (e.g., Ctrl+Delete or Backspace)
- [ ] Keyboard shortcut to delete column (e.g., Ctrl+Shift+Delete)
- [ ] Keyboard shortcut to delete table (e.g., Ctrl+Alt+Delete)
- [ ] Join condition editor not keyboard accessible (click-only)
- [ ] Add keyboard shortcut indicators in UI (e.g., tooltip on buttons)
- [ ] Undo/Redo support (Ctrl+Z / Ctrl+Y)
- [ ] Column reordering via keyboard (drag-and-drop only currently)
- [ ] Boolean checkbox needs visible column label (not just aria-label)
- [ ] Tab order through join condition selectors might skip items
- [ ] No keyboard shortcut to toggle between join type and set operators
- [ ] Arrow key navigation within result table (currently Tab only)
- [ ] No Enter key support to submit join conditions (click-only)

## 📋 DETAILED ISSUES

### Row/Column Deletion
```
- [ ] Delete row: Need keyboard shortcut (Ctrl+Delete or similar)
- [ ] Delete column: Need keyboard shortcut (e.g., Shift+Ctrl+Delete)
- [ ] Delete table: Need keyboard shortcut (e.g., Alt+Ctrl+Delete)
- [ ] Currently only accessible via × button click
```

### Join Condition Editing
```
- [ ] Join condition operator selection: click-only dropdown
- [ ] Join condition first table selector: click-only dropdown
- [ ] Join condition column selector: click-only dropdown
- [ ] Join condition second table selector: click-only dropdown
- [ ] Add condition button: clickable but needs keyboard focus
- [ ] Remove condition button: clickable but needs keyboard focus
```

### Visual/UX Improvements
```
- [ ] Show keyboard shortcuts in UI (tooltips on buttons)
- [ ] Keyboard help section in About/Help page
- [ ] Clear visual indication when in edit mode vs navigation mode
- [ ] Checkbox columns need visible label text (not just aria-label)
- [ ] Focus indicator should be consistent across all elements
```

### Data Entry Enhancements
```
- [ ] Ctrl+A in cell should select all text
- [ ] Ctrl+C/V copy-paste for cells
- [ ] Arrow keys to navigate between cells (up/down/left/right)
- [ ] Shift+Tab to navigate backwards
- [ ] Enter key should move to next cell (like spreadsheet)
```

## 🎯 PRIORITY

### High Priority (Blocker for keyboard-only users)
- Delete row/column/table keyboard shortcuts
- Join condition editor keyboard accessibility
- Visual feedback for edit mode

### Medium Priority (Nice to have)
- Keyboard shortcut indicators in UI
- Copy-paste support
- Arrow key navigation

### Low Priority (Polish)
- Undo/Redo
- Column reordering via keyboard
- Spreadsheet-like Enter behavior

## 📝 NOTES

### Currently Working Shortcuts
```
Ctrl+Enter    → Add row
Ctrl+N        → Add table
Ctrl+Shift+R  → Reset all
Tab           → Navigate to next cell
Shift+Tab     → Navigate to previous cell
Enter         → Save table/column name, Submit form
Escape        → Cancel edit, revert value
Space         → Toggle checkbox
```

### Best Practices Not Yet Implemented
- Keyboard shortcuts should be shown in tooltips on buttons
- Common shortcuts (Delete, Undo) should work
- Keyboard-only users should never need mouse

## 🔗 Related Issues
- WCAG 2.1 Level AA compliance: 2.1.1 Keyboard, 2.1.2 No Keyboard Trap, 2.4.3 Focus Order
