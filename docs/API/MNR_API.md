# MNR API Documentation

**Module**: Material Non-Conformance Report  
**Base URL**: `/api/mnr`  
**Authentication**: JWT Bearer Token (Required)  
**Content-Type**: `application/json`  
**Version**: 1.0  
**Last Updated**: 2026-02-02

---

## Module Grade: 3.3/10 🔴 NEEDS REFACTORING

**Issues**:
- ❌ No error handling for edge cases
- ❌ Zero input validation  
- ❌ Inconsistent response formats
- ❌ No transaction rollback logging
- ⚠️  Duplicated database logic

**Estimated Fix Time**: 16 hours  
**Priority**: HIGH

---

## API Endpoints

### 1. Create MNR Record
**Endpoint**: `POST /api/mnr`  
**Authentication**: Required (JWT)  
**Rate Limit**: 10 requests/minute per user

#### Request

```typescript
// Request Body Schema
{
  // Main Details
  mainDetails: {
    mfgSites: string;           // Site ID (FK)
    supplier: string;            // Supplier ID (FK)
    part: string;                // Part ID (FK)
    partClass?: string;          // Optional
    partType?: string;           // Optional
    
    // Identification
    controlNo?: string;           // Auto-generated: MNR-YY-XXX
    reportNo?: string;
    lotNo: string;
    lotSize: number;
    
    // Documents
    invoiceNo?: string;
    poNo?: string;
    
    // Dates
    receivedDate: Date;
    reportDate: Date;
    
    // Tags
    tags?: string[];
  };
  
  // Nonconformity Details
  nonConformity: {
    description: string;
    category: 'SPECIFICATION' | 'APPEARANCE' | 'FUNCTIONALITY' | 'DOCUMENTATION' | 'OTHER';
    severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
    immediateAction?: string;
    temporaryMeasure?: string;
  };
  
  // Disposition
  disposition: {
    action: 'ACCEPT' | 'SCRAP' | 'REWORK' | 'RETURN' | 'OTHER';
    reworkPlan?: string;
    usageAllowed: boolean;
    usageConditions?: string;
  };
  
  // Approval
  approval?: {
    supervisor?: string;        // User ID
    remarks?: string;
  };
  
  // 8D Response (optional)
  response8D?: {
    containmentAction: string;
    rootCause: string;
    permanentCorrectiveAction: string;
    preventiveMeasures: string;
  };
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "status": 201,
  "data": {
    "id": "uuid-here",
    "controlNo": "MNR-26-0534",
    "status": "DRAFT",
    "createdBy": "user-id",
    "createdAt": "2026-02-02T10:30:00Z",
    "mainDetails": {
      "mfgSites": "site-id",
      "supplier": "supplier-id",
      "part": "part-id",
      "lotNo": "LOT-2026-001",
      "controlNo": "MNR-26-0534"
    }
  },
  "message": "MNR record created successfully"
}
```

#### Error Responses

```json
// 400 Bad Request - Missing required field
{
  "success": false,
  "status": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'mainDetails.mfgSites' is required",
    "fields": {
      "mainDetails": {
        "mfgSites": "Required"
      }
    },
    "timestamp": "2026-02-02T10:30:00Z",
    "requestId": "req-uuid"
  }
}

// 401 Unauthorized
{
  "success": false,
  "status": 401,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No token provided or token expired",
    "timestamp": "2026-02-02T10:30:00Z",
    "requestId": "req-uuid"
  }
}

// 500 Internal Server Error (Database)
{
  "success": false,
  "status": 500,
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to insert MNR record",
    "details": "Transaction rollback: Foreign key constraint failed",
    "timestamp": "2026-02-02T10:30:00Z",
    "requestId": "req-uuid"
  }
}
```

#### cURL Example

```bash
curl -X POST http://localhost:3001/api/mnr \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mainDetails": {
      "mfgSites": "site-123",
      "supplier": "sup-456",
      "part": "part-789",
      "lotNo": "LOT-2026-001",
      "lotSize": 100,
      "reportDate": "2026-02-02T00:00:00Z"
    },
    "nonConformity": {
      "description": "Received parts with paint defects",
      "category": "APPEARANCE",
      "severity": "MAJOR"
    },
    "disposition": {
      "action": "REWORK",
      "usageAllowed": false
    }
  }'
```

