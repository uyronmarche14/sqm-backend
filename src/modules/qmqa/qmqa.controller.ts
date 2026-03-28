import { Request, Response, NextFunction } from 'express';
import { qmqaService } from './qmqa.service.js';
import { qmqaWorkflowService } from './workflow/qmqa-workflow.service.js';
import {
  QmqaCanonicalAttachmentParamSchema,
  QmqaAttachmentParamSchema,
  QmqaIdParamSchema,
  QmqaRecordCreateSchema,
  QmqaRecordUpdateSchema,
  QmqaScheduleCreateSchema,
  QmqaScheduleBulkDeleteSchema,
  QmqaScheduleUpdateSchema,
} from './qmqa.schema.js';
import { successResponse, createResponse } from '../../shared/utils/api-response.js';
import { resolveWorkflowListScope } from '../../shared/utils/workflow-access.js';
import { userRepository } from '../users/user.repository.js';

export class QmqaController {
  private getVariant(req: Request): 'QMQA' | 'QMQA_MEDIA' {
    return (req as any).qmqaVariant === 'QMQA_MEDIA' ? 'QMQA_MEDIA' : 'QMQA';
  }

  private getUserId(req: Request) {
    return (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
  }

  private getRoleId(req: Request) {
    return (req as any).user?.roleId || (req as any).user?.role_id || undefined;
  }

  private getRoleName(req: Request) {
    return (req as any).user?.roleName || (req as any).user?.role_name || (req as any).user?.role || undefined;
  }

  private async getActor(req: Request) {
    const userId = this.getUserId(req);
    const roleId = this.getRoleId(req);
    let roleName = this.getRoleName(req);

    if (!roleName && roleId) {
      const role = await userRepository.findRoleById(roleId);
      roleName = role?.role_name || undefined;
    }

    return {
      userId,
      roleId,
      roleName,
    };
  }

  private getActionRemarks(req: Request) {
    return req.body?.remarks || req.body?.approver_remarks || req.body?.rejectionRemarks;
  }

  private parseBooleanFlag(value: unknown): boolean | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return Boolean(value);
  }

  private getSupplierResponsePayload(req: Request) {
    const skipInitial = this.parseBooleanFlag(req.body?.skip_initial ?? req.body?.skipInitial);
    const initialRemarks = req.body?.initial_remarks ?? req.body?.initialReport ?? null;
    const finalRemarks = req.body?.final_remarks
      ?? (typeof req.body?.finalReport === 'string' ? req.body.finalReport : null);

    return {
      ...(skipInitial !== undefined ? { skip_initial: skipInitial } : {}),
      ...(typeof initialRemarks === 'string' ? { initial_remarks: initialRemarks } : {}),
      ...(typeof finalRemarks === 'string' ? { final_remarks: finalRemarks } : {}),
      ...(Array.isArray(req.body?.attachments) ? { attachments: req.body.attachments } : {}),
    };
  }

  private getResponseReviewPayload(req: Request) {
    return {
      verification_remarks: req.body?.verification_remarks || req.body?.verificationNotes || null,
      cycle2_checker_id: req.body?.cycle2_checker_id || req.body?.checker_id || null,
      cycle2_checker_remarks: req.body?.cycle2_checker_remarks || null,
      cycle2_approver_id: req.body?.cycle2_approver_id || req.body?.approver_id || null,
      cycle2_approver_remarks: req.body?.cycle2_approver_remarks || null,
      ...(Array.isArray(req.body?.attachments) ? { attachments: req.body.attachments } : {}),
    };
  }

