import { NotFoundError } from '../../../shared/errors/AppError.js';
import { attachmentService } from '../../../shared/services/attachment.service.js';
import { assertWorkflowRecordAccess, filterWorkflowRecordsByScope, resolveWorkflowListScope, type WorkflowListScope } from '../../../shared/utils/workflow-access.js';
import { qmqaRepository } from '../qmqa.repository.js';
import type { QmqaAttachmentModuleType } from '../qmqa.schema.js';
import { buildQmqaWorkflowMetadata, getQmqaCompatibilityStatus } from '../workflow/qmqa-workflow.utils.js';
import { qmqaAccessService } from './qmqa-access.service.js';
import { type QmqaModuleVariant } from './qmqa-module-strategy.js';
import { qmqaResponseService } from './qmqa-response.service.js';

export class QmqaRecordQueryService {
  private async findLatestResponseMap(qmqaIds: string[]) {
    const latestResponseMap = new Map<string, Record<string, any>>();
    const latestResponses = await qmqaRepository.findLatestResponsesByQmqaIds(qmqaIds);

    for (const response of latestResponses) {
      if (!latestResponseMap.has(response.qmqa_id)) {
        latestResponseMap.set(response.qmqa_id, response);
      }
    }

    return latestResponseMap;
  }

  private decorateRecord(
    record: Record<string, any>,
    actor: any,
    latestResponse?: Record<string, any> | null,
  ) {
    const workflow = buildQmqaWorkflowMetadata(record, {
      latestResponse: latestResponse || null,
      actor,
    });

    return {
      ...record,
      status: getQmqaCompatibilityStatus(workflow.workflowStage, latestResponse, record),
      created_at: record.created_date,
      ...workflow,
    };
  }

  async getAllRecords(
    filters?: { status?: string | string[]; scope?: WorkflowListScope | string },
    actor?: { userId?: string | null; roleName?: string | null },
    variant: QmqaModuleVariant = 'QMQA',
  ) {
    const { resolveQmqaStatusFilter } = await import('../workflow/qmqa-workflow.utils.js');
    const mappedStatus = resolveQmqaStatusFilter(filters?.status);
    const actorContext = await qmqaAccessService.resolveActorContextWithRole(actor?.userId, actor?.roleName);
    const scope = resolveWorkflowListScope({ scope: filters?.scope }, 'history');
    const roleViewListForms = await qmqaAccessService.resolveRoleViewListFormCodes(actorContext.userId, variant);

    const records = await qmqaRepository.findAllRecordsDetailed({
      mappedStatus,
      actorContext,
    });

    const latestResponseMap = await this.findLatestResponseMap(
      records.map((record: any) => record.qmqa_id),
    );

    const visibleRecords = qmqaAccessService.isAdminActor(actorContext)
      ? records
      : filterWorkflowRecordsByScope(records, scope, {
          isAssigned: (record) =>
            qmqaAccessService.isAssignedRecord(record, latestResponseMap.get(record.qmqa_id) || null, actorContext),
          isMine: (record) =>
            qmqaAccessService.isMineRecord(record, latestResponseMap.get(record.qmqa_id) || null, actorContext),
          isHistoryVisible: (record) =>
            qmqaAccessService.canReadRecord(
              record,
              latestResponseMap.get(record.qmqa_id) || null,
              actorContext,
              variant,
              roleViewListForms,
            ),
        });

    return visibleRecords.map((record: any) => this.decorateRecord(
      record,
      actorContext,
      latestResponseMap.get(record.qmqa_id) || null,
    ));
  }

