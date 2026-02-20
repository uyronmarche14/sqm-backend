# QMQA Database Table Name Fixes

## Issue Summary
The QMQA backend queries were referencing incorrect table names that don't exist in the database schema, causing 500 Internal Server Errors when trying to fetch records.

## Problems Identified

### 1. Incorrect Table Names in SQL Queries
The queries were using old/incorrect table names:
- `DEFECT_CATEGORY` → Should be `AUDITCATEGORY`
- `AUDIT_TYPE` → Should be `AUDITTYPE`
- `SUPPLIER_INCHARGE` → Should be `SUPPLIERSUSER`
- `SITE` → Should be `MFG_SITES`
- `SUPPLIER` → Should be `SUPPLIERS`

### 2. Missing Column Aliases
The queries were selecting `cat.category_name` but the actual column is `cat.audit_category_name`

### 3. Incorrect Foreign Key Validations
The service layer was validating against non-existent tables

## Database Schema Reference

### Correct Table Names (from schema-maintenance.sql)
```sql
-- Audit related
AUDITCATEGORY (audit_category_id, audit_category_name)
AUDITTYPE (audit_type_id, audit_type_name)

-- Supplier related
SUPPLIERS (supplier_id, supplier_name)
SUPPLIERSUSER (Id, supplier_id, user_id, active_flag)

-- Site related
MFG_SITES (site_id, site_name)

-- User related
USERS (user_id, full_name, ...)
```

### Supplier Incharge Mapping
The `SUPPLIERSUSER` table is used to link suppliers with their contact persons (users):
- Primary Key: `Id` (UUID)
- Foreign Keys: `supplier_id`, `user_id`
- The actual contact person name comes from joining with `USERS` table

## Fixes Applied

### 1. Updated SQL Queries
**File:** `sqm-backend/src/repositories/queries/qmqa.queries.js`

#### FIND_SCHEDULE_BY_ID Query
```sql
-- Before
LEFT JOIN dbo.DEFECT_CATEGORY cat ON ap.audit_category_id = cat.category_id

-- After
LEFT JOIN dbo.AUDITCATEGORY cat ON ap.audit_category_id = cat.audit_category_id
SELECT cat.audit_category_name as category_name
```

#### FIND_ALL_SCHEDULES Query
```sql
-- Same fixes as FIND_SCHEDULE_BY_ID
```

#### FIND_FULL_RECORD Query
```sql
-- Before
LEFT JOIN dbo.DEFECT_CATEGORY cat ON ap.audit_category_id = cat.category_id
LEFT JOIN dbo.AUDIT_TYPE at ON q.audit_type_id = at.audit_type_id
LEFT JOIN dbo.SUPPLIER_INCHARGE att ON q.attention_id = att.supplier_incharge_id

-- After
LEFT JOIN dbo.AUDITCATEGORY cat ON ap.audit_category_id = cat.audit_category_id
LEFT JOIN dbo.AUDITTYPE at ON q.audit_type_id = at.audit_type_id
LEFT JOIN dbo.SUPPLIERSUSER att ON q.attention_id = att.Id
LEFT JOIN dbo.USERS att_user ON att.user_id = att_user.user_id

-- Updated SELECT
SELECT cat.audit_category_name as category_name,
       att_user.full_name as attention_name
```

#### FIND_ALL_RECORDS Query
```sql
-- Same fixes as FIND_FULL_RECORD
-- Added encoder JOIN that was missing:
LEFT JOIN dbo.USERS enc ON q.encoder_id = enc.user_id
SELECT enc.full_name as encoder_name
```

### 2. Updated Foreign Key Validations
**File:** `sqm-backend/src/services/qmqa.service.js`

#### In createRecord()
```javascript
// Before
await validateForeignKey(pool, 'AUDIT_TYPE', 'audit_type_id', ...)
await validateForeignKey(pool, 'SUPPLIER_INCHARGE', 'supplier_incharge_id', ...)
await validateForeignKey(pool, 'SITE', 'site_id', ...)
await validateForeignKey(pool, 'SUPPLIER', 'supplier_id', ...)
await validateForeignKey(pool, 'DEFECT_CATEGORY', 'category_id', ...)

// After
await validateForeignKey(pool, 'AUDITTYPE', 'audit_type_id', ...)
await validateForeignKey(pool, 'SUPPLIERSUSER', 'Id', ...)
await validateForeignKey(pool, 'MFG_SITES', 'site_id', ...)
await validateForeignKey(pool, 'SUPPLIERS', 'supplier_id', ...)
await validateForeignKey(pool, 'AUDITCATEGORY', 'audit_category_id', ...)
```

