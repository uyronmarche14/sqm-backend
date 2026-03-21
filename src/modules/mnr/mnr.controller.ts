import { Request, Response, NextFunction } from 'express';
import { mnrService } from './mnr.service.js';
import {
  MnrCreateSchema,
  MnrUpdateSchema,
  MnrIdParamSchema,
  MnrAttachmentParamSchema,
  MnrWorkflowActionSchema,
  MnrResponseWorkflowSchema,
} from './mnr.schema.js';
import { mnrWorkflowService } from './workflow/mnr-workflow.service.js';
import { resolveWorkflowListScope } from '../../shared/utils/workflow-access.js';

export class MnrController {
  constructor() {
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
    this.submit = this.submit.bind(this);
    this.submitMain = this.submitMain.bind(this);
    this.check = this.check.bind(this);
    this.checkMain = this.checkMain.bind(this);
    this.approve = this.approve.bind(this);
    this.approveMain = this.approveMain.bind(this);
    this.reject = this.reject.bind(this);
    this.rejectMain = this.rejectMain.bind(this);
    this.issue = this.issue.bind(this);
    this.issueMain = this.issueMain.bind(this);
    this.close = this.close.bind(this);
    this.cancel = this.cancel.bind(this);
    this.cancelMain = this.cancelMain.bind(this);
    this.saveInitialResponse = this.saveInitialResponse.bind(this);
    this.submitInitialResponse = this.submitInitialResponse.bind(this);
    this.saveFinalResponse = this.saveFinalResponse.bind(this);
    this.submitFinalResponse = this.submitFinalResponse.bind(this);
    this.saveResponseReview = this.saveResponseReview.bind(this);
    this.submitResponseReview = this.submitResponseReview.bind(this);
    this.checkResponse = this.checkResponse.bind(this);
    this.approveResponse = this.approveResponse.bind(this);
    this.rejectResponse = this.rejectResponse.bind(this);
    this.acceptResponse = this.acceptResponse.bind(this);
    this.notAcceptResponse = this.notAcceptResponse.bind(this);
    this.downloadAttachment = this.downloadAttachment.bind(this);
  }

