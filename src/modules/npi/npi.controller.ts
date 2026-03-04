import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { npiService } from './npi.service.js';
import { NpiCreateSchema, NpiUpdateSchema, NpiIdParamSchema, NpiActionSchema } from './npi.schema.js';
import { WorkflowStatusEnum } from '../../shared/types/workflow.js';
import { successResponse, createResponse } from '../../shared/utils/api-response.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '../../../uploads/npi');

export class NpiController {
  
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const records = await npiService.getAllRecords();
      res.json(successResponse(records));
    } catch (error) {
      console.error('[NPI] GET ALL error:', error);
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = NpiIdParamSchema.parse({ params: req.params }).params;
      const record = await npiService.getRecordById(id);
      res.json(successResponse(record));
    } catch (error) {
      console.error('[NPI] GET BY ID error:', error);
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = NpiCreateSchema.parse({ body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];
      
      const result = await npiService.createRecord(payload, userId, files);
      res.status(201).json(createResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[NPI] CREATE error:', error);
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = NpiUpdateSchema.parse({ params: req.params, body: req.body });
      const { id } = parsed.params;
      const payload = parsed.body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];

      const result = await npiService.updateRecord(id, payload, userId, files);
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[NPI] UPDATE error:', error);
      next(error);
    }
  }

  async getStats(_req: Request, res: Response, next: NextFunction) {
      try {
          // @ts-ignore
          const { db } = await import('../../shared/infrastructure/db.js');
          // @ts-ignore
          const stats = await db.selectFrom('NPI_LOTS')
              .select(['request_status as status', db.fn.count('npi_lot_id').as('count')])
              .groupBy('request_status')
              .execute();

          res.json(successResponse(stats));
      } catch (error) {
          next(error);
      }
  }

  async generateSequence(req: Request, res: Response, next: NextFunction) {
      try {
          const siteId = req.query.siteId as string;
          if (!siteId) return res.status(400).json({ message: 'Site Code required' });
          const sequence = await npiService.generateSequence(siteId);
          return res.json(successResponse({ sequence }));
      } catch (error) {
          return next(error);
      }
  }

  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { attachmentId } = NpiIdParamSchema.parse({ params: req.params }).params;
      if (!attachmentId) throw new Error('Attachment ID is required');

      // Attempt to look for it from db pool
      // @ts-ignore
      const { db } = await import('../../shared/infrastructure/db.js');
      
      const match = await db.selectFrom('NPI_ATTACHMENT').select('file_name').where('npi_attachment_id', '=', attachmentId).executeTakeFirst();
      
      if (!match) return res.status(404).json({ error: 'Attachment not found' });

      const fs = await import('fs');
      const filePath = path.join(UPLOAD_DIR, match.file_name);
      
      if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'File not found on disk' });
      }

      return res.download(filePath);
    } catch (error) {
      console.error('[NPI] DOWNLOAD error:', error);
      next(error);
    }
  }

  // Workflow Action Wrappers
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = NpiActionSchema.parse({ params: req.params, body: req.body }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const result = await npiService.updateRecord(id, { 
        request_status: 'SUBMITTED',
        status: WorkflowStatusEnum.SUBMITTED 
      }, userId, []);
      
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[NPI] SUBMIT error:', error);
      next(error);
    }
  }

  async check(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = NpiActionSchema.parse({ params: req.params, body: req.body }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const result = await npiService.updateRecord(id, { 
        request_status: 'CHECKED',
        status: WorkflowStatusEnum.CHECKED,
        checkerRemarks: req.body?.remarks || undefined
      }, userId, []);
      
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[NPI] CHECK error:', error);
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = NpiActionSchema.parse({ params: req.params, body: req.body }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const result = await npiService.updateRecord(id, { 
        request_status: 'APPROVED',
        status: WorkflowStatusEnum.FAPPROVED,
        approverRemarks: req.body?.remarks || undefined
      }, userId, []);
      
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[NPI] APPROVE error:', error);
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { params, body } = NpiActionSchema.parse({ params: req.params, body: req.body });
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const result = await npiService.updateRecord(params.id, { 
        request_status: 'REJECTED',
        status: WorkflowStatusEnum.RREJECTED,
        approverRemarks: body?.remarks
      }, userId, []);
      
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[NPI] REJECT error:', error);
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = NpiIdParamSchema.parse({ params: req.params }).params;
      const result = await npiService.deleteRecord(id);
      res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[NPI] DELETE error:', error);
      next(error);
    }
  }

}

export const npiController = new NpiController();
