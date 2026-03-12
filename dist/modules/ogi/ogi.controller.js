import { ogiService } from './ogi.service.js';
import { OgiCreateSchema, OgiUpdateSchema, OgiIdParamSchema, OgiActionSchema, OgiAttachmentParamSchema } from './ogi.schema.js';
import { successResponse } from '../../shared/utils/api-response.js';
import { attachmentService } from '../../shared/services/attachment.service.js';
export class OgiController {
    async getAll(_req, res, next) {
        try {
            const records = await ogiService.getAllRecords();
            return res.json(successResponse(records));
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
            return res.json(successResponse(record));
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
            return res.status(201).json(successResponse(result.data || result, result.message));
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
            return res.json(successResponse(result.data || result, result.message));
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
            return res.json(successResponse({ sequence }));
        }
        catch (error) {
            return next(error);
        }
    }
    async downloadAttachment(req, res, next) {
        try {
            const { attachmentId } = OgiAttachmentParamSchema.parse({ params: req.params }).params;
            const { filePath, fileName, mimeType } = await attachmentService.downloadAttachment('ogi-main', attachmentId);
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
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
            console.log(`[OGI] SUBMIT called for id=${id}, userId=${userId}`);
            const result = await ogiService.submitRecord(id, userId);
            return res.json(successResponse(result.data || result, result.message));
        }
        catch (error) {
            console.error('[OGI] SUBMIT error:', error);
            return next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const { id } = OgiIdParamSchema.parse({ params: req.params }).params;
            const result = await ogiService.deleteRecord(id);
            return res.json(successResponse(result.data || result, result.message));
        }
        catch (error) {
            console.error('[OGI] DELETE error:', error);
            return next(error);
        }
    }
}
export const ogiController = new OgiController();
