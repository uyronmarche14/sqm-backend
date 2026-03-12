import { npiService } from './npi.service.js';
import { NpiCreateSchema, NpiUpdateSchema, NpiIdParamSchema, NpiActionSchema, NpiAttachmentParamSchema } from './npi.schema.js';
import { WorkflowStatusEnum } from '../../shared/types/workflow.js';
import { successResponse, createResponse } from '../../shared/utils/api-response.js';
import { attachmentService } from '../../shared/services/attachment.service.js';
export class NpiController {
    async getAll(_req, res, next) {
        try {
            const records = await npiService.getAllRecords();
            res.json(successResponse(records));
        }
        catch (error) {
            console.error('[NPI] GET ALL error:', error);
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const { id } = NpiIdParamSchema.parse({ params: req.params }).params;
            const record = await npiService.getRecordById(id);
            res.json(successResponse(record));
        }
        catch (error) {
            console.error('[NPI] GET BY ID error:', error);
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const payload = NpiCreateSchema.parse({ body: req.body }).body;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const files = req.files || [];
            const result = await npiService.createRecord(payload, userId, files);
            res.status(201).json(createResponse(result.data || result, result.message));
        }
        catch (error) {
            console.error('[NPI] CREATE error:', error);
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const parsed = NpiUpdateSchema.parse({ params: req.params, body: req.body });
            const { id } = parsed.params;
            const payload = parsed.body;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const files = req.files || [];
            const result = await npiService.updateRecord(id, payload, userId, files);
            res.json(successResponse(result.data || result, result.message));
        }
        catch (error) {
            console.error('[NPI] UPDATE error:', error);
            next(error);
        }
    }
    async getStats(_req, res, next) {
        try {
            // @ts-ignore
            const { db } = await import('../../shared/infrastructure/db.js');
            // @ts-ignore
            const stats = await db.selectFrom('NPI_LOTS')
                .select(['request_status as status', db.fn.count('npi_lot_id').as('count')])
                .groupBy('request_status')
                .execute();
            res.json(successResponse(stats));
        }
        catch (error) {
            next(error);
        }
    }
    async generateSequence(req, res, next) {
        try {
            const siteId = req.query.siteId;
            if (!siteId)
                return res.status(400).json({ message: 'Site Code required' });
            const sequence = await npiService.generateSequence(siteId);
            return res.json(successResponse({ sequence }));
        }
        catch (error) {
            return next(error);
        }
    }
    async downloadAttachment(req, res, next) {
        try {
            const { attachmentId } = NpiAttachmentParamSchema.parse({ params: req.params }).params;
            const { filePath, fileName, mimeType } = await attachmentService.downloadAttachment('npi-main', attachmentId);
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            return res.download(filePath);
        }
        catch (error) {
            console.error('[NPI] DOWNLOAD error:', error);
            next(error);
        }
    }
    // Workflow Action Wrappers
    async submit(req, res, next) {
        try {
            const { id } = NpiActionSchema.parse({ params: req.params, body: req.body }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await npiService.updateRecord(id, {
                request_status: 'SUBMITTED',
                status: WorkflowStatusEnum.SUBMITTED
            }, userId, []);
            res.json(successResponse(result.data || result, result.message));
        }
        catch (error) {
            console.error('[NPI] SUBMIT error:', error);
            next(error);
        }
    }
    async check(req, res, next) {
        try {
            const { id } = NpiActionSchema.parse({ params: req.params, body: req.body }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await npiService.updateRecord(id, {
                request_status: 'CHECKED',
                status: WorkflowStatusEnum.CHECKED,
                checkerRemarks: req.body?.remarks || undefined
            }, userId, []);
            res.json(successResponse(result.data || result, result.message));
        }
        catch (error) {
            console.error('[NPI] CHECK error:', error);
            next(error);
        }
    }
    async approve(req, res, next) {
        try {
            const { id } = NpiActionSchema.parse({ params: req.params, body: req.body }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await npiService.updateRecord(id, {
                request_status: 'APPROVED',
                status: WorkflowStatusEnum.APPROVED,
                approverRemarks: req.body?.remarks || undefined
            }, userId, []);
            res.json(successResponse(result.data || result, result.message));
        }
        catch (error) {
            console.error('[NPI] APPROVE error:', error);
            next(error);
        }
    }
    async reject(req, res, next) {
        try {
            const { params, body } = NpiActionSchema.parse({ params: req.params, body: req.body });
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await npiService.updateRecord(params.id, {
                request_status: 'REJECTED',
                status: WorkflowStatusEnum.REJECTED,
                approverRemarks: body?.remarks
            }, userId, []);
            res.json(successResponse(result.data || result, result.message));
        }
        catch (error) {
            console.error('[NPI] REJECT error:', error);
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const { id } = NpiIdParamSchema.parse({ params: req.params }).params;
            const result = await npiService.deleteRecord(id);
            res.json(successResponse(result.data || result, result.message));
        }
        catch (error) {
            console.error('[NPI] DELETE error:', error);
            next(error);
        }
    }
}
export const npiController = new NpiController();
