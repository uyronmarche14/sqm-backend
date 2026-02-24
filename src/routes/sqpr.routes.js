import express from 'express';
import * as sqprController from '../controllers/sqpr.controller.js';
import { createModuleUpload, logUploads, handleUploadError } from '../middleware/upload.middleware.js';

const router = express.Router();
const upload = createModuleUpload('sqpr');

router.get('/', sqprController.getAllRecords);
router.get('/:id', sqprController.getRecordById);
router.post('/', upload.any(), logUploads, handleUploadError, sqprController.createRecord);
router.put('/:id', upload.any(), logUploads, handleUploadError, sqprController.updateRecord);

// Workflow Actions
router.post('/:id/submit', sqprController.submitRecord);
router.post('/:id/issue', sqprController.issueRecord);
router.post('/:id/reject', sqprController.rejectRecord);

export default router;

