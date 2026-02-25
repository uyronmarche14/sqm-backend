import { Request, Response, NextFunction } from 'express';
import { sqmpService } from './sqmp.service.js';
import { SqmpCreateSchema, SqmpUpdateSchema, SqmpIdParamSchema, SqmpActionSchema } from './sqmp.schema.js';

export class SqmpController {
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const records = await sqmpService.getAllRecords();
      res.json({ data: records });
    } catch (error) {
      console.error('[SQMP] GET ALL error:', error);
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
      const record = await sqmpService.getRecordById(id);
      res.json({ data: record });
    } catch (error) {
      console.error('[SQMP] GET BY ID error:', error);
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = SqmpCreateSchema.parse({ body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];
      
      const result = await sqmpService.createRecord(payload, userId, files);
      res.status(201).json(result);
    } catch (error) {
      console.error('[SQMP] CREATE error:', error);
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpUpdateSchema.parse({ params: req.params, body: req.body }).params;
      const payload = SqmpUpdateSchema.parse({ params: req.params, body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];

      const result = await sqmpService.updateRecord(id, payload, userId, files);
      res.json(result);
    } catch (error) {
      console.error('[SQMP] UPDATE error:', error);
      next(error);
    }
  }

  // Workflow Action Wrappers
  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpActionSchema.parse({ params: req.params, body: req.body }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const result = await sqmpService.updateRecord(id, { 
        request_status: 'SUBMITTED'
      }, userId, []);
      
      res.json(result);
    } catch (error) {
      console.error('[SQMP] SUBMIT error:', error);
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpActionSchema.parse({ params: req.params, body: req.body }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const result = await sqmpService.updateRecord(id, { 
        request_status: 'APPROVED',
        approver_id: userId,
        approver_date: new Date()
      }, userId, []);
      
      res.json(result);
    } catch (error) {
      console.error('[SQMP] APPROVE error:', error);
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { params, body } = SqmpActionSchema.parse({ params: req.params, body: req.body });
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const result = await sqmpService.updateRecord(params.id, { 
        request_status: 'REJECTED',
        approver_remarks: body?.remarks,
        approver_date: new Date()
      }, userId, []);
      
      res.json(result);
    } catch (error) {
      console.error('[SQMP] REJECT error:', error);
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
      const result = await sqmpService.deleteRecord(id);
      res.json(result);
    } catch (error) {
      console.error('[SQMP] DELETE error:', error);
      next(error);
    }
  }

  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { attachmentId } = SqmpIdParamSchema.parse({ params: req.params }).params;
      if (!attachmentId) throw new Error('Attachment ID is required');

      // Attempt to look for it from db pool
      // @ts-ignore
      const { db } = await import('../../config/db.js');
      
      let match = await db.selectFrom('SQMP_DOCUMENT').select('file_name').where('sqmp_document_id', '=', attachmentId).executeTakeFirst();
      if (!match) {
        match = await db.selectFrom('SQMP_APPENDIX').select('file_name').where('sqmp_appendix_id', '=', attachmentId).executeTakeFirst();
      }

      if (!match) return res.status(404).json({ error: 'Attachment not found' });

      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'uploads/sqmp', match.file_name);
      
      if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'File not found on disk' });
      }

      return res.download(filePath);
    } catch (error) {
      console.error('[SQMP] DOWNLOAD error:', error);
      next(error);
    }
  }
}

export const sqmpController = new SqmpController();
