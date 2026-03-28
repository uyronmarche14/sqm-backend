import { Request, Response, NextFunction } from 'express';
import { sqprService } from './sqpr.service.js';
import { SqprCreateSchema, SqprUpdateSchema, SqprIdParamSchema, SqprActionSchema, SqprAttachmentParamSchema } from './sqpr.schema.js';
import { sqprWorkflowService } from './workflow/sqpr-workflow.service.js';
import { successResponse } from '../../shared/utils/api-response.js';
import { assertNoWorkflowMutationFields } from '../../shared/utils/reject-workflow-mutation-fields.js';
import { resolveWorkflowListScope } from '../../shared/utils/workflow-access.js';

export class SqprController {
  constructor() {
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.submit = this.submit.bind(this);
    this.issue = this.issue.bind(this);
    this.reject = this.reject.bind(this);
    this.delete = this.delete.bind(this);
    this.approve = this.approve.bind(this);
    this.check = this.check.bind(this);
    this.batchDelete = this.batchDelete.bind(this);
    this.downloadAttachment = this.downloadAttachment.bind(this);
  }

  private getUserId(req: Request) {
    return (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
  }

  private getRoleId(req: Request) {
    return (req as any).user?.roleId || (req as any).user?.role_id;
  }

  private getRoleName(req: Request) {
    return (req as any).user?.roleName || (req as any).user?.role_name || (req as any).user?.role || undefined;
  }

  private getActionRemarks(req: Request) {
    return req.body?.remarks || req.body?.approver_remarks || req.body?.rejectionRemarks;
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const records = await sqprService.getAllRecords(
        {
          status,
          scope: resolveWorkflowListScope({
            scope: req.query.scope,
            assignedToMe: req.query.assignedToMe,
          }),
        },
        { userId: this.getUserId(req), roleName: this.getRoleName(req) },
      );
      res.json(successResponse(records));
    } catch (error) {
      console.error('[SQPR] GET ALL error:', error);
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqprIdParamSchema.parse({ params: req.params }).params;
      const record = await sqprService.getRecordById(id, {
        userId: this.getUserId(req),
        roleName: this.getRoleName(req),
      });
      res.json(successResponse(record));
    } catch (error) {
      console.error('[SQPR] GET BY ID error:', error);
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      // Parse JSON strings from FormData if present
      const body = { ...req.body };
      if (typeof body.attachments === 'string') {
        body.attachments = JSON.parse(body.attachments);
      }
      if (typeof body.cc_list === 'string') {
        body.cc_list = JSON.parse(body.cc_list);
      }
      if (typeof body.approval === 'string') {
        body.approval = JSON.parse(body.approval);
      }
      assertNoWorkflowMutationFields(body, 'SQPR');
      
      // Log received data (BEFORE flattening)
      console.info(`[Backend] Receiving SQPR Create form data by user ${this.getUserId(req)}`, { body });
      
      const payload = SqprCreateSchema.parse({ body }).body;
      const userId = this.getUserId(req);
      const files = (req as any).files || [];
      
      const result = await sqprService.createRecord(payload, userId, files);
      
      res.status(201).json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQPR] CREATE error:', error);
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      // Parse JSON strings from FormData if present
      const body = { ...req.body };
      if (typeof body.attachments === 'string') {
        body.attachments = JSON.parse(body.attachments);
      }
      if (typeof body.cc_list === 'string') {
        body.cc_list = JSON.parse(body.cc_list);
      }
      if (typeof body.approval === 'string') {
        body.approval = JSON.parse(body.approval);
      }
      
      // Flatten approval nested object to top-level fields for schema validation
      if (body.approval && typeof body.approval === 'object') {
        const approval = body.approval;
        if (approval.incharge_id) body.incharge_id = approval.incharge_id;
        if (approval.incharge_remarks) body.incharge_remarks = approval.incharge_remarks;
        if (approval.checker_id) body.checker_id = approval.checker_id;
        if (approval.checker_remarks) body.checker_remarks = approval.checker_remarks;
        if (approval.approver_id) body.approver_id = approval.approver_id;
        if (approval.approver_remarks) body.approver_remarks = approval.approver_remarks;
      }
      assertNoWorkflowMutationFields(body, 'SQPR');
      
      const parsed = SqprUpdateSchema.parse({ params: req.params, body });
      const { id } = parsed.params;
      const payload = parsed.body;
      const userId = this.getUserId(req);
      const files = (req as any).files || [];
      const result = await sqprService.updateRecord(
        id,
        payload,
        { userId, roleName: this.getRoleName(req) },
        files,
      );
      
      console.info(`[Backend] Receiving SQPR Update form data for ${id}`, { body });
      
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQPR] UPDATE error:', error);
      next(error);
    }
  }

  // Workflow Action Wrappers
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqprActionSchema.parse({ params: req.params, body: req.body }).params;
      const result = await sqprWorkflowService.submit(id, this.getUserId(req), this.getRoleId(req), this.getActionRemarks(req));
      
      res.json(result);
    } catch (error) {
      console.error('[SQPR] SUBMIT error:', error);
      next(error);
    }
  }

  async issue(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqprActionSchema.parse({ params: req.params, body: req.body }).params;
      const result = await sqprWorkflowService.issue(id, this.getUserId(req), this.getRoleId(req));
      
      res.json(result);
    } catch (error) {
      console.error('[SQPR] ISSUE error:', error);
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqprActionSchema.parse({ params: req.params, body: req.body }).params;
      const result = await sqprWorkflowService.reject(id, this.getUserId(req), this.getRoleId(req), this.getActionRemarks(req));
      
      res.json(result);
    } catch (error) {
      console.error('[SQPR] REJECT error:', error);
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqprIdParamSchema.parse({ params: req.params }).params;
      const result = await sqprService.deleteRecord(id, {
        userId: this.getUserId(req),
        roleName: this.getRoleName(req),
      });
      res.json(result);
    } catch (error) {
      console.error('[SQPR] DELETE error:', error);
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqprActionSchema.parse({ params: req.params, body: req.body }).params;
      const result = await sqprWorkflowService.approve(id, this.getUserId(req), this.getRoleId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      console.error('[SQPR] APPROVE error:', error);
      next(error);
    }
  }

  async check(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqprActionSchema.parse({ params: req.params, body: req.body }).params;
      const result = await sqprWorkflowService.check(id, this.getUserId(req), this.getRoleId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      console.error('[SQPR] CHECK error:', error);
      next(error);
    }
  }

  async batchDelete(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        res.status(400).json({ error: 'ids must be an array' });
        return;
      }
      const result = await sqprService.batchDelete(ids, {
        userId: this.getUserId(req),
        roleName: this.getRoleName(req),
      });
      res.json(result);
    } catch (error) {
      console.error('[SQPR] BATCH DELETE error:', error);
      next(error);
    }
  }

  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { attachmentId } = SqprAttachmentParamSchema.parse({ params: req.params }).params;
      const { filePath, fileName, mimeType } = await sqprService.downloadAttachment(attachmentId as string, {
        userId: this.getUserId(req),
        roleName: this.getRoleName(req),
      });
      
      console.info(`[Backend] Sending attachment ${attachmentId} to frontend`);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.download(filePath);
    } catch (error) {
      console.error('[Backend] Attachment sending failed:', error);
      next(error);
    }
  }
}

export const sqprController = new SqprController();
