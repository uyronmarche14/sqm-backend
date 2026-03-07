import { Request, Response, NextFunction } from 'express';
import { sqmpResponseService } from './response.service.js';
import { SqmpResponseUpsertSchema, SqmpResponseActionSchema } from './response.schema.js';
import { successResponse } from '../../../shared/utils/api-response.js';

export class SqmpResponseController {
  async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpResponseUpsertSchema.parse({ params: req.params, body: req.body }).params;
      const payload = SqmpResponseUpsertSchema.parse({ params: req.params, body: req.body }).body;
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      const files = (req as any).files || [];

      const result = await sqmpResponseService.upsertResponse(id, payload, userId, roleId, files);
      res.json(successResponse(result));
    } catch (error) {
      console.error('[SQMP-RESPONSE] UPSERT error:', error);
      next(error);
    }
  }

  async check(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpResponseActionSchema.parse({ params: req.params, body: req.body }).params;
      const remarks = req.body?.remarks || '';
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      
      const result = await sqmpResponseService.checkResponse(id, remarks, userId, roleId);
      res.json(successResponse(result));
    } catch (error) {
      console.error('[SQMP-RESPONSE] CHECK error:', error);
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpResponseActionSchema.parse({ params: req.params, body: req.body }).params;
      const remarks = req.body?.remarks || '';
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      
      const result = await sqmpResponseService.approveResponse(id, remarks, userId, roleId);
      res.json(successResponse(result));
    } catch (error) {
      console.error('[SQMP-RESPONSE] APPROVE error:', error);
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpResponseActionSchema.parse({ params: req.params, body: req.body }).params;
      const remarks = req.body?.remarks || '';
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      
      const result = await sqmpResponseService.rejectResponse(id, remarks, userId, roleId);
      res.json(successResponse(result));
    } catch (error) {
      console.error('[SQMP-RESPONSE] REJECT error:', error);
      next(error);
    }
  }
}

export const sqmpResponseController = new SqmpResponseController();
