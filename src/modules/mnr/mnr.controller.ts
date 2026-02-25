import { Request, Response, NextFunction } from 'express';
import { mnrService } from './mnr.service.js';
import { MnrCreateSchema, MnrUpdateSchema, MnrIdParamSchema } from './mnr.schema.js';

export class MnrController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const records = await mnrService.getAllRecords(status);
      res.json({ data: records });
    } catch (error) {
      console.error('[MNR] GET ALL error:', error);
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const record = await mnrService.getRecordById(id);
      res.json({ data: record });
    } catch (error) {
      console.error('[MNR] GET BY ID error:', error);
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = MnrCreateSchema.parse({ body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const result = await mnrService.createRecord(payload, userId);
      res.status(201).json(result);
    } catch (error) {
      console.error('[MNR] CREATE error:', error);
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrUpdateSchema.parse({ params: req.params, body: req.body }).params;
      const payload = MnrUpdateSchema.parse({ params: req.params, body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';

      const result = await mnrService.updateRecord(id, payload, userId);
      res.json(result);
    } catch (error) {
      console.error('[MNR] UPDATE error:', error);
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const result = await mnrService.deleteRecord(id);
      res.json(result);
    } catch (error) {
      console.error('[MNR] DELETE error:', error);
      next(error);
    }
  }
}

export const mnrController = new MnrController();
