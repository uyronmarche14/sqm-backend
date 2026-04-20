# Master Data CRUD Functionality Test Guide

## Overview
This document provides comprehensive testing instructions for all master data CRUD operations.

## Prerequisites
- Backend server running on http://localhost:3000
- Valid authentication token
- MAINTENANCE permissions (add, edit, delete)

## Authentication
```bash
# Login first to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Save the token
TOKEN="your_token_here"
```

## Test Pattern
Each master data endpoint follows the same pattern:
- GET /api/master-data/{resource} - List all
- POST /api/master-data/{resource} - Create new
- PUT /api/master-data/{resource}/:id - Update existing
- DELETE /api/master-data/{resource}/:id - Delete

---

## 1. SITES (Manufacturing Sites)

### Read All Sites
```bash
curl -X GET http://localhost:3000/api/master-data/sites \
  -H "Authorization: Bearer $TOKEN"
```

### Create Site
```bash
curl -X POST http://localhost:3000/api/master-data/sites \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Site",
    "code": "TST",
    "description": "Test manufacturing site",
    "isActive": true
  }'
```

### Update Site
```bash
curl -X PUT http://localhost:3000/api/master-data/sites/SITE-001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bangkok Plant Updated",
    "code": "BKK",
    "description": "Updated description",
    "isActive": true
  }'
```

### Delete Site
```bash
curl -X DELETE http://localhost:3000/api/master-data/sites/TEST-SITE-ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## 2. SUPPLIERS

### Read All Suppliers
```bash
curl -X GET http://localhost:3000/api/master-data/suppliers \
  -H "Authorization: Bearer $TOKEN"
```

### Create Supplier
```bash
curl -X POST http://localhost:3000/api/master-data/suppliers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Supplier Co.",
    "siteId": "SITE-001",
    "location": "Bangkok, Thailand",
    "description": "Test supplier",
    "isActive": true
  }'
```

### Update Supplier
```bash
curl -X PUT http://localhost:3000/api/master-data/suppliers/SUP-001 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ABC Electronics Co. Updated",
    "siteId": "SITE-001",
    "location": "Bangkok, Thailand",
    "description": "Updated supplier",
    "isActive": true
  }'
```

---

## 3. ROLES

### Read All Roles
```bash
curl -X GET http://localhost:3000/api/master-data/roles \
  -H "Authorization: Bearer $TOKEN"
```

### Create Role
```bash
curl -X POST http://localhost:3000/api/master-data/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Role",
    "description": "Test role description",
    "isActive": true
  }'
```

---

## 4. PRODUCTS

### Read All Products
```bash
curl -X GET http://localhost:3000/api/master-data/products \
  -H "Authorization: Bearer $TOKEN"
```

### Create Product
```bash
curl -X POST http://localhost:3000/api/master-data/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "code": "TEST-001",
    "description": "Test product description",
    "siteId": "SITE-001",
    "isActive": true
  }'
```

---

## 5. MODELS

### Read All Models
```bash
curl -X GET http://localhost:3000/api/master-data/models \
  -H "Authorization: Bearer $TOKEN"
```

### Create Model
```bash
curl -X POST http://localhost:3000/api/master-data/models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Model",
    "code": "TEST-MOD-001",
    "description": "Test model description",
    "productId": "PROD-001",
    "siteId": "SITE-001",
    "isActive": true
  }'
```

---

## 6. MANUFACTURING AREAS

### Read All Mfg Areas
```bash
curl -X GET http://localhost:3000/api/master-data/mfg-areas \
  -H "Authorization: Bearer $TOKEN"
```

### Create Mfg Area
```bash
curl -X POST http://localhost:3000/api/master-data/mfg-areas \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mfg_area_name": "Test Area",
    "mfg_area_desc": "Test manufacturing area",
    "active_flag": true
  }'
```

---

## 7. DEFECT CATEGORIES

### Read All Defect Categories
```bash
curl -X GET http://localhost:3000/api/master-data/defect-categories \
  -H "Authorization: Bearer $TOKEN"
```

### Create Defect Category
```bash
curl -X POST http://localhost:3000/api/master-data/defect-categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Defect Category",
    "acronym": "TDC",
    "description": "Test defect category",
    "isActive": true
  }'
```

---

## 8. DEFECTS

### Read All Defects
```bash
curl -X GET http://localhost:3000/api/master-data/defects \
  -H "Authorization: Bearer $TOKEN"
```

### Create Defect
```bash
curl -X POST http://localhost:3000/api/master-data/defects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Defect",
    "description": "Test defect description",
    "isActive": true
  }'
```

---

## 9. DEFECT CLASSES

### Read All Defect Classes
```bash
curl -X GET http://localhost:3000/api/master-data/defect-classes \
  -H "Authorization: Bearer $TOKEN"
