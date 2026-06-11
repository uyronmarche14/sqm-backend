# NPI Module - Refactored Architecture

**Date**: March 11, 2026  
**Status**: ✅ Refactored following clean architecture patterns

---

## 📊 Refactoring Results

### Before
- **Single Service File**: 420 lines
- **Mixed Concerns**: CRUD + Workflow + Mapping + Validation
- **No Interfaces**: Hard to test and maintain
- **Duplicate Logic**: Status mapping, date parsing repeated

### After
- **Focused Services**: 4 services, each <300 lines
- **Clear Separation**: CRUD, Workflow, Mapping separated
- **Interface-Based**: Easy to test and mock
- **Reusable Components**: Mapper, utilities extracted

---

## 🏗️ New Structure

```
npi/
├── services/
│   ├── INpiService.ts              # Service interface
│   ├── NpiCrudService.ts           # CRUD operations (280 lines)
│   ├── NpiWorkflowService.ts       # Workflow logic (180 lines)
│   └── NpiMapper.ts                # DTO mapping (60 lines)
├── npi.controller.new.ts           # Refactored controller
├── npi.controller.ts               # Original (for comparison)
├── npi.repository.ts               # Data access (unchanged)
├── npi.schema.ts                   # Validation schemas
├── npi.routes.ts                   # Route definitions
└── README_REFACTORED.md            # This file
```

---

## 🎯 Service Responsibilities

### 1. NpiCrudService
**Purpose**: Handle all CRUD operations

**Methods**:
- `getAllRecords()` - Get all NPI records with related data
- `getRecordById(id)` - Get single record with full details
- `createRecord(payload, userId, files)` - Create new NPI record
- `updateRecord(id, payload, userId, files)` - Update existing record
- `deleteRecord(id)` - Delete record and all related data
- `generateSequence(siteId)` - Generate control number

**Private Helpers**:
- `buildCreatePayload()` - Build insert payload
- `buildUpdatePayload()` - Build update payload
- `insertAttachments()` - Handle attachment insertion
- `insertVisualCategories()` - Handle visual category insertion
- `insertDataCategories()` - Handle data category insertion
- `insertDimensionCategories()` - Handle dimension category insertion
- `insertCCList()` - Handle CC list insertion

### 2. NpiWorkflowService
**Purpose**: Handle workflow state transitions

**Methods**:
- `submitForApproval(id, userId)` - DRAFT → SUBMITTED
- `checkRecord(id, userId, remarks)` - SUBMITTED → CHECKED
- `approveRecord(id, userId, remarks)` - CHECKED → APPROVED
- `rejectRecord(id, userId, remarks)` - Any → DRAFT
- `getAvailableActions(status, role)` - Get allowed actions

**Workflow States**:
```
DRAFT → SUBMITTED → CHECKED → APPROVED
  ↑         ↓          ↓
  └─────REJECTED──────┘
```

### 3. NpiMapper
**Purpose**: Transform data between layers

**Methods**:
- `toListDTO(record)` - Map to list view DTO
- `toListDTOs(records)` - Map multiple records
- `toDetailDTO(data)` - Map to detail view DTO
- `parseDate(date)` - Parse date strings safely

---

## 🔄 Migration Guide

### Step 1: Test New Implementation

```bash
# Run tests with new controller
npm test -- npi.controller.new.test.ts
```

### Step 2: Swap Controllers

```bash
# Backup original
mv npi.controller.ts npi.controller.old.ts

# Activate new controller
mv npi.controller.new.ts npi.controller.ts
```

### Step 3: Update Imports

```typescript
// In npi.routes.ts
import { npiController } from './npi.controller.js'; // Now uses refactored version
```

### Step 4: Verify Functionality

- [ ] Test GET /api/npi (list all)
- [ ] Test GET /api/npi/:id (get by ID)
- [ ] Test POST /api/npi (create)
- [ ] Test PUT /api/npi/:id (update)
- [ ] Test DELETE /api/npi/:id (delete)
- [ ] Test POST /api/npi/:id/submit (workflow)
- [ ] Test POST /api/npi/:id/check (workflow)
- [ ] Test POST /api/npi/:id/approve (workflow)
- [ ] Test POST /api/npi/:id/reject (workflow)

---

## 📝 Usage Examples

### Creating a Record

```typescript
// Controller automatically uses NpiCrudService
const result = await crudService.createRecord(payload, userId, files);

// Service handles:
// 1. Generate control number
// 2. Insert main record
// 3. Insert attachments
// 4. Insert categories
// 5. Insert CC list
// All in a single transaction
```

