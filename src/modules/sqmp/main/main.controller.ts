import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { mainSqmpService } from './main.service.js';
import { SqmpCreateSchema, SqmpUpdateSchema, SqmpIdParamSchema, SqmpActionSchema } from './main.schema.js';
import { successResponse, createResponse } from '../../../shared/utils/api-response.js';
import { BadRequestError, ForbiddenError } from '../../../shared/errors/AppError.js';

const __filename = fileURLToPath(import.meta.url);
import { attachmentService } from '../../../shared/services/attachment.service.js';

export class MainSqmpController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const user = (req as any).user;
      const records = await mainSqmpService.getAllRecords(status, user?.userId, user?.roleId);
      res.json(successResponse(records));
    } catch (error) {
      console.error('[SQMP-MAIN] GET ALL error:', error);
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
      const user = (req as any).user;
      const record = await mainSqmpService.getRecordById(id, user?.userId, user?.roleId);
      return res.json(successResponse(record));
    } catch (error) {
      console.error('[SQMP-MAIN] GET BY ID error:', error);
      return next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = SqmpCreateSchema.parse({ body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];
      
      const result = await mainSqmpService.createRecord(payload, userId, files);
      return res.status(201).json(createResponse({ id: (result as any).sqmp_id || "new" }, result.message));
    } catch (error) {
      console.error('[SQMP-MAIN] CREATE error:', error);
      return next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpUpdateSchema.parse({ params: req.params, body: req.body }).params;
      const payload = SqmpUpdateSchema.parse({ params: req.params, body: req.body }).body;
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      const files = (req as any).files || [];

      const result = await mainSqmpService.updateRecord(id, payload, userId, roleId, files);
      return res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-MAIN] UPDATE error:', error);
      return next(error);
    }
  }

  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpActionSchema.parse({ params: req.params, body: req.body }).params;
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';

      const record = await mainSqmpService.getRecordById(id, userId, roleId);
      const statusStr = (record?.status || '').toUpperCase();
      if (!['DRAFT', 'REJECTED', 'NEW'].includes(statusStr)) {
         throw new BadRequestError('Invalid Transition: Record is not in DRAFT or REJECTED state');
      }
      
      const result = await mainSqmpService.updateRecord(id, { request_status: 'SUBMITTED' }, userId, roleId, []);
      return res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] SUBMIT error:', error);
      return next(error);
    }
  }

  async check(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpActionSchema.parse({ params: req.params, body: req.body }).params;
      const remarks = req.body?.remarks;
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      
      const record = await mainSqmpService.getRecordById(id, userId, roleId);
      const statusStr = (record?.status || '').toUpperCase();

      // Cycle 2 logic: Awaiting Checked (RESPONSE_SUBMITTED) -> Awaiting Approval (RESPONSE_AWAITING_APPROVAL)
      if (statusStr === 'RESPONSE_SUBMITTED') {
        const { sqmpResponseService } = await import('../response/response.service.js');
        const result = await sqmpResponseService.checkResponse(id, remarks || '', userId, roleId);
        return res.json(successResponse(result));
      }

      // Cycle 1 Logic
      if (statusStr !== 'SUBMITTED') {
        throw new BadRequestError('Invalid Transition: Plan is not submitted');
      }
      if (record?.checker_id && record.checker_id !== userId) {
        throw new ForbiddenError('Only the assigned checker can verify this plan');
      }

      const updatePayload = { 
        request_status: 'CHECKED', 
        checker_id: userId,
        checker_date: new Date(),
        checker_remarks: remarks
      };
      
      const result = await mainSqmpService.updateRecord(id, updatePayload, userId, roleId, []);
      return res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] CHECK error:', error);
      return next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpActionSchema.parse({ params: req.params, body: req.body }).params;
      const remarks = req.body?.remarks;
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      
      const record = await mainSqmpService.getRecordById(id, userId, roleId);
      const statusStr = (record?.status || '').toUpperCase();

      // Cycle 2 logic: Awaiting Approval (RESPONSE_AWAITING_APPROVAL) -> CLOSED
      if (statusStr === 'RESPONSE_AWAITING_APPROVAL') {
        const { sqmpResponseService } = await import('../response/response.service.js');
        const result = await sqmpResponseService.approveResponse(id, remarks || '', userId, roleId);
        return res.json(successResponse(result));
      }

      // Cycle 1 Logic
      if (statusStr !== 'AWAITING_APPROVAL' && statusStr !== 'CHECKED' && statusStr !== 'SUBMITTED') {
        throw new BadRequestError('Invalid Transition: Plan is not awaiting approval');
      }
      if (record?.approver_id && record.approver_id !== userId) {
         throw new ForbiddenError('Only the assigned approver can approve this plan');
      }

      const updatePayload = { 
        request_status: 'APPROVED', 
        approver_id: userId,
        approver_date: new Date(),
        approver_remarks: remarks
      };
      
      const result = await mainSqmpService.updateRecord(id, updatePayload, userId, roleId, []);
      return res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] APPROVE error:', error);
      return next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpActionSchema.parse({ params: req.params, body: req.body }).params;
      const remarks = req.body?.remarks;
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      
      const record = await mainSqmpService.getRecordById(id, userId, roleId);
      const statusStr = (record?.status || '').toUpperCase();

      // Cycle 2 logic: Response Rejected
      if (statusStr === 'RESPONSE_SUBMITTED' || statusStr === 'RESPONSE_AWAITING_APPROVAL') {
        const { sqmpResponseService } = await import('../response/response.service.js');
        const result = await sqmpResponseService.rejectResponse(id, remarks || '', userId, roleId);
        return res.json(successResponse(result));
      }

      // Cycle 1 Logic
      if (statusStr !== 'SUBMITTED' && statusStr !== 'CHECKED' && statusStr !== 'AWAITING_APPROVAL') {
        throw new BadRequestError('Invalid Transition: Plan cannot be rejected at this stage');
      }
      if (record?.checker_id === userId || record?.approver_id === userId) {
         // authorized
      } else if (record?.checker_id || record?.approver_id) {
         throw new ForbiddenError('Only assigned checkers or approvers can reject this plan');
      }

      const updatePayload = { 
        request_status: 'REJECTED', 
        approver_remarks: remarks,
        approver_date: new Date()
      };
      
      const result = await mainSqmpService.updateRecord(id, updatePayload, userId, roleId, []);
      return res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] REJECT error:', error);
      return next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      const result = await mainSqmpService.deleteRecord(id, userId, roleId);
      res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] DELETE error:', error);
      next(error);
    }
  }

  async issue(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      const result = await mainSqmpService.issueRecord(id, userId, roleId, req.body?.remarks);
      res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] ISSUE error:', error);
      next(error);
    }
  }

  async requestResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      const result = await mainSqmpService.requestResponse(id, userId, roleId, req.body?.remarks);
      res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] REQUEST RESPONSE error:', error);
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      const result = await mainSqmpService.cancelRecord(id, userId, roleId, req.body?.remarks);
      res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] CANCEL error:', error);
      next(error);
    }
  }

  async close(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      const result = await mainSqmpService.closeRecord(id, userId, roleId, req.body?.remarks);
      res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] CLOSE error:', error);
      next(error);
    }
  }

  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { attachmentId } = req.params;
      const { filePath, fileName, mimeType } = await attachmentService.downloadAttachment('sqmp-main', attachmentId as string);
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.download(filePath);
    } catch (error) {
      console.error('[SQMP-MAIN] DOWNLOAD error:', error);
      next(error);
    }
  }
}

export const mainSqmpController = new MainSqmpController();
