# QMQA Field Name Mapping Fix

## Issue Description
Backend validation was failing with "Validation failed" errors for all required fields:
- `site_id is required`
- `supplier_id is required`
- `audit_category_id is required`
- `audit_plan_date is required`
- `sqe_pic_id is required`
- `audit_type_id is required`
- `audit_date is required`
- `checker_id is required`
- `approver_id is required`

## Root Cause
**Field Name Mismatch**: The frontend was sending camelCase field names, but the backend expected snake_case field names.

### Frontend (Form State)
```typescript
{
  mfgSiteId: "...",
  supplierId: "...",
  categoryId: "...",
  auditPlanDate: "2026-02-21T00:00:00.000Z",
  sqePicId: "...",
  auditTypeId: "...",
  actualDate: "...",  // Note: actualDate in frontend
  checkerId: "...",
  approverId: "..."
}
```

### Backend (Expected)
```javascript
{
  site_id: "...",
  supplier_id: "...",
  audit_category_id: "...",
  audit_plan_date: "2026-02-21",
  sqe_pic_id: "...",
  audit_type_id: "...",
  audit_date: "...",  // Note: audit_date in backend
  checker_id: "...",
  approver_id: "..."
}
```

## Solution
Updated the mapper functions in `form-to-dto.mapper.ts` to properly transform field names from camelCase to snake_case.

### Before (Incorrect)
```typescript
export function transformScheduleData(data: Record<string, any>): Record<string, any> {
  return {
    ...data,  // Just spreads the data without transforming field names
    auditPlanDate: formatDate(data.auditPlanDate),
  };
}
```

### After (Correct)
```typescript
export function transformScheduleData(data: Record<string, any>): Record<string, any> {
  return {
    site_id: data.mfgSiteId,
    supplier_id: data.supplierId,
    audit_category_id: data.categoryId,
    audit_plan_date: formatDate(data.auditPlanDate),
    sqe_pic_id: data.sqePicId,
    remarks: data.remarks,
  };
}
```

## Field Name Mappings

### Audit Plan Fields
| Frontend (camelCase) | Backend (snake_case) |
|---------------------|---------------------|
| `mfgSiteId` | `site_id` |
| `supplierId` | `supplier_id` |
| `categoryId` | `audit_category_id` |
| `auditPlanDate` | `audit_plan_date` |
| `sqePicId` | `sqe_pic_id` |
| `auditTypeId` | `audit_type_id` |

### Audit Details Fields
| Frontend (camelCase) | Backend (snake_case) |
|---------------------|---------------------|
| `attentionId` | `attention_id` |
| `picAuditorId` | `pic_auditor_id` |
| `auditRating` | `audit_rating` |
| `dueDate` | `due_date` |
| `actualDate` | `audit_date` ⚠️ |
| `issuedDate` | `issued_date` |

⚠️ **Important**: `actualDate` in frontend maps to `audit_date` in backend (not `actual_date`)

### Approval Fields
| Frontend (camelCase) | Backend (snake_case) |
|---------------------|---------------------|
| `issuerId` | `issuer_id` |
| `checkerId` | `checker_id` |
| `approverId` | `approver_id` |
| `issuerDate` | `issuer_date` |
| `checkerDate` | `checker_date` |
| `approverDate` | `approver_date` |
| `issuerApprovedDate` | `issuer_approved_date` |
| `checkerApprovedDate` | `checker_approved_date` |
| `approverApprovedDate` | `approver_approved_date` |
| `issuerRemarks` | `issuer_remarks` |
| `checkerRemarks` | `checker_remarks` |
| `approverRemarks` | `approver_remarks` |

##