---

### 2. Get All MNR Records
**Endpoint**: `GET /api/mnr`  
**Authentication**: Required  
**Query Parameters**:
- `status`: Filter by status (DRAFT, SUBMITTED, APPROVED, etc.)
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 20, max: 100)
- `sort`: Sort field (default: createdAt, use `-` for desc)

#### Request

```
GET /api/mnr?status=APPROVED&page=1&limit=20&sort=-createdAt
```

#### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "data": [
    {
      "id": "uuid-1",
      "controlNo": "MNR-26-0534",
      "status": "APPROVED",
      "mainDetails": { /* ... */ },
      "createdAt": "2026-02-02T10:30:00Z"
    },
    {
      "id": "uuid-2",
      "controlNo": "MNR-26-0535",
      "status": "APPROVED",
      "mainDetails": { /* ... */ },
      "createdAt": "2026-02-01T10:30:00Z"
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

#### Error Response

```json
{
  "success": false,
  "status": 400,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Invalid status value: 'UNKNOWN'",
    "validValues": ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
    "timestamp": "2026-02-02T10:30:00Z",
    "requestId": "req-uuid"
  }
}
```

---

### 3. Get MNR Record by ID
**Endpoint**: `GET /api/mnr/:id`  
**Authentication**: Required  
**Parameters**:
- `id`: MNR Record ID (UUID)

#### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "data": {
    "id": "uuid-here",
    "controlNo": "MNR-26-0534",
    "status": "DRAFT",
    "mainDetails": {
      "mfgSites": "site-id",
      "supplier": "supplier-id",
      "part": "part-id",
      "lotNo": "LOT-2026-001"
    },
    "nonConformity": {
      "description": "Received parts with paint defects",
      "category": "APPEARANCE",
      "severity": "MAJOR"
    },
    "disposition": {
      "action": "REWORK",
      "usageAllowed": false
    },
    "approval": null,
    "response8D": null,
    "timestamps": {
      "createdAt": "2026-02-02T10:30:00Z",
      "updatedAt": "2026-02-02T10:30:00Z",
      "submittedAt": null,
      "approvedAt": null
    },
    "audit": {
      "createdBy": "user-id-1",
      "updatedBy": "user-id-1"
    }
  }
}
```

#### Error Responses

```json
// 404 Not Found
{
  "success": false,
  "status": 404,
  "error": {
    "code": "RECORD_NOT_FOUND",
    "message": "MNR record with ID 'uuid-here' not found",
    "timestamp": "2026-02-02T10:30:00Z",
    "requestId": "req-uuid"
  }
}

// 403 Forbidden - User doesn't have access
{
  "success": false,
  "status": 403,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to view this MNR record",
    "reason": "Record belongs to a different business unit",
    "timestamp": "2026-02-02T10:30:00Z",
    "requestId": "req-uuid"
  }
}
```

---

### 4. Update MNR Record
**Endpoint**: `PUT /api/mnr/:id`  
**Authentication**: Required  
**Status Restrictions**:
- Can only edit DRAFT records freely
- SUBMITTED records need approver override
- APPROVED records locked

#### Request

```json
{
  "mainDetails": {
    "lotSize": 150
  },
  "nonConformity": {
    "description": "Updated description",
    "severity": "CRITICAL"
  },
  "status": "SUBMITTED",
  "remarks": "Ready for approval"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "data": {
    "id": "uuid-here",
    "controlNo": "MNR-26-0534",
    "status": "SUBMITTED",
    "message": "MNR record updated successfully"
  }
}
```

#### Error Responses

```json
// 409 Conflict - Record status doesn't allow update
{
  "success": false,
  "status": 409,
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Cannot update MNR record in APPROVED status",
    "currentStatus": "APPROVED",
    "allowedTransitions": [],
    "timestamp": "2026-02-02T10:30:00Z",
    "requestId": "req-uuid"
  }
}

