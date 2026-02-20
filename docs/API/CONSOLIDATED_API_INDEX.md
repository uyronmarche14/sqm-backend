# SQM Backend - Consolidated API Index

**Last Updated**: 2026-02-02  
**Owner**: Backend Architecture Team  
**Status**: Documentation Complete with Grading

---

## 📊 Quick Overview

```
┌─────────────────────────────────────────────────────────────┐
│ BACKEND API HEALTH REPORT                                  │
├─────────────────────────────────────────────────────────────┤
│ MNR Module ........................... 3.3/10 ⚠️  HIGH      │
│ 5M1E Module .......................... 3.2/10 🔴 CRITICAL  │
│ NPI Module ........................... 2.3/10 🔴 HIGH      │
│ OGI Module ........................... 2.5/10 🔴 MED-HIGH  │
│ Master Data Module ................... 2.4/10 🔴 CRITICAL  │
│ Authentication Module ................ 5/10  ⚠️  MEDIUM    │
│                                                             │
│ OVERALL SCORE: 2.9/10 🔴 PRODUCTION RISK                  │
│ Total Endpoints: 30+                                       │
│ Documented Endpoints: 25                                   │
│ Test Coverage: 0%                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 Documentation Map

### By Module

| Module | File | Endpoints | Grade | Status |
|--------|------|-----------|-------|--------|
| **MNR** | `MNR_API.md` | 5 endpoints | 3.3/10 | ⚠️ Documented |
| **5M1E** | `5M1E_API.md` | 6 endpoints | 3.2/10 | ⚠️ Documented |
| **NPI** | `NPI_API.md` | 6 endpoints | 2.3/10 | 🔴 Documented |
| **OGI** | `OGI_API.md` | 5 endpoints | 2.5/10 | ⚠️ Documented |
| **Master Data** | `MASTERDATA_API.md` | 20+ endpoints | 2.4/10 | 🔴 Documented |
| **Authentication** | `AUTH_API.md` | 4 endpoints | 5/10 | ✅ Needs Doc |

---

## 🔌 Full API Endpoint Map

### MNR Endpoints

```
POST   /api/mnr                    Create MNR record
GET    /api/mnr                    List all MNRs (paginated)
GET    /api/mnr/:id                Get MNR by ID
PUT    /api/mnr/:id                Update MNR
DELETE /api/mnr                    Delete MNR batch
```

**Base URL**: `http://localhost:3001/api/mnr`  
**Auth**: Required (JWT Bearer)  
**Documentation**: See `MNR_API.md`

---

### 5M1E Endpoints

```
POST   /api/5m1e                   Create 5M1E draft
GET    /api/5m1e                   List all records
GET    /api/5m1e/:id               Get by ID
PUT    /api/5m1e/:id               Update record
DELETE /api/5m1e/:id               Delete record
POST   /api/5m1e/:id/approve       Approve record
```

**Base URL**: `http://localhost:3001/api/5m1e`  
**Auth**: Required  
**Documentation**: See `5M1E_API.md`

---

### NPI Endpoints

```
POST   /api/npi                    Create NPI lot
GET    /api/npi                    List lots (⚠️ NO PAGINATION)
GET    /api/npi/:id                Get lot details
PUT    /api/npi/:id                Update lot
POST   /api/npi/:id/defects        Record defects
POST   /api/npi/:id/approve        Approve lot
```

**Base URL**: `http://localhost:3001/api/npi`  
**Auth**: Required  
**Warning**: Performance issues at scale  
**Documentation**: See `NPI_API.md`

---

### OGI Endpoints

```
POST   /api/ogi                    Create OGI record
GET    /api/ogi                    List records
GET    /api/ogi/:id                Get by ID
PUT    /api/ogi/:id                Update record
POST   /api/ogi/:id/submit         Submit for approval
```

**Base URL**: `http://localhost:3001/api/ogi`  
**Auth**: Required  
**Documentation**: See `OGI_API.md`

---

### Master Data Endpoints

#### Sites
```
POST   /api/master/sites           Create site
GET    /api/master/sites           List sites
PUT    /api/master/sites/:id       Update site
DELETE /api/master/sites/:id       Delete site
```

#### Suppliers
```
POST   /api/master/suppliers       Create supplier
GET    /api/master/suppliers       List suppliers
PUT    /api/master/suppliers/:id   Update supplier
DELETE /api/master/suppliers/:id   Delete supplier
```

#### Roles
```
POST   /api/master/roles           Create role
GET    /api/master/roles           List roles
PUT    /api/master/roles/:id       Update role
DELETE /api/master/roles/:id       Delete role
```

