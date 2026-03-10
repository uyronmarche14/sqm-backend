import { Router } from 'express';
import { mnrController } from './mnr.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { requirePermission } from '../../shared/middleware/requirePermission.js';
// We still use the robust legacy file upload middleware
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../middleware/upload.middleware.js';

const router = Router();
const upload = createModuleUpload('mnr', { attachmentType: 'mnr-main' });

// Protect all routes
router.use(requireAuth);

router.post('/', requirePermission('MNR-12-01', 'add'), upload.any(), logUploads, handleUploadError, mnrController.create);
router.get('/', mnrController.getAll);
router.get('/:id', mnrController.getById);
router.put('/:id', requirePermission('MNR-12-01', 'edit'), upload.any(), logUploads, handleUploadError, mnrController.update);
router.delete('/:id', requirePermission('MNR-12-01', 'delete'), mnrController.delete);

// Document Downloader
router.get('/download/:attachmentId', mnrController.downloadAttachment);
router.get('/attachments/:attachmentId', mnrController.downloadAttachment);

// Workflow Action Subroutes
router.post('/:id/submit', requirePermission('MNR-12-01', 'submit'), mnrController.submit);
router.post('/:id/check', requirePermission('MNR-12-03', 'check'), mnrController.check);
router.post('/:id/approve', requirePermission('MNR-12-03', 'approve'), mnrController.approve);
router.post('/:id/reject', requirePermission('MNR-12-03', 'reject'), mnrController.reject);
router.post('/:id/issue', requirePermission('MNR-12-04', 'issue'), mnrController.issue);
router.post('/:id/close', requirePermission('MNR-12-07', 'edit'), mnrController.close);
router.post('/:id/cancel', requirePermission('MNR-12-01', 'delete'), mnrController.cancel);

export default router;