// 422 Unprocessable Entity - Business logic violation
{
  "success": false,
  "status": 422,
  "error": {
    "code": "BUSINESS_LOGIC_ERROR",
    "message": "Cannot submit MNR without supervisor approval",
    "field": "approval.supervisor",
    "timestamp": "2026-02-02T10:30:00Z",
    "requestId": "req-uuid"
  }
}
```

---

### 5. Delete MNR Records (Batch)
**Endpoint**: `DELETE /api/mnr`  
**Authentication**: Required  
**Body**: Array of IDs to delete

#### Request

```json
{
  "ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "status": 200,
  "data": {
    "deleted": 3,
    "failed": 0,
    "deletedIds": ["uuid-1", "uuid-2", "uuid-3"]
  },
  "message": "3 MNR records deleted successfully"
}
```

#### Error Response

```json
{
  "success": false,
  "status": 400,
  "error": {
    "code": "PARTIAL_DELETE_FAILURE",
    "message": "Some records could not be deleted",
    "deleted": 2,
    "failed": 1,
    "failures": [
      {
        "id": "uuid-3",
        "reason": "Record is in APPROVED status and cannot be deleted"
      }
    ],
    "timestamp": "2026-02-02T10:30:00Z",
    "requestId": "req-uuid"
  }
}
```

---

## Status Workflow

```
DRAFT
  ↓ (Create)
DRAFT → SUBMITTED (User submits)
  ↓
AAPPROVAL (Awaiting Approval)
  ↓ (Approve or Reject)
APPROVED ─→ ISSUED (Formal issue)
  ↓
RESPONSE_AWAITING (Supplier responds)
  ↓
RESPONSE_RECEIVED (Response submitted)
  ↓
CLOSED (Completed)

Alternative Paths:
SUBMITTED → REJECTED (Approval denied)
REJECTED → DRAFT (Can revise)
RESPONSE_AWAITING → RESPONSE_AWAIT_APPROVAL (Response needs review)
```

---

## Status Code Mapping

### Frontend to Database

| Frontend Status | DB Code | Description |
|-----------------|---------|-------------|
| DRAFT | DR | Draft record |
| NEW | NW | New record |
| PENDING | PN | Pending review |
| SUBMITTED | SU | Submitted for approval |
| AAPPROVAL | AA | Awaiting approval |
| APPROVED | AP | Approved |
| REJECTED | RE | Rejected |
| ISSUED | IS | Officially issued |
| FR | FR | Further review |
| IR | IR | Initial response |
| REPORT | RP | Report stage |
| RESPONSE_AWAITING | RW | Response awaited |
| RESPONSE_AWAIT_APPROVAL | RA | Response awaiting approval |
| RESPONSE_RECEIVED | RC | Response received |
| RREJECTED | RJ | Response rejected |
| RELEASE | RL | Released |
| HOLD | HO | On hold |
| CANCEL | CA | Cancelled |
| CLOSED | CL | Closed |

---

## Common HTTP Status Codes

| Code | Scenario | Example |
|------|----------|---------|
| **200** | Success with data | GET record, Update record |
| **201** | Created | POST new record |
| **204** | Success no content | DELETE record |
| **400** | Bad request/validation | Missing required field |
| **401** | Unauthorized | No/invalid token |
| **403** | Forbidden | Insufficient permissions |
| **404** | Not found | Record doesn't exist |
| **409** | Conflict | Invalid state transition |
| **422** | Unprocessable | Business logic violation |
| **429** | Too many requests | Rate limit exceeded |
| **500** | Server error | Database error |
| **503** | Unavailable | Database down |

---

## Error Code Reference

| Code | HTTP | Meaning | Action |
|------|------|---------|--------|
| `VALIDATION_ERROR` | 400 | Input validation failed | Check `fields` object for details |
| `UNAUTHORIZED` | 401 | Missing/invalid token | Refresh token or re-authenticate |
| `FORBIDDEN` | 403 | No permission | Contact admin |
| `RECORD_NOT_FOUND` | 404 | Record doesn't exist | Verify ID is correct |
| `INVALID_STATE_TRANSITION` | 409 | Invalid status change | Check `allowedTransitions` |
| `BUSINESS_LOGIC_ERROR` | 422 | Business rule violated | Fix issue in `field` |
| `DATABASE_ERROR` | 500 | Database operation failed | Retry or contact support |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait before retrying |
| `DUPLICATE_RECORD` | 409 | Record already exists | Use UPDATE instead |
| `FOREIGN_KEY_ERROR` | 400 | Referenced record not found | Verify foreign key IDs |

---

## DTOs & Type Definitions

### MNR Record DTO

```typescript
interface MnrRecord {
  id: string;
  controlNo: string;
  status: MnrStatus;
  mainDetails: MainDetails;
  nonConformity: NonConformity;
  disposition: Disposition;
  approval?: Approval;
  response8D?: Response8D;
  timestamps: {
    createdAt: Date;
    updatedAt: Date;
    submittedAt?: Date;
    approvedAt?: Date;
    closedAt?: Date;
  };
  audit: {
    createdBy: string;
    updatedBy: string;
  };
}

