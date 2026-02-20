# NPI API Documentation

**Module**: New Part Introduction (Inspection & Approval)  
**Base URL**: `/api/npi`  
**Authentication**: JWT Bearer Token (Required)  
**Content-Type**: `application/json`  
**Version**: 1.0  
**Last Updated**: 2026-02-02

---

## Module Grade: 2.3/10 🔴 HIGH PRIORITY - REFACTOR

**Critical Issues**:
- ❌ N+1 query problem in getAllRecords
- ❌ No pagination (memory leak risk)
- ❌ Zero error handling
- ❌ Hardcoded defaults for critical fields
- ❌ No input validation

**Performance Risk**: Cannot scale beyond 1000 records  
**Estimated Fix Time**: 12 hours  
**Priority**: HIGH

---

## Endpoints Summary

| Method | Endpoint | Purpose | Grade |
|--------|----------|---------|-------|
| POST | `/api/npi` | Create NPI lot | 3/10 |
| GET | `/api/npi` | List all lots | 1/10 🔴 |
| GET | `/api/npi/:id` | Get lot details | 3/10 |
| PUT | `/api/npi/:id` | Update lot | 2/10 |
| POST | `/api/npi/:id/approve` | Approve lot | 2/10 |
| POST | `/api/npi/:id/defects` | Add defects | 1/10 |

---

## 1. Create NPI Lot

**Endpoint**: `POST /api/npi`  
**Authentication**: Required  
**Purpose**: Create new NPI inspection lot

### Request

```json
{
  "siteId": "site-uuid",
  "supplierId": "sup-uuid",
  "partId": "part-uuid",
  "modelId": "model-uuid",
  "partClassId": "partclass-uuid",
  "partTypeId": "parttype-uuid",
  
  "lotNo": "LOT-2026-001",
  "lotSize": 500,
  "invoiceNo": "INV-2026-0123",
  "poNo": "PO-2026-456",
  
  "sampleSize": 50,
  "inspectionMethodId": "method-uuid",
  "inspectionCategoryId": "cat-uuid",
  "inspectionDate": "2026-02-02T09:00:00Z",
  
  "environmentalData": {
    "temperature": 22.5,
    "humidity": 45.2
  },
  
  "dispositionId": "disposition-uuid",
  "rohsVerification": true
}
```

### Response (201 Created)

```json
{
  "success": true,
  "status": 201,
  "data": {
    "npiLotId": "uuid",
    "controlNo": "NPI-26-0001",
    "status": "DRAFT",
    "lotNo": "LOT-2026-001",
    "lotSize": 500,
    "sampleSize": 50,
    "createdAt": "2026-02-02T10:30:00Z"
  },
  "message": "NPI lot created successfully"
}
```

---

## 2. Get All NPI Lots ⚠️ PERFORMANCE WARNING

**Endpoint**: `GET /api/npi?page=1&limit=20&sort=-createdAt`  
**Authentication**: Required  
**⚠️  WARNING**: Current implementation has N+1 query problem  
**Maximum Safe Records**: 100 (will OOM beyond)

### Recommended Query Parameters

```
GET /api/npi?page=1&limit=20&status=PENDING&sort=-inspectionDate
```

### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "npiLotId": "uuid",
      "controlNo": "NPI-26-0001",
      "status": "PENDING_INSPECTION",
      "lotNo": "LOT-2026-001",
      "lotSize": 500,
      "sampleSize": 50,
      "siteName": "Manufacturing Plant A",
      "supplierName": "Supplier XYZ",
      "partName": "Connector Assembly",
      "inspectionDate": "2026-02-02T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2345,
    "pages": 118
  },
  "warning": "Large result sets. Consider using filters."
}
```

---

## 3. Get NPI Lot Details

**Endpoint**: `GET /api/npi/:id`  
**Authentication**: Required

### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "data": {
    "npiLotId": "uuid",
    "controlNo": "NPI-26-0001",
    "status": "INSPECTION_COMPLETE",
    "requestStatus": "PENDING",
    
    "lotDetails": {
      "lotNo": "LOT-2026-001",
      "lotSize": 500,
      "sampleSize": 50,
      "invoiceNo": "INV-2026-0123",
      "poNo": "PO-2026-456"
    },
    
    "references": {
      "siteName": "Manufacturing Plant A",
      "supplierId": "sup-uuid",
      "supplierName": "Supplier XYZ",
      "partId": "part-uuid",
      "partCode": "CONN-001",
      "partName": "Connector Assembly",
      "modelName": "Model-X"
    },
    
    "inspectionData": {
      "methodName": "Functional Test",
      "categoryName": "Electrical",
      "inspectionDate": "2026-02-02T09:00:00Z",
      "temperature": 22.5,
      "humidity": 45.2,
      "sampleSize": 50
    },
    
    "defects": {
      "visual": [
        {
          "defectType": "Scratches",
          "count": 5,
          "severity": "MINOR"
        }
      ],
      "functional": [
        {
          "defectType": "Intermittent Contact",
          "count": 2,
          "severity": "MAJOR"
        }
      ],
      "summary": {
        "totalMinor": 5,
        "totalMajor": 2,
        "totalCritical": 0
      }
    },
    
    "disposition": {
      "dispositionName": "ACCEPT",
      "rohsVerification": true
    },
    
    "approvals": {
      "inspectedBy": "Inspector Name",
      "checkedBy": "Checker Name",
      "approvedBy": "Approver Name",
      "approvedAt": null
    },
    
    "timestamps": {
      "createdAt": "2026-02-02T08:00:00Z",
      "inspectionCompletedAt": "2026-02-02T14:00:00Z",
      "approvedAt": null
    }
  }
}
```

