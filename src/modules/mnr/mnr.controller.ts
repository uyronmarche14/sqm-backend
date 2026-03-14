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
import { attachmentService } from '../../shared/services/attachment.service.js';
import { mnrWorkflowService } from './workflow/mnr-workflow.service.js';

export class MnrController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const userId = (req as any).user?.userId || (req as any).user?.id || undefined;
      const supplierId = (req as any).user?.supplierId || undefined;
      const records = await mnrService.getAllRecords(status, userId, supplierId);
      res.json({ data: records });
    } catch (error) {
      console.error('[MNR] GET ALL error:', error);
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || undefined;
      const supplierId = (req as any).user?.supplierId || undefined;
      const record = await mnrService.getRecordById(id, userId, supplierId);
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
      const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
      const remarks = parsed?.remarks || parsed?.updates?.remarks;
      const result = await mnrWorkflowService.submitMain(id, userId, remarks);
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
      const result = await mnrWorkflowService.checkMain(id, userId, remarks);
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
      const result = await mnrWorkflowService.approveMain(id, userId, remarks);
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
      const result = await mnrWorkflowService.rejectMain(id, userId, remarks);
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
      const result = await mnrWorkflowService.issueMain(id, userId, remarks);
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
      res.status(501).json({
        success: false,
        message: `Legacy MNR close workflow is not exposed in Stage 2. Use explicit response workflow endpoints in later stages for record ${id}.`,
      });
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
      const result = await mnrWorkflowService.cancelMain(id, userId, remarks);
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
      const supplierId = (req as any).user?.supplierId || undefined;
      const result = await mnrWorkflowService.saveInitialResponse(id, userId, responsePayload, supplierId);
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
