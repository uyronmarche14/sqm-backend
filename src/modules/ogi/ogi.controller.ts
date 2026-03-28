import { Request, Response, NextFunction } from 'express';
import { ogiService } from './ogi.service.js';
import { OgiCreateSchema, OgiUpdateSchema, OgiIdParamSchema, OgiActionSchema, OgiAttachmentParamSchema } from './ogi.schema.js';
import { successResponse } from '../../shared/utils/api-response.js';
import { assertNoWorkflowMutationFields } from '../../shared/utils/reject-workflow-mutation-fields.js';
import { resolveWorkflowListScope } from '../../shared/utils/workflow-access.js';

export class OgiController {
  constructor() {
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.generateSequence = this.generateSequence.bind(this);
    this.downloadAttachment = this.downloadAttachment.bind(this);
    this.submit = this.submit.bind(this);
    this.delete = this.delete.bind(this);
  }

  private getActor(req: Request) {
    return {
      userId: (req as any).user?.userId || (req as any).user?.id || 'SYSTEM',
      roleName: (req as any).user?.roleName || (req as any).user?.role_name || (req as any).user?.role || undefined,
    };
  }
  
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const records = await ogiService.getAllRecords(
        this.getActor(req),
        resolveWorkflowListScope({ scope: req.query.scope, assignedToMe: req.query.assignedToMe }),
      );
      return res.json(successResponse(records));
    } catch (error) {
      console.error('[OGI] GET ALL error:', error);
      return next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = OgiIdParamSchema.parse({ params: req.params }).params;
      const record = await ogiService.getRecordById(id, this.getActor(req));
      return res.json(successResponse(record));
    } catch (error) {
      console.error('[OGI] GET BY ID error:', error);
      return next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      assertNoWorkflowMutationFields(req.body as Record<string, unknown>, 'OGI');
      const payload = OgiCreateSchema.parse({ body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];
      
      const result = await ogiService.createRecord(payload, userId, files);
      console.info(`[Backend] Receiving OGI Create form data`, { payload, files: files.length });
      return res.status(201).json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[OGI] CREATE error:', error);
      return next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      assertNoWorkflowMutationFields(req.body as Record<string, unknown>, 'OGI');
      const parsed = OgiUpdateSchema.parse({ params: req.params, body: req.body });
      const { id } = parsed.params;
      const payload = parsed.body;
      const actor = this.getActor(req);
      const files = (req as any).files || [];

      const result = await ogiService.updateRecord(id, payload, actor, files);
      console.info(`[Backend] Receiving OGI Update form data for ${id}`, { payload, files: files.length });
      return res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[OGI] UPDATE error:', error);
      return next(error);
    }
  }

  async generateSequence(req: Request, res: Response, next: NextFunction) {
      try {
          const siteId = req.query.siteId as string;
          if (!siteId) return res.status(400).json({ message: 'Site Code required' });
          const sequence = await ogiService.generateSequence(siteId);
          return res.json(successResponse({ sequence }));
      } catch (error) {
          return next(error);
      }
  }

  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { attachmentId } = OgiAttachmentParamSchema.parse({ params: req.params }).params;
      const { filePath, fileName, mimeType } = await ogiService.downloadAttachment(
        attachmentId as string,
        this.getActor(req),
      );
      
      console.info(`[Backend] Sending attachment ${attachmentId} to frontend`);
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.download(filePath);
    } catch (error) {
      console.error('[Backend] Attachment sending failed:', error);
      return next(error);
    }
  }

  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = OgiActionSchema.parse({ params: req.params, body: req.body }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      console.log(`[OGI] SUBMIT called for id=${id}, userId=${userId}`);
      const result = await ogiService.submitRecord(id, userId);
      return res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[OGI] SUBMIT error:', error);
      return next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = OgiIdParamSchema.parse({ params: req.params }).params;
      const result = await ogiService.deleteRecord(id, this.getActor(req));
      return res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[OGI] DELETE error:', error);
      return next(error);
    }
  }

}

export const ogiController = new OgiController();
