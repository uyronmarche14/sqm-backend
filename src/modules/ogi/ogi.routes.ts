import { Router } from 'express';
import { ogiController } from './ogi.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../middleware/upload.middleware.js';

const router = Router();
const upload = createModuleUpload('ogi');

// Protect all routes
router.use(requireAuth);

router.get('/sequence', ogiController.generateSequence);

router.get('/', ogiController.getAll);
router.get('/:id', ogiController.getById);

// Document Downloader (both paths supported for frontend compatibility)
router.get('/download/:attachmentId', ogiController.downloadAttachment);
router.get('/attachments/:attachmentId', ogiController.downloadAttachment);

// Create / Update with Multer File handling
router.post('/', upload.any(), logUploads, handleUploadError, ogiController.create);
router.put('/:id', upload.any(), logUploads, handleUploadError, ogiController.update);
router.delete('/:id', ogiController.delete);

// Workflow Action Subroutes
router.post('/:id/submit', ogiController.submit);

export default router;
