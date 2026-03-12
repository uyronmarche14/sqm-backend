import { Request, Response, NextFunction } from 'express';
import { mnrService } from './mnr.service.js';
import { MnrCreateSchema, MnrUpdateSchema, MnrIdParamSchema, MnrAttachmentParamSchema } from './mnr.schema.js';
import { WorkflowStatusEnum } from '../../shared/types/workflow.js';
import { attachmentService } from '../../shared/services/attachment.service.js';

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
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];

      const result = await mnrService.updateRecord(id, payload, userId, files);
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

  // Workflow Action Handlers
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      // Accept optional updates from request body for workflow transitions
      const { updates = {} } = req.body || {};
      
      // Merge the status update with any additional updates
      const payload = {
        status: WorkflowStatusEnum.SUBMITTED,
        ...updates
      };
      
      const result = await mnrService.updateRecord(id, payload, userId);
      res.json(result);
    } catch (error) {
      console.error('[MNR] SUBMIT error:', error);
      next(error);
    }
  }

  async check(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const { remarks } = req.body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mnrService.updateRecord(id, { updates: { status: 'CHECKED' as any, remarks } }, userId);
      res.json(result);
    } catch (error) {
      console.error('[MNR] CHECK error:', error);
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const { remarks } = req.body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mnrService.updateRecord(id, { updates: { status: WorkflowStatusEnum.APPROVED, remarks } }, userId);
      res.json(result);
    } catch (error) {
      console.error('[MNR] APPROVE error:', error);
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const { remarks } = req.body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mnrService.updateRecord(id, { updates: { status: WorkflowStatusEnum.REJECTED, remarks } }, userId);
      res.json(result);
    } catch (error) {
      console.error('[MNR] REJECT error:', error);
      next(error);
    }
  }

  async issue(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const { remarks } = req.body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mnrService.issueRecord(id, userId, remarks);
      res.json(result);
    } catch (error) {
      console.error('[MNR] ISSUE error:', error);
      next(error);
    }
  }

  async close(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const { remarks } = req.body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mnrService.updateRecord(id, { updates: { status: WorkflowStatusEnum.CLOSED, remarks } }, userId);
      res.json(result);
    } catch (error) {
      console.error('[MNR] CLOSE error:', error);
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const { remarks } = req.body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mnrService.updateRecord(id, { updates: { status: WorkflowStatusEnum.CANCEL, remarks } }, userId);
      res.json(result);
    } catch (error) {
      console.error('[MNR] CANCEL error:', error);
      next(error);
    }
  }

  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { attachmentId } = MnrAttachmentParamSchema.parse({ params: req.params }).params;
      
      const { filePath, fileName, mimeType } = await attachmentService.downloadAttachment('mnr-main', attachmentId);
      
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
