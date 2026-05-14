import { deleteResponse, successResponse } from '../../shared/utils/api-response.js';
import { attachmentService } from '../../shared/services/attachment.service.js';
import { supplierQualityRecordCommandService } from './services/supplier-quality-record-command.service.js';
import { supplierQualityRecordQueryService } from './services/supplier-quality-record-query.service.js';
import type {
  SupplierQualityActorContext,
  SupplierQualityUploadedFile,
} from './services/supplier-quality-shared.js';
import { supplierQualityWorkflowService } from './workflow/supplier-quality-workflow.service.js';
import type { SupplierQualityListQuery, SupplierQualityRecordInput } from './supplier-quality.schema.js';

export class SupplierQualityService {
  async list(actor: SupplierQualityActorContext, query: SupplierQualityListQuery = {}) {
    return await supplierQualityRecordQueryService.list(actor, query);
  }

  async getById(id: string, actor: SupplierQualityActorContext) {
    return await supplierQualityRecordQueryService.getById(id, actor);
  }

  async create(payload: SupplierQualityRecordInput, userId: string, files: SupplierQualityUploadedFile[] = []) {
    const recordId = await supplierQualityRecordCommandService.create(payload, userId, files);
    return await this.getById(recordId, { userId, roleName: null });
  }

  async update(id: string, payload: SupplierQualityRecordInput, actor: SupplierQualityActorContext, files: SupplierQualityUploadedFile[] = []) {
    const recordId = await supplierQualityRecordCommandService.update(id, payload, actor, files);
    return await this.getById(recordId, actor);
  }

  async delete(id: string, actor: SupplierQualityActorContext) {
    const recordId = await supplierQualityRecordCommandService.delete(id, actor);
    return deleteResponse(recordId);
  }

  async transition(
    id: string,
    action: 'submit' | 'check' | 'approve' | 'reject' | 'issue',
    actor: { userId: string; roleId?: string | null; remarks?: string | undefined },
  ) {
    const workflowActor = {
      userId: actor.userId,
      roleName: null,
      remarks: actor.remarks,
    };

    switch (action) {
      case 'submit':
        return await supplierQualityWorkflowService.submit(id, workflowActor);
      case 'check':
        return await supplierQualityWorkflowService.check(id, workflowActor);
      case 'approve':
        return await supplierQualityWorkflowService.approve(id, workflowActor);
      case 'reject':
        return await supplierQualityWorkflowService.reject(id, workflowActor);
      case 'issue':
        return await supplierQualityWorkflowService.issue(id, workflowActor);
      default:
        return successResponse(undefined);
    }
  }

  async downloadAttachment(attachmentId: string, actor: SupplierQualityActorContext) {
    await supplierQualityRecordQueryService.downloadAttachment(attachmentId, actor);
    return await attachmentService.downloadAttachment('supplier-quality-main', attachmentId);
  }
}

export const supplierQualityService = new SupplierQualityService();
