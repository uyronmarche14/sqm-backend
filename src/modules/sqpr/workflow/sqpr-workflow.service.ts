import { getSubFormFormCodes } from '@sqm/permissions-contract';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors/AppError.js';
import { sqprRepository } from '../sqpr.repository.js';
import {
  buildSqprWorkflowMetadata,
  getSqprCompatibilityRequestStatus,
  getSqprCompatibilityStatus,
  getSqprStageOwnerId,
  normalizeSqprWorkflowStage,
} from './sqpr-workflow.utils.js';
import { SQPR_WORKFLOW_STAGE } from './sqpr-workflow.constants.js';
import { isAdminUser } from '../../../shared/utils/admin.utils.js';
import {
  logAdminBypass,
  logAssignmentGrant,
  logRolePermissionGrant,
  logPermissionDenied,
} from '../../../shared/utils/permission-audit.utils.js';
import { controlNumberService } from '../../../shared/services/control-number.service.js';
import { permissionService } from '../../../shared/services/permission.service.js';

type DetailedRecord = Record<string, any>;

export class SqprWorkflowService {
  constructor(private readonly repository = sqprRepository) {}

  private getRoleFallbackFormCodes(record: DetailedRecord) {
    const compatibilityStatus = getSqprCompatibilityStatus(record.request_status, record);
    return getSubFormFormCodes('SQPR', compatibilityStatus);
  }

  private async hasAnyRoleFallbackPermission(
    userId: string,
    formIds: string[],
    action: 'approve' | 'check' | 'edit',
  ) {
    for (const formId of formIds) {
      if (await permissionService.checkRolePermission(userId, formId, action)) {
        return true;
      }
    }

    return false;
  }

  private async getRecordOrThrow(id: string) {
    const data = await this.repository.findByIdDetailed(id);
    if (!data) {
      throw new NotFoundError('SQPR Record not found');
    }

    return data;
  }

  /**
   * Three-layer permission check for workflow actions
   * Layer 1: Admin Bypass - Admins can perform any action
   * Layer 2: Assignment Lock - If someone is assigned, only they can act
   * Layer 3: Role Fallback - If unassigned, check role permissions
   */
  private async ensureActor(
    record: DetailedRecord,
    userId: string,
    roleId: string | undefined,
    action: 'submit' | 'check' | 'approve' | 'reject' | 'issue',
    message: string
  ): Promise<void> {
    // LAYER 1: ADMIN BYPASS
    const isAdmin = await isAdminUser(roleId);
    if (isAdmin) {
      await logAdminBypass(
        userId,
        roleId,
        action,
        'SQPR',
        record.sqpr_id,
        `Admin bypassed ${action} permission check`
      );
      return;
    }

    // LAYER 2: ASSIGNMENT LOCK
    const ownerId = getSqprStageOwnerId(record);
    if (ownerId) {
      // Someone is assigned - only they can act
      if (ownerId === userId) {
        await logAssignmentGrant(
          userId,
          roleId,
          action,
          'SQPR',
          record.sqpr_id,
          `User is assigned for ${action}`
        );
        return;
      } else {
        // Assignment lock - deny access
        await logPermissionDenied(
          userId,
          roleId,
          action,
          'SQPR',
          record.sqpr_id,
          `Record assigned to different user: ${ownerId}`
        );
        throw new ForbiddenError(message);
      }
    }

    // LAYER 3: ROLE FALLBACK
    // No one assigned - check role permissions
    let permissionType: 'approve' | 'check' | 'edit' | undefined;
    if (action === 'approve') permissionType = 'approve';
    else if (action === 'check') permissionType = 'check';
    else if (action === 'submit' || action === 'reject' || action === 'issue') permissionType = 'edit';

    if (permissionType) {
      const hasPermission = await this.hasAnyRoleFallbackPermission(
        userId,
        this.getRoleFallbackFormCodes(record),
        permissionType,
      );
      if (hasPermission) {
        await logRolePermissionGrant(
          userId,
          roleId,
          action,
          'SQPR',
          record.sqpr_id,
          `Role permission granted for ${action} on unassigned record`
        );
        return;
      }
    }

    // No assignment and no role permission
    await logPermissionDenied(
      userId,
      roleId,
      action,
      'SQPR',
      record.sqpr_id,
      `No assignment and no role permission for ${action}`
    );
    throw new ForbiddenError(`You don't have permission to ${action} this record`);
  }

  private decorateRecord(record: DetailedRecord, actorUserId?: string | null) {
    const workflow = buildSqprWorkflowMetadata(record, {
      actor: { userId: actorUserId || null },
    });

    return {
      ...record,
      status: getSqprCompatibilityStatus(workflow.workflowStage, record),
      request_status: getSqprCompatibilityRequestStatus(workflow.workflowStage, record),
      created_at: record.date_created,
      ...workflow,
    };
  }

  private async buildResult(id: string, actorUserId: string | null | undefined, message: string) {
    const updated = await this.getRecordOrThrow(id);
    return {
      success: true,
      data: this.decorateRecord(updated.record, actorUserId),
      message,
    };
  }

