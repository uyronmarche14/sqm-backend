import { npiService } from './npi.service.js';
import { NpiCreateSchema, NpiUpdateSchema, NpiIdParamSchema, NpiActionSchema } from './npi.schema.js';
import { WorkflowStatusEnum } from '../../shared/types/workflow.js';
export class NpiController {
    async getAll(_req, res, next) {
        try {
            const records = await npiService.getAllRecords();
            res.json({ data: records });
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
            res.json({ data: record });
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
            res.status(201).json(result);
        }
        catch (error) {
            console.error('[NPI] CREATE error:', error);
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const { id } = NpiUpdateSchema.parse({ params: req.params, body: req.body }).params;
            const payload = NpiUpdateSchema.parse({ params: req.params, body: req.body }).body;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const files = req.files || [];
            const result = await npiService.updateRecord(id, payload, userId, files);
            res.json(result);
        }
        catch (error) {
            console.error('[NPI] UPDATE error:', error);
            next(error);
        }
    }
    async getStats(_req, res, next) {
        try {
            // @ts-ignore
            const { db } = await import('../../config/db.js');
            // @ts-ignore
            const stats = await db.selectFrom('NPI_LOTS')
                .select(['request_status as status', db.fn.count('npi_lot_id').as('count')])
                .groupBy('request_status')
                .execute();
            res.json(stats);
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
            return res.json({ sequence });
        }
        catch (error) {
            return next(error);
        }
    }
    async downloadAttachment(req, res, next) {
        try {
            const { attachmentId } = NpiIdParamSchema.parse({ params: req.params }).params;
            if (!attachmentId)
                throw new Error('Attachment ID is required');
            // Attempt to look for it from db pool
            // @ts-ignore
            const { db } = await import('../../config/db.js');
            const match = await db.selectFrom('NPI_ATTACHMENT').select('file_name').where('npi_attachment_id', '=', attachmentId).executeTakeFirst();
            if (!match)
                return res.status(404).json({ error: 'Attachment not found' });
            const fs = await import('fs');
            const path = await import('path');
            const filePath = path.join(process.cwd(), 'uploads/npi', match.file_name);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found on disk' });
            }
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
            res.json(result);
        }
        catch (error) {
            console.error('[NPI] SUBMIT error:', error);
            next(error);
        }
    }
    async approve(req, res, next) {
        try {
            const { id } = NpiActionSchema.parse({ params: req.params, body: req.body }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await npiService.updateRecord(id, {
                request_status: 'APPROVED',
                status: WorkflowStatusEnum.FAPPROVED,
                approverRemarks: req.body?.remarks || undefined
            }, userId, []);
            res.json(result);
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
                status: WorkflowStatusEnum.RREJECTED,
                approverRemarks: body?.remarks
            }, userId, []);
            res.json(result);
        }
        catch (error) {
            console.error('[NPI] REJECT error:', error);
            next(error);
        }
    }
}
export const npiController = new NpiController();
