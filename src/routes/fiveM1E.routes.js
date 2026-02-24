import express from 'express';
import { createRecord, getAllRecords, getRecordById, updateRecord, deleteRecords, exportRecords } from '../controllers/fiveM1E.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { createModuleUpload, logUploads, handleUploadError } from '../middleware/upload.middleware.js';

const router = express.Router();
const upload = createModuleUpload('5m1e');

router.use(authenticateToken);

router.post('/', upload.any(), logUploads, handleUploadError, createRecord);
router.get('/', getAllRecords);
router.get('/export', exportRecords);
router.get('/:id', getRecordById);
router.put('/:id', upload.any(), logUploads, handleUploadError, updateRecord);
router.delete('/', deleteRecords);

export default router;

