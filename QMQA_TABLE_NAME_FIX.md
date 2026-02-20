# QMQA Database Table Name Fix

## Issue Summary
Schedule creation was failing with database error: "Invalid object name 'SITE'"

## Root Cause
The `createSchedule` and `updateSchedule` functions in `qmqa.service.js` were using incorrect table names for foreign key validation.

## Error Details
```
RequestError: Invalid object name 'SITE'.
at handleError (/home/ronmarche14/projects/SQM/sqm-backend/node_modules/mssql/lib/tedious/request.js:384:15)
```

## Incorrect Table Names
The service was using old/incorrect table names:

| Incorrect Name | Correct Name | Purpose |
|---------------|--------------|---------|
| `SITE` ❌ | `MFG_SITES` ✅ | Manufacturing Sites |
| `SUPPLIER` ❌ | `SUPPLIERS` ✅ | Suppliers |
| `DEFECT_CATEGORY` ❌ | `AUDITCATEGORY` ✅ | Audit Categories |

## Solution Implemented

### File: `sqm-backend/src/services/qmqa.service.js`

#### 1. Fixed createSchedule Function (Line ~125)

**Before**:
```javascript
// Validate foreign key references
await validateForeignKey(pool, 'SITE', 'site_id', data.site_id, 'Manufacturing site');
await validateForeignKey(pool, 'SUPPLIER', 'supplier_id', data.supplier_id, 'Supplier');
await validateForeignKey(pool, 'DEFECT_CATEGORY', 'category_id', data.audit_category_id, 'Audit category');
await validateForeignKey(pool, 'USERS', 'user_id', data.sqe_pic_id, 'SQE PIC');
```

**After**:
```javascript
// Validate foreign key references
await validateForeignKey(pool, 'MFG_SITES', 'site_id', data.site_id, 'Manufacturing site');
await validateForeignKey(pool, 'SUPPLIERS', 'supplier_id', data.supplier_id, 'Supplier');
await validateForeignKey(pool, 'AUDITCATEGORY', 'audit_category_id', data.audit_category_id, 'Audit category');
await validateForeignKey(pool, 'USERS', 'user_id', data.sqe_pic_id, 'SQE PIC');
```

#### 2. Fixed updateSchedule Function (Line ~207)

**Before**:
```javascript
// Validate foreign key references if provided
if (data.site_id) {
    await validateForeignKey(pool, 'SITE', 'site_id', data.site_id, 'Manufacturing site');
}
if (data.supplier_id) {
    await validateForeignKey(pool, 'SUPPLIER', 'supplier_id', data.supplier_id, 'Supplier');
}
if (data.audit_category_id) {
    await validateForeignKey(pool, 'DEFECT_CATEGORY', 'category_id', data.audit_category_id, 'Audit category');
}
if (data.sqe_pic_id) {
    await validateForeignKey(pool, 'USERS', 'user_id', data.sqe_pic_id, 'SQE PIC');
}
```

**After**:
```javascript
// Validate foreign key references if provided
if (data.site_id) {
    await validateForeignKey(pool, 'MFG_SITES', 'site_id', data.site_id, 'Manufacturing site');
}
if (data.supplier_id) {
    await validateForeignKey(pool, 'SUPPLIERS', 'supplier_id', data.supplier_id, 'Supplier');
}
if (data.audit_category_id) {
    await validateForeignKey(pool, 'AUDITCATEGORY', 'audit_category_id', data.audit_category_id, 'Audit category');
}
if (data.sqe_pic_id) {
    await validateForeignKey(pool, 'USERS', 'user_id', data.sqe_pic_id, 'SQE PIC');
}
```

## Correct Table Names Reference

### Manufacturing Sites
- **Table Name**: `MFG_SITES`
- **Primary Key**: `site_id`
- **Schema**: `sqm-backend/src/db/generated/schema-maintenance.sql`

### Suppliers
- **Table Name**: `SUPPLIERS`
- **Primary Key**: `supplier_id`
- **Schema**: `sqm-backend/src/db/generated/schema-maintenance.sql`

### Audit Categories
- **Table Name**: `AUDITCATEGORY`
- **Primary Key**: `audit_category_id`
- **Schema**: `sqm-backend/src/db/generated/schema-maintenance.sql`

### Users
- **Table Name**: `USERS`
- **Primary Key**: `user_id`
- **Schema**: Already correct

## Note on createRecord Function
The `createRecord` function (line ~365) already uses the correct table names:
```javascript
await validateForeignKey(pool, 'MFG_SITES', 'site_id', data.site_id, 'Manufacturing site');
await validateForeignKey(pool, 'SUPPLIERS', 'supplier_id', data.supplier_id, 'Supplier');
await validateForeignKey(pool, 'AUDITCATEGORY', 'audit_category_id', data.audit_category_id, 'Audit category');
```

This inconsistency is why the error only appeared in schedule creation, not record creation.

## Testing

### Schedule Creation Test
1. Navigate to QMQA > Plan > New Schedule
2. Fill in required fields:
   - Manufacturing Site: Select any site
   - Supplier: Select any supplier
   - Audit Category: Select any category
   - Audit Plan Date: Select a date
   - SQE PIC: Select a user
3. Click "Save Schedule"
4. Expected Results:
   - ✅ No database errors
   - ✅ Foreign key validation passes
   - ✅ Schedule created successfully
   - ✅ Success toast appears
   - ✅ Redirects to Plan List

### Schedule Update Test
1. Navigate to existing schedule
2. Update any field (site, supplier, category, etc.)
3. Save changes
4. Expected Results:
   - ✅ No database errors
   - ✅ Foreign key validation passes
   - ✅ Schedule updated successfully

## Files Modified
1. `sqm-backend/src/services/qmqa.service.js`
   - Fixed `createSchedule` function (line ~125)
   - Fixed `updateSchedule` function (line ~207)

## Related Issues
- [QMQA Schedule URL Fix](./QMQA_SCHEDULE_URL_FIX.md)
- [QMQA Field Mapping Fix](./QMQA_FIELD_MAPPING_FIX.md)
- [QMQA Database Table Fixes](./QMQA_DATABASE_TABLE_FIXES.md)

## Status
✅ **FIXED** - Schedule creation and update now use correct database table names

## Impact
This fix ensures that:
1. Foreign key validation works correctly for schedules
2. Database queries execute without errors
3. Schedule creation and updates function properly
4. Data integrity is maintained through proper foreign key checks