```

### Create Defect Class
```bash
curl -X POST http://localhost:3000/api/master-data/defect-classes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Class",
    "description": "Test defect class",
    "isActive": true
  }'
```

---

## 10. DISPOSITIONS

### Read All Dispositions
```bash
curl -X GET http://localhost:3000/api/master-data/dispositions \
  -H "Authorization: Bearer $TOKEN"
```

### Create Disposition
```bash
curl -X POST http://localhost:3000/api/master-data/dispositions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Disposition",
    "description": "Test disposition",
    "isActive": true
  }'
```

---

## 11. SEVERITY LEVELS

### Read All Severity Levels
```bash
curl -X GET http://localhost:3000/api/master-data/severity \
  -H "Authorization: Bearer $TOKEN"
```

### Create Severity
```bash
curl -X POST http://localhost:3000/api/master-data/severity \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Severity",
    "description": "Test severity level",
    "isActive": true
  }'
```

---

## 12. AQL (Acceptable Quality Levels)

### Read All AQL
```bash
curl -X GET http://localhost:3000/api/master-data/aql \
  -H "Authorization: Bearer $TOKEN"
```

### Create AQL
```bash
curl -X POST http://localhost:3000/api/master-data/aql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test AQL 1.0/1.5",
    "minor": 1.0,
    "major": 1.5,
    "siteId": "SITE-001",
    "description": "Test AQL level",
    "isActive": true
  }'
```

---

## 13. INSPECTION CATEGORIES

### Read All Inspection Categories
```bash
curl -X GET http://localhost:3000/api/master-data/inspection-categories \
  -H "Authorization: Bearer $TOKEN"
```

### Create Inspection Category
```bash
curl -X POST http://localhost:3000/api/master-data/inspection-categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Inspection Category",
    "description": "Test inspection category",
    "isActive": true
  }'
```

---

## 14. INSPECTION METHODS

### Read All Inspection Methods
```bash
curl -X GET http://localhost:3000/api/master-data/inspection-methods \
  -H "Authorization: Bearer $TOKEN"
```

### Create Inspection Method
```bash
curl -X POST http://localhost:3000/api/master-data/inspection-methods \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Inspection Method",
    "description": "Test method",
    "defaultTemp": 25.0,
    "defaultHum": 50.0,
    "defaultValue": true,
    "isActive": true
  }'
```

---

## 15. INSPECTORS

### Read All Inspectors
```bash
curl -X GET http://localhost:3000/api/master-data/inspectors \
  -H "Authorization: Bearer $TOKEN"
```

### Create Inspector
```bash
curl -X POST http://localhost:3000/api/master-data/inspectors \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Inspector",
    "description": "Test inspector",
    "isActive": true
  }'
```

---

## 16. MNR TYPES

### Read All MNR Types
```bash
curl -X GET http://localhost:3000/api/master-data/mnr-types \
  -H "Authorization: Bearer $TOKEN"
```

### Create MNR Type
```bash
curl -X POST http://localhost:3000/api/master-data/mnr-types \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test MNR Type",
    "description": "Test MNR type",
    "isActive": true
  }'
```

---

## 17. PART CLASSES

### Read All Part Classes
```bash
curl -X GET http://localhost:3000/api/master-data/parts \
  -H "Authorization: Bearer $TOKEN"
```

### Create Part Class
```bash
curl -X POST http://localhost:3000/api/master-data/parts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Part Class",
    "description": "Test part class",
    "siteId": "SITE-001",
    "isActive": true
  }'
```

---

## 18. PART TYPES

### Read All Part Types
```bash
curl -X GET http://localhost:3000/api/master-data/part-types \
  -H "Authorization: Bearer $TOKEN"
```

### Create Part Type
```bash
curl -X POST http://localhost:3000/api/master-data/part-types \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Part Type",
    "code": "TPT",
    "description": "Test part type",
    "isActive": true
  }'
```

---

## 19. AUDIT CATEGORIES

### Read All Audit Categories
```bash
curl -X GET http://localhost:3000/api/master-data/audit-categories \
  -H "Authorization: Bearer $TOKEN"
```

### Create Audit Category
```bash
curl -X POST http://localhost:3000/api/master-data/audit-categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Audit Category",
    "code": "TAC",
    "description": "Test audit category",
    "withRating": true,
    "withAuditees": true,
    "withAuditors": true,
    "withAttendees": false,
    "withAuditPlan": true,
    "isActive": true
  }'
```

---

## 20. AUDIT TYPES

### Read All Audit Types
```bash
curl -X GET http://localhost:3000/api/master-data/audit-types \
  -H "Authorization: Bearer $TOKEN"
