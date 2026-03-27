import { getSubFormFormCodes } from '@sqm/permissions-contract';
import { permissionService } from '../../../shared/services/permission.service.js';
import { buildMnrWorkflowMetadata, type MnrWorkflowActorContext } from '../workflow/mnr-workflow.utils.js';
import { MNR_WORKFLOW_STAGE, type MnrWorkflowStage } from '../workflow/mnr-workflow.constants.js';
import { mnrProjectorService } from './mnr-projector.service.js';

const MNR_QUEUE_STATUS_FORM_FALLBACKS: Record<string, string[]> = {
  NEW: ['MNR-12-01'],
  DRAFT: ['MNR-12-02'],
  SUBMITTED: ['MNR-12-03'],
  CHECKED: ['MNR-12-03'],
  AAPPROVAL: ['MNR-12-03'],
  AWAITING_CHECKED: ['MNR-12-03'],
  AWAITING_APPROVAL: ['MNR-12-03'],
  APPROVED: ['MNR-12-07'],
  ISSUED: ['MNR-12-06'],
  IR: ['MNR-12-09'],
  FR: ['MNR-12-09'],
  REPORT: ['MNR-12-09'],
  WITH_INITIAL_REPORT: ['MNR-12-09'],
  WITH_FINAL_REPORT: ['MNR-12-09'],
  RESPONSE_SUBMITTED: ['MNR-12-10'],
  RESPONSE_RECEIVED: ['MNR-12-10'],
  RESPONSE_AWAITING_CHECKED: ['MNR-12-10'],
  RESPONSE_CHECKED: ['MNR-12-10'],
  RESPONSE_AWAITING_APPROVAL: ['MNR-12-10'],
  RESPONSE_AWAIT_APPROVAL: ['MNR-12-10'],
  RESPONSE_AAPPROVAL: ['MNR-12-10'],
  RESPONSE_REJECTED: ['MNR-12-11'],
  RREJECTED: ['MNR-12-11'],
  LOT_TRACKING: ['MNR-12-12'],
  LOTTRACKING: ['MNR-12-12'],
  CLOSED: ['MNR-12-12'],
  SEARCH: ['MNR-12-13'],
};

const MNR_QUEUE_STAGES = [
  'NEW',
  'DRAFT',
  'AAPPROVAL',
  'APPROVED',
  'ISSUED',
  'REPORT',
  'RESPONSE_AWAIT_APPROVAL',
  'RREJECTED',
  'LOTTRACKING',
  'SEARCH',
] as const;

function uniqueFormCodes(formIds: string[]) {
  return Array.from(new Set(formIds.filter(Boolean)));
}

function resolveMnrQueueFormUniverse() {
  const contractCodes = MNR_QUEUE_STAGES.flatMap((stage) => getSubFormFormCodes('MNR', stage));
  const fallbackCodes = Object.values(MNR_QUEUE_STATUS_FORM_FALLBACKS).flat();
  return uniqueFormCodes([...contractCodes, ...fallbackCodes]);
}

const MNR_QUEUE_FORM_CODES = resolveMnrQueueFormUniverse();

export class MnrAccessService {
  isAdminActor(actor?: MnrWorkflowActorContext) {
    return (actor?.roleName || '').toUpperCase().includes('ADMIN');
  }

  isSupplierActor(actor?: MnrWorkflowActorContext) {
    return (actor?.roleName || '').toUpperCase().includes('SUPPLIER');
  }

  resolveQueueFormCodes(stageOrStatus: string | null | undefined) {
    const normalized = String(stageOrStatus || '').trim().toUpperCase();
    return uniqueFormCodes([
      ...getSubFormFormCodes('MNR', normalized),
      ...(MNR_QUEUE_STATUS_FORM_FALLBACKS[normalized] || []),
    ]);
  }

