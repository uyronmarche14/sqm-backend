import type { NextFunction, Request, Response } from 'express';
import { createResponse, successResponse, updateResponse } from '../../shared/utils/api-response.js';
import {
  SupplierQualityActionSchema,
  SupplierQualityAttachmentParamSchema,
  SupplierQualityIdParamSchema,
  SupplierQualityListQuerySchema,
  SupplierQualityRecordInputSchema,
} from './supplier-quality.schema.js';
import { supplierQualityService } from './supplier-quality.service.js';

function parsePayload(req: Request) {
  const rawPayload = typeof req.body?.payload === 'string'
    ? JSON.parse(req.body.payload)
    : req.body;

  return SupplierQualityRecordInputSchema.parse(rawPayload);
}

class SupplierQualityController {
  private getUserId(req: Request) {
    return (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
  }

  private getRoleId(req: Request) {
    return (req as any).user?.roleId || (req as any).user?.role_id || null;
  }

  private getRoleName(req: Request) {
    return (req as any).user?.roleName || (req as any).user?.role_name || null;
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = SupplierQualityListQuerySchema.parse({ query: req.query });
      const records = await supplierQualityService.list(
        { userId: this.getUserId(req), roleName: this.getRoleName(req) },
        query,
      );
      return res.json(successResponse(records));
    } catch (error) {
      return next(error);
    }
  }

  async search(req: Request, res: Response, next: NextFunction) {
    return this.list(req, res, next);
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SupplierQualityIdParamSchema.parse({ params: req.params }).params;
      const record = await supplierQualityService.getById(id, {
        userId: this.getUserId(req),
        roleName: this.getRoleName(req),
      });
      return res.json(successResponse(record));
    } catch (error) {
      return next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = parsePayload(req);
      const files = ((req as any).files || []) as Array<{ filename: string; originalname: string; mimetype?: string; path?: string }>;
      const record = await supplierQualityService.create(payload, this.getUserId(req), files);
      return res.status(201).json(createResponse(record));
    } catch (error) {
      return next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SupplierQualityIdParamSchema.parse({ params: req.params }).params;
      const payload = parsePayload(req);
      const files = ((req as any).files || []) as Array<{ filename: string; originalname: string; mimetype?: string; path?: string }>;
      const record = await supplierQualityService.update(
        id,
        payload,
        { userId: this.getUserId(req), roleName: this.getRoleName(req) },
        files,
      );
      return res.json(updateResponse(record));
    } catch (error) {
      return next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SupplierQualityIdParamSchema.parse({ params: req.params }).params;
      const response = await supplierQualityService.delete(id, {
        userId: this.getUserId(req),
        roleName: this.getRoleName(req),
      });
      return res.json(response);
    } catch (error) {
      return next(error);
    }
  }

  async submit(req: Request, res: Response, next: NextFunction) {
    return this.runAction('submit', req, res, next);
  }

  async check(req: Request, res: Response, next: NextFunction) {
    return this.runAction('check', req, res, next);
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    return this.runAction('approve', req, res, next);
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    return this.runAction('reject', req, res, next);
  }

  async issue(req: Request, res: Response, next: NextFunction) {
    return this.runAction('issue', req, res, next);
  }

  private async runAction(
    action: 'submit' | 'check' | 'approve' | 'reject' | 'issue',
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const parsed = SupplierQualityActionSchema.parse({ params: req.params, body: req.body });
      const result = await supplierQualityService.transition(parsed.params.id, action, {
        userId: this.getUserId(req),
        roleId: this.getRoleId(req),
        remarks: parsed.body?.remarks,
      });
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { attachmentId } = SupplierQualityAttachmentParamSchema.parse({ params: req.params }).params;
      const { filePath, fileName, mimeType } = await supplierQualityService.downloadAttachment(attachmentId, {
        userId: this.getUserId(req),
        roleName: this.getRoleName(req),
      });
      return res.download(filePath, fileName, {
        headers: {
          'Content-Type': mimeType,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const supplierQualityController = new SupplierQualityController();
