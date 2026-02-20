# QMQA Frontend-Backend Connection Fix

## Issue Summary
The frontend was unable to connect to the backend QMQA API, showing "No Records Found" in the table views. Additionally, the table headers were not displaying the correct columns as required by the user.

## Problems Identified

### 1. API Endpoint Mismatch
**Frontend Expected:**
- `/api/qmqa` for list operations
- `/api/qmqa/:id` for CRUD operations
- `/api/qmqa/:id/submit`, `/api/qmqa/:id/approve`, etc. for workflow actions

**Backend Provided:**
- `/api/qmqa/records` for list operations
- `/api/qmqa/records/:id` for CRUD operations
- `/api/qmqa/records/:id/submit`, `/api/qmqa/records/:id/approve`, etc. for workflow actions

### 2. Authentication Middleware Import Error
The QMQA routes were importing `authenticate` but the middleware exports `authenticateToken`.

### 3. Incorrect Table Column Headers
The table was showing generic columns (Control No, Supplier, Audit Type, Category, etc.) instead of the required columns:
- ACTION
- CONTROL NO
- SITE NAME
- SUPPLIER NAME
- ISSUER NAME
- ISSUED DATE
- ENCODER NAME
- NEXT APPROVER

## Fixes Applied

### 1. Updated Frontend API Endpoints
**File:** `sqm-frontend2/src/constants/index.ts`

Changed all QMQA endpoints to match backend routes:
```typescript
qmqa: {
  // Records (Full audit reports)
  list: '/api/qmqa/records',           // was: '/api/qmqa'
  create: '/api/qmqa/records',         // was: '/api/qmqa'
  get: (id) => `/api/qmqa/records/${id}`,  // was: `/api/qmqa/${id}`
  update: (id) => `/api/qmqa/records/${id}`,
  delete: (id) => `/api/qmqa/records/${id}`,
  
  // Workflow actions
  submit: (id) => `/api/qmqa/records/${id}/submit`,
  approve: (id) => `/api/qmqa/records/${id}/approve`,
  reject: (id) => `/api/qmqa/records/${id}/reject`,
  issue: (id) => `/api/qmqa/records/${id}/issue`,
  cancel: (id) => `/api/qmqa/records/${id}/cancel`,
  
  // Added missing endpoints
  search: '/api/qmqa/search',
  calendar: '/api/qmqa/calendar',
  achievement: '/api/qmqa/achievement',
  batchSubmit: '/api/qmqa/batch/submit',
  batchApprove: '/api/qmqa/batch/approve',
  batchReject: '/api/qmqa/batch/reject',
  batchIssue: '/api/qmqa/batch/issue',
  uploadAttachment: (id) => `/api/qmqa/records/${id}/attachments`,
  downloadAttachment: (attachmentId) => `/api/qmqa/attachments/${attachmentId}`,
}
```

### 2. Fixed Backend Route Authentication
**File:** `sqm-backend/src/routes/qmqa.routes.js`

Changed all instances of `authenticate` to `authenticateToken`:
```javascript
// Before
import { authenticate } from '../middleware/auth.middleware.js';
router.post('/schedules', authenticate, qmqaController.createSchedule);

// After
import { authenticateToken } from '../middleware/auth.middleware.js';
router.post('/schedules', authenticateToken, qmqaController.createSchedule);
```

### 3. Fixed Table Column Headers
**File:** `sqm-frontend2/src/pages/dashboard/qmqa/components/QMQAListView.tsx`

Updated the default columns configuration to match user requirements:
```typescript
const defaultColumns = [
  { accessorKey: 'controlNo', header: 'CONTROL NO' },
  { accessorKey: 'siteName', header: 'SITE NAME' },
  { accessorKey: 'supplierName', header: 'SUPPLIER NAME' },
  { accessorKey: 'issuerName', header: 'ISSUER NAME' },
  { accessorKey: 'issuedDate', header: 'ISSUED DATE' },
  { accessorKey: 'encoderName', header: 'ENCODER NAME' },
  { accessorKey: 'nextApprover', header: 'NEXT APPROVER' }
];
```

### 4. Updated Data Mapping
**File:** `sqm-frontend2/src/hooks/qmqa/use-qmqa-records.hook.ts`

Added proper field mapping from backend snake_case to frontend camelCase:
```typescript
return records.map((record: any) => {
  // Determine next approver based on status
  let nextApprover = '';
  const status = record.request_status || record.status;
  
  if (status === 'DR' || status === 'DRAFT') {
    nextApprover = record.checker_name || '';
  } else if (status === 'AA' || status === 'AWAITING_APPROVAL') {
    nextApprover = record.approver_name || '';
  } else if (status === 'AP' || status === 'APPROVED') {
    nextApprover = record.issuer_name || '';
  } else if (status === 'IS' || status === 'ISSUED') {
    nextApprover = 'Supplier';
  } else if (status === 'WI' || status === 'WITH_INITIAL_REPORT' || 
             status === 'WF' || status === 'WITH_FINAL_REPORT') {
    nextApprover = record.checker_name || '';
  } else if (status === 'RA' || status === 'RESPONSE_AWAITING_APPROVAL') {
    nextApprover = record.approver_name || '';
  } else {
    nextApprover = '-';
  }
  
  return {
    ...record,
    id: record.qmqa_id || record.id,
    controlNo: record.control_no || record.controlNo || '',
    siteName: record.site_name || record.siteName || '',
    supplierName: record.supplier_name || record.supplierName || '',
    issuerName: record.issuer_name || record.issuerName || '',
    issuedDate: record.issued_date || record.issuedDate || '',
    encoderName: record.encoder_name || record.encoderName || '',
    nextApprover: nextApprover,
  };
});
```

