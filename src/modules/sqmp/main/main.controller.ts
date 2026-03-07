import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { mainSqmpService } from './main.service.js';
import { SqmpCreateSchema, SqmpUpdateSchema, SqmpIdParamSchema, SqmpActionSchema } from './main.schema.js';
import { successResponse, createResponse } from '../../../shared/utils/api-response.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '../../../../uploads/sqmp');

export class MainSqmpController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const records = await mainSqmpService.getAllRecords(status);
      res.json(successResponse(records));
    } catch (error) {
      console.error('[SQMP-MAIN] GET ALL error:', error);
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
      const record = await mainSqmpService.getRecordById(id);
      return res.json(successResponse(record));
    } catch (error) {
      console.error('[SQMP-MAIN] GET BY ID error:', error);
      return next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = SqmpCreateSchema.parse({ body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];
      
      const result = await mainSqmpService.createRecord(payload, userId, files);
      return res.status(201).json(createResponse({ id: (result as any).sqmp_id || "new" }, result.message));
    } catch (error) {
      console.error('[SQMP-MAIN] CREATE error:', error);
      return next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpUpdateSchema.parse({ params: req.params, body: req.body }).params;
      const payload = SqmpUpdateSchema.parse({ params: req.params, body: req.body }).body;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const files = (req as any).files || [];

      const result = await mainSqmpService.updateRecord(id, payload, userId, files);
      return res.json(successResponse(result.data || result, result.message));
    } catch (error) {
      console.error('[SQMP-MAIN] UPDATE error:', error);
      return next(error);
    }
  }

  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpActionSchema.parse({ params: req.params, body: req.body }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const result = await mainSqmpService.updateRecord(id, { request_status: 'SUBMITTED' }, userId, []);
      res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] SUBMIT error:', error);
      next(error);
    }
  }

  async check(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpActionSchema.parse({ params: req.params, body: req.body }).params;
      const remarks = req.body?.remarks;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const updatePayload = { 
        request_status: 'CHECKED', 
        checker_id: userId,
        checker_date: new Date(),
        checker_remarks: remarks
      };
      
      const result = await mainSqmpService.updateRecord(id, updatePayload, userId, []);
      res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] CHECK error:', error);
      next(error);
    }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpActionSchema.parse({ params: req.params, body: req.body }).params;
      const remarks = req.body?.remarks;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const updatePayload = { 
        request_status: 'APPROVED', 
        approver_id: userId,
        approver_date: new Date(),
        approver_remarks: remarks
      };
      
      const result = await mainSqmpService.updateRecord(id, updatePayload, userId, []);
      res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] APPROVE error:', error);
      next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpActionSchema.parse({ params: req.params, body: req.body }).params;
      const remarks = req.body?.remarks;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      
      const updatePayload = { 
        request_status: 'REJECTED', 
        approver_remarks: remarks,
        approver_date: new Date()
      };
      
      const result = await mainSqmpService.updateRecord(id, updatePayload, userId, []);
      res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] REJECT error:', error);
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
      const result = await mainSqmpService.deleteRecord(id);
      res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] DELETE error:', error);
      next(error);
    }
  }

  async issue(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mainSqmpService.issueRecord(id, userId, req.body?.remarks);
      res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] ISSUE error:', error);
      next(error);
    }
  }

  async requestResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mainSqmpService.requestResponse(id, userId, req.body?.remarks);
      res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] REQUEST RESPONSE error:', error);
      next(error);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mainSqmpService.cancelRecord(id, userId, req.body?.remarks);
      res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] CANCEL error:', error);
      next(error);
    }
  }

  async close(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      const result = await mainSqmpService.closeRecord(id, userId, req.body?.remarks);
      res.json(result);
    } catch (error) {
      console.error('[SQMP-MAIN] CLOSE error:', error);
      next(error);
    }
  }

  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { attachmentId } = req.params;

      if (!attachmentId) throw new Error('Attachment ID is required');

      // Attempt to look for it from db pool
      // @ts-ignore
      const { db } = await import('../../../shared/infrastructure/db.js');
      
      console.debug(`[SQMP-DOWNLOAD] Searching for attachmentId: ${attachmentId}`);
      let match = await db.selectFrom('SQMP_DOCUMENT').select('file_name').where('sqmp_document_id', '=', attachmentId).executeTakeFirst();
      if (match) console.debug(`[SQMP-DOWNLOAD] Found in SQMP_DOCUMENT: ${match.file_name}`);
      
      if (!match) {
        match = await db.selectFrom('SQMP_APPENDIX').select('file_name').where('sqmp_appendix_id', '=', attachmentId).executeTakeFirst();
        if (match) console.debug(`[SQMP-DOWNLOAD] Found in SQMP_APPENDIX: ${match.file_name}`);
      }
      if (!match) {
        match = await db.selectFrom('SQMP_RESPONSE_DOCUMENT').select('file_name').where('sqmp_response_document_id', '=', attachmentId).executeTakeFirst();
        if (match) console.debug(`[SQMP-DOWNLOAD] Found in SQMP_RESPONSE_DOCUMENT: ${match.file_name}`);
      }
      if (!match) {
        match = await db.selectFrom('SQMP_RESPONSE_APPENDIX').select('file_name').where('sqmp_response_appendix_id', '=', attachmentId).executeTakeFirst();
        if (match) console.debug(`[SQMP-DOWNLOAD] Found in SQMP_RESPONSE_APPENDIX: ${match.file_name}`);
      }
      if (!match) {
        match = await db.selectFrom('SQMP_RESPONSE_CLOSURE').select('file_name').where('sqmp_response_closure_id', '=', attachmentId).executeTakeFirst();
        if (match) console.debug(`[SQMP-DOWNLOAD] Found in SQMP_RESPONSE_CLOSURE: ${match.file_name}`);
      }
      
      if (!match) {
          console.warn(`[SQMP-DOWNLOAD] Attachment ID ${attachmentId} not found in any table.`);
          return res.status(404).json({ error: 'Attachment not found' });
      }

      const fs = await import('fs');
      const filePath = path.join(UPLOAD_DIR, match.file_name);
      console.debug(`[SQMP-DOWNLOAD] Attemping to download from: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
          console.warn(`[SQMP-DOWNLOAD] File not found on disk: ${filePath}`);
          return res.status(404).json({ error: 'File not found on disk' });
      }

      return res.download(filePath);
    } catch (error) {
      console.error('[SQMP-MAIN] DOWNLOAD error:', error);
      next(error);
    }
  }
}

export const mainSqmpController = new MainSqmpController();
