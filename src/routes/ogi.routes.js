import express from 'express';
import * as ogiController from '../controllers/ogi.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

// Routes (Unprotected for now, matching other modules)
router.get('/', ogiController.getAllRecords);
router.get('/:id', ogiController.getRecordById);
router.post('/', ogiController.createRecord);
router.put('/:id', ogiController.updateRecord);

export default router;
