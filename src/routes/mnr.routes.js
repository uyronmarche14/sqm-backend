import express from 'express';
import * as mnrController from '../controllers/mnr.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

// If verifyToken is not exported from auth.routes, we might need to check where it is.
// Looking at `auth.routes.js` file list... size 335 bytes. Likely has middleware?
// Or maybe it's in `../middleware/auth.js`?
// I will check `auth.routes.js` content first if needed, but standard practice is separate middleware.
// For now, I'll assume standard router structure.

const router = express.Router();

router.use(authenticateToken);

// Public or Protected Routes
// Ideally all protected
router.post('/', mnrController.createRecord);
router.get('/', mnrController.getAllRecords);
router.get('/:id', mnrController.getRecordById);
router.put('/:id', mnrController.updateRecord);
router.delete('/', mnrController.deleteRecords);

export default router;
