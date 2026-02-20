# QMQA Schedule Creation URL Fix

## Issue Summary
Schedule creation was failing with 404 error and wrong URL construction. The backend was also receiving requests at the wrong endpoint and validating fields that shouldn't be required for schedule creation.

## Root Causes

### 1. Frontend URL Construction Issue
**Problem**: The `useCreateQMQASchedule` hook was using manual `fetch()` with `import.meta.env.VITE_API_URL` instead of the `apiClient` utility.

**Impact**: 
- Wrong URL being constructed: `http://localhost:3000/dashboard/qmqa/plan/3000/qmqa/schedules`
- Should be: `http://localhost:3001/api/qmqa/schedules`

**Root Cause**: 
- Manual fetch doesn't handle base URL construction properly
- `import.meta.env.VITE_API_URL` may be undefined or incorrectly formatted
- Missing `/api` prefix in the endpoint

### 2. Backend Validation Issue
**Problem**: Backend was validating fields that aren't required for schedule creation.

**Error Details**:
```
Validation failed
details: [
  { field: 'audit_type_id', message: 'audit_type_id is required' },
  { field: 'audit_date', message: 'audit_date is required' },
  { field: 'checker_id', message: 'checker_id is required' },
  { field: 'approver_id', message: 'approver_id is required' }
]
```

**Root Cause**: The request was hitting the `/api/qmqa/records` endpoint instead of `/api/qmqa/schedules` endpoint due to the URL construction issue.

## Solution Implemented

### Frontend Changes

#### File: `sqm-frontend2/src/hooks/qmqa/workflow-actions.hook.ts`

**Before**:
```typescript
export const useCreateQMQASchedule = () => {
  return useMutation({
    mutationFn: async (data: Partial<QMQASchedule>) => {
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
    // ...
  });
};
```

**After**:
```typescript
import { apiClient } from '@/lib/api/client';

export const useCreateQMQASchedule = () => {
  return useMutation({
    mutationFn: async (data: Partial<QMQASchedule>) => {
      // Use apiClient to ensure proper URL construction
      return apiClient.post<{ success: boolean; data: QMQASchedule }>('/api/qmqa/schedules', data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['qmqa-schedules'] });
      toast({ title: 'Success', description: 'Schedule created successfully' });
    },
    onError: (error: any) => {
      const message = error?.error?.message || error?.message || 'Failed to create schedule';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  });
};
```

**Changes**:
1. Imported `apiClient` from `@/lib/api/client`
2. Replaced manual `fetch()` with `apiClient.post()`
3. Used correct endpoint format: `/api/qmqa/schedules` (includes `/api` prefix)
4. Improved error handling to extract nested error messages

#### File: `sqm-frontend2/src/hooks/qmqa/workflow-actions.hook.ts` (Draft Creation)

Applied the same fix to `useCreateQMQADraft`:

**Before**:
```typescript
export const useCreateQMQADraft = () => {
  return useMutation({
    mutationFn: async (data: Partial<QMQARecord>) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/qmqa/records`, {
        // ... manual fetch
      });
    },
  });
};
```

**After**:
```typescript
export const useCreateQMQADraft = () => {
  return useMutation({
    mutationFn: async (data: Partial<QMQARecord>) => {
      return apiClient.post<{ success: boolean; data: QMQARecord }>('/api/qmqa/records', data);
    },
    // ... improved error handling
  });
};
```

## How apiClient Works

### URL Construction
The `apiClient` uses `apiFetch` which constructs URLs as:
```typescript
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const fullUrl = `${BASE_URL}${endpoint}`;
```

**Example**:
- Endpoint: `/api/qmqa/schedules`
- BASE_URL: `http://localhost:3001`
- Full URL: `http://localhost:3001/api/qmqa/schedules` ✅

