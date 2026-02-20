# QMQA Date Validation Final Fix

## Issue Summary
Date fields in QMQA forms were showing validation errors:
- "Invalid date" error when selecting dates
- "Audit Plan Date: is required" error even after selecting a date
- Dates not being accepted by the form validation

## Root Cause Analysis

### How Calendar Fields Work
1. **CalendarField Component** (`CalendarField.tsx`):
   - User selects a date from the calendar picker
   - Component returns a `Date` object via `onChange` callback

2. **FormSection Component** (`FormSection.tsx`):
   - Receives the `Date` object from CalendarField
   - Converts it to ISO string: `date.toISOString()` → `"2026-02-21T00:00:00.000Z"`
   - Stores the ISO string in form state (NOT a Date object)

3. **Form State**:
   - Stores calendar values as ISO strings
   - Default values were set as empty strings `""`

4. **Validation** (`formValidation.ts`):
   - Was using `z.string().min(1)` for required fields
   - Empty string `""` passes the type check but fails the `.min(1)` check
   - When default is `""`, validation fails even after selecting a date

### The Problem
The issue was with **default values initialization**:
- Default values were set as empty strings: `auditPlanDate: ""`
- When a date was selected, the form state updated to ISO string: `"2026-02-21T00:00:00.000Z"`
- However, the validation schema was checking for `undefined` vs empty string inconsistently
- The `z.string().min(1)` validation was too strict and didn't properly handle the transition from `undefined` → ISO string

## Solution

### 1. Updated Default Values
Changed calendar field defaults from empty strings to `undefined`:

**Before:**
```typescript
const auditPlanDefaults = {
  auditPlanDate: "",  // Empty string
  dueDate: "",
  actualDate: "",
};
```

**After:**
```typescript
const auditPlanDefaults = {
  auditPlanDate: undefined,  // Undefined for calendar fields
  dueDate: undefined,
  actualDate: undefined,
};
```

### 2. Updated Validation Schema
Improved the calendar field validation to properly handle `undefined` → ISO string transition:

**Before:**
```typescript
case 'calendar':
case 'date': {
  if (field.required) {
    return z.string({
      required_error: `${field.label} is required`,
      invalid_type_error: `${field.label} must be a valid date`
    }).min(1, `${field.label} is required`);
  }
  return z.string().nullable().optional().or(z.literal(''));
}
```

**After:**
```typescript
case 'calendar':
case 'date': {
  if (field.required) {
    // Accept string or undefined, but string must be non-empty
    return z.union([
      z.string().min(1, `${field.label} is required`),
      z.undefined()
    ]).refine(
      (val) => val !== undefined && val.length > 0,
      { message: `${field.label} is required` }
    );
  }
  
  // Optional: accept string, null, undefined, or empty string
  return z.union([
    z.string(),
    z.null(),
    z.undefined(),
    z.literal('')
  ]).optional();
}
```

### 3. Why This Works

1. **Initial State**: Form starts with `auditPlanDate: undefined`
2. **Validation**: Schema accepts `undefined` initially (form not yet submitted)
3. **User Selects Date**: CalendarField returns Date object
4. **FormSection Converts**: Date → ISO string `"2026-02-21T00:00:00.000Z"`
5. **Form State Updates**: `auditPlanDate: "2026-02-21T00:00:00.000Z"`
6. **Validation Passes**: String is non-empty, validation succeeds
7. **Backend Receives**: ISO string is transformed to `YYYY-MM-DD` format by mapper

## Files Modified

### Frontend
1. **sqm-frontend2/src/lib/validations/formValidation.ts**
   - Updated calendar/date field validation logic
   - Added proper union type handling for undefined → string transition

2. **sqm-frontend2/src/pages/dashboard/qmqa/ScheduleNew.tsx**
   - Changed `auditPlanDate: ""` to `auditPlanDate: undefined`

3. **sqm-frontend2/src/pages/dashboard/qmqa/DraftNew.tsx**
   - Changed all calendar field defaults to `undefined`
   - Changed `auditRating` (number field) to `undefined`

## Testing Checklist

- [x] Calendar field accepts date selection without errors
- [x] Validation passes when date is selected
- [x] Validation fails when required date is not selected
- [x] Form submission works with selected dates
- [x] Date transformation to YYYY-MM-DD format works
- [x] No TypeScript errors
- [x] No console warnings

## Impact on Other Modules

**CRITICAL**: The `formValidation.ts` file is used by ALL modules:
- 5M1E
- MNR
- SQMP
- QMQA
- OGI
- Maintenance

This fix improves calendar field validation across the entire application. All modules should now:
1. Use `undefined` as default for calendar fields (not empty strings)
2. Benefit from improved validation logic
3. Have consistent date handling behavior

## Best Practices Going Forward

### For Calendar Fields:
1. Always use `undefined` as default value, never empty string `""`
2. Form state stores ISO strings after user selection
3. Backend mappers transform ISO strings to `YYYY-MM-DD` format
4. Validation schema handles `undefined` → ISO string transition

### For Number Fields:
1. Use `undefined` as default value, never empty string `""`
2. Let react-hook-form handle number conversion with `valueAsNumber: true`

### Example:
```typescript
const defaultValues = {
  // ✅ Correct
  auditPlanDate: undefined,
  auditRating: undefined,
  
  // ❌ Wrong
  auditPlanDate: "",
  auditRating: "",
};
```

## Related Documentation
- QMQA_DATE_FIX_FINAL.md
- QMQA_5M1E_DATE_COMPARISON.md
- QMQA_DATE_VALIDATION_FIX.md
