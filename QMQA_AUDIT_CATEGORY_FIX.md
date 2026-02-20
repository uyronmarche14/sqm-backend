# QMQA Audit Category Fix

## Issue Summary
Schedule creation was failing with foreign key constraint error:
```
The INSERT statement conflicted with the FOREIGN KEY constraint "FK_QMQA_AUDIT_PLAN_AUDITCATEGORY". 
The conflict occurred in database "master", table "dbo.AUDITCATEGORY", column 'audit_category_id'.
```

## Root Cause
The frontend was configured to use `defectCategories` lookup (which maps to `DEFECTCATEGORIES` table used by MNR module), but the database foreign key constraint expects `AUDITCATEGORY` table (which is specific to QMQA module).

## Database Schema
QMQA uses a dedicated `AUDITCATEGORY` table with QMQA-specific fields:
```sql
CREATE TABLE [dbo].[AUDITCATEGORY] (
    [audit_category_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [audit_category_name] nvarchar(100) NOT NULL,
    [audit_category_code] nvarchar(20) NOT NULL,
    [audit_category_desc] nvarchar(400) NULL,
    [with_rating] bit NOT NULL,           -- QMQA-specific
    [with_auditees] bit NOT NULL,         -- QMQA-specific
    [with_auditors] bit NOT NULL,         -- QMQA-specific
    [with_attendees] bit NOT NULL,        -- QMQA-specific
    [with_audit_plan] bit NOT NULL,       -- QMQA-specific
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
```

This is different from `DEFECTCATEGORIES` table used by MNR:
```sql
CREATE TABLE [dbo].[DEFECTCATEGORIES] (
    [defectcategory_id] nvarchar(72) NOT NULL PRIMARY KEY,
    [defectcategory_name] nvarchar(100) NOT NULL,
    [defectcategory_acronym] nvarchar(100) NOT NULL,
    [defectcategory_desc] nvarchar(200) NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updateby] nvarchar(72) NOT NULL
);
```

## Fixes Applied

### 1. Backend Service - Validation ✅
**File**: `sqm-backend/src/services/qmqa.service.js`

Kept the correct table name `AUDITCATEGORY` in all validation functions:
```javascript
// createSchedule()
await validateForeignKey(pool, 'AUDITCATEGORY', 'audit_category_id', data.audit_category_id, 'Audit category');

// updateSchedule()
await validateForeignKey(pool, 'AUDITCATEGORY', 'audit_category_id', data.audit_category_id, 'Audit category');

// createRecord()
await validateForeignKey(pool, 'AUDITCATEGORY', 'audit_category_id', data.audit_category_id, 'Audit category');
```

### 2. Frontend Lookup Registry ✅
**File**: `sqm-frontend2/src/lib/registry/lookup-registry.ts`

Added new `auditCategories` lookup:
```typescript
// Added to LookupProviderKey type
| 'auditCategories'

// Added import
import { getAuditCategories } from '@/lib/api/module/masterDataAPI';

// Added lookup configuration
auditCategories: {
  title: "Select Audit Category",
  placeholder: "Search Audit Category...",
  columns: [
      { header: "Category Name", accessorKey: "name" },
      { header: "Code", accessorKey: "code" }
  ],
  getLabel: (r: any) => r.name,
  getValue: (r: any) => r.id,
  fetcher: async (query: string) => {
      const data = await getAuditCategories();
      const lowerQ = query.toLowerCase();
      return data.filter(r => r.name.toLowerCase().includes(lowerQ) || r.code?.toLowerCase().includes(lowerQ));
  }
}
```

### 3. QMQA Form Configuration ✅
**File**: `sqm-frontend2/src/pages/dashboard/qmqa/qmqa-config/index.ts`

Changed category field to use correct lookup:
```typescript
// BEFORE (WRONG)
{
  label: "Category:",
  name: "categoryId",
  type: "lookup",
  lookup: "defectCategories",  // ❌ Wrong - uses DEFECTCATEGORIES table
  placeholder: "Select Category",
  required: true,
}

// AFTER (CORRECT)
{
  label: "Category:",
  name: "categoryId",
  type: "lookup",
  lookup: "auditCategories",  // ✅ Correct - uses AUDITCATEGORY table
  placeholder: "Select Category",
  required: true,
}
```

