import { permissionService } from '../../../shared/services/permission.service.js';
import { ForbiddenError } from '../../../shared/errors/AppError.js';
import {
  buildSpcTrendWorkflowMetadata,
  getSpcTrendStageOwnerId,
  normalizeSpcTrendWorkflowStage,
  type SpcTrendWorkflowRecordLike,
} from '../workflow/spc-trend-workflow.js';
import type { SpcTrendActorContext } from './spc-trend-shared.js';

const DRAFT_MUTABLE_STAGES = new Set(['DRAFT', 'REJECT_CHECKER', 'REJECT_APPROVER']);

export class SpcTrendAccessService {
  canReadRecord(record: SpcTrendWorkflowRecordLike, actor?: SpcTrendActorContext) {
    if (!actor?.userId) {
      return false;
    }

    const workflow = buildSpcTrendWorkflowMetadata(record, actor);
    if (workflow.availableActions.length > 0) {
      return true;
    }

    return [
      record.incharge_id,
      record.checker_id,
      record.approver_id,
    ].includes(actor.userId);
  }

  canMutateDraftRecord(record: SpcTrendWorkflowRecordLike, actor?: SpcTrendActorContext) {
    if (!actor?.userId) {
      return false;
    }

    const stage = normalizeSpcTrendWorkflowStage(record.request_status, record);
    return DRAFT_MUTABLE_STAGES.has(stage) && getSpcTrendStageOwnerId(record) === actor.userId;
  }

  async assertActionAccess(
    record: SpcTrendWorkflowRecordLike,
    actor: SpcTrendActorContext,
    action: 'submit' | 'check' | 'approve' | 'reject' | 'issue' | 'delete' | 'update',
    formId = 'SPC-05-04',
  ) {
    if (!actor.userId) {
      throw new ForbiddenError('Authentication is required for SPC Trend workflow actions.');
    }

    if (action === 'delete' || action === 'update') {
      if (!this.canMutateDraftRecord(record, actor)) {
        throw new ForbiddenError(`Only the assigned issuer can ${action} this SPC Trend record.`);
      }
      return;
    }

    const ownerId = getSpcTrendStageOwnerId(record);
    if (ownerId && ownerId === actor.userId) {
      return;
    }

    const allowedByRole = await permissionService.checkRolePermission(actor.userId, formId, action);
    if (!allowedByRole) {
      throw new ForbiddenError(`Only the assigned actor can ${action} this SPC Trend record.`);
    }
  }
}

export const spcTrendAccessService = new SpcTrendAccessService();
