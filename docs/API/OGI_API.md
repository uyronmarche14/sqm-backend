# OGI API Documentation

**Module**: Outgoing Goods Inspection  
**Base URL**: `/api/ogi`  
**Authentication**: JWT Bearer Token (Required)  
**Content-Type**: `application/json`  
**Version**: 1.0  
**Last Updated**: 2026-02-02

---

## Module Grade: 2.5/10 🔴 MEDIUM-HIGH PRIORITY

**Issues**:
- ⚠️  Status mapping hardcoded
- ❌ No input validation
- ❌ Minimal error handling
- ❌ DTOs embedded in controller

**Estimated Fix Time**: 10 hours  
**Priority**: MEDIUM-HIGH

---

## Endpoints Summary

| Method | Endpoint | Purpose | Grade |
|--------|----------|---------|-------|
| POST | `/api/ogi` | Create OGI record | 3/10 |
| GET | `/api/ogi` | List all records | 3/10 |
| GET | `/api/ogi/:id` | Get details | 4/10 |
| PUT | `/api/ogi/:id` | Update record | 3/10 |
| POST | `/api/ogi/:id/submit` | Submit for approval | 2/10 |

---

## 1. Create OGI Record

**Endpoint**: `POST /api/ogi`  
**Authentication**: Required

### Request

```json
{
  "siteId": "site-uuid",
  "supplierId": "supplier-uuid",
  "partId": "part-uuid",
  "remarks": "Final outgoing inspection before shipment",
  
  "lots": [
    {
      "lotNo": "LOT-2026-001",
      "quantity": 500,
      "inspectionDate": "2026-02-02T10:00:00Z"
    }
  ]
}
```

### Response (201 Created)

```json
{
  "success": true,
  "status": 201,
  "data": {
    "ogiId": "uuid",
    "controlNo": "OGI-26-0001",
    "status": "DRAFT",
    "createdAt": "2026-02-02T10:30:00Z"
  }
}
```

---

## 2. Get All OGI Records

**Endpoint**: `GET /api/ogi?status=DRAFT&page=1&limit=20`  
**Authentication**: Required

### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "ogiId": "uuid",
      "controlNo": "OGI-26-0001",
      "status": "DRAFT",
      "siteName": "Plant A",
      "supplierName": "Supplier XYZ",
      "uploadDate": "2026-02-02T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 345
  }
}
```

---

## 3. Get OGI Details

**Endpoint**: `GET /api/ogi/:id`  
**Authentication**: Required

### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "data": {
    "ogiId": "uuid",
    "controlNo": "OGI-26-0001",
    "status": "SUBMITTED",
    "references": {
      "siteName": "Plant A",
      "supplierName": "Supplier XYZ",
      "partCode": "PART-001",
      "partName": "Assembly"
    },
    "lots": [
      {
        "lotNo": "LOT-2026-001",
        "quantity": 500,
        "inspectionDate": "2026-02-02T10:00:00Z"
      }
    ],
    "remarks": "Final outgoing inspection",
    "timestamps": {
      "uploadDate": "2026-02-02T10:30:00Z",
      "submitDate": "2026-02-02T15:00:00Z"
    }
  }
}
```

---

## 4. Update OGI Record

**Endpoint**: `PUT /api/ogi/:id`  
**Authentication**: Required

### Request

```json
{
  "remarks": "Updated remarks",
  "lots": [
    {
      "lotNo": "LOT-2026-001",
      "quantity": 500,
      "inspectionDate": "2026-02-02T11:00:00Z"
    }
  ]
}
```

### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "message": "OGI record updated"
}
```

---

## 5. Submit OGI for Approval

**Endpoint**: `POST /api/ogi/:id/submit`  
**Authentication**: Required

### Request

```json
{
  "submittedBy": "inspector-id",
  "remarks": "Inspection complete, ready for approval"
}
```

### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "data": {
    "ogiId": "uuid",
    "status": "SUBMITTED",
    "submitDate": "2026-02-02T15:00:00Z"
  }
}
```

---

## Status Workflow

```
DRAFT → SUBMITTED → APPROVED → RELEASED
  ↓
  └─→ REJECTED → DRAFT (revise)
```

---

## Refactoring Priority

**Phase 1**: Extract DTOs and mappers  
**Phase 2**: Add validation  
**Phase 3**: Implement service layer

---

**Document Owner**: Backend Team  
**Last Updated**: 2026-02-02  
**Grade**: 2.5/10 🔴
