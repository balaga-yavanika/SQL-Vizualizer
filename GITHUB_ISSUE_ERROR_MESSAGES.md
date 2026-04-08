# GitHub Issue: Improve Error Messages for Clarity and Usability

## Title
🚀 Improve error messages: Show context, explain why, suggest fixes

## Description

### Problem
Error messages are vague and don't help users understand what went wrong or how to fix it.

**Current Examples**:
- "Column order mismatch at position X" → User doesn't know which columns or why
- "Complete current condition before adding another" → Doesn't explain what's incomplete
- "Invalid pair selection" → User doesn't know why or how to fix it
- "Set operator incompatible" → No context about which tables/columns don't match
- "Name invalid" → Doesn't show what was typed or why it failed

### Impact
- 😞 Users confused and frustrated
- 📞 More support requests/questions
- 🚫 Users abandon app thinking it's broken
- ⭐ Poor ratings and reviews

### Expected Behavior
Error messages should have:
1. **What happened**: Clear statement
2. **Why it happened**: Explanation with specific details
3. **How to fix it**: Actionable next steps

### Examples of Improvements

#### Before
```
Error: "Column order mismatch at position X"
```

#### After
```
Error: Column order mismatch
Left table has: (id, name, age)
Right table has: (id, age, name)

Why: Columns must be in the same order for joins to work correctly.
Fix: Reorder the columns in the right table to match: (id, name, age)
```

---

#### Before
```
Error: "Complete current condition before adding another"
```

#### After
```
Error: Join condition incomplete
Current condition: LEFT.users.id = [?]

Why: You started selecting a join condition but didn't finish.
Fix: Select a right table column to complete it (e.g., RIGHT.orders.user_id)
     Or click the × button to delete this condition and start over.
```

---

#### Before
```
Error: "Invalid pair selection"
```

#### After
```
Error: Can't create join - only 1 table exists
Tables available: users

Why: A join needs 2 tables to compare. You only have 1.
Fix: Add another table using the "+ add table" button
     OR use Self-Join to join a table to itself (users joined with users)
```

---

#### Before
```
Error: "Set operator incompatible"
```

#### After
```
Error: UNION incompatible - tables don't match
Left table columns: id, name, age
Right table columns: id, name, salary

Why: UNION requires both tables to have identical columns (same names, same order).
Fix: Rename 'salary' to 'age' in right table
     OR remove the 'age' column from left table to match right table
```

---

#### Before
```
Error: "Name invalid"
```

#### After
```
Error: Invalid table name: "user-table"
You typed: user-table

Why: Names can only contain letters (a-z, A-Z), numbers (0-9), and underscores (_).
     Hyphens (-) are not allowed.
Fix: Try: user_table, userTable, or users_table
     Max 20 characters. Must start with a letter.

Valid examples: users, user_data, Users2, myTable_1
Invalid examples: user-data, 1users, user data, @users
```

---

### Affected Areas
- [ ] Set operator compatibility check (joinEngine.js)
- [ ] Join condition validation (joinEngine.js, joins.js)
- [ ] Name validation (utils.js)
- [ ] Pair selection validation (joins.js)
- [ ] Table/column limits (joins.js)
- [ ] Data type validation (joins.js)

### Changes Needed
1. Update error messages in utility functions (validateName, etc.)
2. Enhance validation error objects to include context
3. Improve error display in toast notifications
4. Add helper text/hints for common errors

### Testing
- [ ] Error messages appear in UI when expected
- [ ] All special characters properly escaped (XSS prevention)
- [ ] Error descriptions are clear and helpful
- [ ] Suggested fixes are actionable
- [ ] Works on mobile (message length)

### WCAG/UX Compliance
- **2.3.2 Label, Name, Role**: Clear error descriptions
- **3.1.5 Reading Level**: Use simple language
- **3.3.1 Error Identification**: Clear identification of errors
- **3.3.3 Error Suggestion**: Suggest how to fix errors

### Priority
High - Impacts user experience and support burden

### Labels
`enhancement` `ux` `documentation` `accessibility`

---

## Acceptance Criteria

- [x] All error messages include: what, why, how-to-fix
- [x] Error messages show specific values/details (not generic)
- [x] Error messages fit on mobile (testing needed)
- [x] XSS prevention maintained (all user input escaped)
- [x] Toast notifications display full message
- [x] Consistent tone across all errors
- [x] No jargon or technical terms without explanation

## Related Issues
- Keyboard accessibility improvements
- Security: XSS prevention in all error messages
- Mobile responsiveness for longer messages
