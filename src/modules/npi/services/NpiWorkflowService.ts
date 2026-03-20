import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors/AppError.js';
import { NpiRepository } from '../npi.repository.js';
import type { ServiceResponse, WorkflowActionResponse } from '../types/npi.types.js';
import {
  buildNpiWorkflowMetadata,
  getNpiDbStatus,
  getNpiStageOwnerId,
  normalizeNpiWorkflowStage,
} from '../workflow/npi-workflow.utils.js';
import { NPI_WORKFLOW_STAGE } from '../workflow/npi-workflow.constants.js';
import { isAdminUser } from '../../../shared/utils/admin.utils.js';
import { hasRolePermission } from '../../../shared/utils/role-permission.utils.js';
import {
  logAdminBypass,
  logAssignmentGrant,
  logRolePermissionGrant,
  logPermissionDenied,
} from '../../../shared/utils/permission-audit.utils.js';

type DetailedRecord = Record<string, any>;

export class NpiWorkflowService {
  constructor(private repository: NpiRepository) {}

  /**
   * Three-layer permission check for workflow actions (mirrors SQPR ensureActor)
   * Layer 1: Admin Bypass — Admins can perform any action
   * Layer 2: Assignment Lock — If someone is assigned, only they can act
   * Layer 3: Role Fallback — If unassigned, check role permissions
   */
  private async ensureActor(
    record: DetailedRecord,
    userId: string,
    roleId: string | undefined,
    action: 'submit' | 'check' | 'approve' | 'reject',
    message: string,
  ): Promise<void> {
    console.log('[NPI ensureActor] Checking permission:', {
      action,
      userId,
      roleId,
      recordId: record.npi_lot_id,
      inspector_id: record.inspector_id,
      checker_id: record.checker_id,
      approver_id: record.approver_id,
      request_status: record.request_status,
    });

    // LAYER 1: ADMIN BYPASS
    const isAdmin = await isAdminUser(roleId);
    if (isAdmin) {
      console.log('[NPI ensureActor] Admin bypass granted');
      await logAdminBypass(
        userId,
        roleId,
        action,
        'NPI',
        record.npi_lot_id,
        `Admin bypassed ${action} permission check`,
      );
      return;
    }

    // LAYER 2: ASSIGNMENT LOCK
    const ownerId = getNpiStageOwnerId(record);
    console.log('[NPI ensureActor] Owner ID check:', {
      ownerId,
      userId,
      match: ownerId === userId,
    });
    
    if (ownerId) {
      // Special case: If owner is the system fallback user, allow any authenticated user to act
      // This handles legacy records where inspector_id was not properly set
      const SYSTEM_FALLBACK_ID = '6a15b66a-079b-433b-b70f-dc15dce25631';
      if (ownerId === SYSTEM_FALLBACK_ID) {
        console.log('[NPI ensureActor] Owner is system fallback - allowing current user');
        await logAssignmentGrant(
          userId,
          roleId,
          action,
          'NPI',
          record.npi_lot_id,
          `System fallback owner - allowing user ${userId} to ${action}`,
        );
        return;
      }
      
      // Normalize IDs for comparison (case-insensitive, trimmed)
      const normalizedOwnerId = String(ownerId || '').trim().toLowerCase();
      const normalizedUserId = String(userId || '').trim().toLowerCase();
      
      console.log('[NPI ensureActor] Normalized comparison:', {
        normalizedOwnerId,
        normalizedUserId,
        match: normalizedOwnerId === normalizedUserId,
      });
      
      if (normalizedOwnerId === normalizedUserId) {
        console.log('[NPI ensureActor] Assignment lock passed');
        await logAssignmentGrant(
          userId,
          roleId,
          action,
          'NPI',
          record.npi_lot_id,
          `User is assigned for ${action}`,
        );
        return;
      } else {
        console.log('[NPI ensureActor] Assignment lock FAILED - IDs do not match');
        await logPermissionDenied(
          userId,
          roleId,
          action,
          'NPI',
          record.npi_lot_id,
          `Record assigned to different user: ${ownerId} vs ${userId}`,
        );
        throw new ForbiddenError(message);
      }
    }

    // LAYER 3: ROLE FALLBACK
    let permissionType: 'approve' | 'check' | 'edit' | undefined;
    if (action === 'approve') permissionType = 'approve';
    else if (action === 'check') permissionType = 'check';
    else if (action === 'submit' || action === 'reject') permissionType = 'edit';

    if (permissionType) {
      const hasPermission = await hasRolePermission(roleId, permissionType, 'NPILOT-09-03');
      if (hasPermission) {
        await logRolePermissionGrant(
          userId,
          roleId,
          action,
          'NPI',
          record.npi_lot_id,
          `Role permission granted for ${action} on unassigned record`,
        );
        return;
      }
    }

    // No assignment and no role permission
    await logPermissionDenied(
      userId,
      roleId,
      action,
      'NPI',
      record.npi_lot_id,
      `No assignment and no role permission for ${action}`,
    );
    throw new ForbiddenError(`You don't have permission to ${action} this record`);
  }

