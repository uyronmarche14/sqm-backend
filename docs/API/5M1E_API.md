# 5M1E API Documentation

**Module**: 5M1E Quality Management (5 Methods, 1 Engineer)  
**Base URL**: `/api/5m1e`  
**Authentication**: JWT Bearer Token (Required)  
**Content-Type**: `application/json`  
**Version**: 1.0  
**Last Updated**: 2026-02-02

---

## Module Grade: 3.2/10 🔴 CRITICAL - NEEDS REFACTORING

**Issues**:
- ❌ Service layer complexity too high
- ❌ No error handling
- ❌ Tightly coupled to database layer
- ❌ No input validation
- ⚠️  Duplicated transaction logic

**Estimated Fix Time**: 24 hours  
**Priority**: CRITICAL

---

## Endpoints Summary

| Method | Endpoint | Purpose | Grade |
|--------|----------|---------|-------|
| POST | `/api/5m1e` | Create draft | 3/10 |
| GET | `/api/5m1e` | List all records | 3/10 |
| GET | `/api/5m1e/:id` | Get by ID | 4/10 |
| PUT | `/api/5m1e/:id` | Update record | 2/10 |
| DELETE | `/api/5m1e/:id` | Delete record | 2/10 |
| POST | `/api/5m1e/:id/approve` | Approve record | 3/10 |

---

## 1. Create Draft (5M1E Record)

**Endpoint**: `POST /api/5m1e`  
**Authentication**: Required  
**Purpose**: Create a new 5M1E draft record

### Request

```json
{
  "title": "Wire Connector Assembly Defect",
  "supplierCN": "WIRE-INC",
  "reportNo": "QA-2026-001",
  "supplierId": "sup-uuid",
  "vendorId": "VENDOR-001",
  "itemId": "ITEM-001",
  "siteId": "site-uuid",
  "commodityId": "COMM-001",
  "impactDate": "2026-01-15",
  "dateRegister": "2026-02-02T00:00:00Z",
  
  // 5M Analysis
  "man": {
    "description": "Operator training insufficient",
    "action": "Conduct training"
  },
  "machine": {
    "description": "Machine calibration off",
    "action": "Recalibrate equipment"
  },
  "material": {
    "description": "Material batch defective",
    "action": "Return to supplier"
  },
  "method": {
    "description": "Process parameters incorrect",
    "action": "Update work instructions"
  },
  "measurement": {
    "description": "Inspection not thorough",
    "action": "Implement new SPC"
  },
  
  // Engineer Assessment
  "engineerRemarks": "Immediate containment action required",
  "modelId": "MODEL-001",
  "class": "CLASS-A",
  "classType": "TYPE-1"
}
```

### Response (201 Created)

```json
{
  "success": true,
  "status": 201,
  "data": {
    "id": "uuid",
    "controlNo": "TMP-26-1234",
    "status": "DRAFT",
    "title": "Wire Connector Assembly Defect",
    "createdBy": "user-id",
    "createdAt": "2026-02-02T10:30:00Z"
  },
  "message": "5M1E draft created successfully"
}
```

### Error Responses

```json
{
  "success": false,
  "status": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'title' is required",
    "fields": {
      "title": "Required"
    }
  }
}
```

---

## 2. Get All Records

**Endpoint**: `GET /api/5m1e`  
**Authentication**: Required  
**Query Params**:
- `status`: DRAFT, SUBMITTED, APPROVED, REJECTED, RAR
- `page`: Pagination (default: 1)
- `limit`: Records per page (default: 20)

### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "id": "uuid-1",
      "controlNo": "TMP-26-1234",
      "status": "DRAFT",
      "title": "Wire Connector Assembly Defect",
      "supplierCN": "WIRE-INC",
      "createdAt": "2026-02-02T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "pages": 8
  }
}
```

---

## 3. Get Record by ID

**Endpoint**: `GET /api/5m1e/:id`  
**Authentication**: Required

### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "data": {
    "id": "uuid",
    "controlNo": "TMP-26-1234",
    "status": "DRAFT",
    "title": "Wire Connector Assembly Defect",
    "supplierCN": "WIRE-INC",
    "reportNo": "QA-2026-001",
    "man": {
      "description": "Operator training insufficient",
      "action": "Conduct training"
    },
    "machine": { /* ... */ },
    "material": { /* ... */ },
    "method": { /* ... */ },
    "measurement": { /* ... */ },
    "engineerRemarks": "Immediate containment action required",
    "timestamps": {
      "createdAt": "2026-02-02T10:30:00Z",
      "updatedAt": "2026-02-02T10:30:00Z",
      "submittedAt": null,
      "approvedAt": null
    },
    "audit": {
      "createdBy": "user-id",
      "updatedBy": "user-id"
    }
  }
}
```

