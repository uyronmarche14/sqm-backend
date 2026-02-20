# QMQA vs 5M1E Date Implementation Comparison

## Date: February 21, 2026

## Summary

Both QMQA and 5M1E use the **same pattern** for date field configuration. The issue was not in the config, but in the validation schema.

---

## Config Layer (Form Configuration)

### 5M1E Date Fields

**File**: `sqm-frontend2/src/pages/dashboard/5m1e/5m1e-config/index.ts`

```typescript
// Example 1: Date Created (Disabled/Auto-generated)
{
  label: "Date Created:",
  name: "dateCreated",
  type: "calendar",
  disabled: true,
}

// Example 2: Implementation Date (Required, User Input)
{
  label: "Implementation Date:",
  name: "implementationDate", 
  type: "calendar",
  required: true,
}

// Example 3: Impact Date (Required, User Input)
{
  label: "Impact Date:",
  name: "impactDate",
  type: "calendar",
  required: true,
}

// Example 4: Date Approved (Disabled, Auto-generated)
{
  label: "Date Approved:",
  name: "procurementDateApproved",
  type: "calendar",
  disabled: true,
  placeholder: "Auto-generated on approval",
}
```

### QMQA Date Fields

**File**: `sqm-frontend2/src/pages/dashboard/qmqa/qmqa-config/index.ts`

```typescript
// Example 1: Created Date (Disabled/Auto-generated)
{
  label: "Created Date:",
  name: "createdDate",
  type: "calendar",
  disabled: true,
  placeholder: "Auto-timestamp",
  description: "Auto-set when draft is first created",
}

// Example 2: Audit Plan Date (Required, User Input)
{
  label: "Audit Plan Date:",
  name: "auditPlanDate",
  type: "calendar",
  required: true,
}

// Example 3: Due Date (Required, User Input)
{
  label: "Due Date:",
  name: "dueDate",
  type: "calendar",
  required: true,
  description: "Deadline for supplier response",
}

// Example 4: Actual Date (Required, User Input)
{
  label: "Actual Date:",
  name: "actualDate",
  type: "calendar",
  required: true,
  description: "Actual audit execution date",
}

// Example 5: Issued Date (Disabled, Auto-generated)
{
  label: "Issued Date:",
  name: "issuedDate",
  type: "calendar",
  disabled: true,
  description: "Auto-populated on issuance",
}
```

### ✅ Conclusion: Config Layer is IDENTICAL

Both modules use:
- `type: "calendar"` for all date fields
- `required: true` for mandatory fields
- `disabled: true` for auto-generated fields
- `placeholder` and `description` for user guidance

---

## Validation Layer (Zod Schemas)

### 5M1E Validation

**File**: `sqm-frontend2/src/lib/validations/5m1e/schemas.ts`

```typescript
export const supplierSectionSchema = z.object({
  pic: z.string().min(1, 'PIC is required'),
  vendorId: z.string().optional(),
  implementationDate: z.union([z.string(), z.date()]).refine(val => !!val, 'Implementation Date is required'),
  firstLotInvoice: z.string().optional(),
});

export const procurementSectionSchema = z.object({
  model: z.string().min(1, "Model is required"),
  costReduction: z.boolean().optional(),
  impactDate: z.union([z.string(), z.date()]).refine(val => !!val, "Impact Date is required"),
  mpdApprover: z.string().min(1, "MPD Approver is required"),
});
```

**Key Pattern**: `z.union([z.string(), z.date()]).refine(val => !!val, 'Error message')`

### QMQA Validation (BEFORE FIX)

**File**: `sqm-frontend2/src/lib/validations/qmqa.schema.ts`

```typescript
// ❌ BEFORE (Incorrect - Only accepts strings)
export const qmqaScheduleSchema = z.object({
  auditPlanDate: z.string().min(1, 'Audit plan date is required'),
  // ...
});

export const qmqaAuditDetailsSchema = z.object({
  dueDate: z.string().min(1, 'Due date is required'),
  actualDate: z.string().min(1, 'Actual date is required'),
  // ...
});
```

**Problem**: Only accepts strings, but calendar component returns `Date` objects.

### QMQA Validation (AFTER FIX)