  async submitForApproval(
    id: string,
    userId: string,
    roleId?: string,
    _remarks?: string,
  ): Promise<ServiceResponse<WorkflowActionResponse>> {
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('NPI Record not found');

    const record = existing.record;
    const stage = normalizeNpiWorkflowStage(record.request_status);
    if (
      stage !== NPI_WORKFLOW_STAGE.DRAFT &&
      stage !== NPI_WORKFLOW_STAGE.REJECT_CHECKER &&
      stage !== NPI_WORKFLOW_STAGE.REJECT_APPROVER
    ) {
      throw new BadRequestError(`Cannot submit record from ${stage}`);
    }

    await this.ensureActor(record, userId, roleId, 'submit', 'Only the originator can submit this NPI record.');

    if (!record.checker_id || !record.approver_id) {
      throw new BadRequestError('Checker and approver must be assigned before submitting.');
    }

    const now = new Date();
    await this.repository.executeTransaction(async (trx) => {
      await trx
        .updateTable('NPI_LOTS')
        .set({
          request_status: getNpiDbStatus(NPI_WORKFLOW_STAGE.CHECKER),
          submitted_date: now,
          last_update: now,
          updateby: userId,
        })
        .where('npi_lot_id', '=', record.npi_lot_id)
        .execute();
    });

    return {
      success: true,
      data: {
        id: record.npi_lot_id,
        status: getNpiDbStatus(NPI_WORKFLOW_STAGE.CHECKER),
      },
      message: 'Record submitted for checker approval',
    };
  }

  async checkRecord(
    id: string,
    userId: string,
    roleId?: string,
    remarks?: string,
  ): Promise<ServiceResponse<WorkflowActionResponse>> {
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('NPI Record not found');

    const record = existing.record;
    const stage = normalizeNpiWorkflowStage(record.request_status);
    if (stage !== NPI_WORKFLOW_STAGE.CHECKER) {
      throw new BadRequestError(`Cannot check record from ${stage}`);
    }

    await this.ensureActor(record, userId, roleId, 'check', 'Only the assigned checker can check this NPI record.');

    const now = new Date();
    await this.repository.executeTransaction(async (trx) => {
      await trx
        .updateTable('NPI_LOTS')
        .set({
          request_status: getNpiDbStatus(NPI_WORKFLOW_STAGE.APPROVER),
          checked_date: now,
          checker_remarks: remarks || null,
          last_update: now,
          updateby: userId,
        })
        .where('npi_lot_id', '=', record.npi_lot_id)
        .execute();
    });

    return {
      success: true,
      data: {
        id: record.npi_lot_id,
        status: getNpiDbStatus(NPI_WORKFLOW_STAGE.APPROVER),
      },
      message: 'Record checked successfully',
    };
  }

