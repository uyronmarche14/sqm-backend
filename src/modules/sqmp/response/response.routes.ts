import { Router } from 'express';
import { sqmpResponseController } from './response.controller.js';
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../../middleware/upload.middleware.js';

const router = Router();
const upload = createModuleUpload('sqmp');

// Target latest or specific response for an SQMP record
router.post('/:id', upload.any(), logUploads, handleUploadError, sqmpResponseController.upsert);

// Cycle 2 approvals
router.post('/:id/check', sqmpResponseController.check);
router.post('/:id/approve', sqmpResponseController.approve);
router.post('/:id/reject', sqmpResponseController.reject);

export default router;
    