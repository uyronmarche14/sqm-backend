import { mnrCommandService } from './services/mnr-command.service.js';
import { mnrQueryService } from './services/mnr-query.service.js';
export class MnrService {
    async saveResponseContent(id, responsePayload, actor = {}) {
        return mnrCommandService.saveResponseContent(id, responsePayload, actor);
    }
    async getAllRecords(filters = {}, actor = {}) {
        return mnrQueryService.getAllRecords(filters, actor);
    }
    async getRecordById(id, actor = {}) {
        return mnrQueryService.getRecordById(id, actor);
    }
    async createRecord(payload, userId, files = []) {
        return mnrCommandService.createRecord(payload, userId, files);
    }
    async updateRecord(id, payload, actor, files = []) {
        return mnrCommandService.updateRecord(id, payload, actor, files);
    }
    async downloadAttachment(attachmentId, actor = {}) {
        return mnrQueryService.downloadAttachment(attachmentId, actor);
    }
    async deleteRecord(id, actor = {}) {
        return mnrCommandService.deleteRecord(id, actor);
    }
}
export const mnrService = new MnrService();
