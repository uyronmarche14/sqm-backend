import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { requireAnyPermission } from '../../shared/middleware/requireAnyPermission.js';
import { requirePermission } from '../../shared/middleware/requirePermission.js';
import { trainingController } from './training.controller.js';

const router = Router();

const TRAINING_DETAIL_FORM_IDS = [
  'TRAINING-10-01',
  'TRAINING-10-02',
  'SQE-10-03',
  'SQE-10-04',
  'SQE-10-05',
] as const;

router.use(requireAuth);

router.get(
  '/',
  requirePermission('TRAINING-10-01', 'viewlist'),
  trainingController.list,
);
router.get(
  '/calendar',
  requirePermission('SQE-10-05', 'viewlist'),
  trainingController.calendar,
);
router.get(
  '/search',
  requirePermission('SQE-10-03', 'viewlist'),
  trainingController.search,
);
router.get(
  '/achievement',
  requirePermission('SQE-10-04', 'viewlist'),
  trainingController.achievement,
);
router.get(
  '/:id',
  requireAnyPermission([...TRAINING_DETAIL_FORM_IDS], 'view'),
  trainingController.getById,
);

router.post(
  '/',
  requirePermission('TRAINING-10-02', 'add'),
  trainingController.create,
);
router.put(
  '/:id',
  requirePermission('TRAINING-10-02', 'edit'),
  trainingController.update,
);
router.delete(
  '/:id',
  requirePermission('TRAINING-10-02', 'delete'),
  trainingController.delete,
);

export default router;
