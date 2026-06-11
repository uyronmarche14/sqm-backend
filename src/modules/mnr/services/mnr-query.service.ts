import { NotFoundError } from '../../../shared/errors/AppError.js';
import { attachmentService } from '../../../shared/services/attachment.service.js';
import {
  assertWorkflowRecordAccess,
  filterWorkflowRecordsByScope,
  type WorkflowListScope,
} from '../../../shared/utils/workflow-access.js';
import { mnrRepository } from '../mnr.repository.js';
import type { MnrWorkflowActorContext } from '../workflow/mnr-workflow.utils.js';
import { mnrAccessService } from './mnr-access.service.js';
import { mnrProjectorService } from './mnr-projector.service.js';

export class MnrQueryService {
  async getAllRecords(
    filters: { status?: string; scope?: WorkflowListScope } = {},
    actor: MnrWorkflowActorContext = {},
  ) {
    let dbFilter: string[] | string | undefined;
    if (filters.status) {
      const { mapStatusToDB } = await import('../../../shared/utils/status-mapper.js');
      dbFilter = filters.status.includes(',')
        ? filters.status.split(',').map((status) => mapStatusToDB(status.trim()))
        : mapStatusToDB(filters.status.trim());
    }

    const records = await mnrRepository.findAllDetailed(dbFilter);
    const latestResponses = await mnrRepository.findLatestResponsesByMnrIds(
      records.map((record) => record.id),
    );
    const latestResponseMap = new Map(latestResponses.map((response) => [response.mnr_id, response]));
    const roleViewListForms = await mnrAccessService.resolveRoleViewListFormCodes(actor.userId);

    const visibleRecords = mnrAccessService.isAdminActor(actor)
      ? records
      : filterWorkflowRecordsByScope(records, filters.scope || 'history', {
          isAssigned: (record) => mnrAccessService.isAssignedRecord(record as any, latestResponseMap.get((record as any).id), actor),
          isMine: (record) => mnrAccessService.isMineRecord(record as any, latestResponseMap.get((record as any).id), actor),
          isHistoryVisible: (record) => mnrAccessService.canReadRecord(
            record as any,
            latestResponseMap.get((record as any).id),
            actor,
            roleViewListForms,
          ),
        });

    return visibleRecords.map((record) =>
      mnrProjectorService.projectListRecord(record as any, latestResponseMap.get((record as any).id), actor),
    );
  }

  async getRecordById(id: string, actor: MnrWorkflowActorContext = {}) {
    const data = await mnrRepository.findByIdDetailed(id);
    if (!data) {
      throw new NotFoundError('MNR Record not found');
    }

    assertWorkflowRecordAccess({
      allowed: mnrAccessService.canReadDetailRecord(data.record, data.response, actor),
      action: 'view',
      moduleName: 'MNR',
    });

    return mnrProjectorService.projectDetailRecord(data as any, actor);
  }

  async downloadAttachment(attachmentId: string, actor: MnrWorkflowActorContext = {}) {
    const owner = await mnrRepository.findAttachmentOwner(attachmentId);
    if (!owner) {
      throw new NotFoundError('Attachment not found');
    }

    const record = await mnrRepository.findByIdDetailed(owner.mnrId);
    if (!record) {
      throw new NotFoundError('MNR Record not found');
    }

    assertWorkflowRecordAccess({
      allowed: mnrAccessService.canReadDetailRecord(record.record, record.response, actor),
      action: 'download',
      moduleName: 'MNR',
    });

    return attachmentService.downloadAttachment(owner.moduleType, attachmentId);
  }
}

export const mnrQueryService = new MnrQueryService();