---

## 4. Update Record

**Endpoint**: `PUT /api/5m1e/:id`  
**Authentication**: Required  
**Restrictions**: Only DRAFT records can be freely updated

### Request

```json
{
  "title": "Updated Title",
  "man": {
    "description": "Updated man description",
    "action": "Updated action"
  },
  "status": "SUBMITTED"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "data": {
    "id": "uuid",
    "controlNo": "TMP-26-1234",
    "status": "SUBMITTED",
    "message": "5M1E record updated successfully"
  }
}
```

---

## 5. Approve Record

**Endpoint**: `POST /api/5m1e/:id/approve`  
**Authentication**: Required  
**Role Requirement**: Supervisor or Engineer lead

### Request

```json
{
  "approverRemarks": "Approved for implementation",
  "approvalType": "ENGINEERING" // or "QUALITY"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "data": {
    "id": "uuid",
    "controlNo": "TMP-26-1234",
    "status": "APPROVED",
    "approvedAt": "2026-02-02T11:00:00Z",
    "approvedBy": "supervisor-id"
  },
  "message": "5M1E record approved successfully"
}
```

---

## Status Workflow

```
DRAFT
  ↓ (Save)
DRAFT → SUBMITTED (Ready for approval)
  ↓
PENDING_APPROVAL (Awaiting engineer review)
  ↓
APPROVED ─→ IMPLEMENTED (Put into action)
  ↓
CLOSED (Verification complete)

Alternative:
SUBMITTED → REJECTED (Not approved)
REJECTED → DRAFT (Can revise) [Status: RAR = Rejected and Revise]
```

---

## Database Mapping

| DTO Field | DB Column | Type | Notes |
|-----------|-----------|------|-------|
| `id` | ID | UUID | Primary key |
| `controlNo` | ControlNo | String | TMP-YY-XXXX |
| `title` | Title | String | Problem title |
| `supplierCN` | SupplierCN | String | Supplier common name |
| `status` | Status | String | DRAFT, SUBMITTED, APPROVED, etc |
| `man` | MAN (JSON) | JSON | 5M data |
| `machine` | MACHINE (JSON) | JSON | 5M data |
| `material` | MATERIAL (JSON) | JSON | 5M data |
| `method` | METHOD (JSON) | JSON | 5M data |
| `measurement` | MEASUREMENT (JSON) | JSON | 5M data |

---

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Missing/invalid field |
| `UNAUTHORIZED` | 401 | No/invalid token |
| `FORBIDDEN` | 403 | No permission |
| `RECORD_NOT_FOUND` | 404 | ID doesn't exist |
| `INVALID_STATE_TRANSITION` | 409 | Cannot change status |
| `DATABASE_ERROR` | 500 | DB operation failed |

---

## Module Issues & Fixes

### Issue 1: Service Layer Complexity
**Current**: All logic in service layer  
**Fix**: Extract to repository, mappers, validators

### Issue 2: No Error Handling
**Current**: Generic catch-all  
**Fix**: Create error middleware with specific error codes

### Issue 3: No Input Validation
**Current**: Assumes valid data  
**Fix**: Add Zod schema validation

### Issue 4: Tight Coupling
**Current**: Service directly calls DB  
**Fix**: Inject repository dependency

---

## Implementation Roadmap

- [ ] Migrate to TypeScript
- [ ] Create error handler middleware
- [ ] Add input validation (Zod)
- [ ] Refactor service to use repository pattern
- [ ] Create unit tests
- [ ] Add integration tests
- [ ] Implement logging
- [ ] Add rate limiting

**Estimated Time**: 24 hours  
**Priority**: CRITICAL

---

**Document Owner**: Backend Team  
**Last Updated**: 2026-02-02  
**Grade**: 3.2/10 🔴
