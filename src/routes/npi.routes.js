import express from 'express';
import * as npiController from '../controllers/npi.controller.js';
import { upload } from '../middleware/fileUpload.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', npiController.getAllRecords);
router.get('/stats', npiController.getStats);
router.get('/sequence', npiController.generateSequence); // Must be before /:id
router.get('/:id', npiController.getRecordById);
router.post('/', upload.any(), npiController.createRecord);
router.put('/:id', upload.any(), npiController.updateRecord);


export default router;
