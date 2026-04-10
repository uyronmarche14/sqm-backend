import { Router } from 'express';
import { sqprController } from './sqpr.controller.js';
import { createModuleUpload, logUploads, handleUploadError } from '../../middleware/upload.middleware.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { requirePermission } from '../../shared/middleware/requirePermission.js';
import { requireModuleAccess } from '../../shared/middleware/requireModuleAccess.js';

const router = Router();
const upload = createModuleUpload('sqpr', { attachmentType: 'sqpr-main' });

// Protect all routes
router.use(requireAuth);
router.get('/', requireModuleAccess('SQPR', 'viewlist'), sqprController.getAll);
router.get('/:id', requireModuleAccess('SQPR', 'view'), sqprController.getById);

// Document Downloader
router.get('/download/:attachmentId', requireModuleAccess('SQPR', 'view'), sqprController.downloadAttachment);
router.get('/attachments/:attachmentId', requireModuleAccess('SQPR', 'view'), sqprController.downloadAttachment);

// Create / Update with Multer File handling
router.post('/', requirePermission('SQPR-03-01', 'add'), upload.any(), logUploads, handleUploadError, sqprController.create);
router.put('/:id', requirePermission('SQPR-03-01', 'edit'), upload.any(), logUploads, handleUploadError, sqprController.update);
router.delete('/:id', requirePermission('SQPR-03-01', 'delete'), sqprController.delete);

// Batch Operations
router.post('/batch-delete', requirePermission('SQPR-03-01', 'delete'), sqprController.batchDelete);

// Workflow Action Subroutes
router.post('/:id/submit', requirePermission('SQPR-03-01', 'submit'), sqprController.submit);
router.post('/:id/issue', requirePermission('SQPR-03-04', 'issue'), sqprController.issue);
router.post('/:id/reject', requirePermission('SQPR-03-02', 'reject'), sqprController.reject);
router.post('/:id/approve', requirePermission('SQPR-03-02', 'approve'), sqprController.approve);
router.post('/:id/check', requirePermission('SQPR-03-02', 'check'), sqprController.check);

export default router;
