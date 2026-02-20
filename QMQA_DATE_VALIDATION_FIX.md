# QMQA Date Validation Fix

## Date: February 21, 2026

## Issue Description

**Problem**: Date fields in QMQA forms were showing validation errors and disappearing immediately after selection:
- Error: `Invalid date` for `dueDate`, `actualDate`, `issuedDate`
- Error: `Expected number, received string` for `auditRating`

**Affected Forms**:
1. Schedule New (Calendar creation)
2. Audit Details (Audit report creation)

**Error Message**:
```
ReusableForm.tsx:63 [ReusableForm] Validation Failed for qmqa-audit-details
{
  auditRating: {message: 'Expected number, received string', type: 'invalid_type'},
  dueDate: {message: 'Invalid date', type: 'invalid_date'},
  actualDate: {message: 'Invalid date', type: 'invalid_date'},
  issuedDate: {message: 'Invalid date', type: 'invalid_date'}
}
```

---

## Root Cause Analysis

### Date Field Issue
The QMQA validation schema was only accepting `z.string()` for date fields, but the calendar component (CalendarField) returns `Date` objects when a date is selected.

**Before (Incorrect)**:
```typescript
auditPlanDate: z.string().min(1, 'Audit plan date is required'),
dueDate: z.string().min(1, 'Due date is required'),
actualDate: z.string().min(1, 'Actual date is required'),
```

**Issue**: When user selects a date from the calendar picker, it returns a JavaScript `Date` object, not a string. The validation fails because the schema expects a string.

### Audit Rating Issue
The `auditRating` field was defined as `type: "number"` in the config, but the HTML input returns string values. The schema was strictly expecting a number without transformation.

**Before (Incorrect)**:
```typescript
auditRating: z.number().min(0).max(100)
```

**Issue**: HTML number inputs return string values that need to be parsed/transformed to numbers.

---

## Solution

### Pattern from 5M1E Module
Investigated how the 5M1E module handles date fields successfully:

**5M1E Validation Schema** (`5m1e.schema.ts`):
```typescript
implementationDate: z.union([z.string(), z.date()]).refine(val => !!val, 'Implementation Date is required'),
impactDate: z.union([z.string(), z.date()]).refine(val => !!val, "Impact Date is required"),
```

**5M1E Mapper** (`form-to-domain.mapper.ts`):
```typescript
impactDate: procurement.impactDate instanceof Date 
  ? procurement.impactDate.toISOString() 
  : toOptional(procurement.impactDate)
```

**Key Insight**: 5M1E accepts both `Date` objects and strings in validation, then transforms them to ISO strings in the mapper layer.

---

## Implementation

### Updated QMQA Validation Schema

**File**: `sqm-frontend2/src/lib/validations/qmqa.schema.ts`

#### 1. Schedule Schema
```typescript
export const qmqaScheduleSchema = z.object({
  mfgSiteId: z.string().min(1, 'Manufacturing site is required'),
  categoryId: z.string().min(1, 'Category is required'),
  sqePicId: z.string().min(1, 'SQE PIC is required'),
  supplierId: z.string().min(1, 'Supplier is required'),
  auditPlanDate: z.union([z.string(), z.date()]).refine(val => !!val, 'Audit plan date is required'),
  remarks: z.string().optional()
});
```

#### 2. Audit Plan Schema
```typescript
export const qmqaAuditPlanSchema = z.object({
  mfgSiteId: z.string().min(1, 'Manufacturing site is required'),
  supplierId: z.string().min(1, 'Supplier is required'),
  categoryId: z.string().min(1, 'Category is required'),
  auditPlanDate: z.union([z.string(), z.date()]).refine(val => !!val, 'Audit plan date is required'),
  sqePicId: z.string().min(1, 'SQE PIC is required'),
  auditTypeId: z.string().min(1, 'Audit type is required')
});
```