  resolveRecordFormCodes(record: Record<string, any>, latestResponse: Record<string, any> | null | undefined) {
    const workflow = this.buildWorkflow({
      ...record,
      request_status: record.request_status ?? record.status,
    }, latestResponse);
    const displayStatus = mnrProjectorService.mapWorkflowStageToDisplayStatus(workflow.workflowStage);
    const resolved = this.resolveQueueFormCodes(displayStatus);
    return resolved.length > 0 ? resolved : MNR_QUEUE_FORM_CODES;
  }

  async resolveRoleViewListFormCodes(userId?: string | null) {
    if (!userId) {
      return new Set<string>();
    }

    const checks = await Promise.all(
      MNR_QUEUE_FORM_CODES.map(async (formId) => ({
        formId,
        allowed: await permissionService.checkRolePermission(userId, formId, 'viewlist'),
      })),
    );

    return new Set(
      checks
        .filter((entry) => entry.allowed)
        .map((entry) => entry.formId),
    );
  }

  hasRoleViewListAccessForRecord(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
    roleViewListForms: Set<string>,
  ) {
    if (roleViewListForms.size === 0) {
      return false;
    }

    return this.resolveRecordFormCodes(record, latestResponse).some((formId) =>
      roleViewListForms.has(formId),
    );
  }

  hasSupplierAccess(record: Record<string, any>, actor?: MnrWorkflowActorContext) {
    if (!actor?.userId) {
      return false;
    }

    return (
      record.attention_id === actor.userId ||
      Boolean(record.supplier_id && actor.supplierId && record.supplier_id === actor.supplierId)
    );
  }

  isParticipantRecord(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
    actor?: MnrWorkflowActorContext,
  ) {
    if (!actor?.userId) {
      return false;
    }

    return [
      record.encoder_id,
      record.issuer_id,
      record.checker_id,
      record.approver_id,
      record.attention_id,
      latestResponse?.checker_id,
      latestResponse?.approver_id,
    ].includes(actor.userId);
  }

  buildWorkflow(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
    actor?: MnrWorkflowActorContext,
  ) {
    return buildMnrWorkflowMetadata({
      ...record,
      request_status: record.request_status ?? record.status,
    }, {
      latestResponse: latestResponse || undefined,
      actor,
    });
  }

  getWorkflowStage(record: Record<string, any>, latestResponse?: Record<string, any> | null) {
    return this.buildWorkflow(record, latestResponse, undefined).workflowStage;
  }

  isReferenceVisibleStage(stage: MnrWorkflowStage) {
    return (
      stage === MNR_WORKFLOW_STAGE.ACCEPT ||
      stage === MNR_WORKFLOW_STAGE.CANCEL ||
      stage === MNR_WORKFLOW_STAGE.LOT_TRACKING
    );
  }

  isSupplierVisibleStage(stage: MnrWorkflowStage) {
    return (
      stage === MNR_WORKFLOW_STAGE.SUPPLIER ||
      stage === MNR_WORKFLOW_STAGE.INITIAL_RESPONSE ||
      stage === MNR_WORKFLOW_STAGE.REJECT_ISSUER_2ND ||
      stage === MNR_WORKFLOW_STAGE.NOT_ACCEPT ||
      this.isReferenceVisibleStage(stage)
    );
  }

  isAssignedRecord(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
    actor?: MnrWorkflowActorContext,
  ) {
    if (!actor?.userId) {
      return false;
    }

    const workflow = this.buildWorkflow(record, latestResponse, actor);
    return Array.isArray(workflow.availableActions) && workflow.availableActions.length > 0;
  }

  isMineRecord(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
    actor?: MnrWorkflowActorContext,
  ) {
    if (!actor?.userId) {
      return false;
    }

    if (this.isSupplierActor(actor)) {
      return this.hasSupplierAccess(record, actor);
    }

    return this.isParticipantRecord(record, latestResponse, actor);
  }

