import { ogiService } from './ogi.service.js';
import { OgiCreateSchema, OgiUpdateSchema, OgiIdParamSchema, OgiActionSchema, OgiAttachmentParamSchema } from './ogi.schema.js';
import { WorkflowStatusEnum } from '../../shared/types/workflow.js';
export class OgiController {
    async getAll(_req, res, next) {
        try {
            const records = await ogiService.getAllRecords();
            return res.json({ data: records });
        }
        catch (error) {
            console.error('[OGI] GET ALL error:', error);
            return next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const { id } = OgiIdParamSchema.parse({ params: req.params }).params;
            const record = await ogiService.getRecordById(id);
            return res.json({ data: record });
        }
        catch (error) {
            console.error('[OGI] GET BY ID error:', error);
            return next(error);
        }
    }
    async create(req, res, next) {
        try {
            const payload = OgiCreateSchema.parse({ body: req.body }).body;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const files = req.files || [];
            const result = await ogiService.createRecord(payload, userId, files);
            return res.status(201).json(result);
        }
        catch (error) {
            console.error('[OGI] CREATE error:', error);
            return next(error);
        }
    }
    async update(req, res, next) {
        try {
            const { id } = OgiUpdateSchema.parse({ params: req.params, body: req.body }).params;
            const payload = OgiUpdateSchema.parse({ params: req.params, body: req.body }).body;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const files = req.files || [];
            const result = await ogiService.updateRecord(id, payload, userId, files);
            return res.json(result);
        }
        catch (error) {
            console.error('[OGI] UPDATE error:', error);
            return next(error);
        }
    }
    async generateSequence(req, res, next) {
        try {
            const siteId = req.query.siteId;
            if (!siteId)
                return res.status(400).json({ message: 'Site Code required' });
            const sequence = await ogiService.generateSequence(siteId);
            return res.json({ sequence });
        }
        catch (error) {
            return next(error);
        }
    }
    async downloadAttachment(req, res, next) {
        try {
            const { attachmentId } = OgiAttachmentParamSchema.parse({ params: req.params }).params;
            if (!attachmentId)
                throw new Error('Attachment ID is required');
            // @ts-ignore
            const { db } = await import('../../config/db.js');
            const match = await db.selectFrom('OGI_ATTACHMENT').select('file_name').where('ogi_attachment_id', '=', attachmentId).executeTakeFirst();
            if (!match)
                return res.status(404).json({ error: 'Attachment not found' });
            const fs = await import('fs');
            const path = await import('path');
            const filePath = path.join(process.cwd(), 'uploads/ogi', match.file_name);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found on disk' });
            }
            return res.download(filePath);
        }
        catch (error) {
            console.error('[OGI] DOWNLOAD error:', error);
            return next(error);
        }
    }
    async submit(req, res, next) {
        try {
            const { id } = OgiActionSchema.parse({ params: req.params, body: req.body }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await ogiService.updateRecord(id, {
                request_status: 'SUBMITTED',
                status: WorkflowStatusEnum.SUBMITTED
            }, userId, []);
            return res.json(result);
        }
        catch (error) {
            console.error('[OGI] SUBMIT error:', error);
            return next(error);
        }
    }
}
export const ogiController = new OgiController();
