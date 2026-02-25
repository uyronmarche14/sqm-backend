import { Router } from 'express';
import { sqprController } from './sqpr.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../middleware/upload.middleware.js';
const router = Router();
const upload = createModuleUpload('sqpr');
// Protect all routes
router.use(requireAuth);
router.get('/', sqprController.getAll);
router.get('/:id', sqprController.getById);
// Create / Update with Multer File handling
router.post('/', upload.any(), logUploads, handleUploadError, sqprController.create);
router.put('/:id', upload.any(), logUploads, handleUploadError, sqprController.update);
router.delete('/:id', sqprController.delete);
// Workflow Action Subroutes
router.post('/:id/submit', sqprController.submit);
router.post('/:id/issue', sqprController.issue);
router.post('/:id/reject', sqprController.reject);
export default router;
