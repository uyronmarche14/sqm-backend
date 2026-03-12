import { Router } from 'express';
import { sqprController } from './sqpr.controller.js';
import { createModuleUpload, logUploads, handleUploadError } from '../../middleware/upload.middleware.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { requirePermission } from '../../shared/middleware/requirePermission.js';
const router = Router();
const upload = createModuleUpload('sqpr', { attachmentType: 'sqpr-main' });
// Protect all routes
router.use(requireAuth);
router.get('/', sqprController.getAll);
router.get('/:id', sqprController.getById);
// Document Downloader
router.get('/download/:attachmentId', sqprController.downloadAttachment);
// Create / Update with Multer File handling
router.post('/', requirePermission('SQPR-13-01', 'add'), upload.any(), logUploads, handleUploadError, sqprController.create);
router.put('/:id', requirePermission('SQPR-13-01', 'edit'), upload.any(), logUploads, handleUploadError, sqprController.update);
router.delete('/:id', requirePermission('SQPR-13-01', 'delete'), sqprController.delete);
// Batch Operations
router.post('/batch-delete', requirePermission('SQPR-13-01', 'delete'), sqprController.batchDelete);
// Workflow Action Subroutes
router.post('/:id/submit', requirePermission('SQPR-13-01', 'submit'), sqprController.submit);
router.post('/:id/issue', requirePermission('SQPR-13-06', 'issue'), sqprController.issue);
router.post('/:id/reject', requirePermission('SQPR-13-05', 'reject'), sqprController.reject);
router.post('/:id/approve', requirePermission('SQPR-13-04', 'approve'), sqprController.approve);
router.post('/:id/check', requirePermission('SQPR-13-07', 'check'), sqprController.check);
export default router;