#### Models
```
POST   /api/master/models          Create model
GET    /api/master/models          List models
PUT    /api/master/models/:id      Update model
DELETE /api/master/models/:id      Delete model
```

#### Parts & Related
```
POST   /api/master/parts           Create part
GET    /api/master/parts           List parts
PUT    /api/master/parts/:id       Update part
DELETE /api/master/parts/:id       Delete part

POST   /api/master/part-classes    Create part class
POST   /api/master/part-types      Create part type
```

**Base URL**: `http://localhost:3001/api/master`  
**Auth**: Required  
**Documentation**: See `MASTERDATA_API.md`

---

### Authentication Endpoints

```
POST   /api/auth/register          Register user
POST   /api/auth/login             Login user
POST   /api/auth/refresh           Refresh JWT token
POST   /api/auth/logout            Logout user
```

**Base URL**: `http://localhost:3001/api/auth`  
**Auth**: Optional (login/register don't need token)  
**Documentation**: Needs to be created (Grade: 5/10)

---

## 🔐 Authentication & Authorization

### JWT Token
- **Issuer**: `sqm-api`
- **Audience**: `sqm-client`
- **Expiry**: 1 hour (configurable via `JWT_EXPIRES_IN`)
- **Refresh Token**: 7 days

### Required Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
X-Request-ID: <optional-uuid>
```

### Roles & Permissions
- **ADMIN**: Full access
- **ENGINEER**: Create/edit records, approve in limited cases
- **SUPERVISOR**: Approve records, manage team
- **INSPECTOR**: Inspect and report
- **VIEWER**: Read-only access

---

## 📊 Common Response Formats

### Success Response (200, 201)
```json
{
  "success": true,
  "status": 200,
  "data": { /* payload */ },
  "message": "Operation successful"
}
```

### Error Response (400+)
```json
{
  "success": false,
  "status": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field validation failed",
    "fields": {
      "email": "Invalid email format"
    },
    "timestamp": "2026-02-02T10:30:00Z",
    "requestId": "req-uuid"
  }
}
```

---

## 🚨 Critical Issues by Module

### MNR Module
- ❌ No input validation
- ❌ No error handling
- ⚠️  Transaction logic duplicated
- ⚠️  Response formats inconsistent

### 5M1E Module
- ❌ Service layer too complex
- ❌ No validation
- ❌ Tight coupling to DB
- ❌ Mapper duplicates code

### NPI Module 🔴 CRITICAL
- 🔴 N+1 query problem (cannot scale)
- 🔴 No pagination (memory leak)
- ❌ No validation
- ❌ Hardcoded defaults

### OGI Module
- ❌ DTOs embedded
- ❌ No validation
- ⚠️  Status mapping hardcoded

### Master Data Module 🔴 CRITICAL
- 🔴 Single 1800-line file
- 🔴 No service layer
- ❌ Zero validation
- ❌ Should be split into 5 modules

---

## 🔧 HTTP Status Codes

### Success Codes
| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | GET record, UPDATE record |
| 201 | Created | POST new record |
| 204 | No Content | DELETE successful |

### Client Error Codes
| Code | Meaning | Fix |
|------|---------|-----|
| 400 | Bad Request | Check request format |
| 401 | Unauthorized | Provide JWT token |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Verify record ID |
| 409 | Conflict | Invalid state transition |
| 422 | Unprocessable | Violates business logic |
| 429 | Too Many Requests | Rate limit exceeded, wait |

### Server Error Codes
| Code | Meaning | Action |
|------|---------|--------|
| 500 | Internal Error | Check server logs |
| 503 | Unavailable | Database down |

---

## 📈 Grading Breakdown

### By Criteria

| Criteria | Grade | Comments |
|----------|-------|----------|
| **Type Safety** | 2/10 | No TypeScript, loose objects |
| **Error Handling** | 1/10 | Generic catch-alls only |
| **Input Validation** | 0/10 | MISSING ENTIRELY |
| **Code Organization** | 3/10 | Some modules mixed |
| **Documentation** | 7/10 | Good (just completed) |
| **Testing** | 0/10 | Zero tests |
| **Performance** | 2/10 | N+1 queries, no pagination |
| **Security** | 4/10 | Has auth, but no input sanitization |

---

## 🛠️ Immediate Action Items

### Week 1: Error Handling & Validation
- [ ] Create `src/middleware/errorHandler.js`
- [ ] Create `src/utils/validators.js` (Zod)
- [ ] Create `src/utils/logger.js`
- [ ] Standardize response format

### Week 2-3: Module Refactoring
- [ ] Extract DTOs/mappers from controllers
- [ ] Create service layer for NPI, OGI
- [ ] Fix N+1 query in NPI
- [ ] Split Master Data into 5 modules

### Week 4: Testing
- [ ] Setup Jest + Supertest
- [ ] Write unit tests (20+ tests)
- [ ] Write integration tests (10+ tests)

---

## 📚 Documentation Files

All documentation is in: `/sqm-backend/docs/API/`

```
docs/API/
├── MNR_API.md                 ✅ Complete
├── 5M1E_API.md                ✅ Complete
├── NPI_API.md                 ✅ Complete
├── OGI_API.md                 ✅ Complete
├── MASTERDATA_API.md          ✅ Complete
├── AUTH_API.md                ⏳ To be created
├── CONSOLIDATED_API_INDEX.md  ✅ This file
└── REFACTORING_ROADMAP.md     ⏳ To be created
```

---

## 🚀 Quick Start Examples

### Create MNR (cURL)
```bash
curl -X POST http://localhost:3001/api/mnr \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mainDetails": {
      "mfgSites": "site-id",
      "supplier": "sup-id",
      "part": "part-id",
      "lotNo": "LOT-001",
      "lotSize": 100
    },
    "nonConformity": {
      "description": "Paint defect",
      "category": "APPEARANCE",
      "severity": "MAJOR"
    },
    "disposition": {
      "action": "REWORK",
      "usageAllowed": false
    }
  }'
