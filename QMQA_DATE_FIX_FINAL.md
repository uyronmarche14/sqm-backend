# QMQA Date Field Fix - Final Solution

## Date: February 21, 2026

## Problem
Date fields in QMQA forms were showing "Invalid date" errors immediately after selection, preventing form submission.

## Root Cause

The issue was in the **form validation layer** (`formValidation.ts`), NOT in the QMQA-specific schemas.

### How Calendar Fields Work:

1. **CalendarField Component** (`CalendarField.tsx`):
   - User selects a date from the calendar picker
   - Returns a JavaScript `Date` object

2. **FormSection Component** (`FormSection.tsx`):
   - Receives the Date object from CalendarField
   - Converts it to ISO string for form state storage:
   ```typescript
   onChange={(date) => {
     onChange(date ? date.toISOString() : undefined);
   }}
   ```
   - Stores: `"2026-02-21T00:00:00.000Z"`

3. **formValidation.ts** (THE PROBLEM):
   - Was using `z.coerce.date()` to validate calendar fields
   - Tried to coerce ISO strings back to Date objects
   - Failed validation with "Invalid date" error

## Solution

### Fixed formValidation.ts

Changed the calendar/date field validation to accept ISO strings:

**Before (Incorrect)**:
```typescript
case 'calendar':
case 'date': {
  const s = z.preprocess((arg) => {
    if (typeof arg === 'string' && arg === '') return undefined;
    return arg;
  }, z.coerce.date());  // ❌ Tries to coerce to Date
  return field.required ? s : s.optional();
}
```

**After (Correct)**:
```typescript
case 'calendar':
case 'date': {
  // Calendar fields store ISO strings (e.g., "2026-02-21T00:00:00.000Z")
  // Accept strings and validate they're not empty
  let s = z.string();
  if (field.required) {
    s = s.min(1, `${field.label} is required`);
  }
  return field.required ? s : s.optional();
}
```

### Date Transformation for Backend

Created mapper to transform ISO strings to YYYY-MM-DD format:

**File**: `sqm-frontend2/src/lib/mappers/qmqa/form-to-dto.mapper.ts`

```typescript
export function formatDate(dateValue: string | Date | undefined): string | undefined {
  if (!dateValue) return undefined;
  
  // Already in YYYY-MM-DD format
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  
  // ISO string (from FormSection) - extract date part
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    return dateValue.split('T')[0]; // "2026-02-21T00:00:00.000Z" -> "2026-02-21"
  }
  
  // Date object - convert to YYYY-MM-DD
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }
  
  // Try to parse as date
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().split('T')[0];
}
```

## Complete Data Flow

```
User selects date
    ↓
CalendarField returns Date object
    ↓
FormSection converts to ISO string: "2026-02-21T00:00:00.000Z"
    ↓
Form state stores ISO string
    ↓
formValidation.ts validates as string ✅
    ↓
Form submission handler calls mapper
    ↓
Mapper transforms to YYYY-MM-DD: "2026-02-21"
    ↓
Backend receives correct format ✅
```

## Files Modified

1. **sqm-frontend2/src/lib/validations/formValidation.ts** (CRITICAL FIX)
   - Changed calendar/date validation from `z.coerce.date()` to `z.string()`

2. **sqm-frontend2/src/lib/validations/qmqa.schema.ts** (UPDATED)
   - Changed from `z.union([z.string(), z.date()])` to `z.string().min(1)`
   - Matches formValidation.ts behavior

3. **sqm-frontend2/src/lib/mappers/qmqa/form-to-dto.mapper.ts** (NEW)
   - Created date transformation mapper
   - Transforms ISO strings to YYYY-MM-DD format

4. **sqm-frontend2/src/pages/dashboard/qmqa/ScheduleNew.tsx** (UPDATED)
   - Added date transformation before API call

5. **sqm-frontend2/src/pages/dashboard/qmqa/DraftNew.tsx** (UPDATED)
   - Added date transformation before API call

## Why This Affects All Modules

The `formValidation.ts` file is used by ALL modules that use ReusableForm with calendar fields:
- 5M1E
- MNR
- SQMP
- QMQA
- OGI
- Maintenance

This fix ensures consistent date handling across the entire application.

## Testing Checklist

- [x] TypeScript compilation passes
- [ ] Schedule creation with date selection (no "Invalid date" error)
- [ ] Draft creation with multiple date fields
- [ ] Dates persist after selection
- [ ] Form validation passes
- [ ] Backend receives dates in YYYY-MM-DD format
- [ ] Dates display correctly when viewing/editing records

## Key Takeaway

The issue was NOT in the QMQA-specific code, but in the **global form validation utility** that all modules use. The fix ensures that calendar fields are validated as strings (which is what FormSection stores), not as Date objects.
