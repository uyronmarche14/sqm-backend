import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { requireAnyPermission } from '../../shared/middleware/requireAnyPermission.js';
import { requirePermission } from '../../shared/middleware/requirePermission.js';
import { createModuleUpload, handleUploadError, logUploads } from '../../middleware/upload.middleware.js';
import { supplierQualityController } from './supplier-quality.controller.js';

const router = Router();
const upload = createModuleUpload('supplier-quality');

const SUPPLIER_QUALITY_VIEW_FORM_IDS = [
  'SQPRLAR-01-01',
  'SQPRLAR-01-02',
  'SQPRLAR-01-03',
  'SQPRLAR-01-04',
  'SQPRLAR-01-05',
] as const;

router.use(requireAuth);

router.get(
  '/attachments/:attachmentId',
  requireAnyPermission([...SUPPLIER_QUALITY_VIEW_FORM_IDS], 'view'),
  supplierQualityController.downloadAttachment,
);
router.get(
  '/search',
  requirePermission('SQPRLAR-01-04', 'viewlist'),
  supplierQualityController.search,
);
router.get(
  '/',
  requireAnyPermission([...SUPPLIER_QUALITY_VIEW_FORM_IDS], 'viewlist'),
  supplierQualityController.list,
);
router.get(
  '/:id',
  requireAnyPermission([...SUPPLIER_QUALITY_VIEW_FORM_IDS], 'view'),
  supplierQualityController.getById,
);

router.post(
  '/',
  requirePermission('SQPRLAR-01-01', 'add'),
  upload.any(),
  logUploads,
  handleUploadError,
  supplierQualityController.create,
);
router.put(
  '/:id',
  requireAnyPermission(['SQPRLAR-01-01', 'SQPRLAR-01-03'], 'edit'),
  upload.any(),
  logUploads,
  handleUploadError,
  supplierQualityController.update,
);
router.delete(
  '/:id',
  requirePermission('SQPRLAR-01-01', 'delete'),
  supplierQualityController.delete,
);

router.post(
  '/:id/submit',
  requireAnyPermission(['SQPRLAR-01-01', 'SQPRLAR-01-03'], 'submit'),
  supplierQualityController.submit,
);
router.post(
  '/:id/check',
  requirePermission('SQPRLAR-01-02', 'check'),
  supplierQualityController.check,
);
router.post(
  '/:id/approve',
  requirePermission('SQPRLAR-01-02', 'approve'),
  supplierQualityController.approve,
);
router.post(
  '/:id/reject',
  requirePermission('SQPRLAR-01-02', 'reject'),
  supplierQualityController.reject,
);
router.post(
  '/:id/issue',
  requirePermission('SQPRLAR-01-05', 'issue'),
  supplierQualityController.issue,
);

export default router;
