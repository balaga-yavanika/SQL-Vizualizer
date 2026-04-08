# Keyboard Accessibility Issues - Ready for GitHub

## Quick Copy-Paste Issues

### Issue #1: Delete Operations Not Keyboard Accessible
```
- [ ] No keyboard shortcut to delete a row (× button is click-only)
- [ ] No keyboard shortcut to delete a column (× button is click-only)  
- [ ] No keyboard shortcut to delete a table (× button is click-only)
- [ ] Suggest: Ctrl+Delete for row, Ctrl+Shift+Delete for column, Ctrl+Alt+Delete for table
```

### Issue #2: Join Condition Editor Not Keyboard Accessible
```
- [ ] Join type/operator dropdown is click-only
- [ ] Table selectors are click-only dropdowns
- [ ] Column selectors are click-only dropdowns
- [ ] Add/Remove condition buttons not keyboard accessible
- [ ] Keyboard users cannot create or modify join conditions
```

### Issue #3: Missing Keyboard Shortcut Indicators
```
- [ ] No UI indication that Ctrl+Enter, Ctrl+N, Ctrl+Shift+R exist
- [ ] Users discover shortcuts by accident or documentation only
- [ ] Buttons should show keyboard hints in tooltips/help text
- [ ] Add Help/Keyboard section to About page
```

### Issue #4: Spreadsheet-Style Navigation Missing
```
- [ ] Arrow keys (up/down/left/right) don't navigate between cells
- [ ] Enter key doesn't move to next cell (like Excel)
- [ ] No Tab behavior to move to next row after last column
- [ ] Makes bulk data entry slower than necessary
```

### Issue #5: Data Entry Features Missing
```
- [ ] Copy-paste (Ctrl+C/V) not supported for cells
- [ ] Ctrl+A in cell doesn't select all text
- [ ] No select-all shortcut for rows/columns
- [ ] Reduces efficiency for users with large datasets
```

### Issue #6: Boolean Checkbox Accessibility
```
- [ ] Checkbox has aria-label but no visible column label
- [ ] Multiple checkboxes in a row are confusing without labels
- [ ] In 4-column table with 3 booleans, unclear which is which
- [ ] Add visible text label next to checkbox (e.g., "Active:")
```

### Issue #7: Tab Order and Focus Management
```
- [ ] Focus order may not follow logical flow through form
- [ ] No aria-flowto to indicate intended tab order
- [ ] Users might get lost navigating complex layout with Tab
- [ ] Audit and document expected tab order
```

### Issue #8: Undo/Redo Not Supported
```
- [ ] Ctrl+Z doesn't undo changes
- [ ] Ctrl+Y doesn't redo
- [ ] Users must manually retype or use Reset button
- [ ] Should maintain undo history for edits
```

---

## Single-Line Issue Template

Use these as GitHub issue titles/descriptions:

```
🚀 Keyboard Shortcut: Delete row [Ctrl+Delete]
🚀 Keyboard Shortcut: Delete column [Ctrl+Shift+Delete]
🚀 Keyboard Shortcut: Delete table [Ctrl+Alt+Delete]
🚀 Join condition editor should support keyboard navigation and Tab access
🚀 Add tooltip/help text showing available keyboard shortcuts
🚀 Support arrow key navigation between table cells
🚀 Support Enter key to move to next cell (spreadsheet behavior)
🚀 Add copy-paste support (Ctrl+C/V) for table cells
🚀 Boolean checkboxes need visible column labels, not just aria-label
🚀 Implement Ctrl+Z (Undo) and Ctrl+Y (Redo) support
🚀 Document and optimize Tab focus order through all controls
🚀 Add keyboard accessibility guide to Help/About section
```

---

## WCAG 2.1 Compliance Mapping

| Issue | WCAG Criteria | Level |
|-------|---------------|-------|
| Delete shortcuts missing | 2.1.1 Keyboard | AA |
| Join editor click-only | 2.1.1 Keyboard | AA |
| No keyboard hints | 2.4.4 Link Purpose | AA |
| No arrow navigation | 2.1.1 Keyboard | AAA |
| Copy-paste missing | 2.1.1 Keyboard | AAA |
| Checkbox label missing | 1.3.1 Info & Relationships | A |
| Tab order not documented | 2.4.3 Focus Order | A |

---

## Currently Working ✅

Users CAN currently:
- Tab between all cells
- Use Enter/Escape in text edits
- Toggle boolean checkboxes with Space
- Use Ctrl+Enter (add row), Ctrl+N (add table), Ctrl+Shift+R (reset)
- See focus outlines on all interactive elements

Users CANNOT currently:
- Delete rows/columns/tables with keyboard
- Edit join conditions with keyboard
- Know what keyboard shortcuts exist
- Use arrow keys or Enter like a spreadsheet
- Copy/paste between cells
- Undo recent changes
