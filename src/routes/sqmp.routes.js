import express from 'express';
import * as sqmpController from '../controllers/sqmp.controller.js';

const router = express.Router();

// CRUD
router.get('/', sqmpController.getAllRecords);
router.get('/:id', sqmpController.getRecordById);
router.post('/', sqmpController.createRecord);
router.put('/:id', sqmpController.updateRecord);

// Workflow Actions
router.post('/:id/submit', sqmpController.submitRecord);
router.post('/:id/approve', sqmpController.approveRecord);
router.post('/:id/reject', sqmpController.rejectRecord);

export default router;
