import { Router } from 'express';
import { ogiController } from './ogi.controller.js';
import { createModuleUpload, logUploads, handleUploadError } from '../../middleware/upload.middleware.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { requirePermission } from '../../shared/middleware/requirePermission.js';

const router = Router();
const upload = createModuleUpload('ogi', { attachmentType: 'ogi-main' });

// Protect all routes
router.use(requireAuth);

router.get('/sequence', ogiController.generateSequence);

router.get('/', ogiController.getAll);
router.get('/:id', ogiController.getById);

// Document Downloader (both paths supported for frontend compatibility)
router.get('/download/:attachmentId', ogiController.downloadAttachment);
router.get('/attachments/:attachmentId', ogiController.downloadAttachment);

// Create / Update with Multer File handling
router.post('/', requirePermission('OGI-01-01', 'add'), upload.any(), logUploads, handleUploadError, ogiController.create);
router.put('/:id', requirePermission('OGI-01-01', 'edit'), upload.any(), logUploads, handleUploadError, ogiController.update);
router.delete('/:id', requirePermission('OGI-01-01', 'delete'), ogiController.delete);

// Workflow Action Subroutes
router.post('/:id/submit', requirePermission('OGI-01-01', 'submit'), ogiController.submit);

export default router;