## Backend API Endpoints
The backend already has API endpoints for audit categories:
- `GET /api/master/audit-categories` - Get all audit categories
- `POST /api/master/audit-categories` - Create audit category
- `PUT /api/master/audit-categories/:id` - Update audit category
- `DELETE /api/master/audit-categories/:id` - Delete audit category

**Controller**: `sqm-backend/src/controllers/masterData.controller.js`
- `getAuditCategories()`
- `createAuditCategory()`
- `updateAuditCategory()`
- `deleteAuditCategory()`

## Testing Steps

1. **Restart Backend Server**:
   ```bash
   cd sqm-backend
   npm start
   ```

2. **Restart Frontend Dev Server**:
   ```bash
   cd sqm-frontend2
   npm run dev
   ```

3. **Clear Browser Cache**: Hard refresh (Ctrl+Shift+R)

4. **Test Schedule Creation**:
   - Navigate to QMQA → Calendar
   - Click "New Schedule"
   - Fill in the form:
     - Mfg Site: Select a site
     - Supplier: Select a supplier
     - **Category: Select an audit category** (should now show AUDITCATEGORY data)
     - Audit Plan Date: Select a date
     - SQE PIC: Select a user
   - Click "Save Schedule"

5. **Expected Result**:
   - ✅ Schedule created successfully
   - ✅ Control No generated with P- prefix (e.g., P-2026-0001)
   - ✅ Toast notification: "Schedule created successfully"
   - ✅ Redirect to Plan List

## Data Population

If the `AUDITCATEGORY` table is empty, you need to populate it with audit categories. Example categories:
- Quality Audit
- Process Audit
- System Audit
- Product Audit
- Supplier Audit

You can add them through:
1. **Maintenance Module** (if there's a UI for audit categories)
2. **Direct SQL Insert**:
   ```sql
   INSERT INTO dbo.AUDITCATEGORY (
       audit_category_id, audit_category_name, audit_category_code, 
       audit_category_desc, with_rating, with_auditees, with_auditors, 
       with_attendees, with_audit_plan, active_flag, last_update, updateby
   ) VALUES (
       NEWID(), 'Quality Audit', 'QA', 
       'Quality Management System Audit', 1, 1, 1, 1, 1, 1, 
       GETDATE(), 'SYSTEM'
   );
   ```

## Key Differences: AUDITCATEGORY vs DEFECTCATEGORIES

| Feature | AUDITCATEGORY | DEFECTCATEGORIES |
|---------|---------------|------------------|
| **Purpose** | QMQA audit types | MNR defect classification |
| **Module** | QMQA | MNR, Maintenance |
| **ID Field** | `audit_category_id` | `defectcategory_id` |
| **Name Field** | `audit_category_name` | `defectcategory_name` |
| **Special Fields** | `with_rating`, `with_auditees`, `with_auditors`, `with_attendees`, `with_audit_plan` | `defectcategory_acronym` |
| **Used By** | QMQA_AUDIT_PLAN | MNR, DEFECTS |

## Related Files

### Frontend
- `sqm-frontend2/src/lib/registry/lookup-registry.ts` - Lookup registry (added auditCategories)
- `sqm-frontend2/src/pages/dashboard/qmqa/qmqa-config/index.ts` - QMQA form config (changed lookup)
- `sqm-frontend2/src/lib/api/module/masterDataAPI.ts` - API functions (getAuditCategories already exists)

### Backend
- `sqm-backend/src/services/qmqa.service.js` - Validation logic (uses AUDITCATEGORY)
- `sqm-backend/src/controllers/masterData.controller.js` - Audit category CRUD
- `sqm-backend/src/routes/masterData.routes.js` - Audit category routes
- `sqm-backend/src/db/generated/schema-maintenance.sql` - AUDITCATEGORY table definition

## Success Criteria

When working correctly:
1. Category dropdown shows audit categories from `AUDITCATEGORY` table
2. Selected category ID is validated against `AUDITCATEGORY` table
3. Foreign key constraint is satisfied
4. Schedule is created successfully with P- prefix
5. No foreign key constraint errors

## Documentation
- `sqm-backend/QMQA_TABLE_NAME_FIX.md` - Previous table name fixes
- `sqm-backend/QMQA_FIELD_MAPPING_FIX.md` - Field mapping documentation
- `sqm-backend/QMQA_SCHEDULE_CREATION_DEBUG.md` - Debugging guide
- `QMQA_SCHEDULE_CREATION_ISSUE_RESOLUTION.md` - Complete resolution guide
