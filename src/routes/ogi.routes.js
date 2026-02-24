import express from 'express';
import * as ogiController from '../controllers/ogi.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { createModuleUpload, logUploads, handleUploadError } from '../middleware/upload.middleware.js';

const router = express.Router();
const upload = createModuleUpload('ogi');

router.use(authenticateToken);

router.get('/', ogiController.getAllRecords);
router.get('/:id', ogiController.getRecordById);
router.post('/', upload.any(), logUploads, handleUploadError, ogiController.createRecord);
router.put('/:id', upload.any(), logUploads, handleUploadError, ogiController.updateRecord);
router.get('/attachments/:attachmentId', ogiController.downloadAttachment);

export default router;