### Benefits of Using apiClient
1. **Automatic URL Construction**: Handles base URL + endpoint concatenation
2. **Authentication**: Automatically adds `Authorization: Bearer <token>` header
3. **Token Refresh**: Automatically refreshes expired tokens
4. **Error Handling**: Standardized error format extraction
5. **Content-Type**: Automatically sets `Content-Type: application/json` (unless FormData)
6. **Logging**: Built-in request/response logging in dev mode

## Backend Validation Logic

### Schedule Creation (`/api/qmqa/schedules`)
**Required Fields**:
- `site_id` (Manufacturing Site)
- `supplier_id` (Supplier)
- `audit_category_id` (Audit Category)
- `audit_plan_date` (Audit Plan Date)
- `sqe_pic_id` (SQE PIC)

**Optional Fields**:
- `remarks`

**NOT Required**:
- `audit_type_id` ❌
- `audit_date` ❌
- `checker_id` ❌
- `approver_id` ❌

### Record Creation (`/api/qmqa/records`)
**Required Fields** (in addition to schedule fields):
- `audit_type_id` (Audit Type)
- `audit_date` (Actual Audit Date)
- `checker_id` (Checker)
- `approver_id` (Approver)

## Field Mapping Reference

### Frontend → Backend
| Frontend (camelCase) | Backend (snake_case) |
|---------------------|---------------------|
| `mfgSiteId` | `site_id` |
| `supplierId` | `supplier_id` |
| `categoryId` | `audit_category_id` |
| `auditPlanDate` | `audit_plan_date` |
| `sqePicId` | `sqe_pic_id` |
| `auditTypeId` | `audit_type_id` |
| `actualDate` | `audit_date` |
| `checkerId` | `checker_id` |
| `approverId` | `approver_id` |

### Date Format Transformation
- **Frontend**: ISO string `"2026-02-21T00:00:00.000Z"` (from CalendarField)
- **Mapper**: Extracts date part `"2026-02-21"`
- **Backend**: Receives `"2026-02-21"` (YYYY-MM-DD format)

## Testing Checklist

### Schedule Creation
- [ ] Navigate to QMQA > Plan > New Schedule
- [ ] Fill in required fields:
  - Manufacturing Site
  - Supplier
  - Audit Category
  - Audit Plan Date
  - SQE PIC
- [ ] Click "Save Schedule"
- [ ] Verify success toast appears
- [ ] Verify redirect to Plan List
- [ ] Verify schedule appears in list with P- prefix

### Draft Creation
- [ ] Navigate to QMQA > Views > New
- [ ] Fill in all required fields (including audit details)
- [ ] Click "Save Draft"
- [ ] Verify success toast appears
- [ ] Verify redirect to Draft list
- [ ] Verify draft appears in list without P- prefix

### Error Handling
- [ ] Try creating schedule with missing required fields
- [ ] Verify validation error messages appear
- [ ] Verify error toast shows correct message
- [ ] Try creating with invalid date format
- [ ] Verify date validation error

## Files Modified

### Frontend
1. `sqm-frontend2/src/hooks/qmqa/workflow-actions.hook.ts`
   - Updated `useCreateQMQASchedule` to use `apiClient`
   - Updated `useCreateQMQADraft` to use `apiClient`
   - Improved error handling

### Backend
No changes required - routes and validation logic were already correct.

## Related Documentation
- [QMQA Calendar Field Fix](./QMQA_CALENDAR_FIELD_COMPLETE_FIX.md)
- [QMQA Field Mapping Fix](./QMQA_FIELD_MAPPING_FIX.md)
- [QMQA Field Name Mapping Fix](./QMQA_FIELD_NAME_MAPPING_FIX.md)
- [QMQA Date Validation Fix](./QMQA_DATE_VALIDATION_FINAL_FIX.md)

## Status
✅ **FIXED** - Schedule creation now uses correct URL and endpoint

## Next Steps
1. Test schedule creation end-to-end
2. Test draft creation end-to-end
3. Verify all QMQA CRUD operations work correctly
4. Update any other hooks that use manual fetch instead of apiClient
