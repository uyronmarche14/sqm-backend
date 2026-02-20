# Master Data & Maintenance API Documentation

**Module**: Master Data (Sites, Suppliers, Roles, Models, etc.)  
**Base URL**: `/api/master`  
**Authentication**: JWT Bearer Token (Required)  
**Content-Type**: `application/json`  
**Version**: 1.0  
**Last Updated**: 2026-02-02

---

## Module Grade: 2.4/10 🔴 CRITICAL - NEEDS SPLITTING

**Critical Issues**:
- 🔴 Single 1800+ line file (masterData.controller.js)
- ❌ No service layer (all logic in controller)
- ❌ Zero validation or error handling
- ❌ DTOs embedded everywhere
- ⚠️  No separation of concerns

**Fix Strategy**: Split into sub-modules  
**Estimated Fix Time**: 20 hours  
**Priority**: CRITICAL

---

## Sub-Modules

This module should be split into:

```
/api/sites      → Site management
/api/suppliers  → Supplier management
/api/roles      → Role management
/api/models     → Model management
/api/parts      → Part management
/api/users      → User management (currently in auth)
```

---

## 1. SITES Management

### POST /api/master/sites - Create Site

```json
{
  "siteName": "Manufacturing Plant A",
  "siteCode": "PLANT-A",
  "siteDesc": "Primary manufacturing facility",
  "activeFlag": true
}
```

**Response**: 201 Created
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Manufacturing Plant A",
    "code": "PLANT-A",
    "description": "Primary manufacturing facility",
    "isActive": true
  }
}
```

**Grade**: 3/10 - No validation  
**Issues**: No site_code uniqueness check, no activeFlag validation

---

### GET /api/master/sites - List Sites

**Response**: 200 OK
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Manufacturing Plant A",
      "code": "PLANT-A",
      "isActive": true
    }
  ]
}
```

**Grade**: 4/10 - No pagination

---

### PUT /api/master/sites/:id - Update Site

**Grade**: 3/10 - No conflict detection

---

### DELETE /api/master/sites/:id - Delete Site

**Grade**: 2/10 - No cascade checks  
**Risk**: Foreign key violations

---

## 2. SUPPLIERS Management

### POST /api/master/suppliers - Create Supplier

```json
{
  "supplierName": "Wire Components Inc",
  "siteId": "site-uuid",
  "supplierDesc": "Electronic components supplier",
  "location": "Los Angeles, CA",
  "activeFlag": true
}
```

**Grade**: 2/10  
**Issues**: 
- No uniqueness check
- No site validation
- No contact info validation

---

### GET /api/master/suppliers - List Suppliers

**Grade**: 3/10 - No pagination, no filtering

---

## 3. ROLES Management

### POST /api/master/roles - Create Role

```json
{
  "roleName": "Quality Inspector",
  "roleDesc": "Can inspect parts",
  "activeFlag": true,
  "permissions": ["READ_NPI", "CREATE_NPI", "APPROVE_NPI"]
}
```

**Grade**: 1/10 - CRITICAL  
**Issues**:
- No permission validation
- No role name uniqueness
- No permissions mapping

---

### GET /api/master/roles - List Roles

**Grade**: 2/10 - No permission hydration

---

## 4. MODELS Management

### POST /api/master/models - Create Model

```json
{
  "modelName": "Model-X-2000",
  "modelCode": "MX-2000",
  "description": "High-performance variant",
  "activeFlag": true
}
```

**Grade**: 3/10 - No validation

---

## 5. PARTS Management

### POST /api/master/parts - Create Part

```json
{
  "partName": "Wire Connector Assembly",
  "partCode": "WCA-001",
  "partClassId": "partclass-uuid",
  "partTypeId": "parttype-uuid",
  "description": "Connector for wire harness",
  "activeFlag": true
}
```

**Grade**: 2/10 - No foreign key validation

---

## Common Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Missing/invalid field |
| `DUPLICATE_RECORD` | 409 | Record already exists |
| `FOREIGN_KEY_ERROR` | 400 | Referenced record not found |
| `CANNOT_DELETE` | 409 | Has dependent records |
| `UNAUTHORIZED` | 401 | No token |
| `FORBIDDEN` | 403 | No permission |

---

## Refactoring Roadmap

### Phase 1: Split Module (CRITICAL)
```
DELETE: sqm-backend/src/controllers/masterData.controller.js (1800 lines)

CREATE:
  sqm-backend/src/controllers/sites.controller.js (150 lines)
  sqm-backend/src/controllers/suppliers.controller.js (150 lines)
  sqm-backend/src/controllers/roles.controller.js (200 lines)
  sqm-backend/src/controllers/models.controller.js (100 lines)
  sqm-backend/src/controllers/parts.controller.js (150 lines)
```

### Phase 2: Create Service Layer
```
CREATE:
  sqm-backend/src/services/sites.service.js
  sqm-backend/src/services/suppliers.service.js
  ... etc
```

### Phase 3: Add Validation & Error Handling
- Input validation with Zod
- Error middleware
- Logging

### Phase 4: Testing
- Unit tests
- Integration tests

---

## Architecture Issues

### Issue 1: Monolithic Controller
**Problem**: 1800 lines in one file  
**Impact**: Hard to test, maintain, version  
**Solution**: Split into 5 sub-modules

### Issue 2: No Data Validation
**Problem**: Accepts any input  
**Impact**: Data corruption, constraint violations  
**Solution**: Add Zod schemas

### Issue 3: Direct DB Access
**Problem**: No service layer  
**Impact**: Business logic scattered, untestable  
**Solution**: Extract to service layer

### Issue 4: No Error Handling
**Problem**: Generic 500 errors  
**Impact**: Hard to debug, poor UX  
**Solution**: Add error middleware

---

## Migration Path

1. **Week 1**: Split controller into 5 files
2. **Week 2**: Create service layer
3. **Week 3**: Add validation & error handling
4. **Week 4**: Write tests

---

## Summary Table

| Sub-Module | Lines | Grade | Priority |
|-----------|-------|-------|----------|
| Sites | 150 | 3/10 | MEDIUM |
| Suppliers | 150 | 2/10 | MEDIUM |
| Roles | 200 | 1/10 | 🔴 CRITICAL |
| Models | 100 | 3/10 | MEDIUM |
| Parts | 150 | 2/10 | MEDIUM |

**Total Current Grade**: 2.4/10 🔴

---

**Document Owner**: Backend Team  
**Last Updated**: 2026-02-02  
**Status**: NEEDS URGENT REFACTORING  
**Estimated Timeline**: 20 hours
