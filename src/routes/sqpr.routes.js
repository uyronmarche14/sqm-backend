import express from 'express';
import * as sqprController from '../controllers/sqpr.controller.js';
// Note: Auth middleware usually imported here if needed
// import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', sqprController.getAllRecords);
router.get('/:id', sqprController.getRecordById);
router.post('/', sqprController.createRecord);
router.put('/:id', sqprController.updateRecord);

// Workflow Actions
router.post('/:id/submit', sqprController.submitRecord);
router.post('/:id/issue', sqprController.issueRecord);
router.post('/:id/reject', sqprController.rejectRecord);

export default router;