  canReadRecord(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
    actor?: MnrWorkflowActorContext,
    roleViewListForms: Set<string> = new Set(),
  ) {
    if (!actor?.userId) {
      return false;
    }

    if (this.isAdminActor(actor)) {
      return true;
    }

    if (this.isSupplierActor(actor)) {
      return this.hasSupplierAccess(record, actor) && this.isSupplierVisibleStage(this.getWorkflowStage(record, latestResponse));
    }

    if (this.hasRoleViewListAccessForRecord(record, latestResponse, roleViewListForms)) {
      return true;
    }

    return this.isParticipantRecord(record, latestResponse, actor);
  }

  canReadDetailRecord(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
    actor?: MnrWorkflowActorContext,
  ) {
    if (!actor?.userId) {
      return false;
    }

    if (this.isAdminActor(actor)) {
      return true;
    }

    if (this.isAssignedRecord(record, latestResponse, actor)) {
      return true;
    }

    const stage = this.getWorkflowStage(record, latestResponse);
    if (!this.isReferenceVisibleStage(stage)) {
      return false;
    }

    if (this.isSupplierActor(actor)) {
      return this.hasSupplierAccess(record, actor) && this.isSupplierVisibleStage(stage);
    }

    return this.isParticipantRecord(record, latestResponse, actor);
  }

  canMutateMainRecord(record: Record<string, any>, actor?: MnrWorkflowActorContext) {
    if (this.isAdminActor(actor)) {
      return true;
    }

    if (!actor?.userId) {
      return false;
    }

    const stage = this.getWorkflowStage(record);
    switch (stage) {
      case MNR_WORKFLOW_STAGE.DRAFT:
      case MNR_WORKFLOW_STAGE.REJECT_CHECKER:
      case MNR_WORKFLOW_STAGE.REJECT_APPROVER:
      case MNR_WORKFLOW_STAGE.CANCEL:
        return record.encoder_id === actor.userId || record.issuer_id === actor.userId;
      case MNR_WORKFLOW_STAGE.ISSUER:
        return record.issuer_id === actor.userId;
      default:
        return false;
    }
  }

  canMutateResponseRecord(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
    actor?: MnrWorkflowActorContext,
  ) {
    if (this.isAdminActor(actor)) {
      return true;
    }

    const stage = this.getWorkflowStage(record, latestResponse);
    switch (stage) {
      case MNR_WORKFLOW_STAGE.SUPPLIER:
      case MNR_WORKFLOW_STAGE.INITIAL_RESPONSE:
      case MNR_WORKFLOW_STAGE.REJECT_ISSUER_2ND:
      case MNR_WORKFLOW_STAGE.NOT_ACCEPT:
      case MNR_WORKFLOW_STAGE.REJECT_SUPPLIER:
        return this.hasSupplierAccess(record, actor);
      case MNR_WORKFLOW_STAGE.FINAL_RESPONSE:
      case MNR_WORKFLOW_STAGE.ISSUER_2ND:
      case MNR_WORKFLOW_STAGE.REJECT_CHECKER_2ND:
      case MNR_WORKFLOW_STAGE.REJECT_APPROVER_2ND:
        return Boolean(actor?.userId && record.issuer_id === actor.userId);
      default:
        return false;
    }
  }

  canDeleteRecord(record: Record<string, any>, actor?: MnrWorkflowActorContext) {
    if (this.isAdminActor(actor)) {
      return true;
    }

    if (!this.canMutateMainRecord(record, actor)) {
      return false;
    }

    const stage = buildMnrWorkflowMetadata(record).workflowStage;
    return (
      stage === MNR_WORKFLOW_STAGE.DRAFT ||
      stage === MNR_WORKFLOW_STAGE.REJECT_CHECKER ||
      stage === MNR_WORKFLOW_STAGE.REJECT_APPROVER ||
      stage === MNR_WORKFLOW_STAGE.CANCEL
    );
  }
}

export const mnrAccessService = new MnrAccessService();
