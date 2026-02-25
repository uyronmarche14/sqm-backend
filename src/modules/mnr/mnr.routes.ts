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

export default router;