  private getActor(req: Request) {
    return {
      userId: (req as any).user?.userId || (req as any).user?.id || undefined,
      supplierId: (req as any).user?.supplierId || undefined,
      roleName: (req as any).user?.roleName || (req as any).user?.role_name || (req as any).user?.role || undefined,
    };
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const actor = this.getActor(req);
      const records = await mnrService.getAllRecords(
        { status, scope: resolveWorkflowListScope({ scope: req.query.scope, assignedToMe: req.query.assignedToMe }) },
        actor,
      );
      res.json({ data: records });
    } catch (error) {
      console.error('[MNR] GET ALL error:', error);
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const actor = this.getActor(req);
      const record = await mnrService.getRecordById(id, actor);
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
      const files = (req as any).files || [];
      
      const result = await mnrService.createRecord(payload, userId, files);
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
      const actor = this.getActor(req);
      const files = (req as any).files || [];

      const result = await mnrService.updateRecord(id, payload, actor, files);
      res.json(result);
    } catch (error) {
      console.error('[MNR] UPDATE error:', error);
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const result = await mnrService.deleteRecord(id, this.getActor(req));
      res.json(result);
    } catch (error) {
      console.error('[MNR] DELETE error:', error);
      next(error);
    }
  }

  // Workflow Action Handlers
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
      const remarks = parsed?.remarks || parsed?.updates?.remarks;
      const roleId = (req as any).user?.roleId || (req as any).user?.role_id;
      const result = await mnrWorkflowService.submitMain(id, userId, roleId, remarks);
      res.json(result);
    } catch (error) {
      console.error('[MNR] SUBMIT error:', error);
      next(error);
    }
  }

  async submitMain(req: Request, res: Response, next: NextFunction) {
    return this.submit(req, res, next);
  }

  async check(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
      const remarks = parsed?.remarks || parsed?.updates?.remarks;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const roleId = (req as any).user?.roleId || (req as any).user?.role_id;
      const result = await mnrWorkflowService.checkMain(id, userId, roleId, remarks);
      res.json(result);
    } catch (error) {
      console.error('[MNR] CHECK error:', error);
      next(error);
    }
  }

  async checkMain(req: Request, res: Response, next: NextFunction) {
    return this.check(req, res, next);
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
      const remarks = parsed?.remarks || parsed?.updates?.remarks;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const roleId = (req as any).user?.roleId || (req as any).user?.role_id;
      const result = await mnrWorkflowService.approveMain(id, userId, roleId, remarks);
      res.json(result);
    } catch (error) {
      console.error('[MNR] APPROVE error:', error);
      next(error);
    }
  }

  async approveMain(req: Request, res: Response, next: NextFunction) {
    return this.approve(req, res, next);
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
      const remarks = parsed?.remarks || parsed?.updates?.remarks;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const roleId = (req as any).user?.roleId || (req as any).user?.role_id;
      const result = await mnrWorkflowService.rejectMain(id, userId, roleId, remarks);
      res.json(result);
    } catch (error) {
      console.error('[MNR] REJECT error:', error);
      next(error);
    }
  }

  async rejectMain(req: Request, res: Response, next: NextFunction) {
    return this.reject(req, res, next);
  }

  async issue(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
      const remarks = parsed?.remarks || parsed?.updates?.remarks;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const roleId = (req as any).user?.roleId || (req as any).user?.role_id;
      const result = await mnrWorkflowService.issueMain(id, userId, roleId, remarks);
      res.json(result);
    } catch (error) {
      console.error('[MNR] ISSUE error:', error);
      next(error);
    }
  }

  async issueMain(req: Request, res: Response, next: NextFunction) {
    return this.issue(req, res, next);
  }

  async close(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
      const remarks = parsed?.remarks || parsed?.updates?.remarks;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const roleId = (req as any).user?.roleId || (req as any).user?.role_id;
      const result = await mnrWorkflowService.close(id, userId, roleId, remarks);
      res.json(result);
    } catch (error) {
      console.error('[MNR] CLOSE error:', error);
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
      const remarks = parsed?.remarks || parsed?.updates?.remarks;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const roleId = (req as any).user?.roleId || (req as any).user?.role_id;
      const result = await mnrWorkflowService.cancelMain(id, userId, roleId, remarks);
      res.json(result);
    } catch (error) {
      console.error('[MNR] CANCEL error:', error);
      next(error);
    }
  }

  async cancelMain(req: Request, res: Response, next: NextFunction) {
    return this.cancel(req, res, next);
  }

  async saveInitialResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrResponseWorkflowSchema.parse({ body: req.body }).body;
      const responsePayload = parsed?.response8D || parsed?.updates?.response8D || {};
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const roleId = (req as any).user?.roleId || (req as any).user?.role_id || undefined;
      const supplierId = (req as any).user?.supplierId || undefined;
      const result = await mnrWorkflowService.saveInitialResponse(id, userId, roleId, responsePayload, supplierId);
      res.json(result);
    } catch (error) {
      console.error('[MNR] SAVE INITIAL RESPONSE error:', error);
      next(error);
    }
  }

  async submitInitialResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrResponseWorkflowSchema.parse({ body: req.body }).body;
      const responsePayload = parsed?.response8D || parsed?.updates?.response8D || {};
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const supplierId = (req as any).user?.supplierId || undefined;
      const result = await mnrWorkflowService.submitInitialResponse(id, userId, responsePayload, supplierId);
      res.json(result);
    } catch (error) {
      console.error('[MNR] SUBMIT INITIAL RESPONSE error:', error);
      next(error);
    }
  }

  async saveFinalResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrResponseWorkflowSchema.parse({ body: req.body }).body;
      const responsePayload = parsed?.response8D || parsed?.updates?.response8D || {};
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const supplierId = (req as any).user?.supplierId || undefined;
      const result = await mnrWorkflowService.saveFinalResponse(id, userId, responsePayload, supplierId);
      res.json(result);
    } catch (error) {
      console.error('[MNR] SAVE FINAL RESPONSE error:', error);
      next(error);
    }
  }

  async submitFinalResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrResponseWorkflowSchema.parse({ body: req.body }).body;
      const responsePayload = parsed?.response8D || parsed?.updates?.response8D || {};
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const supplierId = (req as any).user?.supplierId || undefined;
      const result = await mnrWorkflowService.submitFinalResponse(id, userId, responsePayload, supplierId);
      res.json(result);
    } catch (error) {
      console.error('[MNR] SUBMIT FINAL RESPONSE error:', error);
      next(error);
    }
  }

  async saveResponseReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrResponseWorkflowSchema.parse({ body: req.body }).body;
      const responsePayload = parsed?.response8D || parsed?.updates?.response8D || {};
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mnrWorkflowService.saveResponseReview(id, userId, responsePayload);
      res.json(result);
    } catch (error) {
      console.error('[MNR] SAVE RESPONSE REVIEW error:', error);
      next(error);
    }
  }

  async submitResponseReview(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrResponseWorkflowSchema.parse({ body: req.body }).body;
      const responsePayload = parsed?.response8D || parsed?.updates?.response8D || {};
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mnrWorkflowService.submitResponseReview(id, userId, responsePayload);
      res.json(result);
    } catch (error) {
      console.error('[MNR] SUBMIT RESPONSE REVIEW error:', error);
      next(error);
    }
  }

  async checkResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
      const remarks = parsed?.remarks || parsed?.updates?.remarks;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mnrWorkflowService.checkResponse(id, userId, remarks);
      res.json(result);
    } catch (error) {
      console.error('[MNR] CHECK RESPONSE error:', error);
      next(error);
    }
  }

  async approveResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
      const remarks = parsed?.remarks || parsed?.updates?.remarks;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mnrWorkflowService.approveResponse(id, userId, remarks);
      res.json(result);
    } catch (error) {
      console.error('[MNR] APPROVE RESPONSE error:', error);
      next(error);
    }
  }

  async rejectResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
      const remarks = parsed?.remarks || parsed?.updates?.remarks;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mnrWorkflowService.rejectResponse(id, userId, remarks || '');
      res.json(result);
    } catch (error) {
      console.error('[MNR] REJECT RESPONSE error:', error);
      next(error);
    }
  }

  async acceptResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
      const remarks = parsed?.remarks || parsed?.updates?.remarks;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mnrWorkflowService.acceptResponse(id, userId, remarks);
      res.json(result);
    } catch (error) {
      console.error('[MNR] ACCEPT RESPONSE error:', error);
      next(error);
    }
  }

  async notAcceptResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
      const remarks = parsed?.remarks || parsed?.updates?.remarks;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mnrWorkflowService.notAcceptResponse(id, userId, remarks || '');
      res.json(result);
    } catch (error) {
      console.error('[MNR] NOT ACCEPT RESPONSE error:', error);
      next(error);
    }
  }

  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { attachmentId } = MnrAttachmentParamSchema.parse({ params: req.params }).params;
      const { filePath, fileName, mimeType } = await mnrService.downloadAttachment(attachmentId, this.getActor(req));
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.download(filePath);
    } catch (error) {
      console.error('[MNR] DOWNLOAD error:', error);
      next(error);
    }
  }
}

export const mnrController = new MnrController();