  getAllSchedules = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const records = await qmqaService.getAllSchedules();
      res.json(successResponse(records));
    } catch (error) {
      next(error);
    }
  }

  getScheduleById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const record = await qmqaService.getScheduleById(id);
      res.json(successResponse(record));
    } catch (error) {
      next(error);
    }
  }

  createSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = QmqaScheduleCreateSchema.parse({ body: req.body }).body;
      const result = await qmqaService.createSchedule(payload, this.getUserId(req));
      res.status(201).json(createResponse(result, 'Schedule created'));
    } catch (error) {
      next(error);
    }
  }

  updateSchedule = async (req: Request, res: Response, next: NextFunction) => {
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

  deleteSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaService.deleteSchedule(id);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  deleteSchedules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ids } = QmqaScheduleBulkDeleteSchema.parse({ body: req.body }).body;
      const result = await qmqaService.deleteSchedules(ids);
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  cancelSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaService.cancelSchedule(id, this.getUserId(req));
      res.json(successResponse(result));
    } catch (error) {
      next(error);
    }
  }

  getAllRecords = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as string | undefined;
      const scope = resolveWorkflowListScope({
        scope: req.query.scope,
        assignedToMe: req.query.assignedToMe,
      });
      const actor = await this.getActor(req);
      const records = await qmqaService.getAllRecords(
        { status, scope },
        { userId: actor.userId, roleName: actor.roleName },
        this.getVariant(req),
      );
      res.json({ data: records });
    } catch (error) {
      next(error);
    }
  }

  getRecordById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const actor = await this.getActor(req);
      const record = await qmqaService.getRecordById(id, {
        userId: actor.userId,
        roleName: actor.roleName,
      }, this.getVariant(req));
      res.json({ data: record });
    } catch (error) {
      next(error);
    }
  }

  createRecord = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = QmqaRecordCreateSchema.parse({ body: req.body }).body;
      const files = (req as any).files || [];
      const result = await qmqaService.createRecord(payload, this.getUserId(req), files);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  updateRecord = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = QmqaRecordUpdateSchema.parse({ params: req.params, body: req.body });
      const actor = await this.getActor(req);
      const files = (req as any).files || [];
      const result = await qmqaService.updateRecord(
        parsed.params.id,
        parsed.body,
        {
          userId: actor.userId,
          roleName: actor.roleName,
        },
        files,
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  deleteRecord = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const actor = await this.getActor(req);
      const result = await qmqaService.deleteRecord(id, {
        userId: actor.userId,
        roleName: actor.roleName,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  submit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.submit(id, this.getUserId(req), this.getRoleId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  check = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.check(id, this.getUserId(req), this.getRoleId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  approve = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.approve(id, this.getUserId(req), this.getRoleId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  reject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.reject(id, this.getUserId(req), this.getRoleId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  issue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.issue(id, this.getUserId(req), this.getRoleId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.cancel(id, this.getUserId(req), this.getRoleId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  verify = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.verify(
        id,
        this.getUserId(req),
        this.getRoleId(req),
        this.getResponseReviewPayload(req),
        (req as any).files || [],
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  saveResponse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.saveResponse(
        id,
        this.getUserId(req),
        this.getRoleId(req),
        this.getSupplierResponsePayload(req),
        (req as any).files || [],
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  submitInitialResponse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.submitInitialResponse(
        id,
        this.getUserId(req),
        this.getRoleId(req),
        this.getSupplierResponsePayload(req),
        (req as any).files || [],
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  submitFinalResponse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.submitFinalResponse(
        id,
        this.getUserId(req),
        this.getRoleId(req),
        this.getSupplierResponsePayload(req),
        (req as any).files || [],
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  saveResponseReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.saveResponseReview(
        id,
        this.getUserId(req),
        this.getRoleId(req),
        this.getResponseReviewPayload(req),
        (req as any).files || [],
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  submitResponseReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.submitResponseReview(
        id,
        this.getUserId(req),
        this.getRoleId(req),
        this.getResponseReviewPayload(req),
        (req as any).files || [],
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  checkResponse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.checkResponse(id, this.getUserId(req), this.getRoleId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  approveResponse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.approveResponse(id, this.getUserId(req), this.getRoleId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  rejectResponse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.rejectResponse(id, this.getUserId(req), this.getRoleId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  acceptResponse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.acceptResponse(id, this.getUserId(req), this.getRoleId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  notAcceptResponse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.notAcceptResponse(id, this.getUserId(req), this.getRoleId(req), this.getActionRemarks(req));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  saveInitialReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.saveInitialReport(
        id,
        this.getUserId(req),
        this.getRoleId(req),
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

  submitFinalReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = QmqaIdParamSchema.parse({ params: req.params }).params;
      const result = await qmqaWorkflowService.submitFinalReport(
        id,
        this.getUserId(req),
        this.getRoleId(req),
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

  batchSubmit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(req);
      let count = 0;
      const failed: { id: string; error: string }[] = [];

      for (const id of req.body?.ids || []) {
        try {
          await qmqaWorkflowService.submit(id, userId, undefined, this.getActionRemarks(req));
          count += 1;
        } catch (error: any) {
          failed.push({ id, error: error.message || 'Unknown error' });
        }
      }

      res.json({ success: true, count, failed, total: req.body?.ids?.length || 0 });
    } catch (error) {
      next(error);
    }
  }

  batchCheck = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(req);
      let count = 0;
      const failed: { id: string; error: string }[] = [];

      for (const id of req.body?.ids || []) {
        try {
          await qmqaWorkflowService.check(id, userId, this.getRoleId(req), req.body?.remarks);
          count += 1;
        } catch (error: any) {
          console.error(`[QMQA batchCheck] Failed for ${id}:`, error.message);
          failed.push({ id, error: error.message || 'Unknown error' });
        }
      }

      res.json({ success: count > 0, count, failed, total: req.body?.ids?.length || 0 });
    } catch (error) {
      next(error);
    }
  }

  batchApprove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(req);
      let count = 0;
      const failed: { id: string; error: string }[] = [];

      for (const id of req.body?.ids || []) {
        try {
          await qmqaWorkflowService.approve(id, userId, this.getRoleId(req), req.body?.remarks);
          count += 1;
        } catch (error: any) {
          failed.push({ id, error: error.message || 'Unknown error' });
        }
      }

      res.json({ success: true, count, failed, total: req.body?.ids?.length || 0 });
    } catch (error) {
      next(error);
    }
  }

  batchReject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(req);
      let count = 0;
      const failed: { id: string; error: string }[] = [];

      for (const id of req.body?.ids || []) {
        try {
          await qmqaWorkflowService.reject(id, userId, this.getRoleId(req), req.body?.remarks);
          count += 1;
        } catch (error: any) {
          failed.push({ id, error: error.message || 'Unknown error' });
        }
      }

      res.json({ success: true, count, failed, total: req.body?.ids?.length || 0 });
    } catch (error) {
      next(error);
    }
  }

  batchIssue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserId(req);
      let count = 0;
      const failed: { id: string; error: string }[] = [];

      for (const id of req.body?.ids || []) {
        try {
          await qmqaWorkflowService.issue(id, userId, req.body?.remarks);
          count += 1;
        } catch (error: any) {
          failed.push({ id, error: error.message || 'Unknown error' });
        }
      }

      res.json({ success: true, count, failed, total: req.body?.ids?.length || 0 });
    } catch (error) {
      next(error);
    }
  }

  downloadAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hasLegacyModuleType = typeof req.params.moduleType === 'string' && req.params.moduleType.trim().length > 0;
      const legacyParams = hasLegacyModuleType
        ? QmqaAttachmentParamSchema.parse({ params: req.params }).params
        : null;
      const canonicalParams = hasLegacyModuleType
        ? null
        : QmqaCanonicalAttachmentParamSchema.parse({ params: req.params }).params;
      const attachmentId = legacyParams?.attachmentId || canonicalParams?.attachmentId;
      const actor = await this.getActor(req);
      const { filePath, fileName, mimeType } = await qmqaService.downloadAttachment(
        attachmentId as string,
        {
          userId: actor.userId,
          roleName: actor.roleName,
        },
        this.getVariant(req),
        legacyParams?.moduleType,
      );

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.download(filePath);
    } catch (error) {
      next(error);
    }
  }
}

export const qmqaController = new QmqaController();
