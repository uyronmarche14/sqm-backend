import { Router } from 'express';
import { sqmpController } from './sqmp.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../middleware/upload.middleware.js';

const router = Router();
const upload = createModuleUpload('sqmp');

// Protect all routes
router.use(requireAuth);

router.get('/', sqmpController.getAll);
router.get('/:id', sqmpController.getById);

// Document Downloader
router.get('/download/:attachmentId', sqmpController.downloadAttachment);

// Create / Update with Multer File handling
router.post('/', upload.any(), logUploads, handleUploadError, sqmpController.create);
router.put('/:id', upload.any(), logUploads, handleUploadError, sqmpController.update);
router.delete('/:id', sqmpController.delete);

// Workflow Action Subroutes
router.post('/:id/submit', sqmpController.submit);
router.post('/:id/approve', sqmpController.approve);
router.post('/:id/reject', sqmpController.reject);
router.post('/:id/issue', sqmpController.issue);
router.post('/:id/cancel', sqmpController.cancel);
router.post('/:id/close', sqmpController.close);

export default router;
