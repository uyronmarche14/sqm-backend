import { Request, Response, NextFunction } from 'express';
import { sqmpWorkflowService } from '../workflow/workflow.service.js';
import { SqmpResponseUpsertSchema, SqmpResponseActionSchema, SqmpResponseAttachmentParamSchema } from './response.schema.js';
import { successResponse } from '../../../shared/utils/api-response.js';
import { attachmentService } from '../../../shared/services/attachment.service.js';
import { mainSqmpService } from '../main/main.service.js';

export class SqmpResponseController {
  constructor() {
    this.saveResponse = this.saveResponse.bind(this);
    this.submitResponse = this.submitResponse.bind(this);
    this.saveClosure = this.saveClosure.bind(this);
    this.submitClosure = this.submitClosure.bind(this);
    this.checkClosure = this.checkClosure.bind(this);
    this.approveClosure = this.approveClosure.bind(this);
    this.rejectClosure = this.rejectClosure.bind(this);
    this.acceptClosure = this.acceptClosure.bind(this);
    this.notAcceptClosure = this.notAcceptClosure.bind(this);
    this.upsert = this.upsert.bind(this);
    this.check = this.check.bind(this);
    this.approve = this.approve.bind(this);
    this.reject = this.reject.bind(this);
    this.downloadAttachment = this.downloadAttachment.bind(this);
  }

  private getActor(req: Request) {
    const user = (req as any).user;
    return {
      userId: user?.userId || user?.id || 'SYSTEM',
      roleId: user?.roleId || '',
    };
  }

  async saveResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpResponseUpsertSchema.parse({ params: req.params, body: req.body });
      const { userId, roleId } = this.getActor(req);
      const files = (req as any).files || [];

      const result = await sqmpWorkflowService.saveResponse(parsed.params.id, parsed.body, userId, roleId, files);
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-RESPONSE] SAVE RESPONSE error:', error);
      next(error);
    }
  }

  async submitResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpResponseUpsertSchema.parse({ params: req.params, body: req.body });
      const { userId, roleId } = this.getActor(req);
      const files = (req as any).files || [];

      const result = await sqmpWorkflowService.submitResponse(parsed.params.id, parsed.body, userId, roleId, files);
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-RESPONSE] SUBMIT RESPONSE error:', error);
      next(error);
    }
  }

  async saveClosure(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpResponseUpsertSchema.parse({ params: req.params, body: req.body });
      const { userId, roleId } = this.getActor(req);
      const files = (req as any).files || [];

      const result = await sqmpWorkflowService.saveClosure(parsed.params.id, parsed.body, userId, roleId, files);
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-RESPONSE] SAVE CLOSURE error:', error);
      next(error);
    }
  }

  async submitClosure(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpResponseUpsertSchema.parse({ params: req.params, body: req.body });
      const { userId, roleId } = this.getActor(req);
      const files = (req as any).files || [];

      const result = await sqmpWorkflowService.submitClosure(parsed.params.id, parsed.body, userId, roleId, files);
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-RESPONSE] SUBMIT CLOSURE error:', error);
      next(error);
    }
  }

  async checkClosure(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpResponseActionSchema.parse({ params: req.params, body: req.body });
      const { userId, roleId } = this.getActor(req);

      const result = await sqmpWorkflowService.checkClosure(parsed.params.id, parsed.body?.remarks, userId, roleId);
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-RESPONSE] CHECK CLOSURE error:', error);
      next(error);
    }
  }

  async approveClosure(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpResponseActionSchema.parse({ params: req.params, body: req.body });
      const { userId, roleId } = this.getActor(req);

      const result = await sqmpWorkflowService.approveClosure(parsed.params.id, parsed.body?.remarks, userId, roleId);
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-RESPONSE] APPROVE CLOSURE error:', error);
      next(error);
    }
  }

  async rejectClosure(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpResponseActionSchema.parse({ params: req.params, body: req.body });
      const { userId, roleId } = this.getActor(req);

      const result = await sqmpWorkflowService.rejectClosure(parsed.params.id, parsed.body?.remarks, userId, roleId);
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-RESPONSE] REJECT CLOSURE error:', error);
      next(error);
    }
  }

  async acceptClosure(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpResponseActionSchema.parse({ params: req.params, body: req.body });
      const { userId, roleId } = this.getActor(req);

      const result = await sqmpWorkflowService.acceptClosure(parsed.params.id, parsed.body?.remarks, userId, roleId);
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-RESPONSE] ACCEPT CLOSURE error:', error);
      next(error);
    }
  }

  async notAcceptClosure(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpResponseActionSchema.parse({ params: req.params, body: req.body });
      const { userId, roleId } = this.getActor(req);

      const result = await sqmpWorkflowService.notAcceptClosure(parsed.params.id, parsed.body?.remarks, userId, roleId);
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-RESPONSE] NOT ACCEPT CLOSURE error:', error);
      next(error);
    }
  }

  async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpResponseUpsertSchema.parse({ params: req.params, body: req.body });
      const { userId, roleId } = this.getActor(req);
      const files = (req as any).files || [];
      const record = await mainSqmpService.getRecordById(parsed.params.id, userId, roleId);

      const result = ['15', '21', '22'].includes(record.workflowStageCode || '')
        ? await sqmpWorkflowService.submitClosure(parsed.params.id, parsed.body, userId, roleId, files)
        : await sqmpWorkflowService.submitResponse(parsed.params.id, parsed.body, userId, roleId, files);

      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-RESPONSE] UPSERT error:', error);
      next(error);
    }
  }

  async check(req: Request, res: Response, next: NextFunction) {
    return this.checkClosure(req, res, next);
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpResponseActionSchema.parse({ params: req.params, body: req.body });
      const { userId, roleId } = this.getActor(req);
      const record = await mainSqmpService.getRecordById(parsed.params.id, userId, roleId);

      const result = record.workflowStageCode === '19'
        ? await sqmpWorkflowService.acceptClosure(parsed.params.id, parsed.body?.remarks, userId, roleId)
        : await sqmpWorkflowService.approveClosure(parsed.params.id, parsed.body?.remarks, userId, roleId);

      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-RESPONSE] APPROVE error:', error);
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpResponseActionSchema.parse({ params: req.params, body: req.body });
      const { userId, roleId } = this.getActor(req);
      const record = await mainSqmpService.getRecordById(parsed.params.id, userId, roleId);

      const result = record.workflowStageCode === '19'
        ? await sqmpWorkflowService.notAcceptClosure(parsed.params.id, parsed.body?.remarks, userId, roleId)
        : await sqmpWorkflowService.rejectClosure(parsed.params.id, parsed.body?.remarks, userId, roleId);

      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-RESPONSE] REJECT error:', error);
      next(error);
    }
  }

  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { attachmentId } = SqmpResponseAttachmentParamSchema.parse({ params: req.params }).params;
      const { filePath, fileName, mimeType } = await attachmentService.downloadAttachment('sqmp-response', attachmentId as string);
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.download(filePath);
    } catch (error) {
      console.error('[SQMP-RESPONSE] DOWNLOAD error:', error);
      next(error);
    }
  }
}

export const sqmpResponseController = new SqmpResponseController();
