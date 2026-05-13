import type { NextFunction, Request, Response } from 'express';
import { createResponse, successResponse, updateResponse } from '../../shared/utils/api-response.js';
import {
  SpcTrendActionSchema,
  SpcTrendAttachmentParamSchema,
  SpcTrendIdParamSchema,
  SpcTrendListQuerySchema,
  SpcTrendRecordInputSchema,
} from './spc-trend.schema.js';
import { spcTrendService } from './spc-trend.service.js';

function parsePayload(req: Request) {
  const rawPayload = typeof req.body?.payload === 'string'
    ? JSON.parse(req.body.payload)
    : req.body;

  return SpcTrendRecordInputSchema.parse(rawPayload);
}

class SpcTrendController {
  private getUserId(req: Request) {
    return (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = SpcTrendListQuerySchema.parse({ query: req.query });
      const records = await spcTrendService.list({ userId: this.getUserId(req) }, query);
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
      const { id } = SpcTrendIdParamSchema.parse({ params: req.params }).params;
      const record = await spcTrendService.getById(id, { userId: this.getUserId(req) });
      return res.json(successResponse(record));
    } catch (error) {
      return next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = parsePayload(req);
      const files = ((req as any).files || []) as Array<{ filename: string; originalname: string; mimetype?: string; path?: string }>;
      const record = await spcTrendService.create(payload, this.getUserId(req), files);
      return res.status(201).json(createResponse(record));
    } catch (error) {
      return next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SpcTrendIdParamSchema.parse({ params: req.params }).params;
      const payload = parsePayload(req);
      const files = ((req as any).files || []) as Array<{ filename: string; originalname: string; mimetype?: string; path?: string }>;
      const record = await spcTrendService.update(id, payload, { userId: this.getUserId(req) }, files);
      return res.json(updateResponse(record));
    } catch (error) {
      return next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SpcTrendIdParamSchema.parse({ params: req.params }).params;
      const response = await spcTrendService.delete(id, { userId: this.getUserId(req) });
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
      const parsed = SpcTrendActionSchema.parse({ params: req.params, body: req.body });
      const result = await spcTrendService.transition(parsed.params.id, action, {
        userId: this.getUserId(req),
        remarks: parsed.body?.remarks,
      });
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { attachmentId } = SpcTrendAttachmentParamSchema.parse({ params: req.params }).params;
      const { filePath, fileName, mimeType } = await spcTrendService.downloadAttachment(attachmentId, {
        userId: this.getUserId(req),
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

export const spcTrendController = new SpcTrendController();
