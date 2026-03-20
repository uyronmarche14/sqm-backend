import { fiveM1EService } from './fiveM1E.service.js';
import { successResponse } from '../../shared/utils/api-response.js';
import { resolveWorkflowListScope } from '../../shared/utils/workflow-access.js';
export class FiveM1EController {
    constructor() {
        this.createApplication = this.createApplication.bind(this);
        this.getAllApplications = this.getAllApplications.bind(this);
        this.getApplication = this.getApplication.bind(this);
        this.updateApplication = this.updateApplication.bind(this);
        this.deleteApplication = this.deleteApplication.bind(this);
        this.submitApplication = this.submitApplication.bind(this);
        this.checkApplication = this.checkApplication.bind(this);
        this.approveApplication = this.approveApplication.bind(this);
        this.rejectApplication = this.rejectApplication.bind(this);
        this.releaseApplication = this.releaseApplication.bind(this);
        this.downloadAttachment = this.downloadAttachment.bind(this);
    }
    getActor(req) {
        return {
            userId: req.user?.userId,
            roleName: req.user?.roleName || req.user?.role_name || req.user?.role || undefined,
        };
    }
    /**
     * Submit a new 5M1E Application
     */
    async createApplication(req, res, next) {
        try {
            // req.user is guaranteed by requireAuth middleware
            const userId = req.user.userId;
            const files = req.files || [];
            console.log(`[5M1E Controller] Create - ${files.length} file(s) received`);
            // 🔗 DATA CONNECTION LOGGER (Requested for Verification)
            console.log("🚀 [BACKEND E2E VERIFICATION] Received Create Payload:");
            console.log(JSON.stringify(req.body, null, 2));
            const result = await fiveM1EService.createApplication(req.body, userId, files);
            res.status(201).json(successResponse(result.data, result.message));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Fetch all 5M1E Applications
     */
    async getAllApplications(req, res, next) {
        try {
            const status = req.query.status;
            const records = await fiveM1EService.getAllApplications(status, this.getActor(req), resolveWorkflowListScope({ scope: req.query.scope, assignedToMe: req.query.assignedToMe }));
            res.status(200).json(successResponse(records));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Fetch a specific Application by its Control Number
     */
    async getApplication(req, res, next) {
        try {
            const id = req.params.id; // ID acts as controlNo in our URL schema
            const record = await fiveM1EService.getApplication(id, this.getActor(req));
            res.status(200).json(successResponse(record));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Update an existing Application
     */
    async updateApplication(req, res, next) {
        try {
            const id = req.params.id;
            const files = req.files || [];
            const actor = this.getActor(req);
            console.log(`[5M1E Controller] Update [${id}] - ${files.length} file(s) received for user ${actor.userId}`);
            // 🔗 DATA CONNECTION LOGGER (Requested for Verification)
            console.log(`🚀 [BACKEND E2E VERIFICATION] Received Update Payload for ${id}:`);
            console.log(JSON.stringify(req.body, null, 2));
            const result = await fiveM1EService.updateApplication(id, req.body, files, actor);
            res.status(200).json(successResponse(result.data, result.message));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Delete an Application and all child data
     */
    async deleteApplication(req, res, next) {
        try {
            const id = req.params.id;
            const result = await fiveM1EService.deleteApplication(id, this.getActor(req));
            res.status(200).json(successResponse({ id }, result.message));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Workflow: Submit
     */
    async submitApplication(req, res, next) {
        try {
            const id = req.params.id;
            const userId = req.user.userId;
            const result = await fiveM1EService.submitApplication(id, userId);
            res.status(200).json(successResponse(result.data, result.message));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Workflow: Check (two-stage approval — checker marks as reviewed)
     */
    async checkApplication(req, res, next) {
        try {
            const id = req.params.id;
            const userId = req.user.userId;
            const result = await fiveM1EService.checkApplication(id, userId, req.body?.remarks);
            res.status(200).json(successResponse(result.data, result.message));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Workflow: Approve
     */
    async approveApplication(req, res, next) {
        try {
            const id = req.params.id;
            const userId = req.user.userId;
            const result = await fiveM1EService.approveApplication(id, userId, req.body?.remarks, req.body?.status);
            res.status(200).json(successResponse(result.data, result.message));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Workflow: Reject
     */
    async rejectApplication(req, res, next) {
        try {
            const id = req.params.id;
            const userId = req.user.userId;
            const result = await fiveM1EService.rejectApplication(id, userId, req.body?.remarks);
            res.status(200).json(successResponse(result.data, result.message));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Workflow: Release
     */
    async releaseApplication(req, res, next) {
        try {
            const id = req.params.id;
            const userId = req.user.userId;
            const result = await fiveM1EService.releaseApplication(id, userId);
            res.status(200).json(successResponse(result.data, result.message));
        }
        catch (error) {
            next(error);
        }
    }
    async downloadAttachment(req, res, next) {
        try {
            const { attachmentId } = req.params;
            const { filePath, fileName, mimeType } = await fiveM1EService.downloadAttachment(attachmentId, this.getActor(req));
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            return res.download(filePath);
        }
        catch (error) {
            console.error('[5M1E] DOWNLOAD error:', error);
            next(error);
        }
    }
}
export const fiveM1EController = new FiveM1EController();
