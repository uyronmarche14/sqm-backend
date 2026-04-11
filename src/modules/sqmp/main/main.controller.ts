import { Request, Response, NextFunction } from 'express';
import { mainSqmpService } from './main.service.js';
import { SqmpCreateSchema, SqmpUpdateSchema, SqmpIdParamSchema, SqmpActionSchema, SqmpControlNoPreviewSchema } from './main.schema.js';
import { successResponse } from '../../../shared/utils/api-response.js';
import { sqmpWorkflowService } from '../workflow/workflow.service.js';
import {
  resolveWorkflowListScope,
  resolveWorkflowListSurface,
} from '../../../shared/utils/workflow-access.js';

export class MainSqmpController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const user = (req as any).user;
      const records = await mainSqmpService.getAllRecords(
        status,
        user?.userId,
        user?.roleId,
        resolveWorkflowListScope({ scope: req.query.scope, assignedToMe: req.query.assignedToMe }),
        resolveWorkflowListSurface({ surface: req.query.surface }),
      );
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
      const record = await mainSqmpService.getRecordById(
        id,
        user?.userId,
        user?.roleId,
        resolveWorkflowListSurface({ surface: req.query.surface }),
      );
      return res.json(successResponse(record));
    } catch (error) {
      console.error('[SQMP-MAIN] GET BY ID error:', error);
      return next(error);
    }
  }

  async previewControlNo(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpControlNoPreviewSchema.parse({ query: req.query });
      const preview = await mainSqmpService.previewControlNo(parsed.query);
      return res.json(successResponse(preview));
    } catch (error) {
      console.error('[SQMP-MAIN] PREVIEW CONTROL NO error:', error);
      return next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = SqmpCreateSchema.parse({ body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];
      
      const result = await mainSqmpService.createRecord(payload, userId, files);
      return res.status(201).json(successResponse(result.data || result, result.message));
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
      const parsed = SqmpActionSchema.parse({ params: req.params, body: req.body });
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      const result = await sqmpWorkflowService.submitMain(parsed.params.id, parsed.body?.remarks, userId, roleId);
      return res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-MAIN] SUBMIT error:', error);
      return next(error);
    }
  }

  async check(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpActionSchema.parse({ params: req.params, body: req.body });
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';

      const result = await sqmpWorkflowService.checkMain(parsed.params.id, parsed.body?.remarks, userId, roleId);
      return res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-MAIN] CHECK error:', error);
      return next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpActionSchema.parse({ params: req.params, body: req.body });
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';

      const result = await sqmpWorkflowService.approveMain(parsed.params.id, parsed.body?.remarks, userId, roleId);
      return res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-MAIN] APPROVE error:', error);
      return next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpActionSchema.parse({ params: req.params, body: req.body });
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';

      const result = await sqmpWorkflowService.rejectMain(parsed.params.id, parsed.body?.remarks, userId, roleId);
      return res.json(successResponse(result.data || result, result.message));
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
      const parsed = SqmpActionSchema.parse({ params: req.params, body: req.body });
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      const result = await sqmpWorkflowService.issueMain(parsed.params.id, parsed.body?.remarks, userId, roleId);
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-MAIN] ISSUE error:', error);
      next(error);
    }
  }

  async requestResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpActionSchema.parse({ params: req.params, body: req.body });
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      const record = await mainSqmpService.getRecordById(parsed.params.id, userId, roleId);
      if (record.workflowStageCode === '11') {
        return res.json(successResponse({ id: parsed.params.id }, 'Supplier response already requested'));
      }

      const result = await sqmpWorkflowService.issueMain(parsed.params.id, parsed.body?.remarks, userId, roleId);
      return res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-MAIN] REQUEST RESPONSE error:', error);
      return next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = SqmpActionSchema.parse({ params: req.params, body: req.body });
      const user = (req as any).user;
      const userId = user?.userId || user?.id || 'SYSTEM';
      const roleId = user?.roleId || '';
      const result = await sqmpWorkflowService.cancelMain(parsed.params.id, parsed.body?.remarks, userId, roleId);
      res.json(successResponse(result.data || result, result.message));
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
      const user = (req as any).user;
      const { filePath, fileName, mimeType } = await mainSqmpService.downloadMainAttachment(
        attachmentId as string,
        user?.userId || user?.id,
        user?.roleId,
        resolveWorkflowListSurface({ surface: req.query.surface }),
      );
      
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