#### 3. Audit Details Schema
```typescript
export const qmqaAuditDetailsSchema = z.object({
  attentionId: z.string().min(1, 'Attention is required'),
  picAuditorId: z.string().min(1, 'PIC Auditor is required'),
  auditRating: z.union([z.string(), z.number()]).transform(val => {
    if (typeof val === 'string') {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error('Invalid rating');
      return num;
    }
    return val;
  }).refine(val => val >= 0 && val <= 100, 'Rating must be between 0 and 100'),
  dueDate: z.union([z.string(), z.date()]).refine(val => !!val, 'Due date is required'),
  actualDate: z.union([z.string(), z.date()]).refine(val => !!val, 'Actual date is required'),
  issuedDate: z.union([z.string(), z.date()]).optional(),
  auditees: z.string().min(1, 'Auditees are required'),
  auditors: z.string().min(1, 'Auditors are required'),
  attendees: z.string().min(1, 'Attendees are required'),
  remarks: z.string().min(1, 'Remarks are required')
});
```

---

## Changes Summary

### Date Fields
- **Changed**: All date fields now accept both `Date` objects and strings using `z.union([z.string(), z.date()])`
- **Validation**: Added `.refine(val => !!val, 'Field is required')` to ensure the value exists
- **Affected Fields**:
  - `auditPlanDate` (Schedule and Audit Plan schemas)
  - `dueDate` (Audit Details schema)
  - `actualDate` (Audit Details schema)
  - `issuedDate` (Audit Details schema - optional)

### Audit Rating Field
- **Changed**: Now accepts both string and number using `z.union([z.string(), z.number()])`
- **Transformation**: Added `.transform()` to convert string to number
- **Validation**: Maintains 0-100 range validation after transformation

---

## Testing Checklist

### Schedule Creation (Calendar)
- [ ] Select audit plan date from calendar picker
- [ ] Date should persist after selection
- [ ] Form should validate successfully
- [ ] No "Invalid date" errors in console

### Audit Details Form
- [ ] Select due date from calendar picker
- [ ] Select actual date from calendar picker
- [ ] Enter audit rating as number (0-100)
- [ ] All fields should persist after selection
- [ ] Form should validate successfully
- [ ] No validation errors in console

### Edge Cases
- [ ] Test with pre-filled date values (edit mode)
- [ ] Test with empty/null date values
- [ ] Test audit rating with decimal values (e.g., 85.5)
- [ ] Test audit rating with string input
- [ ] Test audit rating boundary values (0, 100)

---

## Files Modified

1. `sqm-frontend2/src/lib/validations/qmqa.schema.ts`
   - Updated `qmqaScheduleSchema`
   - Updated `qmqaAuditPlanSchema`
   - Updated `qmqaAuditDetailsSchema`

---

## Next Steps (Future Enhancement)

When implementing QMQA mappers (form-to-domain, domain-to-dto), ensure date transformation:

```typescript
// Example pattern from 5M1E
function formatDate(dateValue: string | Date | undefined): string | undefined {
  if (!dateValue) return undefined;
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Usage in mapper
auditPlanDate: formatDate(formData.auditPlanDate),
dueDate: formatDate(formData.dueDate),
actualDate: formatDate(formData.actualDate),
```

---

## Related Issues

- Table headers not showing (Fixed in QMQA_TABLE_HEADER_AND_DATABASE_FIX.md)
- React key prop warnings (Fixed in QMQA_TABLE_HEADER_AND_DATABASE_FIX.md)
- Supplier incharge implementation (Documented in QMQA_TABLE_HEADER_AND_DATABASE_FIX.md)

---

## References

- 5M1E validation schema: `sqm-frontend2/src/lib/validations/5m1e/schemas.ts`
- 5M1E mapper: `sqm-frontend2/src/lib/mappers/5m1e/form-to-domain.mapper.ts`
- MNR date formatting: `sqm-frontend2/src/lib/mappers/mnr/domain-to-dto.mapper.ts`
- Zod documentation: https://zod.dev/


---

## UPDATE: Date Transformation Implementation (February 21, 2026)

### Problem Identified
After fixing the validation schema, dates were still showing "Invalid date" errors on submission. The validation was passing, but the backend was receiving ISO strings with timestamps instead of YYYY-MM-DD format.

