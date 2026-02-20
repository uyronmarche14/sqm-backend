# QMQA Schedule Creation Debugging Guide

## Problem Summary
Schedule creation is failing with database error "Invalid object name 'SITE'". Backend logs show "From Schedule: false" indicating the request is hitting `/api/qmqa/records` instead of `/api/qmqa/schedules`.

## What We Fixed So Far

### 1. Frontend URL Construction ✅
- Changed from manual `fetch()` to `apiClient.post('/api/qmqa/schedules', data)`
- apiClient properly constructs URL: `http://localhost:3001/api/qmqa/schedules`

### 2. Backend Table Names ✅
- Fixed validation queries in `qmqaService.createSchedule()`:
  - `SITE` → `MFG_SITES`
  - `SUPPLIER` → `SUPPLIERS`
  - `DEFECT_CATEGORY` → `AUDITCATEGORY`

### 3. Field Name Mapping ✅
- Frontend sends camelCase, backend expects snake_case
- Mapper transforms: `mfgSiteId` → `site_id`, etc.

## Current Issue

Backend logs show:
```
📥 [QMQA-SERVICE] Create Audit Report Request
📦 From Schedule: false
```

This means the request is hitting `qmqaService.createRecord()` instead of `qmqaService.createSchedule()`.

## Debugging Steps

### Step 1: Verify Frontend Endpoint
**Action**: Check browser Network tab
- Open DevTools → Network tab
- Click "Save Schedule" button
- Look for the POST request
- **Expected**: `POST http://localhost:3001/api/qmqa/schedules`
- **If different**: There's a frontend routing issue

### Step 2: Verify Backend Route Mapping
**File**: `sqm-backend/src/routes/qmqa.routes.js`
```javascript
router.post('/schedules', authenticateToken, qmqaController.createSchedule);
router.post('/records', authenticateToken, qmqaController.createRecord);
```
- Routes are correctly defined
- `/schedules` → `createSchedule` controller → `qmqaService.createSchedule()`
- `/records` → `createRecord` controller → `qmqaService.createRecord()`

### Step 3: Check for Browser Cache
**Action**: Hard refresh the frontend
```bash
# In browser
Ctrl + Shift + R (Linux/Windows)
Cmd + Shift + R (Mac)
```

### Step 4: Restart Frontend Dev Server
```bash
cd sqm-frontend2
# Kill the dev server (Ctrl+C)
npm run dev
```

### Step 5: Add Debug Logging
**File**: `sqm-frontend2/src/hooks/qmqa/workflow-actions.hook.ts`

Add console.log to verify which hook is being called:
```typescript
export const useCreateQMQASchedule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<QMQASchedule>) => {
      console.log('🔵 [HOOK] useCreateQMQASchedule called');
      console.log('🔵 [HOOK] Endpoint: /api/qmqa/schedules');
      console.log('🔵 [HOOK] Data:', data);
      
      return apiClient.post<{ success: boolean; data: QMQASchedule }>('/api/qmqa/schedules', data);
    },
    // ...
  });
};
```

### Step 6: Add Backend Controller Logging
**File**: `sqm-backend/src/controllers/qmqa.controller.js`

Add logging to verify which controller method is hit:
```javascript
export const createSchedule = async (req, res) => {
    console.log('🟢 [CONTROLLER] createSchedule called');
    console.log('🟢 [CONTROLLER] URL:', req.url);
    console.log('🟢 [CONTROLLER] Method:', req.method);
    // ...
};

export const createRecord = async (req, res) => {
    console.log('🔴 [CONTROLLER] createRecord called');
    console.log('🔴 [CONTROLLER] URL:', req.url);
    console.log('🔴 [CONTROLLER] Method:', req.method);
    // ...
};
```

## Expected Flow

### Correct Flow (Schedule Creation)
```
1. User clicks "Save Schedule" in ScheduleNew.tsx
2. handleSave() calls createScheduleMutation.mutateAsync()
3. useCreateQMQASchedule hook executes
4. apiClient.post('/api/qmqa/schedules', data)
5. apiFetch constructs: http://localhost:3001/api/qmqa/schedules
6. Backend receives POST /api/qmqa/schedules
7. Router matches: router.post('/schedules', ...)
8. qmqaController.createSchedule() executes
9. qmqaService.createSchedule() executes
10. Logs: "📥 [QMQA-SERVICE] Create Schedule Request"
11. Control No generated with P- prefix
12. Success!
```

### Incorrect Flow (What's Happening Now)
```
1. User clicks "Save Schedule"
2. ??? (Something goes wrong here)
3. Backend receives POST /api/qmqa/records (WRONG!)
4. Router matches: router.post('/records', ...)
5. qmqaController.createRecord() executes
6. qmqaService.createRecord() executes
7. Logs: "📥 [QMQA-SERVICE] Create Audit Report Request"
8. Logs: "📦 From Schedule: false"
9. Validation fails with wrong table names
```

## Possible Causes

### 1. Component Using Wrong Hook
**Check**: `sqm-frontend2/src/pages/dashboard/qmqa/ScheduleNew.tsx`
- Line 14: `const createScheduleMutation = useCreateQMQASchedule();`
- Line 60: `await createScheduleMutation.mutateAsync(...)`
- **Status**: ✅ Correct hook is used

### 2. Hook Definition Issue
**Check**: `sqm-frontend2/src/hooks/qmqa/workflow-actions.hook.ts`
- Line 36-48: `useCreateQMQASchedule` definition
- Line 43: `return apiClient.post('/api/qmqa/schedules', data);`
- **Status**: ✅ Correct endpoint is used

### 3. apiClient Implementation Issue
**Check**: `sqm-frontend2/src/lib/api/client.ts`
- Line 18-24: `post` method implementation
- **Status**: ✅ Correctly delegates to apiFetch

### 4. Build/Cache Issue
**Likelihood**: HIGH
- Old compiled code might still be running
- Browser cache might have old API calls
- **Solution**: Hard refresh + restart dev server

### 5. Duplicate Hook Import
**Check**: Search for other imports of workflow hooks
```bash
cd sqm-frontend2
grep -r "useCreateQMQA" src/
```
- **Status**: ✅ Only one definition found

## Next Actions

1. **User should check browser Network tab** to see actual endpoint being called
2. **Hard refresh browser** (Ctrl+Shift+R)
3. **Restart frontend dev server**
4. **Add debug logging** to both frontend hook and backend controller
5. **Try again** and observe the logs

## If Still Failing

If the issue persists after all debugging steps:

1. Check if there's a proxy configuration redirecting requests
2. Check if there's middleware modifying the request path
3. Check if there's a service worker caching old requests
4. Check the actual HTTP request in browser DevTools (Headers tab)
5. Verify the backend is actually running on port 3001
6. Check for any nginx/apache reverse proxy configuration

## Success Criteria

When working correctly, you should see:
- Browser Network tab: `POST http://localhost:3001/api/qmqa/schedules`
- Backend logs: "📥 [QMQA-SERVICE] Create Schedule Request"
- Backend logs: "⚙️ [QMQA-SERVICE] Generated Control No: P-2026-XXXX"
- Backend logs: "✅ [QMQA-SERVICE] Schedule Created"
- Frontend toast: "Schedule created successfully"
- Redirect to: `/qmqa/plan-list`
