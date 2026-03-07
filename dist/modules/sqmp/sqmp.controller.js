import path from 'path';
import { fileURLToPath } from 'url';
import { sqmpService } from './sqmp.service.js';
import { SqmpCreateSchema, SqmpUpdateSchema, SqmpIdParamSchema, SqmpActionSchema, SqmpAttachmentParamSchema } from './sqmp.schema.js';
import { successResponse, createResponse } from '../../shared/utils/api-response.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '../../../uploads/sqmp');
export class SqmpController {
    async getAll(req, res, next) {
        try {
            const status = req.query.status;
            const records = await sqmpService.getAllRecords(status);
            res.json(successResponse(records));
        }
        catch (error) {
            console.error('[SQMP] GET ALL error:', error);
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
            const record = await sqmpService.getRecordById(id);
            return res.json(successResponse(record));
        }
        catch (error) {
            console.error('[SQMP] GET BY ID error:', error);
            return next(error);
        }
    }
    async create(req, res, next) {
        try {
            const payload = SqmpCreateSchema.parse({ body: req.body }).body;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const files = req.files || [];
            const result = await sqmpService.createRecord(payload, userId, files);
            return res.status(201).json(createResponse({ id: result.sqmp_id || "new" }, result.message));
        }
        catch (error) {
            console.error('[SQMP] CREATE error:', error);
            return next(error);
        }
    }
    async update(req, res, next) {
        try {
            const { id } = SqmpUpdateSchema.parse({ params: req.params, body: req.body }).params;
            const payload = SqmpUpdateSchema.parse({ params: req.params, body: req.body }).body;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const files = req.files || [];
            const result = await sqmpService.updateRecord(id, payload, userId, files);
            return res.json(successResponse(result.data || result, result.message));
        }
        catch (error) {
            console.error('[SQMP] UPDATE error:', error);
            return next(error);
        }
    }
    // Workflow Action Wrappers
    async submit(req, res, next) {
        try {
            const { id } = SqmpActionSchema.parse({ params: req.params, body: req.body }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await sqmpService.updateRecord(id, {
                request_status: 'SUBMITTED'
            }, userId, []);
            res.json(result);
        }
        catch (error) {
            console.error('[SQMP] SUBMIT error:', error);
            next(error);
        }
    }
    async check(req, res, next) {
        try {
            const { id } = SqmpActionSchema.parse({ params: req.params, body: req.body }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await sqmpService.updateRecord(id, {
                request_status: 'CHECKED',
                checker_id: userId,
                checker_date: new Date()
            }, userId, []);
            res.json(result);
        }
        catch (error) {
            console.error('[SQMP] CHECK error:', error);
            next(error);
        }
    }
    async approve(req, res, next) {
        try {
            const { id } = SqmpActionSchema.parse({ params: req.params, body: req.body }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await sqmpService.updateRecord(id, {
                request_status: 'APPROVED',
                approver_id: userId,
                approver_date: new Date()
            }, userId, []);
            res.json(result);
        }
        catch (error) {
            console.error('[SQMP] APPROVE error:', error);
            next(error);
        }
    }
    async reject(req, res, next) {
        try {
            const { params, body } = SqmpActionSchema.parse({ params: req.params, body: req.body });
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await sqmpService.updateRecord(params.id, {
                request_status: 'REJECTED',
                approver_remarks: body?.remarks,
                approver_date: new Date()
            }, userId, []);
            res.json(result);
        }
        catch (error) {
            console.error('[SQMP] REJECT error:', error);
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
            const result = await sqmpService.deleteRecord(id);
            res.json(result);
        }
        catch (error) {
            console.error('[SQMP] DELETE error:', error);
            next(error);
        }
    }
    async downloadAttachment(req, res, next) {
        try {
            const { attachmentId } = SqmpAttachmentParamSchema.parse({ params: req.params }).params;
            if (!attachmentId)
                throw new Error('Attachment ID is required');
            // Attempt to look for it from db pool
            // @ts-ignore
            const { db } = await import('../../shared/infrastructure/db.js');
            let match = await db.selectFrom('SQMP_DOCUMENT').select('file_name').where('sqmp_document_id', '=', attachmentId).executeTakeFirst();
            if (!match) {
                match = await db.selectFrom('SQMP_APPENDIX').select('file_name').where('sqmp_appendix_id', '=', attachmentId).executeTakeFirst();
            }
            if (!match) {
                match = await db.selectFrom('SQMP_RESPONSE_DOCUMENT').select('file_name').where('sqmp_response_document_id', '=', attachmentId).executeTakeFirst();
            }
            if (!match) {
                match = await db.selectFrom('SQMP_RESPONSE_APPENDIX').select('file_name').where('sqmp_response_appendix_id', '=', attachmentId).executeTakeFirst();
            }
            if (!match) {
                match = await db.selectFrom('SQMP_RESPONSE_CLOSURE').select('file_name').where('sqmp_response_closure_id', '=', attachmentId).executeTakeFirst();
            }
            if (!match)
                return res.status(404).json({ error: 'Attachment not found' });
            const fs = await import('fs');
            const filePath = path.join(UPLOAD_DIR, match.file_name);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found on disk' });
            }
            return res.download(filePath);
        }
        catch (error) {
            console.error('[SQMP] DOWNLOAD error:', error);
            next(error);
        }
    }
    // Additional Workflow Actions
    async issue(req, res, next) {
        try {
            const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await sqmpService.issueRecord(id, userId, req.body?.remarks);
            res.json(result);
        }
        catch (error) {
            console.error('[SQMP] ISSUE error:', error);
            next(error);
        }
    }
    async requestResponse(req, res, next) {
        try {
            const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await sqmpService.requestResponse(id, userId, req.body?.remarks);
            res.json(result);
        }
        catch (error) {
            console.error('[SQMP] REQUEST RESPONSE error:', error);
            next(error);
        }
    }
    async cancel(req, res, next) {
        try {
            const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await sqmpService.cancelRecord(id, userId, req.body?.remarks);
            res.json(result);
        }
        catch (error) {
            console.error('[SQMP] CANCEL error:', error);
            next(error);
        }
    }
    async close(req, res, next) {
        try {
            const { id } = SqmpIdParamSchema.parse({ params: req.params }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await sqmpService.closeRecord(id, userId, req.body?.remarks);
            res.json(result);
        }
        catch (error) {
            console.error('[SQMP] CLOSE error:', error);
            next(error);
        }
    }
}
export const sqmpController = new SqmpController();
