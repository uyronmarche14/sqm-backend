import { mnrService } from './mnr.service.js';
import { MnrCreateSchema, MnrUpdateSchema, MnrIdParamSchema, MnrAttachmentParamSchema, MnrWorkflowActionSchema, MnrResponseWorkflowSchema, } from './mnr.schema.js';
import { mnrWorkflowService } from './workflow/mnr-workflow.service.js';
import { resolveWorkflowListScope } from '../../shared/utils/workflow-access.js';
export class MnrController {
    constructor() {
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
        this.submit = this.submit.bind(this);
        this.submitMain = this.submitMain.bind(this);
        this.check = this.check.bind(this);
        this.checkMain = this.checkMain.bind(this);
        this.approve = this.approve.bind(this);
        this.approveMain = this.approveMain.bind(this);
        this.reject = this.reject.bind(this);
        this.rejectMain = this.rejectMain.bind(this);
        this.issue = this.issue.bind(this);
        this.issueMain = this.issueMain.bind(this);
        this.close = this.close.bind(this);
        this.cancel = this.cancel.bind(this);
        this.cancelMain = this.cancelMain.bind(this);
        this.saveInitialResponse = this.saveInitialResponse.bind(this);
        this.submitInitialResponse = this.submitInitialResponse.bind(this);
        this.saveFinalResponse = this.saveFinalResponse.bind(this);
        this.submitFinalResponse = this.submitFinalResponse.bind(this);
        this.saveResponseReview = this.saveResponseReview.bind(this);
        this.submitResponseReview = this.submitResponseReview.bind(this);
        this.checkResponse = this.checkResponse.bind(this);
        this.approveResponse = this.approveResponse.bind(this);
        this.rejectResponse = this.rejectResponse.bind(this);
        this.acceptResponse = this.acceptResponse.bind(this);
        this.notAcceptResponse = this.notAcceptResponse.bind(this);
        this.downloadAttachment = this.downloadAttachment.bind(this);
    }
    getActor(req) {
        return {
            userId: req.user?.userId || req.user?.id || undefined,
            supplierId: req.user?.supplierId || undefined,
            roleName: req.user?.roleName || req.user?.role_name || req.user?.role || undefined,
        };
    }
    async getAll(req, res, next) {
        try {
            const status = req.query.status;
            const actor = this.getActor(req);
            const records = await mnrService.getAllRecords({ status, scope: resolveWorkflowListScope({ scope: req.query.scope, assignedToMe: req.query.assignedToMe }) }, actor);
            res.json({ data: records });
        }
        catch (error) {
            console.error('[MNR] GET ALL error:', error);
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const actor = this.getActor(req);
            const record = await mnrService.getRecordById(id, actor);
            res.json({ data: record });
        }
        catch (error) {
            console.error('[MNR] GET BY ID error:', error);
            next(error);
        }
    }
    async create(req, res, next) {
        try {
            const payload = MnrCreateSchema.parse({ body: req.body }).body;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const files = req.files || [];
            const result = await mnrService.createRecord(payload, userId, files);
            console.info(`[Backend] Receiving MNR Create form data by user ${userId}`, { payload, files: files.length });
            res.status(201).json(result);
        }
        catch (error) {
            console.error('[MNR] CREATE error:', error);
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const { id } = MnrUpdateSchema.parse({ params: req.params, body: req.body }).params;
            const payload = MnrUpdateSchema.parse({ params: req.params, body: req.body }).body;
            const actor = this.getActor(req);
            const files = req.files || [];
            const result = await mnrService.updateRecord(id, payload, actor, files);
            console.info(`[Backend] Receiving MNR Update form data for ${id}`, { payload, files: files.length });
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] UPDATE error:', error);
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const result = await mnrService.deleteRecord(id, this.getActor(req));
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] DELETE error:', error);
            next(error);
        }
    }
    // Workflow Action Handlers
    async submit(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
            const remarks = parsed?.remarks || parsed?.updates?.remarks;
            const roleId = req.user?.roleId || req.user?.role_id;
            const result = await mnrWorkflowService.submitMain(id, userId, roleId, remarks);
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] SUBMIT error:', error);
            next(error);
        }
    }
    async submitMain(req, res, next) {
        return this.submit(req, res, next);
    }
    async check(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
            const remarks = parsed?.remarks || parsed?.updates?.remarks;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const roleId = req.user?.roleId || req.user?.role_id;
            const result = await mnrWorkflowService.checkMain(id, userId, roleId, remarks);
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] CHECK error:', error);
            next(error);
        }
    }
    async checkMain(req, res, next) {
        return this.check(req, res, next);
    }
    async approve(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
            const remarks = parsed?.remarks || parsed?.updates?.remarks;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const roleId = req.user?.roleId || req.user?.role_id;
            const result = await mnrWorkflowService.approveMain(id, userId, roleId, remarks);
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] APPROVE error:', error);
            next(error);
        }
    }
    async approveMain(req, res, next) {
        return this.approve(req, res, next);
    }
    async reject(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
            const remarks = parsed?.remarks || parsed?.updates?.remarks;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const roleId = req.user?.roleId || req.user?.role_id;
            const result = await mnrWorkflowService.rejectMain(id, userId, roleId, remarks);
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] REJECT error:', error);
            next(error);
        }
    }
    async rejectMain(req, res, next) {
        return this.reject(req, res, next);
    }
    async issue(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
            const remarks = parsed?.remarks || parsed?.updates?.remarks;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const roleId = req.user?.roleId || req.user?.role_id;
            const result = await mnrWorkflowService.issueMain(id, userId, roleId, remarks);
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] ISSUE error:', error);
            next(error);
        }
    }
    async issueMain(req, res, next) {
        return this.issue(req, res, next);
    }
    async close(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
            const remarks = parsed?.remarks || parsed?.updates?.remarks;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const roleId = req.user?.roleId || req.user?.role_id;
            const result = await mnrWorkflowService.close(id, userId, roleId, remarks);
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] CLOSE error:', error);
            next(error);
        }
    }
    async cancel(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
            const remarks = parsed?.remarks || parsed?.updates?.remarks;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const roleId = req.user?.roleId || req.user?.role_id;
            const result = await mnrWorkflowService.cancelMain(id, userId, roleId, remarks);
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] CANCEL error:', error);
            next(error);
        }
    }
    async cancelMain(req, res, next) {
        return this.cancel(req, res, next);
    }
    async saveInitialResponse(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrResponseWorkflowSchema.parse({ body: req.body }).body;
            const responsePayload = parsed?.response8D || parsed?.updates?.response8D || {};
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const roleId = req.user?.roleId || req.user?.role_id || undefined;
            const supplierId = req.user?.supplierId || undefined;
            const result = await mnrWorkflowService.saveInitialResponse(id, userId, roleId, responsePayload, supplierId);
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] SAVE INITIAL RESPONSE error:', error);
            next(error);
        }
    }
    async submitInitialResponse(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrResponseWorkflowSchema.parse({ body: req.body }).body;
            const responsePayload = parsed?.response8D || parsed?.updates?.response8D || {};
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const supplierId = req.user?.supplierId || undefined;
            const result = await mnrWorkflowService.submitInitialResponse(id, userId, responsePayload, supplierId);
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] SUBMIT INITIAL RESPONSE error:', error);
            next(error);
        }
    }
    async saveFinalResponse(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrResponseWorkflowSchema.parse({ body: req.body }).body;
            const responsePayload = parsed?.response8D || parsed?.updates?.response8D || {};
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const supplierId = req.user?.supplierId || undefined;
            const result = await mnrWorkflowService.saveFinalResponse(id, userId, responsePayload, supplierId);
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] SAVE FINAL RESPONSE error:', error);
            next(error);
        }
    }
    async submitFinalResponse(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrResponseWorkflowSchema.parse({ body: req.body }).body;
            const responsePayload = parsed?.response8D || parsed?.updates?.response8D || {};
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const supplierId = req.user?.supplierId || undefined;
            const result = await mnrWorkflowService.submitFinalResponse(id, userId, responsePayload, supplierId);
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] SUBMIT FINAL RESPONSE error:', error);
            next(error);
        }
    }
    async saveResponseReview(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrResponseWorkflowSchema.parse({ body: req.body }).body;
            const responsePayload = parsed?.response8D || parsed?.updates?.response8D || {};
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await mnrWorkflowService.saveResponseReview(id, userId, responsePayload);
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] SAVE RESPONSE REVIEW error:', error);
            next(error);
        }
    }
    async submitResponseReview(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrResponseWorkflowSchema.parse({ body: req.body }).body;
            const responsePayload = parsed?.response8D || parsed?.updates?.response8D || {};
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await mnrWorkflowService.submitResponseReview(id, userId, responsePayload);
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] SUBMIT RESPONSE REVIEW error:', error);
            next(error);
        }
    }
    async checkResponse(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
            const remarks = parsed?.remarks || parsed?.updates?.remarks;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await mnrWorkflowService.checkResponse(id, userId, remarks);
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] CHECK RESPONSE error:', error);
            next(error);
        }
    }
    async approveResponse(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
            const remarks = parsed?.remarks || parsed?.updates?.remarks;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await mnrWorkflowService.approveResponse(id, userId, remarks);
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] APPROVE RESPONSE error:', error);
            next(error);
        }
    }
    async rejectResponse(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
            const remarks = parsed?.remarks || parsed?.updates?.remarks;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await mnrWorkflowService.rejectResponse(id, userId, remarks || '');
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] REJECT RESPONSE error:', error);
            next(error);
        }
    }
    async acceptResponse(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
            const remarks = parsed?.remarks || parsed?.updates?.remarks;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await mnrWorkflowService.acceptResponse(id, userId, remarks);
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] ACCEPT RESPONSE error:', error);
            next(error);
        }
    }
    async notAcceptResponse(req, res, next) {
        try {
            const { id } = MnrIdParamSchema.parse({ params: req.params }).params;
            const parsed = MnrWorkflowActionSchema.parse({ body: req.body }).body;
            const remarks = parsed?.remarks || parsed?.updates?.remarks;
            const userId = req.user?.userId || req.user?.id || 'SYSTEM';
            const result = await mnrWorkflowService.notAcceptResponse(id, userId, remarks || '');
            res.json(result);
        }
        catch (error) {
            console.error('[MNR] NOT ACCEPT RESPONSE error:', error);
            next(error);
        }
    }
    async downloadAttachment(req, res, next) {
        try {
            const { attachmentId } = MnrAttachmentParamSchema.parse({ params: req.params }).params;
            const { filePath, fileName, mimeType } = await mnrService.downloadAttachment(attachmentId, this.getActor(req));
            console.info(`[Backend] Sending attachment ${attachmentId} to frontend`);
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            return res.download(filePath);
        }
        catch (error) {
            console.error('[Backend] Attachment sending failed:', error);
            next(error);
        }
    }
}
export const mnrController = new MnrController();
