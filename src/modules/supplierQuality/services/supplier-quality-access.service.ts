import { permissionService } from '../../../shared/services/permission.service.js';
import { isAdminRole } from '../../../shared/utils/admin.utils.js';
import { ForbiddenError } from '../../../shared/errors/AppError.js';
import {
  buildSupplierQualityWorkflowMetadata,
  getSupplierQualityCompatibilityStatus,
  getSupplierQualityStageOwnerId,
  normalizeSupplierQualityWorkflowStage,
  type SupplierQualityWorkflowRecordLike,
} from '../workflow/supplier-quality-workflow.js';
import type { SupplierQualityActorContext } from './supplier-quality-shared.js';

const SUPPLIER_QUALITY_QUEUE_STATUS_FORM_FALLBACKS: Record<string, string[]> = {
  DRAFT: ['SQPRLAR-01-01'],
  AWAITING_CHECKED: ['SQPRLAR-01-02'],
  AWAITING_APPROVAL: ['SQPRLAR-01-02'],
  REJECTED: ['SQPRLAR-01-03'],
  APPROVED: ['SQPRLAR-01-05'],
  ISSUED: ['SQPRLAR-01-05'],
  SEARCH: ['SQPRLAR-01-04'],
};

const SUPPLIER_QUALITY_QUEUE_FORM_CODES = Array.from(
  new Set(Object.values(SUPPLIER_QUALITY_QUEUE_STATUS_FORM_FALLBACKS).flat()),
);

function uniqueFormCodes(formIds: string[]) {
  return Array.from(new Set(formIds.filter(Boolean)));
}

export class SupplierQualityAccessService {
  isAdminActor(actor?: SupplierQualityActorContext) {
    return isAdminRole(actor?.roleName);
  }

  resolveQueueFormCodes(stageOrStatus: string | null | undefined) {
    const normalized = String(stageOrStatus || '').trim().toUpperCase();
    return uniqueFormCodes(SUPPLIER_QUALITY_QUEUE_STATUS_FORM_FALLBACKS[normalized] || []);
  }

  async resolveRoleViewListFormCodes(userId?: string | null) {
    if (!userId) {
      return new Set<string>();
    }

    const checks = await Promise.all(
      SUPPLIER_QUALITY_QUEUE_FORM_CODES.map(async (formId) => ({
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

  hasRoleViewListAccessForRecord(record: SupplierQualityWorkflowRecordLike, roleViewListForms: Set<string>) {
    if (roleViewListForms.size === 0) {
      return false;
    }

    const status = getSupplierQualityCompatibilityStatus(record.request_status, record);
    return this.resolveQueueFormCodes(status).some((formId) => roleViewListForms.has(formId));
  }

  isAssignedRecord(record: SupplierQualityWorkflowRecordLike, actor?: SupplierQualityActorContext) {
    if (!actor?.userId) {
      return false;
    }

    const workflow = buildSupplierQualityWorkflowMetadata(record, actor);
    return Array.isArray(workflow.availableActions) && workflow.availableActions.length > 0;
  }

  isParticipantRecord(record: SupplierQualityWorkflowRecordLike, actor?: SupplierQualityActorContext) {
    if (!actor?.userId) {
      return false;
    }

    return [
      record.incharge_id,
      record.checker_id,
      record.approver_id,
    ].includes(actor.userId);
  }

  async canReadRecord(record: SupplierQualityWorkflowRecordLike, actor?: SupplierQualityActorContext) {
    if (this.isAdminActor(actor)) {
      return true;
    }

    if (!actor?.userId) {
      return false;
    }

    if (this.isAssignedRecord(record, actor) || this.isParticipantRecord(record, actor)) {
      return true;
    }

    const roleViewListForms = await this.resolveRoleViewListFormCodes(actor.userId);
    return this.hasRoleViewListAccessForRecord(record, roleViewListForms);
  }

  canMutateDraftRecord(record: SupplierQualityWorkflowRecordLike, actor?: SupplierQualityActorContext) {
    if (this.isAdminActor(actor)) {
      return true;
    }

    if (!actor?.userId) {
      return false;
    }

    const stage = normalizeSupplierQualityWorkflowStage(record.request_status, record);
    return ['DRAFT', 'REJECT_CHECKER', 'REJECT_APPROVER'].includes(stage)
      && getSupplierQualityStageOwnerId(record) === actor.userId;
  }

  async assertActionAccess(
    record: SupplierQualityWorkflowRecordLike,
    actor: SupplierQualityActorContext,
    action: 'submit' | 'check' | 'approve' | 'reject' | 'issue' | 'delete' | 'update',
    formId: string,
    failureMessage: string,
  ) {
    if (this.isAdminActor(actor)) {
      return;
    }

    if (!actor.userId) {
      throw new ForbiddenError('Authentication is required for Supplier Quality actions.');
    }

    if (action === 'delete' || action === 'update') {
      if (!this.canMutateDraftRecord(record, actor)) {
        throw new ForbiddenError(failureMessage);
      }
      return;
    }

    const ownerId = getSupplierQualityStageOwnerId(record);
    if (ownerId && ownerId === actor.userId) {
      return;
    }

    if (!ownerId) {
      const allowedByRole = await permissionService.checkRolePermission(actor.userId, formId, action);
      if (allowedByRole) {
        return;
      }
    }

    throw new ForbiddenError(failureMessage);
  }
}

export const supplierQualityAccessService = new SupplierQualityAccessService();
