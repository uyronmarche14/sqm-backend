import { Request, Response, NextFunction } from 'express';
import { sqprService } from './sqpr.service.js';
import { SqprCreateSchema, SqprUpdateSchema, SqprIdParamSchema, SqprActionSchema } from './sqpr.schema.js';

export class SqprController {
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const records = await sqprService.getAllRecords();
      res.json({ data: records });
    } catch (error) {
      console.error('[SQPR] GET ALL error:', error);
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqprIdParamSchema.parse({ params: req.params }).params;
      const record = await sqprService.getRecordById(id);
      res.json({ data: record });
    } catch (error) {
      console.error('[SQPR] GET BY ID error:', error);
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = SqprCreateSchema.parse({ body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];
      
      const result = await sqprService.createRecord(payload, userId, files);
      res.status(201).json(result);
    } catch (error) {
      console.error('[SQPR] CREATE error:', error);
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqprUpdateSchema.parse({ params: req.params, body: req.body }).params;
      const payload = SqprUpdateSchema.parse({ params: req.params, body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];

      const result = await sqprService.updateRecord(id, payload, userId, files);
      res.json(result);
    } catch (error) {
      console.error('[SQPR] UPDATE error:', error);
      next(error);
    }
  }

  // Workflow Action Wrappers
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqprActionSchema.parse({ params: req.params, body: req.body }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const result = await sqprService.updateRecord(id, { 
        request_status: 'SUBMITTED', 
        submit_date: new Date() 
      }, userId, []);
      
      res.json(result);
    } catch (error) {
      console.error('[SQPR] SUBMIT error:', error);
      next(error);
    }
  }

  async issue(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqprActionSchema.parse({ params: req.params, body: req.body }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const result = await sqprService.updateRecord(id, { 
        request_status: 'ISSUED'
      }, userId, []);
      
      res.json(result);
    } catch (error) {
      console.error('[SQPR] ISSUE error:', error);
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { params, body } = SqprActionSchema.parse({ params: req.params, body: req.body });
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const result = await sqprService.updateRecord(params.id, { 
        request_status: 'REJECTED',
        checker_remarks: body?.remarks
      }, userId, []);
      
      res.json(result);
    } catch (error) {
      console.error('[SQPR] REJECT error:', error);
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqprIdParamSchema.parse({ params: req.params }).params;
      const result = await sqprService.deleteRecord(id);
      res.json(result);
    } catch (error) {
      console.error('[SQPR] DELETE error:', error);
      next(error);
    }
  }
}

export const sqprController = new SqprController();
