import { Router } from 'express';
import { npiController } from './npi.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../middleware/upload.middleware.js';

const router = Router();
const upload = createModuleUpload('npi');

// Protect all routes
router.use(requireAuth);

router.get('/stats', npiController.getStats);
router.get('/sequence', npiController.generateSequence);

router.get('/', npiController.getAll);
router.get('/:id', npiController.getById);

// Document Downloader
router.get('/download/:attachmentId', npiController.downloadAttachment);

// Create / Update with Multer File handling
router.post('/', upload.any(), logUploads, handleUploadError, npiController.create);
router.put('/:id', upload.any(), logUploads, handleUploadError, npiController.update);

// Workflow Action Subroutes
router.post('/:id/submit', npiController.submit);
router.post('/:id/approve', npiController.approve);
router.post('/:id/reject', npiController.reject);

export default router;