type MnrStatus = 
  | 'DRAFT'
  | 'NEW'
  | 'PENDING'
  | 'SUBMITTED'
  | 'AAPPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'ISSUED'
  | 'RESPONSE_AWAITING'
  | 'RESPONSE_AWAIT_APPROVAL'
  | 'RESPONSE_RECEIVED'
  | 'CLOSED';

interface MainDetails {
  mfgSites: string;
  supplier: string;
  part: string;
  partClass?: string;
  partType?: string;
  controlNo: string;
  reportNo?: string;
  lotNo: string;
  lotSize: number;
  invoiceNo?: string;
  poNo?: string;
  receivedDate: Date;
  reportDate: Date;
  tags?: string[];
}

interface NonConformity {
  description: string;
  category: 'SPECIFICATION' | 'APPEARANCE' | 'FUNCTIONALITY' | 'DOCUMENTATION' | 'OTHER';
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  immediateAction?: string;
  temporaryMeasure?: string;
}

interface Disposition {
  action: 'ACCEPT' | 'SCRAP' | 'REWORK' | 'RETURN' | 'OTHER';
  reworkPlan?: string;
  usageAllowed: boolean;
  usageConditions?: string;
}

interface Approval {
  supervisor?: string;
  remarks?: string;
  approvedAt?: Date;
}

interface Response8D {
  containmentAction: string;
  rootCause: string;
  permanentCorrectiveAction: string;
  preventiveMeasures: string;
  submittedAt?: Date;
}
```

---

## Mapper Functions

### mapToDTO (Database → Frontend)

```javascript
function mapToDTO(dbRecord) {
  return {
    id: dbRecord.id,
    controlNo: dbRecord.control_no,
    status: mapStatusFromDB(dbRecord.request_status),
    mainDetails: {
      mfgSites: dbRecord.site_id,
      supplier: dbRecord.supplier_id,
      part: dbRecord.part_id,
      lotNo: dbRecord.lot_no,
      lotSize: dbRecord.lot_size,
      reportDate: dbRecord.report_date,
      // ... other fields
    },
    timestamps: {
      createdAt: dbRecord.created_date,
      updatedAt: dbRecord.last_update,
    }
  };
}
```

### mapToSQL (Frontend → Database)

```javascript
function mapToSQL(dto) {
  return {
    id: dto.id,
    control_no: dto.controlNo,
    request_status: mapStatusToDB(dto.status),
    site_id: dto.mainDetails.mfgSites,
    supplier_id: dto.mainDetails.supplier,
    part_id: dto.mainDetails.part,
    lot_no: dto.mainDetails.lotNo,
    lot_size: dto.mainDetails.lotSize,
    report_date: dto.mainDetails.reportDate,
    // ... other fields
    last_update: new Date(),
  };
}
```

---

## Authentication & Authorization

### Required Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
X-Request-ID: <optional-uuid>
```

### JWT Payload

