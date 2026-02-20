import express from 'express';
import { createRecord, getAllRecords, getRecordById, updateRecord, deleteRecords, exportRecords } from '../controllers/fiveM1E.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply Authentication Middleware to ALL routes
router.use(authenticateToken);

router.post('/', createRecord);
router.get('/', getAllRecords);
router.get('/export', exportRecords); // Export route must come before :id to check exact match
router.get('/:id', getRecordById);
router.put('/:id', updateRecord);
router.delete('/', deleteRecords);

export default router;
