import { Router } from 'express';
import { actionItemsController } from './actionItems.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

router.get('/', actionItemsController.list);
router.get('/:id', actionItemsController.getById);
router.post('/export', actionItemsController.exportList);

export default router;
