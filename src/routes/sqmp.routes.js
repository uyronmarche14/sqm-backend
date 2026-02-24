import express from 'express';
import * as sqmpController from '../controllers/sqmp.controller.js';
import { createModuleUpload, logUploads, handleUploadError } from '../middleware/upload.middleware.js';

const router = express.Router();
const upload = createModuleUpload('sqmp');

// CRUD
router.get('/', sqmpController.getAllRecords);
router.get('/:id', sqmpController.getRecordById);
router.post('/', upload.any(), logUploads, handleUploadError, sqmpController.createRecord);
router.put('/:id', upload.any(), logUploads, handleUploadError, sqmpController.updateRecord);

// File Management
router.get('/attachments/:attachmentId', sqmpController.downloadAttachment);

export default router;

