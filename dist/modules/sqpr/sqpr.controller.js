import { sqprService } from './sqpr.service.js';
import { SqprCreateSchema, SqprUpdateSchema, SqprIdParamSchema, SqprActionSchema, SqprAttachmentParamSchema } from './sqpr.schema.js';
export class SqprController {
    async getAll(_req, res, next) {
        try {
            const records = await sqprService.getAllRecords();
            res.json({ data: records });
        }
        catch (error) {
            console.error('[SQPR] GET ALL error:', error);
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const { id } = SqprIdParamSchema.parse({ params: req.params }).params;
            const record = await sqprService.getRecordById(id);
            res.json({ data: record });
        }
        catch (error) {
            console.error('[SQPR] GET BY ID error:', error);
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            // Parse JSON strings from FormData if present
            const body = { ...req.body };
            if (typeof body.attachments === 'string') {
                body.attachments = JSON.parse(body.attachments);
            }
            if (typeof body.cc_list === 'string') {
                body.cc_list = JSON.parse(body.cc_list);
            }
            if (typeof body.approval === 'string') {
                body.approval = JSON.parse(body.approval);
            }
            // Log received data (BEFORE flattening)
            console.log('[SQPR Controller] CREATE received (RAW):', {
                sqprId: body.sqpr_id,
                controlNo: body.control_no,
                approvalRaw: body.approval,
                approvalType: typeof body.approval
            });
            // Flatten approval nested object to top-level fields for schema validation
            if (body.approval && typeof body.approval === 'object') {
                const approval = body.approval;
                console.log('[SQPR Controller] Flattening approval:', approval);
                if (approval.incharge_id !== undefined && approval.incharge_id !== null)
                    body.incharge_id = approval.incharge_id;
                if (approval.incharge_remarks !== undefined && approval.incharge_remarks !== null)
                    body.incharge_remarks = approval.incharge_remarks;
                if (approval.checker_id !== undefined && approval.checker_id !== null)
                    body.checker_id = approval.checker_id;
                if (approval.checker_remarks !== undefined && approval.checker_remarks !== null)
                    body.checker_remarks = approval.checker_remarks;
                if (approval.approver_id !== undefined && approval.approver_id !== null)
                    body.approver_id = approval.approver_id;
                if (approval.approver_remarks !== undefined && approval.approver_remarks !== null)
                    body.approver_remarks = approval.approver_remarks;
            }
            // Log received data (AFTER flattening)
            console.log('[SQPR Controller] CREATE received (AFTER FLATTEN):', {
                inchargeRemarks: body.incharge_remarks,
                checkerRemarks: body.checker_remarks,
                approverRemarks: body.approver_remarks
            });
            const payload = SqprCreateSchema.parse({ body }).body;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const files = req.files || [];
            const result = await sqprService.createRecord(payload, userId, files);
            // Log response
            console.log('[SQPR Controller] CREATE response:', {
                success: result.success,
                sqprId: result.data?.sqpr_id,
                attachments: result.data?.attachments?.length
            });
            res.status(201).json(result);
        }
        catch (error) {
            console.error('[SQPR] CREATE error:', error);
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            // Parse JSON strings from FormData if present
            const body = { ...req.body };
            if (typeof body.attachments === 'string') {
                body.attachments = JSON.parse(body.attachments);
            }
            if (typeof body.cc_list === 'string') {
                body.cc_list = JSON.parse(body.cc_list);
            }
            if (typeof body.approval === 'string') {
                body.approval = JSON.parse(body.approval);
            }
            // Flatten approval nested object to top-level fields for schema validation
            if (body.approval && typeof body.approval === 'object') {
                const approval = body.approval;
                if (approval.incharge_id)
                    body.incharge_id = approval.incharge_id;
                if (approval.incharge_remarks)
                    body.incharge_remarks = approval.incharge_remarks;
                if (approval.checker_id)
                    body.checker_id = approval.checker_id;
                if (approval.checker_remarks)
                    body.checker_remarks = approval.checker_remarks;
                if (approval.approver_id)
                    body.approver_id = approval.approver_id;
                if (approval.approver_remarks)
                    body.approver_remarks = approval.approver_remarks;
            }
            const { id } = SqprUpdateSchema.parse({ params: req.params, body }).params;
            const payload = SqprUpdateSchema.parse({ params: req.params, body }).body;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const files = req.files || [];
            const result = await sqprService.updateRecord(id, payload, userId, files);
            // Log response
            console.log('[SQPR Controller] UPDATE response:', {
                success: result.success,
                sqprId: result.data?.sqpr_id,
                status: result.data?.request_status,
                inchargeRemarks: result.data?.incharge_remarks,
                checkerRemarks: result.data?.checker_remarks,
                approverRemarks: result.data?.approver_remarks
            });
            res.json(result);
        }
        catch (error) {
            console.error('[SQPR] UPDATE error:', error);
            next(error);
        }
    }
    // Workflow Action Wrappers
    async submit(req, res, next) {
        try {
            const { id } = SqprActionSchema.parse({ params: req.params, body: req.body }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await sqprService.updateRecord(id, {
                request_status: 'SUBMITTED',
                submit_date: new Date()
            }, userId, []);
            res.json(result);
        }
        catch (error) {
            console.error('[SQPR] SUBMIT error:', error);
            next(error);
        }
    }
    async issue(req, res, next) {
        try {
            const { id } = SqprActionSchema.parse({ params: req.params, body: req.body }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await sqprService.updateRecord(id, {
                request_status: 'ISSUED'
            }, userId, []);
            res.json(result);
        }
        catch (error) {
            console.error('[SQPR] ISSUE error:', error);
            next(error);
        }
    }
    async reject(req, res, next) {
        try {
            const { params, body } = SqprActionSchema.parse({ params: req.params, body: req.body });
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await sqprService.updateRecord(params.id, {
                request_status: 'REJECTED',
                checker_remarks: body?.remarks
            }, userId, []);
            res.json(result);
        }
        catch (error) {
            console.error('[SQPR] REJECT error:', error);
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const { id } = SqprIdParamSchema.parse({ params: req.params }).params;
            const result = await sqprService.deleteRecord(id);
            res.json(result);
        }
        catch (error) {
            console.error('[SQPR] DELETE error:', error);
            next(error);
        }
    }
    async approve(req, res, next) {
        try {
            const { id } = SqprActionSchema.parse({ params: req.params, body: req.body }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const { remarks } = req.body || {};
            const result = await sqprService.approveRecord(id, userId, remarks);
            res.json(result);
        }
        catch (error) {
            console.error('[SQPR] APPROVE error:', error);
            next(error);
        }
    }
    async check(req, res, next) {
        try {
            const { id } = SqprActionSchema.parse({ params: req.params, body: req.body }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const { remarks } = req.body || {};
            const result = await sqprService.checkRecord(id, userId, remarks);
            res.json(result);
        }
        catch (error) {
            console.error('[SQPR] CHECK error:', error);
            next(error);
        }
    }
    async batchDelete(req, res, next) {
        try {
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const { ids } = req.body;
            if (!Array.isArray(ids)) {
                res.status(400).json({ error: 'ids must be an array' });
                return;
            }
            const result = await sqprService.batchDelete(ids, userId);
            res.json(result);
        }
        catch (error) {
            console.error('[SQPR] BATCH DELETE error:', error);
            next(error);
        }
    }
    async downloadAttachment(req, res, next) {
        try {
            const { attachmentId } = SqprAttachmentParamSchema.parse({ params: req.params }).params;
            if (!attachmentId)
                throw new Error('Attachment ID is required');
            const attachment = await sqprService.getAttachment(attachmentId);
            const fs = await import('fs');
            const path = await import('path');
            const filePath = path.join(process.cwd(), 'uploads/sqpr', attachment.file_name);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found on disk' });
            }
            return res.download(filePath);
        }
        catch (error) {
            console.error('[SQPR] DOWNLOAD error:', error);
            next(error);
        }
    }
}
export const sqprController = new SqprController();