### 5. Added Encoder Name to Backend Query
**File:** `sqm-backend/src/repositories/queries/qmqa.queries.js`

Added encoder JOIN and field to the FIND_ALL_RECORDS query:
```sql
-- Encoder
q.encoder_id,
enc.full_name as encoder_name,

...

LEFT JOIN dbo.USERS enc ON q.encoder_id = enc.user_id
```

## Backend Server Status
✅ Backend server is running on port 3001
✅ Database connection is healthy
✅ All QMQA routes are properly registered at `/api/qmqa`

## Table Column Mapping

| Column Header | Database Field | Frontend Field | Logic |
|--------------|----------------|----------------|-------|
| ACTION | - | - | Edit/View/Delete buttons |
| CONTROL NO | `control_no` | `controlNo` | Direct mapping |
| SITE NAME | `site_name` | `siteName` | From MFG_SITES JOIN |
| SUPPLIER NAME | `supplier_name` | `supplierName` | From SUPPLIERS JOIN |
| ISSUER NAME | `issuer_name` | `issuerName` | From USERS JOIN (issuer) |
| ISSUED DATE | `issued_date` | `issuedDate` | Direct mapping |
| ENCODER NAME | `encoder_name` | `encoderName` | From USERS JOIN (encoder) |
| NEXT APPROVER | Calculated | `nextApprover` | Based on status logic |

## Next Approver Logic

The "Next Approver" column is dynamically calculated based on the current status:

- **DRAFT** → Checker
- **AWAITING_APPROVAL** → Approver
- **APPROVED** → Issuer
- **ISSUED** → Supplier
- **WITH_INITIAL_REPORT / WITH_FINAL_REPORT** → Checker
- **RESPONSE_AWAITING_APPROVAL** → Approver
- **Other statuses** → "-"

## Testing Checklist

### Backend API Endpoints (All require authentication)
- [ ] `GET /api/qmqa/records` - List all audit reports
- [ ] `POST /api/qmqa/records` - Create new audit report
- [ ] `GET /api/qmqa/records/:id` - Get audit report by ID
- [ ] `PUT /api/qmqa/records/:id` - Update audit report
- [ ] `DELETE /api/qmqa/records/:id` - Delete audit report
- [ ] `POST /api/qmqa/records/:id/submit` - Submit for approval
- [ ] `POST /api/qmqa/records/:id/approve` - Approve audit
- [ ] `POST /api/qmqa/records/:id/reject` - Reject audit
- [ ] `POST /api/qmqa/records/:id/issue` - Issue to supplier
- [ ] `POST /api/qmqa/records/:id/cancel` - Cancel audit

### Frontend Views
- [ ] Draft view shows records with status=DRAFT
- [ ] Awaiting Approval view shows records with status=AWAITING_APPROVAL
- [ ] Approved view shows records with status=APPROVED
- [ ] Rejected view shows records with status=REJECTED
- [ ] Issued view shows records with status=ISSUED
- [ ] With Initial Report view shows records with status=WITH_INITIAL_REPORT
- [ ] With Final Report view shows records with status=WITH_FINAL_REPORT

### Table Display
- [ ] ACTION column shows Edit/View/Delete buttons
- [ ] CONTROL NO displays correctly
- [ ] SITE NAME displays correctly
- [ ] SUPPLIER NAME displays correctly
- [ ] ISSUER NAME displays correctly
- [ ] ISSUED DATE displays correctly
- [ ] ENCODER NAME displays correctly
- [ ] NEXT APPROVER displays correctly based on status

## Next Steps

1. **Test API Connection:**
   - Login to the frontend
   - Navigate to QMQA > Draft view
   - Verify that records are displayed with correct column headers
   - Check browser console for any API errors

2. **Verify Table Headers:**
   - Confirm all 7 columns are displayed in the correct order
   - Verify ACTION column shows appropriate buttons
   - Check that data is properly aligned with headers

3. **Test CRUD Operations:**
   - Create a new QMQA draft
   - Edit an existing draft
   - Submit for approval
   - Verify workflow transitions

4. **Check Row Level Security:**
   - Verify that users only see records they have permission to access
   - Test with different user roles (Admin, TIP, Supplier)

## Files Modified

### Frontend
- `sqm-frontend2/src/constants/index.ts` - Updated QMQA API endpoints
- `sqm-frontend2/src/pages/dashboard/qmqa/components/QMQAListView.tsx` - Updated table columns
- `sqm-frontend2/src/hooks/qmqa/use-qmqa-records.hook.ts` - Updated data mapping with next approver logic

### Backend
- `sqm-backend/src/routes/qmqa.routes.js` - Fixed authentication middleware import
- `sqm-backend/src/repositories/queries/qmqa.queries.js` - Added encoder_name field to query

## Related Documentation
- Backend Implementation: `sqm-backend/QMQA_BACKEND_INTEGRATION_COMPLETE.md`
- Task Summaries: 
  - `sqm-backend/QMQA_TASKS_12_13_14_SUMMARY.md`
  - `sqm-backend/QMQA_TASKS_10_11_SUMMARY.md`
  - `sqm-backend/QMQA_TASKS_7_8_9_SUMMARY.md`
  - `sqm-backend/QMQA_TASKS_5_6_SUMMARY.md`
  - `sqm-backend/QMQA_TASKS_3_4_SUMMARY.md`
  - `sqm-backend/QMQA_TASK_2_SUMMARY.md`
  - `sqm-backend/QMQA_TASK_1_VERIFICATION.md`
