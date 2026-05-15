import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { requireAnyPermission } from '../../shared/middleware/requireAnyPermission.js';
import { requirePermission } from '../../shared/middleware/requirePermission.js';
import { ssiController } from './ssi.controller.js';

const router = Router();

const SSI_PLAN_VIEW_FORM_IDS = ['SSI-05-12', 'SSI-05-15', 'SSI-05-16'] as const;
const SSI_RECORD_VIEW_FORM_IDS = [
  'SSI-05-01',
  'SSI-05-02',
  'SSI-05-03',
  'SSI-05-04',
  'SSI-05-05',
  'SSI-05-06',
  'SSI-05-07',
  'SSI-05-08',
  'SSI-05-09',
  'SSI-05-10',
  'SSI-05-11',
  'SSI-05-12',
  'SSI-05-13',
  'SSI-05-14',
] as const;
const SSI_LOOKUP_VIEW_FORM_IDS = ['SSI-05-01', 'SSI-05-03', 'SSI-05-12', 'SSI-05-15'] as const;

router.use(requireAuth);

router.get(
  '/plans',
  requireAnyPermission([...SSI_PLAN_VIEW_FORM_IDS], 'viewlist'),
  ssiController.listPlans,
);
router.post(
  '/plans',
  requirePermission('SSI-05-15', 'add'),
  ssiController.createPlan,
);
router.post(
  '/plans/:id/cancel',
  requirePermission('SSI-05-16', 'delete'),
  ssiController.cancelPlan,
);
router.post(
  '/plans/:id/records',
  requirePermission('SSI-05-01', 'add'),
  ssiController.createRecordFromPlan,
);
router.get(
  '/plans/:id',
  requireAnyPermission([...SSI_PLAN_VIEW_FORM_IDS], 'view'),
  ssiController.getPlanById,
);
router.put(
  '/plans/:id',
  requirePermission('SSI-05-15', 'edit'),
  ssiController.updatePlan,
);
router.delete(
  '/plans/:id',
  requirePermission('SSI-05-15', 'delete'),
  ssiController.deletePlan,
);

router.get(
  '/records',
  requireAnyPermission([...SSI_RECORD_VIEW_FORM_IDS], 'viewlist'),
  ssiController.listRecords,
);
router.post(
  '/records',
  requirePermission('SSI-05-01', 'add'),
  ssiController.createRecord,
);
router.get(
  '/records/:id',
  requireAnyPermission([...SSI_RECORD_VIEW_FORM_IDS], 'view'),
  ssiController.getRecordById,
);
router.put(
  '/records/:id',
  requireAnyPermission(['SSI-05-01', 'SSI-05-02', 'SSI-05-04'], 'edit'),
  ssiController.updateRecord,
);
router.delete(
  '/records/:id',
  requireAnyPermission(['SSI-05-01', 'SSI-05-02', 'SSI-05-04'], 'delete'),
  ssiController.deleteRecord,
);

router.post(
  '/workflow/:id/submit',
  requireAnyPermission(['SSI-05-01', 'SSI-05-02', 'SSI-05-04'], 'submit'),
  ssiController.submit,
);
router.post(
  '/workflow/:id/check',
  requirePermission('SSI-05-03', 'check'),
  ssiController.check,
);
router.post(
  '/workflow/:id/approve',
  requirePermission('SSI-05-03', 'approve'),
  ssiController.approve,
);
router.post(
  '/workflow/:id/reject',
  requireAnyPermission(['SSI-05-03', 'SSI-05-09'], 'reject'),
  ssiController.reject,
);
router.post(
  '/workflow/:id/issue',
  requirePermission('SSI-05-06', 'issue'),
  ssiController.issue,
);
router.post(
  '/workflow/:id/cancel',
  requirePermission('SSI-05-07', 'delete'),
  ssiController.cancel,
);
router.post(
  '/workflow/:id/resubmit',
  requirePermission('SSI-05-04', 'submit'),
  ssiController.resubmit,
);

router.post(
  '/responses/:id/save',
  requireAnyPermission(['SSI-05-05', 'SSI-05-08', 'SSI-05-10'], 'edit'),
  ssiController.saveResponse,
);
router.post(
  '/responses/:id/submit',
  requireAnyPermission(['SSI-05-05', 'SSI-05-08', 'SSI-05-10'], 'submit'),
  ssiController.submitResponse,
);
router.post(
  '/responses/:id/review',
  requirePermission('SSI-05-09', 'approve'),
  ssiController.reviewResponse,
);

router.get(
  '/reports/calendar',
  requirePermission('SSI-05-12', 'viewlist'),
  ssiController.calendar,
);
router.get(
  '/reports/search',
  requirePermission('SSI-05-14', 'viewlist'),
  ssiController.search,
);
router.get(
  '/reports/achievement',
  requirePermission('SSI-05-13', 'viewlist'),
  ssiController.achievement,
);
router.get(
  '/reports',
  requirePermission('SSI-05-12', 'viewlist'),
  ssiController.reports,
);

router.get(
  '/lookups',
  requireAnyPermission([...SSI_LOOKUP_VIEW_FORM_IDS], 'view'),
  ssiController.lookups,
);

router.post(
  '/artifacts/:id',
  requireAnyPermission(['SSI-05-05', 'SSI-05-06'], 'edit'),
  ssiController.generateArtifact,
);

export default router;
