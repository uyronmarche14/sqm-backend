import express from 'express';
import * as mnrController from '../controllers/mnr.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { createModuleUpload, logUploads, handleUploadError } from '../middleware/upload.middleware.js';

const router = express.Router();
const upload = createModuleUpload('mnr');

router.use(authenticateToken);

router.post('/', upload.any(), logUploads, handleUploadError, mnrController.createRecord);
router.get('/', mnrController.getAllRecords);
router.get('/:id', mnrController.getRecordById);
router.put('/:id', upload.any(), logUploads, handleUploadError, mnrController.updateRecord);
router.delete('/', mnrController.deleteRecords);

export default router;

