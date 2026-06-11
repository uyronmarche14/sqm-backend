import { Router } from 'express';
import { mainSqmpController } from './main.controller.js';
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../../middleware/upload.middleware.js';
import { requirePermission } from '../../../shared/middleware/requirePermission.js';
import { requireModuleAccess } from '../../../shared/middleware/requireModuleAccess.js';

const router = Router();
const upload = createModuleUpload('sqmp', { attachmentType: 'sqmp-main' });

router.get('/', requireModuleAccess('SQM_PLAN', 'viewlist'), mainSqmpController.getAll);
router.get('/control-no-preview', requireModuleAccess('SQM_PLAN', 'view'), mainSqmpController.previewControlNo);
router.get('/:id', requireModuleAccess('SQM_PLAN', 'view'), mainSqmpController.getById);

// Create / Update with Multer File handling
router.post('/', requirePermission('SQMP-09-01', 'add'), upload.any(), logUploads, handleUploadError, mainSqmpController.create);
router.put('/:id', requirePermission('SQMP-09-01', 'edit'), upload.any(), logUploads, handleUploadError, mainSqmpController.update);
router.delete('/:id', requirePermission('SQMP-09-01', 'delete'), mainSqmpController.delete);

// Primary Workflow Actions (Cycle 1)
router.post('/:id/submit-main', requirePermission('SQMP-09-01', 'submit'), mainSqmpController.submit);
router.post('/:id/check-main', requirePermission('SQMP-09-03', 'check'), mainSqmpController.check);
router.post('/:id/approve-main', requirePermission('SQMP-09-03', 'approve'), mainSqmpController.approve);
router.post('/:id/reject-main', requirePermission('SQMP-09-03', 'reject'), mainSqmpController.reject);
router.post('/:id/issue-main', requirePermission('SQMP-09-05', 'issue'), mainSqmpController.issue);
router.post('/:id/cancel-main', requirePermission('SQMP-09-10', 'delete'), mainSqmpController.cancel);

// Legacy coarse aliases
router.post('/:id/submit', requirePermission('SQMP-09-01', 'submit'), mainSqmpController.submit);
router.post('/:id/check', requirePermission('SQMP-09-03', 'check'), mainSqmpController.check);
router.post('/:id/approve', requirePermission('SQMP-09-03', 'approve'), mainSqmpController.approve);
router.post('/:id/reject', requirePermission('SQMP-09-03', 'reject'), mainSqmpController.reject);
router.post('/:id/issue', requirePermission('SQMP-09-05', 'issue'), mainSqmpController.issue);
router.post('/:id/request-response', requirePermission('SQMP-09-05', 'issue'), mainSqmpController.requestResponse);
router.post('/:id/cancel', requirePermission('SQMP-09-10', 'delete'), mainSqmpController.cancel);
router.post('/:id/close', requirePermission('SQMP-09-09', 'edit'), mainSqmpController.close);

export default router;
