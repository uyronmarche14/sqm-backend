import { Request, Response, NextFunction } from 'express';
import { qmqaService } from './qmqa.service.js';
import { 
  QmqaScheduleCreateSchema, QmqaScheduleUpdateSchema, 
  QmqaRecordCreateSchema, QmqaRecordUpdateSchema, 
  QmqaIdParamSchema, QmqaVerificationSchema
} from './qmqa.schema.js';
import { successResponse, createResponse } from '../../shared/utils/api-response.js';

export class QmqaController {
  
  // ==========================================
  // SCHEDULES (Audit Plan)
  // ==========================================
  async getAllSchedules(_req: Request, res: Response, next: NextFunction) {
    try {
      const records = await qmqaService.getAllSchedules();
      res.json(successResponse(records));
    } catch (error) {
      next(error);
    }
  }

  async getScheduleById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const record = await qmqaService.getScheduleById(id);
      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  }

  async createSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = QmqaScheduleCreateSchema.parse({ body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const result = await qmqaService.createSchedule(payload, userId);
      res.status(201).json(createResponse(result, 'Schedule created'));
    } catch (error) {
      next(error);
    }
  }

  async updateSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaScheduleUpdateSchema.parse({ params: req.params, body: req.body }).params;
      const payload = QmqaScheduleUpdateSchema.parse({ params: req.params, body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';

      const result = await qmqaService.updateSchedule(id, payload, userId);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  async deleteSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaService.deleteSchedule(id);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  // RECORDS (Execution)
  // ==========================================
  async getAllRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const records = await qmqaService.getAllRecords({ status });
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

  async deleteRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaService.deleteRecord(id);
      return res.json(result);
    } catch (error) {
      console.error('[QMQA] DELETE RECORD error:', error);
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

  async check(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const { remarks } = req.body;
      const result = await qmqaService.check(id, userId, remarks);
      return res.json(result);
    } catch (error) {
      console.error('[QMQA] CHECK error:', error);
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

  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaVerificationSchema.parse({ params: req.params, body: req.body }).params;
      const payload = QmqaVerificationSchema.parse({ params: req.params, body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      // Parse verification_date if it's a string
      const verificationDate = payload.verification_date 
        ? new Date(payload.verification_date) 
        : undefined;
      
      const result = await qmqaService.verify(id, userId, {
        verified_by: payload.verified_by,
        verification_remarks: payload.verification_remarks,
        verification_date: verificationDate,
        cycle2_checker_id: payload.cycle2_checker_id,
        cycle2_checker_remarks: payload.cycle2_checker_remarks,
        cycle2_approver_id: payload.cycle2_approver_id,
        cycle2_approver_remarks: payload.cycle2_approver_remarks,
      });
      return res.json(result);
    } catch (error) {
      console.error('[QMQA] VERIFY error:', error);
      return next(error);
    }
  }

  // ==========================================
  // SUPPLIER RESPONSE
  // ==========================================
  async saveInitialReport(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];
      const { skip_initial, initial_remarks, skipInitial, initialReport, is_submit, isSubmit } = req.body;

      const result = await qmqaService.saveInitialReport(id, userId, {
        skip_initial: skip_initial === 'true' || skip_initial === true || skipInitial === 'true' || skipInitial === true,
        initial_remarks: initial_remarks || initialReport || null,
        is_submit: is_submit === 'true' || is_submit === true || isSubmit === 'true' || isSubmit === true,
      }, files);
      return res.json(result);
    } catch (error) {
      console.error('[QMQA] SAVE INITIAL REPORT error:', error);
      return next(error);
    }
  }

  async submitFinalReport(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];
      const { final_remarks, is_submit, isSubmit } = req.body;

      const result = await qmqaService.submitFinalReport(id, userId, {
        final_remarks: final_remarks || null,
        is_submit: is_submit === 'true' || is_submit === true || isSubmit === 'true' || isSubmit === true,
      }, files);
      return res.json(result);
    } catch (error) {
      console.error('[QMQA] SUBMIT FINAL REPORT error:', error);
      return next(error);
    }
  }

  // ==========================================
  // BATCH OPERATIONS
  // ==========================================
  async batchSubmit(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const { ids } = req.body;
      let count = 0;
      for (const id of ids) {
        try { await qmqaService.submit(id, userId); count++; } catch (e) { console.error(`Failed to submit ${id}:`, e); }
      }
      return res.json({ success: true, count });
    } catch (error) {
      return next(error);
    }
  }

  async batchCheck(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const { ids, remarks } = req.body;
      let count = 0;
      for (const id of ids) {
        try { await qmqaService.check(id, userId, remarks); count++; } catch (e) { console.error(`Failed to check ${id}:`, e); }
      }
      return res.json({ success: true, count });
    } catch (error) {
      return next(error);
    }
  }

  async batchApprove(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const { ids, remarks } = req.body;
      let count = 0;
      for (const id of ids) {
        try { await qmqaService.approve(id, userId, remarks); count++; } catch (e) { console.error(`Failed to approve ${id}:`, e); }
      }
      return res.json({ success: true, count });
    } catch (error) {
      return next(error);
    }
  }

  async batchReject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const { ids, remarks } = req.body;
      let count = 0;
      for (const id of ids) {
        try { await qmqaService.reject(id, userId, remarks); count++; } catch (e) { console.error(`Failed to reject ${id}:`, e); }
      }
      return res.json({ success: true, count });
    } catch (error) {
      return next(error);
    }
  }

  async batchIssue(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const { ids } = req.body;
      let count = 0;
      for (const id of ids) {
        try { await qmqaService.issue(id, userId); count++; } catch (e) { console.error(`Failed to issue ${id}:`, e); }
      }
      return res.json({ success: true, count });
    } catch (error) {
      return next(error);
    }
  }
}

export const qmqaController = new QmqaController();
