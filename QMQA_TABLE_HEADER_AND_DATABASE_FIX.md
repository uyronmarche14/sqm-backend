# QMQA Table Header and Database Fix Summary

## Date: February 21, 2026

## Issues Addressed

### 1. React Key Prop Warning in DataTable Component
**Issue**: React warning about missing key props in DataTable component
```
Warning: Each child in a list should have a unique "key" prop.
```

**Root Cause**: SVG elements inside the sort indicator were not assigned unique keys

**Fix Applied**:
- Added `key="sort-up"` and `key="sort-down"` to the SVG elements in the sort indicator
- Location: `sqm-frontend2/src/components/tables/DataTable.tsx` lines 195-200

**Files Modified**:
- `sqm-frontend2/src/components/tables/DataTable.tsx`

---

### 2. Supplier Incharge Implementation Investigation

**User Request**: Check how supplier incharge is implemented in maintenance module (frontend and backend)

**Findings**:

#### Database Schema
The supplier incharge data is stored in the `SUPPLIERSUSER` table:
```sql
CREATE TABLE [dbo].[SUPPLIERSUSER] (
    [Id] nvarchar(72) NOT NULL PRIMARY KEY,
    [supplier_id] nvarchar(72) NOT NULL,
    [user_id] nvarchar(72) NOT NULL,
    [active_flag] bit NOT NULL,
    [last_update] datetime NOT NULL,
    [updatedby] nvarchar(100) NOT NULL
);
```

This is a junction table that links:
- `supplier_id` → `SUPPLIERS.supplier_id`
- `user_id` → `USERS.user_id`

#### Backend Implementation
**API Endpoints** (`sqm-backend/src/routes/masterData.routes.js`):
- `GET /api/master/supplier-incharges` - List all supplier incharges
- `POST /api/master/supplier-incharges` - Create new supplier incharge
- `PUT /api/master/supplier-incharges/:id` - Update supplier incharge
- `DELETE /api/master/supplier-incharges/:id` - Delete supplier incharge

**Controller** (`sqm-backend/src/controllers/masterData.controller.js`):
- Uses view `vSupplierIncharges` (note: view definition not found in schema files, may be created manually)
- Maps data using `mapSupplierInchargeToDto` function
- Returns joined data with supplier name, site name, and user full name

#### QMQA Implementation Pattern
The QMQA module correctly implements supplier incharge queries using the JOIN pattern:
```sql
LEFT JOIN dbo.SUPPLIERSUSER att ON q.attention_id = att.Id
LEFT JOIN dbo.USERS att_user ON att.user_id = att_user.user_id
```

This pattern:
1. Joins `SUPPLIERSUSER` table using the `attention_id` field
2. Then joins `USERS` table to get the full name of the supplier contact person
3. Returns `att_user.full_name` as `attention_name`

**Location**: `sqm-backend/src/repositories/queries/qmqa.queries.js` lines 143-145, 173-174

#### Frontend Implementation
**Lookup Configuration** (`sqm-frontend2/src/lib/registry/lookup-registry.ts`):
- Registered as `supplierIncharges` lookup type
- Fetches data from `/api/master/supplier-incharges`
- Displays: Supplier Name, Site Name, Full Name
- Filters by full name in search

**Usage in QMQA**:
- Field name: `attentionId` (stores SUPPLIERSUSER.Id)
- Lookup type: `supplierIncharges`
- Location: `sqm-frontend2/src/pages/dashboard/qmqa/qmqa-config/index.ts` line 168

**Maintenance Page** (`sqm-frontend2/src/pages/dashboard/maintenance/suppliers/SupplierIncharge.tsx`):
- Uses `MasterDataEngine` component for CRUD operations
- Custom dialog `SupplierAssignmentDialog` for dual-list assignment
- Columns: ACTION, SUPPLIER NAME, SITE NAME, FULL NAME, ACTIVE FLAG, LAST UPDATE, UPDATEDBY

---

## Current Status

### ✅ Completed
1. Fixed React key prop warning in DataTable component
2. Investigated and documented supplier incharge implementation
3. Confirmed QMQA is using correct database pattern for supplier incharge
4. **Fixed missing table headers in QMQA list views**

### 🐛 Issue: Missing Table Headers

**Problem**: Table headers were not displaying in QMQA list views. Only "ACTION" column was visible, but other headers like "CONTROL NO", "SITE NAME", etc. were missing.

**Root Cause**: Column definition format mismatch
- QMQAListView was using TanStack Table format: `{ accessorKey: 'field', header: 'LABEL' }`
- DataTable component expects: `{ key: 'field', label: 'LABEL' }`

**Fix Applied**:
Changed column definitions in `QMQAListView.tsx` from:
```typescript
const defaultColumns = [
  { accessorKey: 'controlNo', header: 'CONTROL NO' },
  // ...
];
```

To:
```typescript
const defaultColumns = [
  { key: 'controlNo', label: 'CONTROL NO' },
  // ...
];
```

**Files Modified**:
- `sqm-frontend2/src/pages/dashboard/qmqa/components/QMQAListView.tsx`

**Result**: All table headers now display correctly:
- ACTION
- CONTROL NO
- SITE NAME
- SUPPLIER NAME
- ISSUER NAME
- ISSUED DATE
- ENCODER NAME
- NEXT APPROVER

### 📋 Implementation Pattern Summary

**To query supplier incharge data in any module:**
```sql
-- Step 1: Join SUPPLIERSUSER table
LEFT JOIN dbo.SUPPLIERSUSER si ON your_table.attention_id = si.Id

-- Step 2: Join USERS table to get full name
LEFT JOIN dbo.USERS u ON si.user_id = u.user_id

-- Step 3: Select the full name
SELECT u.full_name as attention_name
```

**Frontend lookup configuration:**
```typescript
{
  name: "attentionId",
  type: "lookup",
  lookup: "supplierIncharges",
  placeholder: "Select Attention",
  required: true
}
```

---

## Notes

1. The `vSupplierIncharges` view is referenced in the backend but not found in schema files. This view likely needs to be created manually or is created by a migration script.

2. The SUPPLIERSUSER table is a many-to-many relationship table that allows:
   - One supplier to have multiple contact persons (incharges)
   - One user to be assigned to multiple suppliers

3. The QMQA implementation is correct and follows the established pattern used throughout the application.

---

## Files Referenced

### Backend
- `sqm-backend/src/db/generated/schema-maintenance.sql` (SUPPLIERSUSER table)
- `sqm-backend/src/routes/masterData.routes.js` (API routes)
- `sqm-backend/src/controllers/masterData.controller.js` (Controller logic)
- `sqm-backend/src/repositories/queries/qmqa.queries.js` (Query implementation)

### Frontend
- `sqm-frontend2/src/components/tables/DataTable.tsx` (Fixed React warning)
- `sqm-frontend2/src/lib/registry/lookup-registry.ts` (Lookup configuration)
- `sqm-frontend2/src/pages/dashboard/maintenance/suppliers/SupplierIncharge.tsx` (Maintenance page)
- `sqm-frontend2/src/pages/dashboard/qmqa/qmqa-config/index.ts` (QMQA usage)