```

### Get NPI Lot (JavaScript)
```javascript
async function getNPILot(id, token) {
  const response = await fetch(`http://localhost:3001/api/npi/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  if (!data.success) {
    console.error(data.error.message);
    return null;
  }
  
  return data.data;
}
```

---

## 🔍 Troubleshooting

### Issue: 401 Unauthorized
**Cause**: Missing or invalid JWT token  
**Fix**: 
1. Login: `POST /api/auth/login`
2. Copy `accessToken` from response
3. Use in Authorization header: `Bearer <token>`

### Issue: 404 Not Found
**Cause**: Record doesn't exist or wrong ID  
**Fix**:
1. Verify ID is correct UUID
2. Check if record was deleted
3. Verify permissions allow access

### Issue: 422 Unprocessable Entity
**Cause**: Business logic violation  
**Fix**: Check error message for specific field issue

### Issue: 500 Internal Server Error
**Cause**: Database or server error  
**Action**:
1. Check server logs: `docker logs sqm-backend`
2. Verify database is running
3. Check if all required tables exist

---

## 📞 Support & Escalation

### Bug Report
1. Document the exact request
2. Include response status + body
3. Check server logs
4. Create GitHub issue with reproduction steps

### Performance Issues
1. Check NPI module pagination settings
2. Monitor database query times
3. Review logs for N+1 queries
4. Contact DevOps team

### Database Issues
1. Check connection string
2. Verify database is accessible
3. Run migrations: `npm run migrate`
4. Check for schema mismatches

---

## 📋 Next Review Date

**Last Updated**: 2026-02-02  
**Next Review**: 2026-02-09  
**Owner**: Backend Architecture Team

---

## Appendix: File Structure

```
sqm-backend/
├── src/
│   ├── app.js
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── mnr.controller.js (1118 lines)
│   │   ├── fiveM1E.controller.js
│   │   ├── npi.controller.js (821 lines)
│   │   ├── ogi.controller.js (371 lines)
│   │   ├── masterData.controller.js (1848 lines) ⚠️ NEEDS SPLIT
│   │   └── user.controller.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── mnr.routes.js
│   │   ├── fiveM1E.routes.js
│   │   ├── npi.routes.js
│   │   ├── ogi.routes.js
│   │   └── masterData.routes.js
│   ├── services/
│   │   └── fiveM1E.service.js (231 lines)
│   ├── repositories/
│   │   └── fiveM1E.repository.js (199 lines)
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── errorHandler.js (❌ MISSING)
│   └── utils/
│       ├── fiveM1E.mapper.js
│       ├── validators.js (❌ MISSING)
│       └── logger.js (❌ MISSING)
└── docs/
    └── API/
        ├── MNR_API.md
        ├── 5M1E_API.md
        ├── NPI_API.md
        ├── OGI_API.md
        ├── MASTERDATA_API.md
        └── CONSOLIDATED_API_INDEX.md (THIS FILE)
```

---

**Version**: 1.0  
**Status**: Complete  
**For Questions**: See individual API documentation files
