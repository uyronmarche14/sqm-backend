import { Router } from 'express';
import { mnrController } from './mnr.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { requirePermission } from '../../shared/middleware/requirePermission.js';
import { requireModuleAccess } from '../../shared/middleware/requireModuleAccess.js';
// We still use the robust legacy file upload middleware
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../middleware/upload.middleware.js';

const router = Router();
const upload = createModuleUpload('mnr', { attachmentType: 'mnr-main' });
const responseUpload = createModuleUpload('mnr', { attachmentType: 'mnr-response' });

// Protect all routes
router.use(requireAuth);

router.post('/', requirePermission('MNR-12-01', 'add'), upload.any(), logUploads, handleUploadError, mnrController.create);
router.get('/', requireModuleAccess('MNR', 'viewlist'), mnrController.getAll);
router.get('/:id', requireModuleAccess('MNR', 'view'), mnrController.getById);
router.put('/:id', requirePermission('MNR-12-01', 'edit'), upload.any(), logUploads, handleUploadError, mnrController.update);
router.delete('/:id', requirePermission('MNR-12-01', 'delete'), mnrController.delete);

// Document Downloader
router.get('/download/:attachmentId', requireModuleAccess('MNR', 'view'), mnrController.downloadAttachment);
router.get('/attachments/:attachmentId', requireModuleAccess('MNR', 'view'), mnrController.downloadAttachment);

// Workflow Action Subroutes
router.post('/:id/submit', requirePermission('MNR-12-01', 'submit'), mnrController.submit);
router.post('/:id/submit-main', requirePermission('MNR-12-01', 'submit'), mnrController.submitMain.bind(mnrController));
router.post('/:id/check', requirePermission('MNR-12-03', 'check'), mnrController.check);
router.post('/:id/check-main', requirePermission('MNR-12-03', 'check'), mnrController.checkMain.bind(mnrController));
router.post('/:id/approve', requirePermission('MNR-12-03', 'approve'), mnrController.approve);
router.post('/:id/approve-main', requirePermission('MNR-12-03', 'approve'), mnrController.approveMain.bind(mnrController));
router.post('/:id/reject', requirePermission('MNR-12-03', 'reject'), mnrController.reject);
router.post('/:id/reject-main', requirePermission('MNR-12-03', 'reject'), mnrController.rejectMain.bind(mnrController));
router.post('/:id/issue', requirePermission('MNR-12-07', 'issue'), mnrController.issue);
router.post('/:id/issue-main', requirePermission('MNR-12-07', 'issue'), mnrController.issueMain.bind(mnrController));
router.post('/:id/close', requirePermission('MNR-12-09', 'edit'), mnrController.close);
router.post('/:id/cancel', requirePermission('MNR-12-08', 'delete'), mnrController.cancel);
router.post('/:id/cancel-main', requirePermission('MNR-12-08', 'delete'), mnrController.cancelMain.bind(mnrController));
router.post('/:id/save-initial-response', requirePermission('MNR-12-09', 'edit'), responseUpload.any(), logUploads, handleUploadError, mnrController.saveInitialResponse.bind(mnrController));
router.post('/:id/submit-initial-response', requirePermission('MNR-12-09', 'submit'), responseUpload.any(), logUploads, handleUploadError, mnrController.submitInitialResponse.bind(mnrController));
router.post('/:id/save-final-response', requirePermission('MNR-12-09', 'edit'), responseUpload.any(), logUploads, handleUploadError, mnrController.saveFinalResponse.bind(mnrController));
router.post('/:id/submit-final-response', requirePermission('MNR-12-09', 'submit'), responseUpload.any(), logUploads, handleUploadError, mnrController.submitFinalResponse.bind(mnrController));
router.post('/:id/save-response-review', requirePermission('MNR-12-10', 'edit'), responseUpload.any(), logUploads, handleUploadError, mnrController.saveResponseReview.bind(mnrController));
router.post('/:id/submit-response-review', requirePermission('MNR-12-10', 'submit'), responseUpload.any(), logUploads, handleUploadError, mnrController.submitResponseReview.bind(mnrController));
router.post('/:id/check-response', requirePermission('MNR-12-10', 'check'), mnrController.checkResponse.bind(mnrController));
router.post('/:id/approve-response', requirePermission('MNR-12-10', 'approve'), mnrController.approveResponse.bind(mnrController));
router.post('/:id/reject-response', requirePermission('MNR-12-10', 'reject'), mnrController.rejectResponse.bind(mnrController));
router.post('/:id/accept-response', requirePermission('MNR-12-10', 'approve'), mnrController.acceptResponse.bind(mnrController));
router.post('/:id/not-accept-response', requirePermission('MNR-12-10', 'reject'), mnrController.notAcceptResponse.bind(mnrController));

export default router;
