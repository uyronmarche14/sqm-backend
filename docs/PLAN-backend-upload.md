# PLAN: Backend Upload Standardization

## Objective
Wire up multer file upload middleware to all module routes (MNR, 5M1E, SQPR, OGI-UP, SQM Plan, QMQA) so they can receive `multipart/form-data` requests containing file attachments. Currently **only NPI (New Parts)** has this wired.

## Current State (Audit Results)

| Module | Route File | Has `upload.any()`? | Controller reads `req.files`? | DB has attachment table? |
|--------|-----------|---------------------|------------------------------|--------------------------|
| **NPI** | `npi.routes.js` | ✅ Yes | ✅ Yes | ✅ Yes |
| **MNR** | `mnr.routes.js` | ❌ No | ❌ No | ⚠️ Unknown |
| **5M1E** | `fiveM1E.routes.js` | ❌ No | ❌ No | ⚠️ Unknown |
| **SQPR** | `sqpr.routes.js` | ❌ No | ❌ No | ⚠️ Unknown |
| **OGI** | `ogi.routes.js` | ❌ No | ❌ No | ⚠️ Unknown |
| **SQMP** | `sqmp.routes.js` | ❌ No | ❌ No | ⚠️ Unknown |
| **QMQA** | `qmqa.routes.js` | ❌ No | ❌ No | Has middleware but unwired |

### Existing Middleware Files
1. `src/middleware/fileUpload.js` — **Generic**, saves to `uploads/`, used by NPI only
2. `src/middleware/file-upload.middleware.js` — **QMQA-specific**, saves to `uploads/qmqa/`, with file type validation and error handling, **NOT wired into any route**

### Gold Standard Reference
**NPI routes** (`npi.routes.js` lines 14-15):
```js
import { upload } from '../middleware/fileUpload.js';
// ...
router.post('/', upload.any(), npiController.createRecord);
router.put('/:id', upload.any(), npiController.updateRecord);
```

---

## Proposed Changes

### Phase 1: Route Wiring (Low Risk)
Add `upload.any()` middleware to POST and PUT routes for each module.

> [!IMPORTANT]
> `upload.any()` is safe — it accepts files but doesn't break JSON-only requests. If no files are sent, `req.files` is simply an empty array. This is a **non-breaking change**.

---

#### [MODIFY] `mnr.routes.js`
```diff
 import express from 'express';
 import * as mnrController from '../controllers/mnr.controller.js';
 import { authenticateToken } from '../middleware/auth.middleware.js';
+import { upload } from '../middleware/fileUpload.js';

-router.post('/', mnrController.createRecord);
+router.post('/', upload.any(), mnrController.createRecord);
-router.put('/:id', mnrController.updateRecord);
+router.put('/:id', upload.any(), mnrController.updateRecord);
```

#### [MODIFY] `fiveM1E.routes.js`
```diff
+import { upload } from '../middleware/fileUpload.js';

-router.post('/', createRecord);
+router.post('/', upload.any(), createRecord);
-router.put('/:id', updateRecord);
+router.put('/:id', upload.any(), updateRecord);
```

#### [MODIFY] `sqpr.routes.js`
```diff
+import { upload } from '../middleware/fileUpload.js';

-router.post('/', sqprController.createRecord);
+router.post('/', upload.any(), sqprController.createRecord);
-router.put('/:id', sqprController.updateRecord);
+router.put('/:id', upload.any(), sqprController.updateRecord);
```

#### [MODIFY] `ogi.routes.js`
```diff
+import { upload } from '../middleware/fileUpload.js';

-router.post('/', ogiController.createRecord);
+router.post('/', upload.any(), ogiController.createRecord);
-router.put('/:id', ogiController.updateRecord);
+router.put('/:id', upload.any(), ogiController.updateRecord);
```

#### [MODIFY] `sqmp.routes.js`
```diff
+import { upload } from '../middleware/fileUpload.js';

-router.post('/', controller.createRecord);
+router.post('/', upload.any(), controller.createRecord);
-router.put('/:id', controller.updateRecord);
+router.put('/:id', upload.any(), controller.updateRecord);
```

#### [MODIFY] `qmqa.routes.js`
Wire the **existing** QMQA-specific middleware:
```diff
+import { uploadMultipleFiles } from '../middleware/file-upload.middleware.js';

-router.post('/', controller.createRecord);
+router.post('/', uploadMultipleFiles('files', 10), controller.createRecord);
```

---

### Phase 2: Controller Updates (Medium Risk)
Each controller's `createRecord` and `updateRecord` must:
1. Check if `req.files` exists and has content
2. If files are present, save file metadata alongside the record
3. Log uploaded file details for debugging

**Pattern** (matching NPI controller):
```js
export const createRecord = async (req, res) => {
    console.log('[MODULE-BE] FILES:', req.files?.length || 0, 'files received');
    
    // When multer parses FormData, non-file fields land in req.body
    // File fields land in req.files
    try {
        const result = await service.createRecord(req.body, req.files);
        res.status(201).json({ data: result });
    } catch (error) {
        // ...
    }
};
```

**Modules requiring controller updates**:
- `mnr.controller.js` — Add `req.files` parameter to `createRecord`/`updateRecord` calls
- `fiveM1E.controller.js` — Same pattern
- `sqpr.controller.js` — Same pattern
- `ogi.controller.js` — Same pattern
- `sqmp.controller.js` — Same pattern

---

### Phase 3: Service Layer Updates (Higher Risk)
Each service must save uploaded files to disk and store metadata in the DB. This requires:
1. Checking if attachment tables exist in the DB schema
2. If they do, inserting file references (filename, path, MIME type)
3. If they don't, creating the tables first

> [!WARNING]
> Phase 3 requires inspecting the database schema for each module's attachment table. This should be done before implementation to avoid creating duplicate or conflicting tables.

---

## Verification Plan

### Manual Verification (Recommended)
1. Start the backend server: `npm run dev` in `sqm-backend/`
2. Use **curl** or **Postman** to POST a `multipart/form-data` request to each module endpoint with a test file
3. Verify:
   - Server does NOT crash (non-breaking)
   - `req.files` is logged in the console
   - `req.body` still contains the JSON fields correctly

**Example curl test** (after Phase 1):
```bash
curl -X POST http://localhost:3001/api/mnr \
  -H "Authorization: Bearer <TOKEN>" \
  -F "site_id=test" \
  -F "supplier_id=test" \
  -F "files=@/path/to/test.pdf"
```

### Automated Verification
- Run existing tests (if any): `npm test` in `sqm-backend/`
- Ensure no existing JSON-only requests break (they shouldn't since `upload.any()` is a passthrough for JSON requests)

> [!TIP]
> Phase 1 (route wiring) is the safest and most impactful change. It can be deployed independently. Phases 2 and 3 can follow incrementally per module.