  async approveRecord(
    id: string,
    userId: string,
    roleId?: string,
    remarks?: string,
  ): Promise<ServiceResponse<WorkflowActionResponse>> {
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('NPI Record not found');

    const record = existing.record;
    const stage = normalizeNpiWorkflowStage(record.request_status);
    if (stage !== NPI_WORKFLOW_STAGE.APPROVER) {
      throw new BadRequestError(`Cannot approve record from ${stage}`);
    }

    await this.ensureActor(record, userId, roleId, 'approve', 'Only the assigned approver can approve this NPI record.');

    const now = new Date();
    await this.repository.executeTransaction(async (trx) => {
      await trx
        .updateTable('NPI_LOTS')
        .set({
          request_status: getNpiDbStatus(NPI_WORKFLOW_STAGE.ACCEPT),
          approved_date: now,
          approver_remarks: remarks || null,
          last_update: now,
          updateby: userId,
        })
        .where('npi_lot_id', '=', record.npi_lot_id)
        .execute();
    });

    return {
      success: true,
      data: {
        id: record.npi_lot_id,
        status: getNpiDbStatus(NPI_WORKFLOW_STAGE.ACCEPT),
      },
      message: 'Record approved successfully',
    };
  }

  async rejectRecord(
    id: string,
    userId: string,
    roleId?: string,
    remarks?: string,
  ): Promise<ServiceResponse<WorkflowActionResponse>> {
    if (!remarks) {
      throw new BadRequestError('Remarks are required for rejection');
    }

    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('NPI Record not found');

    const record = existing.record;
    const stage = normalizeNpiWorkflowStage(record.request_status);
    const now = new Date();

    if (stage === NPI_WORKFLOW_STAGE.CHECKER) {
      await this.ensureActor(record, userId, roleId, 'reject', 'Only the assigned checker can reject this NPI record.');

      await this.repository.executeTransaction(async (trx) => {
        await trx
          .updateTable('NPI_LOTS')
          .set({
            request_status: getNpiDbStatus(NPI_WORKFLOW_STAGE.REJECT_CHECKER),
            corrected_lot_verification: 0,
            checked_date: now,
            checker_remarks: remarks,
            last_update: now,
            updateby: userId,
          })
          .where('npi_lot_id', '=', record.npi_lot_id)
          .execute();
      });

      return {
        success: true,
        data: {
          id: record.npi_lot_id,
          status: getNpiDbStatus(NPI_WORKFLOW_STAGE.REJECT_CHECKER),
        },
        message: 'Record rejected by checker',
      };
    }

    if (stage === NPI_WORKFLOW_STAGE.APPROVER) {
      await this.ensureActor(record, userId, roleId, 'reject', 'Only the assigned approver can reject this NPI record.');

      await this.repository.executeTransaction(async (trx) => {
        await trx
          .updateTable('NPI_LOTS')
          .set({
            request_status: getNpiDbStatus(NPI_WORKFLOW_STAGE.REJECT_APPROVER),
            corrected_lot_verification: 0,
            approved_date: now,
            approver_remarks: remarks,
            last_update: now,
            updateby: userId,
          })
          .where('npi_lot_id', '=', record.npi_lot_id)
          .execute();
      });

      return {
        success: true,
        data: {
          id: record.npi_lot_id,
          status: getNpiDbStatus(NPI_WORKFLOW_STAGE.REJECT_APPROVER),
        },
        message: 'Record rejected by approver',
      };
    }

    throw new BadRequestError(`Cannot reject record from ${stage}`);
  }

  getAvailableActions(
    currentStatus: string,
    userId?: string,
    roleName?: string | null,
    record?: Record<string, unknown>,
  ) {
    const metadata = buildNpiWorkflowMetadata(
      {
        request_status: currentStatus,
        ...(record || {}),
      },
      { userId, roleName },
    );

    return metadata.availableActions;
  }
}