### Root Cause
The FormSection component stores dates as ISO strings (e.g., "2026-02-21T00:00:00.000Z") in the form state, NOT as Date objects. This is by design:

```typescript
// FormSection.tsx - Calendar field handler
onChange={(date) => {
  // Convert back to string (ISO) for form state, or undefined if cleared
  onChange(date ? date.toISOString() : undefined);
}}
```

The validation schema was expecting Date objects (`z.date()`), but the form was storing ISO strings. This caused validation to fail.

### Solution: Correct Validation Schema

Updated the validation schema to accept strings (which is what FormSection actually stores):

**File**: `sqm-frontend2/src/lib/validations/qmqa.schema.ts`

```typescript
// BEFORE (Incorrect - expecting Date objects)
auditPlanDate: z.union([z.string(), z.date()]).refine(val => !!val, 'Audit plan date is required')

// AFTER (Correct - expecting ISO strings from FormSection)
auditPlanDate: z.string().min(1, 'Audit plan date is required')
```

Applied to all date fields:
- `auditPlanDate` (Schedule and Audit Plan schemas)
- `dueDate` (Audit Details schema)
- `actualDate` (Audit Details schema)
- `issuedDate` (Audit Details schema - optional)

### Date Transformation Mapper

Created a mapper to transform ISO strings to YYYY-MM-DD format for the backend:

**File**: `sqm-frontend2/src/lib/mappers/qmqa/form-to-dto.mapper.ts`

```typescript
/**
 * Formats a date value to YYYY-MM-DD string for the API.
 * FormSection stores dates as ISO strings like "2026-02-21T00:00:00.000Z"
 */
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

### Updated Form Submission Handlers

#### 1. ScheduleNew.tsx
```typescript
import { transformScheduleData } from "@/lib/mappers/qmqa/form-to-dto.mapper";

const handleSave = async () => {
  const auditPlanData = auditPlanFormRef.current?.getValues();
  const transformedData = transformScheduleData(auditPlanData);
  await createScheduleMutation.mutateAsync(transformedData);
};
```

#### 2. DraftNew.tsx
```typescript
import { transformQMQAFormData } from "@/lib/mappers/qmqa/form-to-dto.mapper";

const handleSaveDraft = async () => {
  const draftData = { ...auditPlanData, ...auditDetailsData, ...approvalData };
  const transformedData = transformQMQAFormData(draftData);
  await createDraftMutation.mutateAsync(transformedData);
};
```

### Complete Fix Summary

The complete fix involves TWO layers:

1. **Validation Layer**:
   - Accept ISO strings (what FormSection actually stores): `z.string().min(1, 'Date is required')`
   - Allows form validation to pass

2. **Transformation Layer**:
   - Transform ISO strings to YYYY-MM-DD format before API submission
   - Ensures backend receives dates in correct format

### Key Insight

The FormSection component is designed to store dates as ISO strings, not Date objects. This is consistent across all modules (5M1E, MNR, SQMP). The validation schema must match this behavior.

### Files Modified (This Update)
1. `sqm-frontend2/src/lib/validations/qmqa.schema.ts` (UPDATED - changed from z.union to z.string)
2. `sqm-frontend2/src/lib/mappers/qmqa/form-to-dto.mapper.ts` (UPDATED - added comment about ISO strings)
3. `sqm-frontend2/src/pages/dashboard/qmqa/ScheduleNew.tsx` (UPDATED)
4. `sqm-frontend2/src/pages/dashboard/qmqa/DraftNew.tsx` (UPDATED)

### Testing Checklist (Updated)
- [x] TypeScript compilation passes
- [ ] Schedule creation with date selection
- [ ] Draft creation with multiple date fields
- [ ] Dates persist after save
- [ ] Backend receives dates in YYYY-MM-DD format
- [ ] No "Invalid date" errors on submission
- [ ] Dates display correctly when viewing/editing records

### Pattern Consistency
This implementation now correctly matches the FormSection behavior:
- FormSection stores dates as ISO strings
- Validation accepts ISO strings
- Mapper transforms ISO strings to YYYY-MM-DD for backend
