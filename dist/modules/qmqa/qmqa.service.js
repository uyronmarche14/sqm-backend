import { qmqaRecordCommandService } from './services/qmqa-record-command.service.js';
import { qmqaRecordQueryService } from './services/qmqa-record-query.service.js';
import { qmqaResponseService } from './services/qmqa-response.service.js';
import { qmqaScheduleService } from './services/qmqa-schedule.service.js';
export class QmqaService {
    async generateControlNo(year, isSchedule = false) {
        return qmqaScheduleService.generateControlNo(year, isSchedule);
    }
    async getAllSchedules() {
        return qmqaScheduleService.getAllSchedules();
    }
    async getScheduleById(id) {
        return qmqaScheduleService.getScheduleById(id);
    }
    async createSchedule(payload, userId) {
        return qmqaScheduleService.createSchedule(payload, userId);
    }
    async updateSchedule(id, payload, userId) {
        return qmqaScheduleService.updateSchedule(id, payload, userId);
    }
    async getAllRecords(filters, actor, variant = 'QMQA') {
        return qmqaRecordQueryService.getAllRecords(filters, actor, variant);
    }
    async getRecordById(id, actor, variant = 'QMQA') {
        return qmqaRecordQueryService.getRecordById(id, actor, variant);
    }
    async createRecord(payload, userId, files = []) {
        return qmqaRecordCommandService.createRecord(payload, userId, files);
    }
    async updateRecord(id, payload, actor) {
        return qmqaRecordCommandService.updateRecord(id, payload, actor);
    }
    async saveSupplierResponseContent(id, userId, payload, files = [], section = 'initial') {
        return qmqaResponseService.saveSupplierResponseContent(id, userId, payload, files, section);
    }
    async saveResponseReviewContent(id, userId, payload, files = []) {
        return qmqaResponseService.saveResponseReviewContent(id, userId, payload, files);
    }
    async deleteSchedule(id) {
        return qmqaScheduleService.deleteSchedule(id);
    }
    async deleteSchedules(ids) {
        return qmqaScheduleService.deleteSchedules(ids);
    }
    async cancelSchedule(id, userId) {
        return qmqaScheduleService.cancelSchedule(id, userId);
    }
    async deleteRecord(id, actor) {
        return qmqaRecordCommandService.deleteRecord(id, actor);
    }
    async downloadAttachment(attachmentId, actor, variant = 'QMQA', moduleTypeHint) {
        return qmqaRecordQueryService.downloadAttachment(attachmentId, actor, variant, moduleTypeHint);
    }
}
export const qmqaService = new QmqaService();
