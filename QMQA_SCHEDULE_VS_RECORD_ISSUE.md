# QMQA Schedule vs Record Creation Issue

## Problem
When trying to create a schedule from the "New Schedule" page, the request is going to `/api/qmqa/records` endpoint instead of `/api/qmqa/schedules`, causing validation errors for fields that aren't required for schedules.

## Error Message
```
📦 From Schedule: false
❌ [CONTROLLER] Create Record Error: Error: Validation failed
details: [
  { field: 'audit_type_id', message: 'audit_type_id is required' },
  { field: 'audit_date', message: 'audit_date is required' },
  { field: 'checker_id', message: 'checker_id is required' },
  { field: 'approver_id', message: 'approver_id is required' }
]
```

## Analysis

### Frontend Code (ScheduleNew.tsx)
The page is correctly:
1. Using `useCreateQMQASchedule()` hook ✅
2. Using `transformScheduleData()` mapper ✅
3. Only collecting schedule fields (no audit_type_id, audit_date, checker_id, approver_id) ✅

### Hook Configuration (workflow-actions.hook.ts)
The hook is correctly configured to use `/api/qmqa/schedules`:
```typescript
export const useCreateQMQASchedule = () => {
  return useMutation({
    mutationFn: async (data: Partial<QMQASchedule>) => {
      return apiClient.post<{ success: boolean; data: QMQASchedule }>('/api/qmqa/schedules', data);
    },
    // ...
  });
};
```

### Backend Routes (qmqa.routes.js)
Routes are correctly configured:
```javascript
router.post('/schedules', authenticateToken, qmqaController.createSchedule);
router.post('/records', authenticateToken, qmqaController.createRecord);
```

## Possible Causes

### 1. Browser Cache Issue
The browser might be caching the old hook code that used manual `fetch()` with incorrect URL.

**Solution**: Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)

### 2. Build Issue
The frontend build might not have picked up the latest changes to the hook.

**Solution**: Rebuild the frontend
```bash
cd sqm-frontend2
npm run build
# or if using dev server
# restart the dev server
```

### 3. Multiple Instances
There might be multiple instances of the hook or the page is importing from the wrong location.

**Solution**: Check imports in ScheduleNew.tsx

### 4. API Client Issue
The `apiClient` might not be constructing the URL correctly.

**Solution**: Add console.log to debug:
```typescript
export const useCreateQMQASchedule = () => {
  return useMutation({
    mutationFn: async (data: Partial<QMQASchedule>) => {
      console.log('🔍 [SCHEDULE] Sending to /api/qmqa/schedules');
      console.log('📦 [SCHEDULE] Data:', data);
      return apiClient.post<{ success: boolean; data: QMQASchedule }>('/api/qmqa/schedules', data);
    },
    // ...
  });
};
```

## Debugging Steps

### Step 1: Check Browser Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to create a schedule
4. Look for the POST request
5. Check the URL - should be `http://localhost:3001/api/qmqa/schedules`
6. Check the Request Payload

### Step 2: Check Backend Logs
The backend should log:
```
📥 [QMQA-SERVICE] Create Schedule Request
```

If it logs:
```
📥 [QMQA-SERVICE] Create Audit Report Request
📦 From Schedule: false
```

Then the request is going to the wrong endpoint.

### Step 3: Verify Hook Import
In ScheduleNew.tsx, verify:
```typescript
import { useCreateQMQASchedule } from "@/hooks/qmqa/workflow-actions.hook";
```

Not:
```typescript
import { useCreateQMQADraft } from "@/hooks/qmqa/workflow-actions.hook";
```

### Step 4: Check for Duplicate Hooks
Search for other definitions of `useCreateQMQASchedule`:
```bash
cd sqm-frontend2
grep -r "useCreateQMQASchedule" src/
```

Should only find:
- Definition in `src/hooks/qmqa/workflow-actions.hook.ts`
- Import in `src/pages/dashboard/qmqa/ScheduleNew.tsx`

## Temporary Workaround

If the issue persists, add explicit logging to the hook:

```typescript
export const useCreateQMQASchedule = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Partial<QMQASchedule>) => {
      console.log('='.repeat(50));
      console.log('🚀 [SCHEDULE HOOK] Starting schedule creation');
      console.log('📍 [SCHEDULE HOOK] Endpoint: /api/qmqa/schedules');
      console.log('📦 [SCHEDULE HOOK] Data:', JSON.stringify(data, null, 2));
      console.log('='.repeat(50));
      
      const result = await apiClient.post<{ success: boolean; data: QMQASchedule }>(
        '/api/qmqa/schedules', 
        data
      );
      
      console.log('✅ [SCHEDULE HOOK] Response:', result);
      return result;
    },
    onSuccess: () => {
      console.log('✅ [SCHEDULE HOOK] Success callback');
      queryClient.invalidateQueries({ queryKey: ['qmqa-schedules'] });
      toast({ title: 'Success', description: 'Schedule created successfully' });
    },
    onError: (error: any) => {
      console.error('❌ [SCHEDULE HOOK] Error callback:', error);
      const message = error?.error?.message || error?.message || 'Failed to create schedule';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  });
};
```

## Expected vs Actual

### Expected Flow
1. User fills schedule form (5 fields only)
2. Click "Save Schedule"
3. `useCreateQMQASchedule()` called
4. POST to `/api/qmqa/schedules`
5. Backend `createSchedule()` validates 5 required fields
6. Schedule created with P- prefix
7. Success!

### Actual Flow (Current Issue)
1. User fills schedule form (5 fields only)
2. Click "Save Schedule"
3. `useCreateQMQASchedule()` called (?)
4. POST to `/api/qmqa/records` ❌ (WRONG!)
5. Backend `createRecord()` validates 9 required fields
6. Validation fails - missing audit_type_id, audit_date, checker_id, approver_id
7. Error!

## Next Steps

1. **Clear browser cache** and hard refresh
2. **Restart frontend dev server** to ensure latest code is loaded
3. **Check browser Network tab** to see actual URL being called
4. **Add console.logs** to the hook to trace execution
5. **Verify no other code** is intercepting or redirecting the request

## Status
🔍 **INVESTIGATING** - Need to verify which endpoint is actually being called
