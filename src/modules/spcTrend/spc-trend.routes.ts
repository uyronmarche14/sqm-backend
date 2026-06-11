import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { requireAnyPermission } from '../../shared/middleware/requireAnyPermission.js';
import { requirePermission } from '../../shared/middleware/requirePermission.js';
import { createModuleUpload, handleUploadError, logUploads } from '../../middleware/upload.middleware.js';
import { spcTrendController } from './spc-trend.controller.js';

const router = Router();
const upload = createModuleUpload('spc-trend');

const SPC_TREND_VIEW_FORM_IDS = [
  'SPC-05-01',
  'SPC-05-02',
  'SPC-05-03',
  'SPC-05-04',
] as const;

router.use(requireAuth);

router.get(
  '/attachments/:attachmentId',
  requireAnyPermission([...SPC_TREND_VIEW_FORM_IDS], 'view'),
  spcTrendController.downloadAttachment,
);
router.get(
  '/search',
  requirePermission('SPC-05-04', 'viewlist'),
  spcTrendController.search,
);
router.get(
  '/',
  requireAnyPermission([...SPC_TREND_VIEW_FORM_IDS], 'viewlist'),
  spcTrendController.list,
);
router.get(
  '/:id',
  requireAnyPermission([...SPC_TREND_VIEW_FORM_IDS], 'view'),
  spcTrendController.getById,
);

router.post(
  '/',
  requirePermission('SPC-05-02', 'add'),
  upload.any(),
  logUploads,
  handleUploadError,
  spcTrendController.create,
);
router.put(
  '/:id',
  requirePermission('SPC-05-03', 'edit'),
  upload.any(),
  logUploads,
  handleUploadError,
  spcTrendController.update,
);
router.delete(
  '/:id',
  requirePermission('SPC-05-03', 'delete'),
  spcTrendController.delete,
);

router.post(
  '/:id/submit',
  requirePermission('SPC-05-03', 'submit'),
  spcTrendController.submit,
);
router.post(
  '/:id/check',
  requirePermission('SPC-05-04', 'check'),
  spcTrendController.check,
);
router.post(
  '/:id/approve',
  requirePermission('SPC-05-04', 'approve'),
  spcTrendController.approve,
);
router.post(
  '/:id/reject',
  requirePermission('SPC-05-04', 'reject'),
  spcTrendController.reject,
);
router.post(
  '/:id/issue',
  requirePermission('SPC-05-04', 'issue'),
  spcTrendController.issue,
);

export default router;
