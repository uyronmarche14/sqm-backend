import { Request, Response, NextFunction } from 'express';
import { qmqaService } from './qmqa.service.js';
import { qmqaWorkflowService } from './workflow/qmqa-workflow.service.js';
import {
  QmqaAttachmentParamSchema,
  QmqaIdParamSchema,
  QmqaRecordCreateSchema,
  QmqaRecordUpdateSchema,
  QmqaScheduleCreateSchema,
  QmqaScheduleUpdateSchema,
} from './qmqa.schema.js';
import { successResponse, createResponse } from '../../shared/utils/api-response.js';
import { attachmentService } from '../../shared/services/attachment.service.js';

export class QmqaController {
  private getUserId(req: Request) {
    return (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
  }

  private getActionRemarks(req: Request) {
    return req.body?.remarks || req.body?.approver_remarks || req.body?.rejectionRemarks;
  }

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
      const result = await qmqaService.createSchedule(payload, this.getUserId(req));
      res.status(201).json(createResponse(result, 'Schedule created'));
    } catch (error) {
      next(error);
    }
  }

  async updateSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = QmqaScheduleUpdateSchema.parse({ params: req.params, body: req.body });
      const result = await qmqaService.updateSchedule(
        parsed.params.id,
        parsed.body,
        this.getUserId(req),
      );
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

  async getAllRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const records = await qmqaService.getAllRecords(
        { status },
        { userId: this.getUserId(req) },
      );
      res.json({ data: records });
    } catch (error) {
      next(error);
    }
  }

  async getRecordById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const record = await qmqaService.getRecordById(id, { userId: this.getUserId(req) });
      res.json({ data: record });
    } catch (error) {
      next(error);
    }
  }

  async createRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = QmqaRecordCreateSchema.parse({ body: req.body }).body;
      const files = (req as any).files || [];
      const result = await qmqaService.createRecord(payload, this.getUserId(req), files);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = QmqaRecordUpdateSchema.parse({ params: req.params, body: req.body });
      const result = await qmqaService.updateRecord(
        parsed.params.id,
        parsed.body,
        this.getUserId(req),
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaService.deleteRecord(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.submit(id, this.getUserId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async check(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.check(id, this.getUserId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.approve(id, this.getUserId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.reject(id, this.getUserId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async issue(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.issue(id, this.getUserId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.cancel(id, this.getUserId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.verify(id, this.getUserId(req), {
        verification_remarks: req.body?.verification_remarks || req.body?.verificationNotes,
        cycle2_checker_id: req.body?.cycle2_checker_id || req.body?.checker_id,
        cycle2_checker_remarks: req.body?.cycle2_checker_remarks,
        cycle2_approver_id: req.body?.cycle2_approver_id || req.body?.approver_id,
        cycle2_approver_remarks: req.body?.cycle2_approver_remarks,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async saveResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.saveResponse(
        id,
        this.getUserId(req),
        req.body,
        (req as any).files || [],
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async submitInitialResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.submitInitialResponse(
        id,
        this.getUserId(req),
        req.body,
        (req as any).files || [],
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async submitFinalResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.submitFinalResponse(
        id,
        this.getUserId(req),
        req.body,
        (req as any).files || [],
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async saveResponseReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.saveResponseReview(id, this.getUserId(req), req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async submitResponseReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.submitResponseReview(id, this.getUserId(req), req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async checkResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.checkResponse(id, this.getUserId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async approveResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.approveResponse(id, this.getUserId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async rejectResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.rejectResponse(id, this.getUserId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async acceptResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.acceptResponse(id, this.getUserId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async notAcceptResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.notAcceptResponse(id, this.getUserId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async saveInitialReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.saveInitialReport(
        id,
        this.getUserId(req),
        {
          skip_initial: req.body?.skip_initial === 'true'
            || req.body?.skip_initial === true
            || req.body?.skipInitial === 'true'
            || req.body?.skipInitial === true,
          initial_remarks: req.body?.initial_remarks || req.body?.initialReport || null,
          is_submit: req.body?.is_submit === 'true'
            || req.body?.is_submit === true
            || req.body?.isSubmit === 'true'
            || req.body?.isSubmit === true,
        },
        (req as any).files || [],
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async submitFinalReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.submitFinalReport(
        id,
        this.getUserId(req),
        {
          final_remarks: req.body?.final_remarks || req.body?.finalReport || null,
          is_submit: req.body?.is_submit === 'true'
            || req.body?.is_submit === true
            || req.body?.isSubmit === 'true'
            || req.body?.isSubmit === true,
        },
        (req as any).files || [],
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async batchSubmit(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      let count = 0;

      for (const id of req.body?.ids || []) {
        try {
          await qmqaWorkflowService.submit(id, userId, this.getActionRemarks(req));
          count += 1;
        } catch (_error) {}
      }

      res.json({ success: true, count });
    } catch (error) {
      next(error);
    }
  }

  async batchCheck(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      let count = 0;

      for (const id of req.body?.ids || []) {
        try {
          await qmqaWorkflowService.check(id, userId, req.body?.remarks);
          count += 1;
        } catch (_error) {}
      }

      res.json({ success: true, count });
    } catch (error) {
      next(error);
    }
  }

  async batchApprove(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      let count = 0;

      for (const id of req.body?.ids || []) {
        try {
          await qmqaWorkflowService.approve(id, userId, req.body?.remarks);
          count += 1;
        } catch (_error) {}
      }

      res.json({ success: true, count });
    } catch (error) {
      next(error);
    }
  }

  async batchReject(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      let count = 0;

      for (const id of req.body?.ids || []) {
        try {
          await qmqaWorkflowService.reject(id, userId, req.body?.remarks);
          count += 1;
        } catch (_error) {}
      }

      res.json({ success: true, count });
    } catch (error) {
      next(error);
    }
  }

  async batchIssue(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = this.getUserId(req);
      let count = 0;

      for (const id of req.body?.ids || []) {
        try {
          await qmqaWorkflowService.issue(id, userId, req.body?.remarks);
          count += 1;
        } catch (_error) {}
      }

      res.json({ success: true, count });
    } catch (error) {
      next(error);
    }
  }

  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { moduleType, attachmentId } = QmqaAttachmentParamSchema.parse({ params: req.params }).params;
      const { filePath, fileName, mimeType } = await attachmentService.downloadAttachment(moduleType, attachmentId);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.download(filePath);
    } catch (error) {
      next(error);
    }
  }
}

export const qmqaController = new QmqaController();

