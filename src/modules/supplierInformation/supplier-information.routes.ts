import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { requireAnyPermission } from '../../shared/middleware/requireAnyPermission.js';
import { supplierInformationController } from './supplier-information.controller.js';

const router = Router();

const SUPPLIER_INFORMATION_LIST_FORM_IDS = [
  'SUPPLIERINFORMATION-02-03',
  'SUPPLIERINFORMATION-02-04',
] as const;

router.use(requireAuth);

router.get(
  '/',
  requireAnyPermission([...SUPPLIER_INFORMATION_LIST_FORM_IDS], 'viewlist'),
  supplierInformationController.list,
);
router.get(
  '/by-supplier/:supplierId',
  requireAnyPermission([...SUPPLIER_INFORMATION_LIST_FORM_IDS], 'viewlist'),
  supplierInformationController.listBySupplier,
);
router.get(
  '/search',
  requireAnyPermission(['SUPPLIERINFORMATION-02-04'], 'viewlist'),
  supplierInformationController.search,
);
router.get(
  '/attachments/:attachmentId',
  requireAnyPermission([...SUPPLIER_INFORMATION_LIST_FORM_IDS], 'view'),
  supplierInformationController.downloadAttachment,
);
router.get(
  '/:id',
  requireAnyPermission([...SUPPLIER_INFORMATION_LIST_FORM_IDS], 'view'),
  supplierInformationController.getById,
);

export default router;
