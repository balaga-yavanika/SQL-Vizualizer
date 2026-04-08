# Keyboard Accessibility - Bugs Found

## Critical Bugs

### BUG #1: Escape Key on Table/Column Names Saves Instead of Canceling ⚠️
**Severity**: HIGH  
**Location**: `joins-ui.js` lines 126, 150  
**Problem**: 
- User edits table name "users" → types "users123" → presses Escape
- Expected: Revert to "users", no save
- Actual: Saves as "users123" (Escape just blurs, triggering onblur which saves)

**Root Cause**:
```javascript
onkeydown="if(event.key==='Escape'){this.blur();event.preventDefault()}"
onblur="window.app.renameTableAndRender(${ti}, this.textContent)"
```
The onblur handler ALWAYS runs and saves the current textContent.

**Impact**: Users can't cancel edits - Escape behaves like Enter

**Fix Required**:
- Store original value before editing starts
- On Escape, restore original value BEFORE blurring
- Only call renameTableAndRender if user intentionally saved (Enter or blur after editing)

---

### BUG #2: Data Cell Inputs Don't Restore Value on Escape ⚠️
**Severity**: MEDIUM  
**Location**: `joins-ui.js` line 189  
**Problem**:
- User types "100" in a cell → presses Escape
- Expected: Value reverts to original, change discarded
- Actual: Value is saved when onchange fires (triggered by blur)

**Root Cause**:
```javascript
onkeydown="if(event.key==='Escape'){this.blur();event.preventDefault()}"
onchange="app.handleKeyChange(...)"  // Fires on blur!
```

**Impact**: Escape doesn't cancel edits in data cells

**Fix Required**:
- Track initial value when input gets focus
- On Escape: restore input.value to initial value BEFORE blur
- Prevent onchange from firing if value was reverted

---

### BUG #3: No Visual Distinction Between Edit Mode & Navigation Mode
**Severity**: MEDIUM  
**Location**: Table name/column name contenteditable elements  
**Problem**:
- User tabs to table name with keyboard - no clear indication they're now in edit mode
- User might press Arrow keys expecting to navigate, but instead edits the name
- No mode indicator (e.g., "Press Enter to edit" on focus)

**Impact**: Confusing keyboard experience; unclear when in edit vs navigation mode

**Fix Required**:
- Add aria-describedby with edit instructions
- Show tooltip/hint on focus: "Press Enter to edit, Escape to cancel"
- Or add visual border/background on focus (already partially done)

---

## Medium Severity Issues

### BUG #4: Boolean Checkbox Not Obviously Keyboard-Editable
**Severity**: LOW  
**Location**: `joins-ui.js` line 172  
**Problem**:
- Checkbox has aria-label but no visible label text
- User can't easily tell which column the checkbox represents without tabbing
- In a 4-column table with 3 booleans, it's unclear which checkbox is which

**Fix Required**:
- Add visible label text next to checkbox (column name)
- Or enhance aria-label with column context

---

### BUG #5: No Tab Focus Order Documentation
**Severity**: LOW  
**Location**: All interactive elements  
**Problem**:
- Focus order might not be intuitive (follows DOM order)
- No aria-flowto or other indicators of logical tab order
- Users might get confused when tabbing through complex layouts

**Fix Required**:
- Consider if tabindex needs adjustment for logical order
- Document expected tab order in help/accessibility guide

---

## Test Cases to Verify

1. ✅ **Tab Navigation**: Tab through all cells - should work
2. ❌ **Escape on Table Name**: Edit → Escape → Check if reverted (WILL FAIL - saves instead)
3. ❌ **Escape on Data Cell**: Edit cell → Escape → Check if value restored (WILL FAIL - saves instead)
4. ✅ **Enter on Table Name**: Edit → Enter → Should save
5. ✅ **Focus Visible**: All inputs should show 2px outline on focus
6. ✅ **Checkbox Space/Enter**: Checkbox should toggle with Space/Enter

---

## Implementation Status

**Working ✅**:
- Tab navigation between cells
- Enter key to save table/column names
- Focus outline visibility
- Checkbox Space/Enter toggle
- Escape blur (but saves when shouldn't)

**Broken ❌**:
- Escape should revert, not save
- No mode indicator for contenteditable elements
- No visual feedback when in edit mode vs navigation mode

---

## Recommended Fixes (Priority Order)

1. **HIGH**: Implement proper Escape-to-cancel for table/column names
   - Store original value on focus
   - Restore and prevent save on Escape

2. **HIGH**: Implement proper Escape-to-revert for data cells
   - Store initial input.value on focus
   - Restore value and prevent onchange on Escape

3. **MEDIUM**: Add edit mode indicator
   - aria-describedby with edit instructions
   - Visual hint on focus

4. **LOW**: Add visible checkbox labels

5. **LOW**: Document and optimize tab order