---

## 4. Update NPI Lot

**Endpoint**: `PUT /api/npi/:id`  
**Authentication**: Required  
**Restrictions**: Only DRAFT can be freely updated

### Request

```json
{
  "sampleSize": 60,
  "inspectionDate": "2026-02-03T09:00:00Z",
  "environmentalData": {
    "temperature": 23.0,
    "humidity": 46.0
  }
}
```

### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "data": {
    "npiLotId": "uuid",
    "controlNo": "NPI-26-0001",
    "message": "NPI lot updated successfully"
  }
}
```

---

## 5. Record Defects

**Endpoint**: `POST /api/npi/:id/defects`  
**Authentication**: Required

### Request

```json
{
  "defects": {
    "visualCategory": {
      "defectTypes": [
        { "name": "Scratches", "count": 5, "severity": "MINOR" },
        { "name": "Dents", "count": 2, "severity": "MINOR" }
      ]
    },
    "dataCategory": {
      "defectTypes": [
        { "name": "Intermittent Contact", "count": 2, "severity": "MAJOR" },
        { "name": "Resistance Out of Spec", "count": 1, "severity": "MAJOR" }
      ]
    }
  },
  "inspectorNotes": "Found issues during functional testing"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "data": {
    "npiLotId": "uuid",
    "totalMinor": 7,
    "totalMajor": 3,
    "totalCritical": 0,
    "status": "INSPECTION_COMPLETE"
  }
}
```

---

## 6. Approve NPI Lot

**Endpoint**: `POST /api/npi/:id/approve`  
**Authentication**: Required  
**Role**: Approver

### Request

```json
{
  "approvalStatus": "APPROVED", // or REJECTED
  "remarks": "Lot approved for production use",
  "conditions": "Test at both temperature extremes"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "data": {
    "npiLotId": "uuid",
    "controlNo": "NPI-26-0001",
    "status": "APPROVED",
    "approvedAt": "2026-02-02T15:00:00Z",
    "approvedBy": "approver-id"
  }
}
```

---

## Data Structure

### Inspection Categories
- **Visual**: Surface defects, scratches, dents
- **Functional**: Electrical, mechanical operation
- **Dimensional**: Measurements out of spec
- **Other**: Miscellaneous

### Severity Levels
- **MINOR**: Cosmetic, doesn't affect function
- **MAJOR**: Affects function, usable with caution
- **CRITICAL**: Unusable, cannot accept

### Disposition Options
- **ACCEPT**: Lot approved for production
- **ACCEPT_WITH_CONDITIONS**: Approved with restrictions
- **REJECT**: Lot not approved
- **REWORK**: Can be reworked
- **SCRAP**: Must discard

---

## Performance Issues & Fixes

### Issue 1: N+1 Query Problem
**Current Code**:
```javascript
// Fetches all lots
const lotsResult = await pool.request().query(`SELECT * FROM NPI...`);
// Then for EACH lot, fetches defects
for (let lot of lotsResult.recordset) {
  lot.defects = await pool.request().query(`SELECT * FROM NPI_DEFECTS WHERE npi_lot_id = ?`);
}
```

**Problem**: If 1000 lots exist = 1001 queries!  
**Fix**: Fetch all defects in ONE query with JOIN

### Issue 2: No Pagination
**Current**: Fetches all records into memory  
**Fix**: Implement LIMIT/OFFSET

### Issue 3: Hardcoded Defaults
```javascript
const defaultInspectorId = null; // Can cause data inconsistency
```
**Fix**: Require inspector_id, don't default

---

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Invalid input |
| `UNAUTHORIZED` | 401 | No token |
| `FORBIDDEN` | 403 | No permission |
| `RECORD_NOT_FOUND` | 404 | Lot doesn't exist |
| `DEFECT_LIMIT_EXCEEDED` | 400 | Too many defects recorded |
| `INVALID_DISPOSITION` | 400 | Invalid disposition choice |
| `DATABASE_ERROR` | 500 | DB operation failed |

---

## Refactoring Roadmap

**Phase 1** (Week 1-2): Fix Critical Issues
- [ ] Add pagination
- [ ] Fix N+1 query problem
- [ ] Add input validation

**Phase 2** (Week 3): Refactoring
- [ ] Extract service layer
- [ ] Create repository pattern
- [ ] Add error middleware

**Phase 3** (Week 4): Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Load testing

---

**Document Owner**: Backend Team  
**Last Updated**: 2026-02-02  
**Grade**: 2.3/10 🔴  
**Status**: NEEDS URGENT REFACTORING