```typescript
// ✅ AFTER (Correct - Accepts both Date and string)
export const qmqaScheduleSchema = z.object({
  auditPlanDate: z.union([z.string(), z.date()]).refine(val => !!val, 'Audit plan date is required'),
  // ...
});

export const qmqaAuditDetailsSchema = z.object({
  dueDate: z.union([z.string(), z.date()]).refine(val => !!val, 'Due date is required'),
  actualDate: z.union([z.string(), z.date()]).refine(val => !!val, 'Actual date is required'),
  issuedDate: z.union([z.string(), z.date()]).optional(),
  // ...
});
```

**Solution**: Now matches 5M1E pattern - accepts both `Date` objects and strings.

---

## Mapper Layer (Data Transformation)

### 5M1E Mapper

**File**: `sqm-frontend2/src/lib/mappers/5m1e/form-to-domain.mapper.ts`

```typescript
// Transform Date objects to ISO strings for backend
implementationDate: issuance.implementationDate || existingRecord?.implementationDate || new Date().toISOString(),

impactDate: procurement.impactDate instanceof Date 
  ? procurement.impactDate.toISOString() 
  : toOptional(procurement.impactDate),
```

**Pattern**: Check if value is `Date` object, convert to ISO string if needed.

### QMQA Mapper (TODO - Not Yet Implemented)

When QMQA mappers are created, they should follow the same pattern:

```typescript
// Recommended implementation for QMQA mappers
function formatDate(dateValue: string | Date | undefined): string | undefined {
  if (!dateValue) return undefined;
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Usage in mapper
export function mapQMQAFormToDomain(formData: any): QMQARecord {
  return {
    auditPlanDate: formatDate(formData.auditPlanDate),
    dueDate: formatDate(formData.dueDate),
    actualDate: formatDate(formData.actualDate),
    issuedDate: formatDate(formData.issuedDate),
    // ...
  };
}
```

---

## Complete Date Field Lifecycle

### 1. User Interaction
```
User selects date from calendar picker
↓
Calendar component returns JavaScript Date object
```

### 2. Form State
```
Form state stores: Date object
Example: new Date('2026-02-21')
```

### 3. Validation (Zod Schema)
```
Schema accepts: z.union([z.string(), z.date()])
✅ Validates Date object successfully
✅ Also accepts string format for flexibility
```

### 4. Mapper (Form → Domain)
```
Mapper transforms:
Date object → ISO string (YYYY-MM-DD)
Example: '2026-02-21'
```

### 5. API Request
```
Backend receives: String in YYYY-MM-DD format
Example: { auditPlanDate: '2026-02-21' }
```

### 6. Database Storage
```
SQL Server stores: datetime or date type
Example: 2026-02-21 00:00:00
```

---

## Key Differences Between Modules

| Aspect | 5M1E | QMQA |
|--------|------|------|
| **Config** | ✅ `type: "calendar"` | ✅ `type: "calendar"` |
| **Validation** | ✅ `z.union([z.string(), z.date()])` | ✅ Fixed to match 5M1E |
| **Mapper** | ✅ Implemented | ⚠️ TODO (not yet needed) |
| **Status** | ✅ Working | ✅ Fixed |

---

## Testing Results

### Before Fix
```
❌ Error: Invalid date
❌ Date disappears after selection
❌ Validation fails immediately
```

### After Fix
```
✅ Date persists after selection
✅ Validation passes
✅ Form can be submitted
```

---

## Best Practices for Date Fields

### 1. Config Layer
```typescript
{
  label: "Date Field:",
  name: "dateField",
  type: "calendar",        // Always use "calendar" type
  required: true,          // Add if mandatory
  disabled: false,         // true for auto-generated dates
  placeholder: "Select date",
  description: "Helper text"
}
```

### 2. Validation Layer
```typescript
// Always accept both Date and string
dateField: z.union([z.string(), z.date()]).refine(val => !!val, 'Date is required')

// For optional dates
dateField: z.union([z.string(), z.date()]).optional()
```

### 3. Mapper Layer
```typescript
// Always transform to ISO string for backend
dateField: dateValue instanceof Date 
  ? dateValue.toISOString().split('T')[0]
  : dateValue
```

---

## Conclusion

The QMQA date implementation now **matches 5M1E exactly**:
- ✅ Config uses `type: "calendar"`
- ✅ Validation accepts both `Date` and `string`
- ✅ Ready for mapper implementation when needed

The issue was solely in the validation schema, which has been corrected to follow the 5M1E pattern.
