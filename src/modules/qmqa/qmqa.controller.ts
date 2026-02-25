import { Request, Response, NextFunction } from 'express';
import { qmqaService } from './qmqa.service.js';
import { 
  QmqaScheduleCreateSchema, QmqaScheduleUpdateSchema, 
  QmqaRecordCreateSchema, QmqaRecordUpdateSchema, 
  QmqaIdParamSchema 
} from './qmqa.schema.js';

export class QmqaController {
  
  // ==========================================
  // SCHEDULES (Audit Plan)
  // ==========================================
  async getAllSchedules(_req: Request, res: Response, next: NextFunction) {
    try {
      const records = await qmqaService.getAllSchedules();
      return res.json({ data: records });
    } catch (error) {
      console.error('[QMQA] GET ALL SCHEDULES error:', error);
      return next(error);
    }
  }

  async getScheduleById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const record = await qmqaService.getScheduleById(id);
      return res.json({ data: record });
    } catch (error) {
      console.error('[QMQA] GET SCHEDULE BY ID error:', error);
      return next(error);
    }
  }

  async createSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = QmqaScheduleCreateSchema.parse({ body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const result = await qmqaService.createSchedule(payload, userId);
      return res.status(201).json(result);
    } catch (error) {
      console.error('[QMQA] CREATE SCHEDULE error:', error);
      return next(error);
    }
  }

  async updateSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaScheduleUpdateSchema.parse({ params: req.params, body: req.body }).params;
      const payload = QmqaScheduleUpdateSchema.parse({ params: req.params, body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';

      const result = await qmqaService.updateSchedule(id, payload, userId);
      return res.json(result);
    } catch (error) {
      console.error('[QMQA] UPDATE SCHEDULE error:', error);
      return next(error);
    }
  }

  // ==========================================
  // RECORDS (Execution)
  // ==========================================
  async getAllRecords(_req: Request, res: Response, next: NextFunction) {
    try {
      const records = await qmqaService.getAllRecords();
      return res.json({ data: records });
    } catch (error) {
      console.error('[QMQA] GET ALL RECORDS error:', error);
      return next(error);
    }
  }

  async getRecordById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const record = await qmqaService.getRecordById(id);
      return res.json({ data: record });
    } catch (error) {
      console.error('[QMQA] GET RECORD BY ID error:', error);
      return next(error);
    }
  }

  async createRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = QmqaRecordCreateSchema.parse({ body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];
      
      const result = await qmqaService.createRecord(payload, userId, files);
      return res.status(201).json(result);
    } catch (error) {
      console.error('[QMQA] CREATE RECORD error:', error);
      return next(error);
    }
  }

  async updateRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaRecordUpdateSchema.parse({ params: req.params, body: req.body }).params;
      const payload = QmqaRecordUpdateSchema.parse({ params: req.params, body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';

      const result = await qmqaService.updateRecord(id, payload, userId);
      return res.json(result);
    } catch (error) {
      console.error('[QMQA] UPDATE RECORD error:', error);
      return next(error);
    }
  }

  // ==========================================
  // WORKFLOW ACTIONS
  // ==========================================
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await qmqaService.submit(id, userId);
      return res.json(result);
    } catch (error) {
      console.error('[QMQA] SUBMIT error:', error);
      return next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const { remarks } = req.body;
      const result = await qmqaService.approve(id, userId, remarks);
      return res.json(result);
    } catch (error) {
      console.error('[QMQA] APPROVE error:', error);
      return next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const { remarks } = req.body;
      const result = await qmqaService.reject(id, userId, remarks);
      return res.json(result);
    } catch (error) {
      console.error('[QMQA] REJECT error:', error);
      return next(error);
    }
  }

  async issue(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await qmqaService.issue(id, userId);
      return res.json(result);
    } catch (error) {
      console.error('[QMQA] ISSUE error:', error);
      return next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await qmqaService.cancel(id, userId);
      return res.json(result);
    } catch (error) {
      console.error('[QMQA] CANCEL error:', error);
      return next(error);
    }
  }
}

export const qmqaController = new QmqaController();