### Workflow Transition

```typescript
// Controller uses NpiWorkflowService
const result = await workflowService.submitForApproval(id, userId);

// Service handles:
// 1. Validate current status
// 2. Update status
// 3. Record timestamp
// 4. Send notifications (TODO)
```

### Mapping Data

```typescript
// Mapper handles all transformations
const dto = mapper.toDetailDTO({
  record,
  attachments,
  visual_categories,
  data_categories,
  dimension_categories,
  cc_list
});

// Returns clean DTO with:
// - Mapped status (DB code → Display name)
// - All related data included
// - Consistent field naming
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// Test NpiCrudService
describe('NpiCrudService', () => {
  let service: NpiCrudService;
  let mockRepository: jest.Mocked<NpiRepository>;
  let mockMapper: jest.Mocked<NpiMapper>;
  
  beforeEach(() => {
    mockRepository = createMockRepository();
    mockMapper = createMockMapper();
    service = new NpiCrudService(mockRepository, mockMapper);
  });
  
  it('should create record with all related data', async () => {
    // Test implementation
  });
});

// Test NpiWorkflowService
describe('NpiWorkflowService', () => {
  it('should submit record for approval', async () => {
    // Test implementation
  });
  
  it('should reject invalid status transitions', async () => {
    // Test implementation
  });
});

// Test NpiMapper
describe('NpiMapper', () => {
  it('should map database record to DTO', async () => {
    // Test implementation
  });
});
```

### Integration Tests

```typescript
describe('NPI API Integration', () => {
  it('should create and retrieve record', async () => {
    const response = await request(app)
      .post('/api/npi')
      .send(testPayload);
    
    expect(response.status).toBe(201);
    
    const getResponse = await request(app)
      .get(`/api/npi/${response.body.data.id}`);
    
    expect(getResponse.status).toBe(200);
  });
  
  it('should complete workflow cycle', async () => {
    // Create → Submit → Check → Approve
  });
});
```

---

## 🎨 Benefits of Refactoring

### 1. Maintainability ✅
- **Before**: 420-line service with mixed concerns
- **After**: 4 focused services, each <300 lines
- **Impact**: Easier to understand and modify

### 2. Testability ✅
- **Before**: Hard to test, tightly coupled
- **After**: Interface-based, easy to mock
- **Impact**: Can achieve >80% test coverage

### 3. Reusability ✅
- **Before**: Logic duplicated across methods
- **After**: Extracted to reusable helpers
- **Impact**: DRY principle applied

### 4. Extensibility ✅
- **Before**: Hard to add new features
- **After**: Clear extension points
- **Impact**: Easy to add notifications, validations, etc.

### 5. Consistency ✅
- **Before**: Inconsistent patterns
- **After**: Follows established patterns
- **Impact**: Consistent with other refactored modules

---

## 🚀 Next Steps

### Immediate
- [ ] Write comprehensive unit tests
- [ ] Write integration tests
- [ ] Update API documentation
- [ ] Deploy to staging
- [ ] Run QA tests

### Future Enhancements
- [ ] Add notification service integration
- [ ] Add caching for frequently accessed data
- [ ] Add validation service
- [ ] Add audit logging
- [ ] Add performance monitoring

---

## 📚 Related Documentation

- [Main Refactoring Plan](../../../../implementations/SQM_CLEANUP_REFACTORING_PLAN.md)
- [Module Refactoring Guide](../../../../implementations/MODULE_REFACTORING_GUIDE.md)
- [Workflow Status Standardization](../../../../implementations/WORKFLOW_STATUS_STANDARDIZATION.md)

---

## 🤝 Contributing

When adding new features to NPI module:

1. **CRUD Operations**: Add to `NpiCrudService`
2. **Workflow Logic**: Add to `NpiWorkflowService`
3. **Data Mapping**: Add to `NpiMapper`
4. **New Endpoints**: Add to `npi.controller.ts`
5. **Always**: Write tests first (TDD)

---

## ✅ Checklist

### Refactoring Complete
- [x] Create service interfaces
- [x] Split into focused services
- [x] Create mapper for DTOs
- [x] Update controller to use new services
- [x] Document new structure
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Deploy to staging
- [ ] QA verification
- [ ] Deploy to production

---

**Status**: Ready for testing and deployment  
**Next**: Write comprehensive tests and deploy to staging