```json
{
  "userId": "user-id-uuid",
  "email": "user@company.com",
  "roleId": "role-id-uuid",
  "siteId": "site-id-uuid",
  "iat": 1707130200,
  "exp": 1707133800
}
```

### Permissions Required

| Operation | Minimum Role | Additional Checks |
|-----------|--------------|-------------------|
| CREATE | Engineer | Belongs to same site |
| READ | Any authenticated | Can view own/site records |
| UPDATE (DRAFT) | Engineer | Record owner or admin |
| UPDATE (SUBMIT) | Engineer | Status allows transition |
| APPROVE | Supervisor+ | Has approval authority |
| DELETE | Admin | Record in deletable status |

---

## Rate Limiting

- **Authenticated Users**: 100 requests/minute
- **Per User Endpoint**: 10 requests/minute
- **Burst Limit**: 20 requests in 10 seconds

**Response Header**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1707130860
```

---

## Versioning Strategy

**Current Version**: 1.0  
**Release Date**: 2026-02-02

### Planned Changes (v1.1)
- [ ] Add batch import endpoint
- [ ] Add export to Excel/PDF
- [ ] Add advanced filtering
- [ ] Add audit trail endpoint

### Breaking Changes (v2.0 - Future)
- Response format changes
- Status enumeration changes
- DTO restructuring

**Migration Path**: Old API maintained for 6 months with deprecation warnings.

---

## Testing

### Prerequisites
```bash
npm install --save-dev jest supertest
```

### Example Test Case
```javascript
describe('MNR API', () => {
  describe('POST /api/mnr', () => {
    it('should create MNR record with valid data', async () => {
      const response = await request(app)
        .post('/api/mnr')
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.controlNo).toMatch(/^MNR-\d{2}-\d{4}$/);
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/mnr')
        .set('Authorization', `Bearer ${token}`)
        .send({}); // Empty body
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
```

---

## Integration Examples

### JavaScript/Fetch

```javascript
async function createMNR(mrnData) {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('http://api.company.com/api/mnr', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mrnData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return response.json();
}

// Usage
try {
  const result = await createMNR({
    mainDetails: { /* ... */ },
    nonConformity: { /* ... */ },
    disposition: { /* ... */ },
  });
  console.log('Created MNR:', result.data.controlNo);
} catch (error) {
  console.error('Failed:', error.message);
}
```

### React Query Hook

```typescript
import { useMutation, useQuery } from '@tanstack/react-query';

export function useMNRAPI() {
  return useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/mnr', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log('MNR created:', data);
      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['mnr'] });
    },
    onError: (error) => {
      console.error('Error:', error);
    },
  });
}
```

---

## Summary Table

| Feature | Status | Notes |
|---------|--------|-------|
| Create Record | ✅ Implemented | Grade: 4/10 - Needs validation |
| List Records | ✅ Implemented | Grade: 3/10 - No pagination |
| Get by ID | ✅ Implemented | Grade: 4/10 - Good |
| Update Record | ✅ Implemented | Grade: 3/10 - No state machine |
| Delete Records | ✅ Implemented | Grade: 2/10 - Batch delete risky |
| Error Handling | ❌ Not Implemented | Grade: 1/10 - Use generic 500 |
| Input Validation | ❌ Not Implemented | Grade: 0/10 - Critical gap |
| Rate Limiting | ❌ Not Implemented | Grade: 0/10 - No protection |
| Testing | ❌ Not Implemented | Grade: 0/10 - Zero coverage |

---

## Next Steps

1. **This Week**:
   - [ ] Implement error handling middleware
   - [ ] Add input validation using Zod
   - [ ] Standardize response format

2. **Next Week**:
   - [ ] Create service layer (separate from controller)
   - [ ] Migrate to TypeScript
   - [ ] Add unit tests

3. **Ongoing**:
   - [ ] Monitor error rates
   - [ ] Track performance metrics
   - [ ] Gather user feedback

---

**Document Owner**: Backend Team  
**Last Updated**: 2026-02-02  
**Next Review**: 2026-02-09  
**Approval**: Pending
