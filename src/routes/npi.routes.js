import express from 'express';
import * as npiController from '../controllers/npi.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { createModuleUpload, logUploads, handleUploadError } from '../middleware/upload.middleware.js';

const router = express.Router();
const upload = createModuleUpload('npi');

router.use(authenticateToken);

router.get('/', npiController.getAllRecords);
router.get('/stats', npiController.getStats);
router.get('/sequence', npiController.generateSequence);
router.get('/:id', npiController.getRecordById);
router.post('/', upload.any(), logUploads, handleUploadError, npiController.createRecord);
router.put('/:id', upload.any(), logUploads, handleUploadError, npiController.updateRecord);

export default router;

