# QMQA Field Mapping and Endpoint Fix

## Issue Description
Backend validation was failing with errors like:
- `site_id is required`
- `supplier_id is required`
- `audit_category_id is required`
- `audit_type_id is required`
- `audit_date is required`
- `checker_id is required`
- `approver_id is required`

Even though the frontend was sending these values, the backend couldn't find them.

## Root Causes

### 1. Field Name Mismatch (camelCase vs snake_case)
**Problem**: Frontend was sending camelCase field names, but backend expected snake_case.

**Frontend (before fix)**:
```typescript
{
  mfgSiteId: "123",
  supplierId: "456",
  categoryId: "789",
  auditPlanDate: "2026-02-21",
  sqePicId: "abc"
}
```

**Backend expects**:
```javascript
{
  site_id: "123",
  supplier_id: "456",
  audit_category_id: "789",
  audit_plan_date: "2026-02-21",
  sqe_pic_id: "abc"
}
```

### 2. Wrong Endpoint Usage
**Problem**: Both schedule creation and draft creation were using the same generic endpoint.

- `useCreateQMQASchedule` was calling `/api/qmqa` (generic)
- `useCreateQMQADraft` was calling `/api/qmqa` (generic)
- Both should use specific endpoints:
  - Schedules: `/api/qmqa/schedules`
  - Records: `/api/qmqa/records`

## Solution Implemented

### 1. Updated Form-to-DTO Mapper
**File**: `sqm-frontend2/src/lib/mappers/qmqa/form-to-dto.mapper.ts`

#### Schedule Transformation
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

#### Full Record Transformation
```typescript
export function transformQMQAFormData(data: Record<string, any>): Record<string, any> {
  const transformed: Record<string, any> = {};
  
  // Audit Plan fields (camelCase → snake_case)
  if (data.mfgSiteId) transformed.site_id = data.mfgSiteId;
  if (data.supplierId) transformed.supplier_id = data.supplierId;
  if (data.categoryId) transformed.audit_category_id = data.categoryId;
  if (data.auditPlanDate) transformed.audit_plan_date = formatDate(data.auditPlanDate);
  if (data.sqePicId) transformed.sqe_pic_id = data.sqePicId;
  if (data.auditTypeId) transformed.audit_type_id = data.auditTypeId;
  
  // Audit Details fields
  if (data.attentionId) transformed.attention_id = data.attentionId;
  if (data.picAuditorId) transformed.pic_auditor_id = data.picAuditorId;
  if (data.auditRating !== undefined) transformed.audit_rating = data.auditRating;
  if (data.dueDate) transformed.due_date = formatDate(data.dueDate);
  if (data.actualDate) transformed.audit_date = formatDate(data.actualDate);
  if (data.issuedDate) transformed.issued_date = formatDate(data.issuedDate);
  if (data.auditees) transformed.auditees = data.auditees;
  if (data.auditors) transformed.auditors = data.auditors;
  if (data.attendees) transformed.attendees = data.attendees;
  if (data.remarks) transformed.remarks = data.remarks;
  
  // Approval fields
  if (data.issuerId) transformed.issuer_id = data.issuerId;
  if (data.checkerId) transformed.checker_id = data.checkerId;
  if (data.approverId) transformed.approver_id = data.approverId;
  
  // Schedule-related fields
  if (data.scheduleId) {
    transformed.from_schedule = true;
    transformed.schedule_id = data.scheduleId;
  } else {
    transformed.from_schedule = false;
  }
  
  return transformed;
}
```

### 2. Updated Workflow Actions Hooks
**File**: `sqm-frontend2/src/hooks/qmqa/workflow-actions.hook.ts`

#### Schedule Creation Hook
```typescript
export const useCreateQMQASchedule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<QMQASchedule>) => {
      // Use the schedules endpoint specifically
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/qmqa/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create schedule');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qmqa-schedules'] });
      toast({ title: 'Success', description: 'Schedule created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });
};
```

#### Draft Creation Hook
```typescript
export const useCreateQMQADraft = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<QMQARecord>) => {
      // Use the records endpoint specifically
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/qmqa/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create draft');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qmqa-records'] });
      toast({ title: 'Success', description: 'Draft created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });
};
```

## Field Mapping Reference

### Frontend → Backend Field Names

| Frontend (camelCase) | Backend (snake_case) | Description |
|---------------------|---------------------|-------------|
| `mfgSiteId` | `site_id` | Manufacturing site ID |
| `supplierId` | `supplier_id` | Supplier ID |
| `categoryId` | `audit_category_id` | Audit category ID |
| `auditPlanDate` | `audit_plan_date` | Planned audit date |
| `sqePicId` | `sqe_pic_id` | SQE person in charge ID |
| `auditTypeId` | `audit_type_id` | Audit type ID |
| `attentionId` | `attention_id` | Supplier contact ID |
| `picAuditorId` | `pic_auditor_id` | PIC auditor ID |
| `auditRating` | `audit_rating` | Audit rating (0-100) |
| `dueDate` | `due_date` | Response due date |
| `actualDate` | `audit_date` | Actual audit date |
| `issuedDate` | `issued_date` | Date issued to supplier |
| `issuerId` | `issuer_id` | Issuer user ID |
| `checkerId` | `checker_id` | Checker user ID |
| `approverId` | `approver_id` | Approver user ID |
| `scheduleId` | `schedule_id` | Schedule reference ID |

## Backend Validation Requirements

### Schedule Creation (POST /api/qmqa/schedules)
**Required fields**:
- `site_id`
- `supplier_id`
- `audit_category_id`
- `audit_plan_date`
- `sqe_pic_id`

### Draft Creation - From Schedule (POST /api/qmqa/records)
**Required fields**:
- `schedule_id`
- `audit_type_id`
- `audit_date`
- `checker_id`
- `approver_id`

### Draft Creation - Direct (POST /api/qmqa/records)
**Required fields**:
- `site_id`
- `supplier_id`
- `audit_category_id`
- `audit_plan_date`
- `sqe_pic_id`
- `audit_type_id`
- `audit_date`
- `checker_id`
- `approver_id`

## Testing Checklist

- [x] Schedule creation sends correct field names
- [x] Schedule creation uses `/api/qmqa/schedules` endpoint
- [x] Draft creation sends correct field names
- [x] Draft creation uses `/api/qmqa/records` endpoint
- [x] Date fields are formatted as YYYY-MM-DD
- [x] No TypeScript errors
- [ ] Backend validation passes for schedule creation
- [ ] Backend validation passes for draft creation
- [ ] Schedule with P- prefix is created correctly
- [ ] Draft without P- prefix is created correctly
- [ ] Draft from schedule retains P- prefix

## Files Modified

1. **sqm-frontend2/src/lib/mappers/qmqa/form-to-dto.mapper.ts**
   - Updated `transformScheduleData` to map camelCase → snake_case
   - Updated `transformQMQAFormData` to map all fields correctly

2. **sqm-frontend2/src/hooks/qmqa/workflow-actions.hook.ts**
   - Updated `useCreateQMQASchedule` to use `/api/qmqa/schedules` endpoint
   - Updated `useCreateQMQADraft` to use `/api/qmqa/records` endpoint

## Related Documentation
- QMQA_CALENDAR_FIELD_COMPLETE_FIX.md
- QMQA_DATE_VALIDATION_FINAL_FIX.md
- QMQA_TABLE_HEADER_AND_DATABASE_FIX.md
- QMQA_BACKEND_INTEGRATION_COMPLETE.md
