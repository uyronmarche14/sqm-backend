import { permissionService } from '../../../shared/services/permission.service.js';
import { buildQmqaWorkflowMetadata, getQmqaCompatibilityStatus, isQmqaSupplierActor, normalizeQmqaWorkflowStage, type QmqaWorkflowActorContext } from '../workflow/qmqa-workflow.utils.js';
import { QMQA_WORKFLOW_STAGE } from '../workflow/qmqa-workflow.constants.js';
import { qmqaRepository } from '../qmqa.repository.js';
import { qmqaModuleStrategy, type QmqaModuleVariant } from './qmqa-module-strategy.js';

const QMQA_HISTORY_STATUSES = new Set(['CLOSED', 'CANCELLED']);
const QMQA_EDITABLE_MAIN_STAGES = new Set<string>([
  QMQA_WORKFLOW_STAGE.DRAFT,
  QMQA_WORKFLOW_STAGE.REJECT_CHECKER,
  QMQA_WORKFLOW_STAGE.REJECT_APPROVER,
]);

export class QmqaAccessService {
  async resolveActorContextWithRole(
    userId?: string | null,
    roleName?: string | null,
  ): Promise<QmqaWorkflowActorContext> {
    if (!userId) {
      return {};
    }

    return {
      userId,
      supplierIds: await qmqaRepository.findSupplierIdsByUserId(userId),
      roleName: roleName || null,
    };
  }

  isAdminActor(actor?: QmqaWorkflowActorContext) {
    return (actor?.roleName || '').toUpperCase().includes('ADMIN');
  }

  async resolveRoleViewListFormCodes(
    userId: string | null | undefined,
    variant: QmqaModuleVariant,
  ) {
    if (!userId) {
      return new Set<string>();
    }

    const checks = await Promise.all(
      qmqaModuleStrategy.getQueueFormCodes(variant).map(async (formId) => ({
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
    variant: QmqaModuleVariant,
    roleViewListForms: Set<string>,
  ) {
    if (roleViewListForms.size === 0) {
      return false;
    }

    return qmqaModuleStrategy.resolveRecordFormCodes(record, latestResponse, variant).some((formId) =>
      roleViewListForms.has(formId),
    );
  }

  isAssignedRecord(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
    actor: QmqaWorkflowActorContext,
  ) {
    if (!actor.userId) {
      return false;
    }

    const workflow = buildQmqaWorkflowMetadata(record, {
      latestResponse: latestResponse || null,
      actor,
    });

    return Array.isArray(workflow.availableActions) && workflow.availableActions.length > 0;
  }

  resolveCompatibilityStatus(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
  ) {
    return getQmqaCompatibilityStatus(record?.request_status, latestResponse || null, record);
  }

  isHistoryRecord(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
  ) {
    return QMQA_HISTORY_STATUSES.has(this.resolveCompatibilityStatus(record, latestResponse));
  }

  isMineRecord(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
    actor: QmqaWorkflowActorContext,
  ) {
    if (!actor.userId) {
      return false;
    }

    return (
      record.encoder_id === actor.userId ||
      record.issuer_id === actor.userId ||
      record.checker_id === actor.userId ||
      record.approver_id === actor.userId ||
      record.attention_id === actor.userId ||
      record.sqe_pic_id === actor.userId ||
      record.pic_auditor_id === actor.userId ||
      latestResponse?.checker_id === actor.userId ||
      latestResponse?.approver_id === actor.userId ||
      latestResponse?.updateby === actor.userId
    );
  }

  canReadRecord(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
    actor: QmqaWorkflowActorContext,
    variant: QmqaModuleVariant,
    roleViewListForms: Set<string> = new Set(),
  ) {
    if (this.isAdminActor(actor)) {
      return true;
    }

    if (!actor.userId) {
      return false;
    }

    if ((actor.roleName || '').toUpperCase().includes('SUPPLIER')) {
      return isQmqaSupplierActor(record, actor) && (
        this.isAssignedRecord(record, latestResponse, actor) ||
        this.isHistoryRecord(record, latestResponse)
      );
    }

    if (this.isAssignedRecord(record, latestResponse, actor)) {
      return true;
    }

    if (!this.isHistoryRecord(record, latestResponse)) {
      return false;
    }

    return (
      this.hasRoleViewListAccessForRecord(record, latestResponse, variant, roleViewListForms) ||
      this.isMineRecord(record, latestResponse, actor)
    );
  }

  canMutateMainRecord(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
    actor: QmqaWorkflowActorContext,
  ) {
    if (this.isAdminActor(actor)) {
      return true;
    }

    if (!actor.userId) {
      return false;
    }

    const workflowStage = normalizeQmqaWorkflowStage(record.request_status, latestResponse || null, record);
    return (
      QMQA_EDITABLE_MAIN_STAGES.has(workflowStage) &&
      (record.encoder_id === actor.userId || record.issuer_id === actor.userId)
    );
  }

  canDeleteMainRecord(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null | undefined,
    actor: QmqaWorkflowActorContext,
  ) {
    if (this.isAdminActor(actor)) {
      return true;
    }

    if (!actor.userId) {
      return false;
    }

    return (
      normalizeQmqaWorkflowStage(record.request_status, latestResponse || null, record) === QMQA_WORKFLOW_STAGE.DRAFT &&
      (record.encoder_id === actor.userId || record.issuer_id === actor.userId)
    );
  }
}

export const qmqaAccessService = new QmqaAccessService();