#### In updateRecord()
```javascript
// Same fixes as createRecord()
```

## Table Mapping Summary

| Old/Incorrect Name | Correct Name | Primary Key | Notes |
|-------------------|--------------|-------------|-------|
| DEFECT_CATEGORY | AUDITCATEGORY | audit_category_id | Column: audit_category_name |
| AUDIT_TYPE | AUDITTYPE | audit_type_id | Column: audit_type_name |
| SUPPLIER_INCHARGE | SUPPLIERSUSER | Id | Links supplier_id + user_id |
| SITE | MFG_SITES | site_id | Column: site_name |
| SUPPLIER | SUPPLIERS | supplier_id | Column: supplier_name |

## Supplier Incharge Implementation

The supplier incharge (contact person) is implemented using:

1. **SUPPLIERSUSER Table**: Links suppliers to users
   - `Id`: Primary key (UUID)
   - `supplier_id`: Foreign key to SUPPLIERS
   - `user_id`: Foreign key to USERS
   - `active_flag`: Boolean flag

2. **JOIN Pattern**:
   ```sql
   LEFT JOIN dbo.SUPPLIERSUSER att ON q.attention_id = att.Id
   LEFT JOIN dbo.USERS att_user ON att.user_id = att_user.user_id
   SELECT att_user.full_name as attention_name
   ```

3. **Frontend API**: `/api/master/supplier-incharges`
   - Uses view: `vSupplierIncharges` (if exists) or direct table query
   - Returns: supplier info + user info combined

## Testing Checklist

### Backend API Endpoints
- [x] Server starts without errors
- [ ] `GET /api/qmqa/records` - Returns records without 500 error
- [ ] `GET /api/qmqa/records?status=DRAFT` - Filters by status
- [ ] `GET /api/qmqa/records?status=APPROVED` - Filters by status
- [ ] `GET /api/qmqa/records/:id` - Returns single record with all JOINs
- [ ] `POST /api/qmqa/records` - Creates record with validation
- [ ] `PUT /api/qmqa/records/:id` - Updates record with validation

### Database Queries
- [ ] All JOINs resolve correctly
- [ ] No "Invalid object name" errors
- [ ] Category name displays correctly
- [ ] Audit type name displays correctly
- [ ] Supplier incharge name displays correctly
- [ ] Encoder name displays correctly
- [ ] All user names (issuer, checker, approver) display correctly

### Frontend Display
- [ ] Table shows all 7 columns correctly
- [ ] CONTROL NO displays
- [ ] SITE NAME displays
- [ ] SUPPLIER NAME displays
- [ ] ISSUER NAME displays
- [ ] ISSUED DATE displays
- [ ] ENCODER NAME displays
- [ ] NEXT APPROVER displays based on status

## Files Modified

### Backend
1. `sqm-backend/src/repositories/queries/qmqa.queries.js`
   - Fixed all table names in JOINs
   - Fixed column aliases
   - Added missing encoder JOIN

2. `sqm-backend/src/services/qmqa.service.js`
   - Updated foreign key validation table names
   - Updated foreign key validation column names

## Related Documentation
- Frontend-Backend Connection Fix: `sqm-backend/QMQA_FRONTEND_BACKEND_CONNECTION_FIX.md`
- Backend Integration Complete: `sqm-backend/QMQA_BACKEND_INTEGRATION_COMPLETE.md`
- Database Schema: `sqm-backend/src/db/generated/schema-maintenance.sql`
- QMQA Schema: `sqm-backend/src/db/generated/schema-qmqa.sql`

## Next Steps

1. **Test API Endpoints:**
   - Use Postman or curl to test each endpoint
   - Verify no 500 errors
   - Check that all fields are populated

2. **Verify Data Display:**
   - Login to frontend
   - Navigate to QMQA > Draft
   - Verify table displays with correct headers and data

3. **Test CRUD Operations:**
   - Create a new QMQA record
   - Verify all dropdowns populate correctly
   - Test workflow transitions

4. **Check Supplier Incharge:**
   - Verify supplier incharge dropdown works
   - Check that selected incharge displays in table
   - Test filtering by supplier incharge
