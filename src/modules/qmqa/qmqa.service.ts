import { QMQAScheduleCreationInput, QMQAScheduleUpdateInput, QMQARecordCreationInput, QMQARecordUpdateInput, type QmqaAttachmentModuleType } from './qmqa.schema.js';
import type { WorkflowListScope } from '../../shared/utils/workflow-access.js';
import { type QmqaModuleVariant } from './services/qmqa-module-strategy.js';
import { qmqaRecordCommandService } from './services/qmqa-record-command.service.js';
import { qmqaRecordQueryService } from './services/qmqa-record-query.service.js';
import { qmqaResponseService } from './services/qmqa-response.service.js';
import { qmqaScheduleService } from './services/qmqa-schedule.service.js';

export class QmqaService {
  async generateControlNo(year: number, isSchedule = false): Promise<string> {
    return qmqaScheduleService.generateControlNo(year, isSchedule);
  }

  async getAllSchedules() {
    return qmqaScheduleService.getAllSchedules();
  }

  async getScheduleById(id: string) {
    return qmqaScheduleService.getScheduleById(id);
  }

  async createSchedule(payload: QMQAScheduleCreationInput, userId: string) {
    return qmqaScheduleService.createSchedule(payload, userId);
  }

  async updateSchedule(id: string, payload: QMQAScheduleUpdateInput, userId: string) {
    return qmqaScheduleService.updateSchedule(id, payload, userId);
  }

  async getAllRecords(
    filters?: { status?: string | string[]; scope?: WorkflowListScope | string },
    actor?: { userId?: string | null; roleName?: string | null },
    variant: QmqaModuleVariant = 'QMQA',
  ) {
    return qmqaRecordQueryService.getAllRecords(filters, actor, variant);
  }

  async getRecordById(
    id: string,
    actor?: { userId?: string | null; roleName?: string | null },
    variant: QmqaModuleVariant = 'QMQA',
  ) {
    return qmqaRecordQueryService.getRecordById(id, actor, variant);
  }

  async createRecord(payload: QMQARecordCreationInput, userId: string, files: any[] = []) {
    return qmqaRecordCommandService.createRecord(payload, userId, files);
  }

  async updateRecord(
    id: string,
    payload: QMQARecordUpdateInput,
    actor: { userId: string; roleName?: string | null },
    files: any[] = [],
  ) {
    return qmqaRecordCommandService.updateRecord(id, payload, actor, files);
  }

  async saveSupplierResponseContent(
    id: string,
    userId: string,
    payload: {
      skip_initial?: boolean;
      initial_remarks?: string | null;
      final_remarks?: string | null;
    },
    files: any[] = [],
    section: 'initial' | 'final' = 'initial',
  ) {
    return qmqaResponseService.saveSupplierResponseContent(id, userId, payload, files, section);
  }

  async saveResponseReviewContent(
    id: string,
    userId: string,
    payload: {
      issuer_remarks?: string | null;
      verification_remarks?: string | null;
      cycle2_checker_id?: string | null;
      cycle2_checker_remarks?: string | null;
      cycle2_approver_id?: string | null;
      cycle2_approver_remarks?: string | null;
    },
    files: any[] = [],
  ) {
    return qmqaResponseService.saveResponseReviewContent(id, userId, payload, files);
  }

  async deleteSchedule(id: string) {
    return qmqaScheduleService.deleteSchedule(id);
  }

  async deleteSchedules(ids: string[]) {
    return qmqaScheduleService.deleteSchedules(ids);
  }

  async cancelSchedule(id: string, userId: string) {
    return qmqaScheduleService.cancelSchedule(id, userId);
  }

  async deleteRecord(id: string, actor?: { userId?: string | null; roleName?: string | null }) {
    return qmqaRecordCommandService.deleteRecord(id, actor);
  }

  async downloadAttachment(
    attachmentId: string,
    actor?: { userId?: string | null; roleName?: string | null },
    variant: QmqaModuleVariant = 'QMQA',
    moduleTypeHint?: QmqaAttachmentModuleType,
  ) {
    return qmqaRecordQueryService.downloadAttachment(attachmentId, actor, variant, moduleTypeHint);
  }
}

export const qmqaService = new QmqaService();
