import { Router } from 'express';
import { sqmpResponseController } from './response.controller.js';
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../../middleware/upload.middleware.js';
import { requirePermission } from '../../../shared/middleware/requirePermission.js';
import { requireModuleAccess } from '../../../shared/middleware/requireModuleAccess.js';

const router = Router();
const upload = createModuleUpload('sqmp', { attachmentType: 'sqmp-response' });

// Explicit form endpoints
router.post('/:id/save-response', requirePermission('SQMP-09-06', 'edit'), upload.any(), logUploads, handleUploadError, sqmpResponseController.saveResponse);
router.post('/:id/submit-response', requirePermission('SQMP-09-06', 'submit'), upload.any(), logUploads, handleUploadError, sqmpResponseController.submitResponse);
router.post('/:id/save-closure', requirePermission('SQMP-09-07', 'edit'), upload.any(), logUploads, handleUploadError, sqmpResponseController.saveClosure);
router.post('/:id/submit-closure', requirePermission('SQMP-09-07', 'submit'), upload.any(), logUploads, handleUploadError, sqmpResponseController.submitClosure);
router.post('/:id/check-closure', requirePermission('SQMP-09-07', 'check'), sqmpResponseController.checkClosure);
router.post('/:id/approve-closure', requirePermission('SQMP-09-07', 'approve'), sqmpResponseController.approveClosure);
router.post('/:id/reject-closure', requirePermission('SQMP-09-07', 'reject'), sqmpResponseController.rejectClosure);
router.post('/:id/accept-closure', requirePermission('SQMP-09-07', 'edit'), sqmpResponseController.acceptClosure);
router.post('/:id/not-accept-closure', requirePermission('SQMP-09-07', 'reject'), sqmpResponseController.notAcceptClosure);

// Legacy coarse aliases
router.post('/:id', requirePermission('SQMP-09-06', 'edit'), upload.any(), logUploads, handleUploadError, sqmpResponseController.upsert);
router.post('/:id/check', requirePermission('SQMP-09-07', 'check'), sqmpResponseController.check);
router.post('/:id/approve', requirePermission('SQMP-09-07', 'approve'), sqmpResponseController.approve);
router.post('/:id/reject', requirePermission('SQMP-09-07', 'reject'), sqmpResponseController.reject);

// Document Downloader
router.get('/download/:attachmentId', requireModuleAccess('SQM_PLAN', 'view'), sqmpResponseController.downloadAttachment);

export default router;
    
