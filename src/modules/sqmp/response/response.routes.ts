import { Router } from 'express';
import { sqmpResponseController } from './response.controller.js';
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../../middleware/upload.middleware.js';

const router = Router();
const upload = createModuleUpload('sqmp', { attachmentType: 'sqmp-response' });

// Explicit form endpoints
router.post('/:id/save-response', upload.any(), logUploads, handleUploadError, sqmpResponseController.saveResponse);
router.post('/:id/submit-response', upload.any(), logUploads, handleUploadError, sqmpResponseController.submitResponse);
router.post('/:id/save-closure', upload.any(), logUploads, handleUploadError, sqmpResponseController.saveClosure);
router.post('/:id/submit-closure', upload.any(), logUploads, handleUploadError, sqmpResponseController.submitClosure);
router.post('/:id/check-closure', sqmpResponseController.checkClosure);
router.post('/:id/approve-closure', sqmpResponseController.approveClosure);
router.post('/:id/reject-closure', sqmpResponseController.rejectClosure);
router.post('/:id/accept-closure', sqmpResponseController.acceptClosure);
router.post('/:id/not-accept-closure', sqmpResponseController.notAcceptClosure);

// Legacy coarse aliases
router.post('/:id', upload.any(), logUploads, handleUploadError, sqmpResponseController.upsert);
router.post('/:id/check', sqmpResponseController.check);
router.post('/:id/approve', sqmpResponseController.approve);
router.post('/:id/reject', sqmpResponseController.reject);

// Document Downloader
router.get('/download/:attachmentId', sqmpResponseController.downloadAttachment);

export default router;
    