```

### Create Audit Type
```bash
curl -X POST http://localhost:3000/api/master-data/audit-types \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Audit Type",
    "description": "Test audit type",
    "auditCategoryId": "ACAT-001",
    "isActive": true
  }'
```

---

## 21. CRITERIAS

### Read All Criterias
```bash
curl -X GET http://localhost:3000/api/master-data/criterias \
  -H "Authorization: Bearer $TOKEN"
```

### Create Criteria
```bash
curl -X POST http://localhost:3000/api/master-data/criterias \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Criteria",
    "description": "Test criteria",
    "isActive": true
  }'
```

---

## 22. CERTIFICATIONS

### Read All Certifications
```bash
curl -X GET http://localhost:3000/api/master-data/certifications \
  -H "Authorization: Bearer $TOKEN"
```

### Create Certification
```bash
curl -X POST http://localhost:3000/api/master-data/certifications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Certification",
    "description": "Test certification",
    "isActive": true
  }'
```

---

## 23. GROUPS

### Read All Groups
```bash
curl -X GET http://localhost:3000/api/master-data/groups \
  -H "Authorization: Bearer $TOKEN"
```

### Create Group
```bash
curl -X POST http://localhost:3000/api/master-data/groups \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Group",
    "description": "Test group",
    "isActive": true
  }'
```

---

## 24. FAQ ITEMS

### Read All FAQ
```bash
curl -X GET http://localhost:3000/api/master-data/faq \
  -H "Authorization: Bearer $TOKEN"
```

### Create FAQ
```bash
curl -X POST http://localhost:3000/api/master-data/faq \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Test Question?",
    "answer": "Test Answer",
    "category": "Test",
    "isActive": true
  }'
```

---

## 25. TRAINING PROGRAMS

### Read All Training Programs
```bash
curl -X GET http://localhost:3000/api/master-data/training-programs \
  -H "Authorization: Bearer $TOKEN"
```

### Create Training Program
```bash
curl -X POST http://localhost:3000/api/master-data/training-programs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Training",
    "description": "Test training program",
    "durationHours": 8,
    "isActive": true
  }'
```

---

## 26. MESSAGES

### Read All Messages
```bash
curl -X GET http://localhost:3000/api/master-data/messages \
  -H "Authorization: Bearer $TOKEN"
```

### Create Message
```bash
curl -X POST http://localhost:3000/api/master-data/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Message",
    "content": "Test message content",
    "type": "General",
    "isActive": true
  }'
```

---

## Testing Checklist

### For Each Endpoint:
- [ ] GET - List all records (should return seeded data)
- [ ] POST - Create new record (verify 201 status)
- [ ] PUT - Update existing record (verify changes)
- [ ] DELETE - Delete test record (verify removal)
- [ ] Verify permission checks (try without MAINTENANCE permission)
- [ ] Verify validation (try with invalid data)

### Expected Results:
- All GET requests return 200 with data array
- POST requests return 201 with created object
- PUT requests return 200 with updated object
- DELETE requests return 200 with success message
- Unauthorized requests return 401/403
- Invalid data returns 400 with validation errors

## Automated Testing Script

Save this as `test_all_master_data.sh`:

```bash
#!/bin/bash

# Configuration
BASE_URL="http://localhost:3000/api"
TOKEN="your_token_here"

# Test function
test_endpoint() {
  local resource=$1
  echo "Testing $resource..."
  
  # GET
  echo "  GET /$resource"
  curl -s -X GET "$BASE_URL/master-data/$resource" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.[] | .id' | head -5
  
  echo "  ✓ GET completed"
  echo ""
}

# Test all endpoints
test_endpoint "sites"
test_endpoint "suppliers"
test_endpoint "roles"
test_endpoint "products"
test_endpoint "models"
test_endpoint "mfg-areas"
test_endpoint "defect-categories"
test_endpoint "defects"
test_endpoint "defect-classes"
test_endpoint "dispositions"
test_endpoint "severity"
test_endpoint "aql"
test_endpoint "inspection-categories"
test_endpoint "inspection-methods"
test_endpoint "inspectors"
test_endpoint "mnr-types"
test_endpoint "parts"
test_endpoint "part-types"
test_endpoint "audit-categories"
test_endpoint "audit-types"
test_endpoint "criterias"
test_endpoint "certifications"
test_endpoint "groups"
test_endpoint "faq"
test_endpoint "training-programs"
test_endpoint "messages"

echo "All tests completed!"
```

## Notes
- Replace `$TOKEN` with actual authentication token
- Replace test IDs with actual IDs from your database
- Ensure proper permissions before testing write operations
- Test in development environment first
