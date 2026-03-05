import { Router } from 'express';
import { mnrController } from './mnr.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
// We still use the robust legacy file upload middleware
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../middleware/upload.middleware.js';

const router = Router();
const upload = createModuleUpload('mnr');

// Protect all routes
router.use(requireAuth);

router.post('/', upload.any(), logUploads, handleUploadError, mnrController.create);
router.get('/', mnrController.getAll);
router.get('/:id', mnrController.getById);
router.put('/:id', upload.any(), logUploads, handleUploadError, mnrController.update);
router.delete('/:id', mnrController.delete);

// Document Downloader
router.get('/download/:attachmentId', mnrController.downloadAttachment);
router.get('/attachments/:attachmentId', mnrController.downloadAttachment);

// Workflow Action Subroutes
router.post('/:id/submit', mnrController.submit);
router.post('/:id/check', mnrController.check);
router.post('/:id/approve', mnrController.approve);
router.post('/:id/reject', mnrController.reject);
router.post('/:id/issue', mnrController.issue);
router.post('/:id/close', mnrController.close);
router.post('/:id/cancel', mnrController.cancel);

export default router;
