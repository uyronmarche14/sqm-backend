import type { NextFunction, Request, Response } from 'express';
import { successResponse } from '../../shared/utils/api-response.js';
import {
  SupplierInformationAttachmentParamSchema,
  SupplierInformationBySupplierParamSchema,
  SupplierInformationIdParamSchema,
  SupplierInformationSearchQuerySchema,
} from './supplier-information.schema.js';
import { supplierInformationService } from './supplier-information.service.js';

class SupplierInformationController {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const records = await supplierInformationService.list();
      return res.json(successResponse(records));
    } catch (error) {
      return next(error);
    }
  }

  async listBySupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const { supplierId } = SupplierInformationBySupplierParamSchema.parse({ params: req.params }).params;
      const records = await supplierInformationService.listBySupplier(supplierId);
      return res.json(successResponse(records));
    } catch (error) {
      return next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SupplierInformationIdParamSchema.parse({ params: req.params }).params;
      const record = await supplierInformationService.getById(id);
      return res.json(successResponse(record));
    } catch (error) {
      return next(error);
    }
  }

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const { keyword, q } = SupplierInformationSearchQuerySchema.parse({ query: req.query }).query;
      const records = await supplierInformationService.search(keyword || q || '');
      return res.json(successResponse(records));
    } catch (error) {
      return next(error);
    }
  }

  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { attachmentId } = SupplierInformationAttachmentParamSchema.parse({ params: req.params }).params;
      const file = await supplierInformationService.downloadAttachment(attachmentId);

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
      return res.download(file.filePath);
    } catch (error) {
      return next(error);
    }
  }
}

export const supplierInformationController = new SupplierInformationController();
