import { Router } from 'express';
import { mainSqmpController } from './main.controller.js';
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../../middleware/upload.middleware.js';

const router = Router();
const upload = createModuleUpload('sqmp');

router.get('/', mainSqmpController.getAll);
router.get('/:id', mainSqmpController.getById);

// Create / Update with Multer File handling
router.post('/', upload.any(), logUploads, handleUploadError, mainSqmpController.create);
router.put('/:id', upload.any(), logUploads, handleUploadError, mainSqmpController.update);
router.delete('/:id', mainSqmpController.delete);

// Primary Workflow Actions (Cycle 1)
router.post('/:id/submit', mainSqmpController.submit);
router.post('/:id/check', mainSqmpController.check);
router.post('/:id/approve', mainSqmpController.approve);
router.post('/:id/reject', mainSqmpController.reject);
router.post('/:id/issue', mainSqmpController.issue);
router.post('/:id/request-response', mainSqmpController.requestResponse);
router.post('/:id/cancel', mainSqmpController.cancel);
router.post('/:id/close', mainSqmpController.close);

export default router;