  async submit(id: string, userId: string, roleId?: string, remarks?: string) {
    const { record } = await this.getRecordOrThrow(id);
    const stage = normalizeSqprWorkflowStage(record.request_status, record);

    if (
      stage !== SQPR_WORKFLOW_STAGE.DRAFT &&
      stage !== SQPR_WORKFLOW_STAGE.REJECT_CHECKER &&
      stage !== SQPR_WORKFLOW_STAGE.REJECT_APPROVER
    ) {
      throw new BadRequestError(`Cannot submit SQPR from ${stage}.`);
    }

    await this.ensureActor(record, userId, roleId, 'submit', 'Only the assigned incharge can submit this SQPR record.');

    const now = new Date();
    const nextControlNo = controlNumberService.finalizeSqpr(String(record.control_no || ''), 'SQPR');

    await this.repository.executeTransaction(async (trx: any) => {
      await trx.updateTable('SQPR')
        .set({
          control_no: nextControlNo,
          request_status: '3',
          submit_date: now,
          incharge_remarks: remarks ?? record.incharge_remarks ?? null,
          last_update: now,
          updateby: userId,
        })
        .where('sqpr_id', '=', record.sqpr_id)
        .execute();
    });

    return this.buildResult(id, userId, 'Record submitted successfully');
  }

  async check(id: string, userId: string, roleId?: string, remarks?: string) {
    const { record } = await this.getRecordOrThrow(id);
    const stage = normalizeSqprWorkflowStage(record.request_status, record);

    if (stage !== SQPR_WORKFLOW_STAGE.CHECKER) {
      throw new BadRequestError(`Cannot check SQPR from ${stage}.`);
    }

    await this.ensureActor(record, userId, roleId, 'check', 'Only the assigned checker can check this SQPR record.');

    const now = new Date();
    await this.repository.executeTransaction(async (trx: any) => {
      await trx.updateTable('SQPR')
        .set({
          request_status: '4',
          checker_date: now,
          checker_remarks: remarks ?? null,
          last_update: now,
          updateby: userId,
        })
        .where('sqpr_id', '=', record.sqpr_id)
        .execute();
    });

    return this.buildResult(id, userId, 'Record checked successfully');
  }

  async approve(id: string, userId: string, roleId?: string, remarks?: string) {
    const { record } = await this.getRecordOrThrow(id);
    const stage = normalizeSqprWorkflowStage(record.request_status, record);

    if (stage !== SQPR_WORKFLOW_STAGE.APPROVER) {
      throw new BadRequestError(`Cannot approve SQPR from ${stage}.`);
    }

    await this.ensureActor(record, userId, roleId, 'approve', 'Only the assigned approver can approve this SQPR record.');

    const now = new Date();
    await this.repository.executeTransaction(async (trx: any) => {
      await trx.updateTable('SQPR')
        .set({
          request_status: '10',
          approver_date: now,
          approver_remarks: remarks ?? null,
          last_update: now,
          updateby: userId,
        })
        .where('sqpr_id', '=', record.sqpr_id)
        .execute();
    });

    return this.buildResult(id, userId, 'Record approved successfully');
  }

  async reject(id: string, userId: string, roleId?: string, remarks?: string) {
    const { record } = await this.getRecordOrThrow(id);
    const stage = normalizeSqprWorkflowStage(record.request_status, record);

    if (
      stage !== SQPR_WORKFLOW_STAGE.CHECKER &&
      stage !== SQPR_WORKFLOW_STAGE.APPROVER
    ) {
      throw new BadRequestError(`Cannot reject SQPR from ${stage}.`);
    }

    const now = new Date();

    if (stage === SQPR_WORKFLOW_STAGE.CHECKER) {
      await this.ensureActor(record, userId, roleId, 'reject', 'Only the assigned checker can reject this SQPR record.');
      await this.repository.executeTransaction(async (trx: any) => {
        await trx.updateTable('SQPR')
          .set({
            request_status: '5',
            checker_date: now,
            checker_remarks: remarks ?? null,
            last_update: now,
            updateby: userId,
          })
          .where('sqpr_id', '=', record.sqpr_id)
          .execute();
      });

      return this.buildResult(id, userId, 'Record rejected successfully');
    }

    await this.ensureActor(record, userId, roleId, 'reject', 'Only the assigned approver can reject this SQPR record.');
    await this.repository.executeTransaction(async (trx: any) => {
      await trx.updateTable('SQPR')
        .set({
          request_status: '6',
          approver_date: now,
          approver_remarks: remarks ?? null,
          last_update: now,
          updateby: userId,
        })
        .where('sqpr_id', '=', record.sqpr_id)
        .execute();
    });

    return this.buildResult(id, userId, 'Record rejected successfully');
  }

  async issue(id: string, userId: string, roleId?: string) {
    const { record } = await this.getRecordOrThrow(id);
    const stage = normalizeSqprWorkflowStage(record.request_status, record);

    if (stage !== SQPR_WORKFLOW_STAGE.ISSUER) {
      throw new BadRequestError(`Cannot issue SQPR from ${stage}.`);
    }

    await this.ensureActor(record, userId, roleId, 'issue', 'Only the assigned incharge can issue this SQPR record.');

    const now = new Date();
    await this.repository.executeTransaction(async (trx: any) => {
      await trx.updateTable('SQPR')
        .set({
          request_status: '1',
          last_update: now,
          updateby: userId,
        })
        .where('sqpr_id', '=', record.sqpr_id)
        .execute();
    });

    return this.buildResult(id, userId, 'Record issued successfully');
  }
}

export const sqprWorkflowService = new SqprWorkflowService();