  async getRecordById(
    id: string,
    actor?: { userId?: string | null; roleName?: string | null },
    variant: QmqaModuleVariant = 'QMQA',
  ) {
    const data = await qmqaRepository.findRecordByIdDetailed(id);
    if (!data) {
      throw new NotFoundError('QMQA Record not found');
    }

    const planAttachments = await qmqaRepository.findPlanAttachments(data.qmqa_id);
    const attachments = await qmqaRepository.findAttachments(data.qmqa_id);
    const ccList = await qmqaRepository.findCcList(data.qmqa_id);
    const response = await qmqaRepository.findResponseByQmqaId(data.qmqa_id);
    const actorContext = await qmqaAccessService.resolveActorContextWithRole(actor?.userId, actor?.roleName);
    const roleViewListForms = await qmqaAccessService.resolveRoleViewListFormCodes(actorContext.userId, variant);

    assertWorkflowRecordAccess({
      allowed: qmqaAccessService.canReadRecord(data, response, actorContext, variant, roleViewListForms),
      action: 'view',
      moduleName: variant,
    });

    let responseInitialAttachments: any[] = [];
    let responseFinalAttachments: any[] = [];
    let responseVerificationAttachments: any[] = [];
    let initialReportAttachment: any = null;
    let finalReport: any = null;
    let finalReportAttachment: any = null;

    if (response) {
      const rawInitial = await qmqaRepository.findResponseInitialAttachments(response.qmqa_response_id);
      const rawFinal = await qmqaRepository.findResponseFinalAttachments(response.qmqa_response_id);
      const rawVerification = await qmqaRepository.findResponseVerificationAttachments(response.qmqa_response_id);
      responseInitialAttachments = qmqaResponseService.mapInitialAttachments(rawInitial);
      responseFinalAttachments = qmqaResponseService.mapFinalAttachments(rawFinal);
      responseVerificationAttachments = qmqaResponseService.mapVerificationAttachments(rawVerification);
      initialReportAttachment = qmqaResponseService.resolveInitialAttachment(rawInitial);
      ({ finalReport, finalReportAttachment } = qmqaResponseService.resolveFinalAttachmentSlots(rawFinal));
    }

    return {
      ...this.decorateRecord(data, actorContext, response),
      audit_plan_attachments: planAttachments,
      attachments,
      cc_list: ccList,
      response: response || null,
      response_initial_attachments: responseInitialAttachments,
      response_final_attachments: responseFinalAttachments,
      response_verification_attachments: responseVerificationAttachments,
      initialReportAttachment,
      finalReport,
      finalReportAttachment,
      verificationAttachment: responseVerificationAttachments[0] || null,
    };
  }

  async downloadAttachment(
    attachmentId: string,
    actor?: { userId?: string | null; roleName?: string | null },
    variant: QmqaModuleVariant = 'QMQA',
    moduleTypeHint?: QmqaAttachmentModuleType,
  ) {
    const hintedOwner = moduleTypeHint
      ? await qmqaRepository.findAttachmentOwner(moduleTypeHint, attachmentId)
      : null;
    const owner = hintedOwner
      ? { ...hintedOwner, moduleType: moduleTypeHint as QmqaAttachmentModuleType }
      : await qmqaRepository.findAttachmentOwnerByAttachmentId(attachmentId);
    if (!owner) {
      throw new NotFoundError('Attachment not found');
    }

    const actorContext = await qmqaAccessService.resolveActorContextWithRole(actor?.userId, actor?.roleName);
    const record = await qmqaRepository.findRecordByIdDetailed(owner.qmqa_id);
    if (!record) {
      throw new NotFoundError('QMQA Record not found');
    }

    const response = await qmqaRepository.findResponseByQmqaId(owner.qmqa_id);
    const roleViewListForms = await qmqaAccessService.resolveRoleViewListFormCodes(actorContext.userId, variant);

    assertWorkflowRecordAccess({
      allowed: qmqaAccessService.canReadRecord(record, response, actorContext, variant, roleViewListForms),
      action: 'view',
      moduleName: variant,
    });

    return attachmentService.downloadAttachment(owner.moduleType, attachmentId);
  }
}

export const qmqaRecordQueryService = new QmqaRecordQueryService();
