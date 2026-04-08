# GitHub Issue: Join Condition Panel Not Visible with 2 Tables

## SIMPLE SUMMARY

**Title**: 🐛 Join condition panel hidden when exactly 2 tables exist

**Description**:
When user manually adds 2 tables and selects a join operation (e.g., RIGHT JOIN), the "ON CONDITION" panel doesn't appear. The pair selector dropdown is also hidden.

**Steps to Reproduce**:
1. Add table 1 (any data)
2. Add table 2 (any data)
3. Select RIGHT JOIN from dropdown
4. Look for "ON CONDITION" panel or pair selector
5. Nothing appears ❌

**Expected**:
- Pair selector dropdown visible (to choose which tables to join)
- ON CONDITION panel visible (to set join conditions)
- User can select tables and add conditions ✅

**Current**:
- Pair selector hidden ❌
- ON CONDITION panel hidden or not showing properly ❌
- User can't see what they're doing ❌

**Testing**:
- [ ] Add exactly 2 tables
- [ ] Select RIGHT JOIN
- [ ] Verify pair selector appears
- [ ] Verify ON CONDITION panel appears

---

## DETAILED INFORMATION

### Root Cause #1: Pair Selector Always Hidden with 2 Tables

**Location**: `pages/joins/joins.js` line 765

**Current Code**:
```javascript
document.getElementById("pair-row").style.display =
  state.tables.length > 2 ? "flex" : "none";  // WRONG: > should be >=
```

**Problem**:
- Condition checks `> 2` (more than 2)
- With 2 tables: `2 > 2 = false` → `display = "none"` ❌
- With 3 tables: `3 > 2 = true` → `display = "flex"` ✅
- User with 2 tables can't see pair selector

**Why This Matters**:
- Pair selector lets user choose which 2 tables to join
- With exactly 2 tables, user NEEDS this selector
- Currently hidden, makes feature invisible

**Fix**:
```javascript
document.getElementById("pair-row").style.display =
  state.tables.length >= 2 ? "flex" : "block";  // Show with 2+ tables
```

---

### Root Cause #2: Join Condition Panel Logic (Possible)

**Location**: `pages/joins/joins.js` lines 768-773

**Current Code**:
```javascript
const joinCondPanel = document.querySelector(".join-condition-panel");
const isSetOperator = state.currentOp && JOIN_OPS[state.currentOp]?.group === "set";

if (joinCondPanel) {
  joinCondPanel.style.display = isSetOperator ? "none" : "block";
}
```

**This SHOULD work correctly**:
- RIGHT JOIN is NOT a set operator
- `isSetOperator = false`
- `display = "block"` ✅

**But user reports it's not showing**, so possible issues:
1. Panel is showing but positioned off-screen
2. Panel is showing but has 0 height
3. Panel styling hides it with `display: none` from CSS
4. Panel is behind other content (z-index issue)

**Need to verify CSS for `.join-condition-panel`**

---

### Files to Check/Fix

**High Priority**:
- `pages/joins/joins.js` line 765 - Fix `>` to `>=`

**Medium Priority**:
- `styles/` - Check if `.join-condition-panel` has CSS hiding it
- `pages/joins/joins.html` - Verify panel exists and positioned correctly

---

### Testing Checklist

**After Fix**:
- [ ] Add table 1
- [ ] Add table 2
- [ ] Pair selector dropdown is VISIBLE
- [ ] Can select "Table1 → Table2" from dropdown
- [ ] SELECT JOIN from join type selector
- [ ] ON CONDITION panel is VISIBLE
- [ ] Can add join conditions
- [ ] Works with RIGHT JOIN
- [ ] Works with INNER JOIN
- [ ] Works with LEFT JOIN
- [ ] With 3+ tables, both pair selector and ON CONDITION visible

---

### Impact
✅ Medium Priority (blocks join functionality with 2 tables)
✅ Likely quick fix (single line)

### Related
- Modal dropdown positioning (similar UI visibility issue)
- Previous fixes to join condition logic

### Status
🔧 READY FOR FIX

### Labels
`bug` `ui-visibility` `joins` `critical`

### Priority
High - Joins don't work with exactly 2 tables
