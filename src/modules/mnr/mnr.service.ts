import { MNRCreationInput, MNRUpdateInput } from './mnr.schema.js';
import type { MnrWorkflowActorContext } from './workflow/mnr-workflow.utils.js';
import type { WorkflowListScope } from '../../shared/utils/workflow-access.js';
import { mnrCommandService } from './services/mnr-command.service.js';
import { mnrQueryService } from './services/mnr-query.service.js';

export class MnrService {
  async saveResponseContent(
    id: string,
    responsePayload: Record<string, any>,
    actor: MnrWorkflowActorContext = {},
    files: any[] = [],
  ) {
    return mnrCommandService.saveResponseContent(id, responsePayload, actor, files);
  }

  async getAllRecords(
    filters: { status?: string; scope?: WorkflowListScope } = {},
    actor: MnrWorkflowActorContext = {},
  ) {
    return mnrQueryService.getAllRecords(filters, actor);
  }

  async getRecordById(id: string, actor: MnrWorkflowActorContext = {}) {
    return mnrQueryService.getRecordById(id, actor);
  }

  async createRecord(payload: MNRCreationInput, userId: string, files: any[] = []) {
    return mnrCommandService.createRecord(payload, userId, files);
  }

  async updateRecord(id: string, payload: MNRUpdateInput, actor: MnrWorkflowActorContext, files: any[] = []) {
    return mnrCommandService.updateRecord(id, payload, actor, files);
  }

  async downloadAttachment(attachmentId: string, actor: MnrWorkflowActorContext = {}) {
    return mnrQueryService.downloadAttachment(attachmentId, actor);
  }

  async deleteRecord(id: string, actor: MnrWorkflowActorContext = {}) {
    return mnrCommandService.deleteRecord(id, actor);
  }
}

export const mnrService = new MnrService();
