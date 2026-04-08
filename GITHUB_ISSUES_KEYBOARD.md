# GitHub Issues: Keyboard Accessibility

## SIMPLE SUMMARY

**Title**: ⌨️ Add missing keyboard shortcuts and accessibility features

**Description**:
While basic keyboard navigation works (Tab, Enter, Escape), several features are still click-only, blocking keyboard-only users from efficient data entry and operations.

**Currently Working**:
- ✅ Tab between cells
- ✅ Enter/Escape for edits
- ✅ Ctrl+Enter (add row), Ctrl+N (add table), Ctrl+Shift+R (reset)
- ✅ Space to toggle booleans

**Currently Broken** (Click-Only):
- ❌ Delete row/column/table (only × button)
- ❌ Edit join conditions (all dropdowns are click-only)
- ❌ No keyboard hints in UI (users don't know shortcuts exist)
- ❌ No arrow key navigation between cells
- ❌ No copy-paste support (Ctrl+C/V)

**Testing** (Pick Any):
- [ ] Try deleting a row with keyboard only (no click) → Should work with shortcut
- [ ] Try editing a join condition with Tab only → Should access all fields
- [ ] Look for keyboard hints on buttons → Should show available shortcuts
- [ ] Try arrow keys to navigate cells → Should move between cells

---

## DETAILED INFORMATION

### Currently Working ✅

```
Ctrl+Enter    → Add row to current table
Ctrl+N        → Add new table
Ctrl+Shift+R  → Reset all data
Tab           → Navigate to next cell
Shift+Tab     → Navigate to previous cell
Enter         → Save table/column name edit
Escape        → Cancel and revert edit
Space         → Toggle boolean checkbox
```

### Missing Keyboard Shortcuts ❌

#### Issue #1: Delete Operations Not Keyboard Accessible
**Problem**: Only × button (click-only) to delete rows, columns, or tables
**Suggested Shortcuts**:
- Ctrl+Delete → Delete row
- Ctrl+Shift+Delete → Delete column
- Ctrl+Alt+Delete → Delete table

**Impact**: Users can't delete anything with keyboard

---

#### Issue #2: Join Condition Editor Not Keyboard Accessible
**Problem**: All dropdowns for join conditions are click-only
- Join type/operator selector
- Table selectors (left/right)
- Column selectors (left/right)
- Add/Remove condition buttons

**Impact**: Keyboard users cannot create or modify join conditions at all

---

#### Issue #3: Missing Keyboard Shortcut Indicators
**Problem**: No UI indication that shortcuts exist
- Ctrl+Enter, Ctrl+N, Ctrl+Shift+R not shown anywhere
- Users discover shortcuts by accident or documentation only

**Impact**: Users don't know shortcuts exist, stick to mouse

---

#### Issue #4: Spreadsheet-Style Navigation Missing
**Problem**: No arrow key navigation or Enter-to-move behavior
- Arrow keys don't navigate between cells
- Enter doesn't move to next cell (like Excel)
- No Tab behavior to move to next row after last column

**Impact**: Data entry is slower than necessary

---

#### Issue #5: Copy-Paste Support Missing
**Problem**: Can't copy/paste cell values
- Ctrl+C/V not supported
- Users must retype values

**Impact**: Bulk data entry very inefficient

---

#### Issue #6: Undo/Redo Not Supported
**Problem**: No undo/redo functionality
- Ctrl+Z doesn't undo changes
- Ctrl+Y doesn't redo
- Users must manually revert or use Reset

**Impact**: Accidental changes can't be easily reverted

---

#### Issue #7: Boolean Checkbox Visual Accessibility
**Problem**: Checkbox has aria-label but no visible text label
- Multiple booleans in a row are confusing
- Unclear which checkbox represents which column

**Impact**: Keyboard users can't easily tell which column they're in

---

### WCAG Compliance Mapping

| Issue | WCAG Criteria | Level | Status |
|-------|---------------|-------|--------|
| Delete shortcuts | 2.1.1 Keyboard | AA | ❌ Missing |
| Join editor keyboard | 2.1.1 Keyboard | AA | ❌ Missing |
| Shortcut indicators | 2.4.4 Link Purpose | AA | ❌ Missing |
| Arrow key navigation | 2.1.1 Keyboard | AAA | ❌ Missing |
| Copy-paste support | 2.1.1 Keyboard | AAA | ❌ Missing |
| Undo/Redo | 2.1.1 Keyboard | AAA | ❌ Missing |
| Checkbox labels | 1.3.1 Info Relationships | A | ⚠️ Partial |

### Implementation Priority

#### High Priority (Blocker for keyboard-only users)
1. Delete row/column/table shortcuts
2. Join condition editor keyboard access
3. Keyboard shortcut indicators in UI

#### Medium Priority (Nice to have)
4. Spreadsheet-style Enter/arrow behavior
5. Copy-paste support
6. Visual checkbox labels

#### Low Priority (Polish)
7. Undo/Redo functionality
8. Column reordering via keyboard
9. Keyboard accessibility guide/help

### Files to Modify

**High Priority**:
- `pages/joins/joins.js` - Add keyboard event listeners for delete shortcuts
- `js/components/dropdown-handler.js` - Ensure join condition dropdowns are keyboard accessible
- Multiple files - Add keyboard shortcut indicators in UI (tooltips)

**Medium Priority**:
- `pages/joins/joins-ui.js` - Add arrow key navigation to table cells
- `pages/joins/joins.js` - Add copy-paste handlers

**Low Priority**:
- `js/core/state.js` - Add undo/redo history
- Help documentation - Add keyboard guide

### Testing Checklist

**Keyboard-Only Testing**:
- [ ] Delete row with keyboard only
- [ ] Delete column with keyboard only
- [ ] Delete table with keyboard only
- [ ] Edit all join condition fields with Tab only
- [ ] Add new join condition with keyboard
- [ ] Remove join condition with keyboard
- [ ] Navigate all cells with arrow keys
- [ ] See keyboard shortcuts displayed somewhere in UI

**Accessibility Testing**:
- [ ] Tab order is logical
- [ ] Focus visible on all interactive elements
- [ ] Screen reader announces shortcuts
- [ ] No keyboard traps (can always escape)

### Related Files & Issues
- KEYBOARD_ACCESSIBILITY_CHECKLIST.md - Full tracking list
- Previous fixes: Tab navigation, Escape-to-cancel
- Keyboard help text (aria-describedby) already added

### Status
⚠️ **PARTIALLY COMPLETE**
- [x] Tab navigation working
- [x] Enter/Escape working
- [x] Basic shortcuts (Ctrl+N, Ctrl+Enter, Ctrl+Shift+R) working
- [ ] Delete shortcuts missing
- [ ] Join editor not keyboard accessible
- [ ] No shortcut indicators in UI
- [ ] No arrow key navigation
- [ ] No copy-paste

### Labels
`enhancement` `accessibility` `keyboard-navigation` `usability`

### Priority
High - Keyboard users are completely blocked for several features
