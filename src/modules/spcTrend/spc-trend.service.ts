import { attachmentService } from '../../shared/services/attachment.service.js';
import { deleteResponse, successResponse } from '../../shared/utils/api-response.js';
import { spcTrendRecordCommandService } from './services/spc-trend-record-command.service.js';
import { spcTrendRecordQueryService } from './services/spc-trend-record-query.service.js';
import type { SpcTrendActorContext, SpcTrendUploadedFile } from './services/spc-trend-shared.js';
import { spcTrendWorkflowService } from './workflow/spc-trend-workflow.service.js';
import type { SpcTrendListQuery, SpcTrendRecordInput } from './spc-trend.schema.js';

export class SpcTrendService {
  async list(actor: SpcTrendActorContext, query: SpcTrendListQuery = {}) {
    return await spcTrendRecordQueryService.list(actor, query);
  }

  async getById(id: string, actor: SpcTrendActorContext) {
    return await spcTrendRecordQueryService.getById(id, actor);
  }

  async create(payload: SpcTrendRecordInput, userId: string, files: SpcTrendUploadedFile[] = []) {
    const recordId = await spcTrendRecordCommandService.create(payload, userId, files);
    return await this.getById(recordId, { userId });
  }

  async update(
    id: string,
    payload: SpcTrendRecordInput,
    actor: SpcTrendActorContext,
    files: SpcTrendUploadedFile[] = [],
  ) {
    const recordId = await spcTrendRecordCommandService.update(id, payload, actor, files);
    return await this.getById(recordId, actor);
  }

  async delete(id: string, actor: SpcTrendActorContext) {
    const recordId = await spcTrendRecordCommandService.delete(id, actor);
    return deleteResponse(recordId);
  }

  async transition(
    id: string,
    action: 'submit' | 'check' | 'approve' | 'reject' | 'issue',
    actor: { userId: string; remarks?: string | undefined },
  ) {
    switch (action) {
      case 'submit':
        return await spcTrendWorkflowService.submit(id, actor);
      case 'check':
        return await spcTrendWorkflowService.check(id, actor);
      case 'approve':
        return await spcTrendWorkflowService.approve(id, actor);
      case 'reject':
        return await spcTrendWorkflowService.reject(id, actor);
      case 'issue':
        return await spcTrendWorkflowService.issue(id, actor);
      default:
        return successResponse(undefined);
    }
  }

  async downloadAttachment(attachmentId: string, actor: SpcTrendActorContext) {
    await spcTrendRecordQueryService.downloadAttachment(attachmentId, actor);
    return await attachmentService.downloadAttachment('spc-trend-main', attachmentId);
  }
}

export const spcTrendService = new SpcTrendService();
