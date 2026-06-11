import { getSubFormFormCodes } from '@sqm/permissions-contract';
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
import {
  logAdminBypass,
  logAssignmentGrant,
  logRolePermissionGrant,
  logPermissionDenied,
} from '../../../shared/utils/permission-audit.utils.js';
import { controlNumberService } from '../../../shared/services/control-number.service.js';
import { permissionService } from '../../../shared/services/permission.service.js';
import {
  npiNotificationService,
  type NpiNotificationSender,
} from '../../../shared/notifications/npi-notification.service.js';
import type { EmailAddress } from '../../../shared/notifications/email.types.js';
import type { NpiNotificationContext, NpiNotificationRecipient } from '../npi.repository.js';
import { npiLegacyParityService } from './NpiLegacyParityService.js';

type DetailedRecord = Record<string, any>;

export class NpiWorkflowService {
  constructor(
    private repository: NpiRepository,
    private readonly notifications: NpiNotificationSender = npiNotificationService,
  ) {}

  private getRoleFallbackFormCodes(record: DetailedRecord): string[] {
    const stage = normalizeNpiWorkflowStage(record.request_status);

    switch (stage) {
      case NPI_WORKFLOW_STAGE.DRAFT:
        return getSubFormFormCodes('NEWPARTS', 'DRAFT');
      case NPI_WORKFLOW_STAGE.CHECKER:
      case NPI_WORKFLOW_STAGE.APPROVER:
        return getSubFormFormCodes('NEWPARTS', 'AAPPROVAL');
      case NPI_WORKFLOW_STAGE.REJECT_CHECKER:
      case NPI_WORKFLOW_STAGE.REJECT_APPROVER:
        return getSubFormFormCodes('NEWPARTS', 'REJECTED');
      case NPI_WORKFLOW_STAGE.ACCEPT:
      case NPI_WORKFLOW_STAGE.LOT_TRACKING:
        return getSubFormFormCodes('NEWPARTS', 'LOTTRACKING');
      case NPI_WORKFLOW_STAGE.CANCELLED:
        return getSubFormFormCodes('NEWPARTS', 'CLOSED');
      default:
        return getSubFormFormCodes('NEWPARTS', 'DRAFT');
    }
  }

  private async hasAnyRoleFallbackPermission(
    userId: string,
    formIds: string[],
    action: 'approve' | 'check' | 'edit',
  ): Promise<boolean> {
    for (const formId of formIds) {
      if (await permissionService.checkRolePermission(userId, formId, action)) {
        return true;
      }
    }

    return false;
  }

  private assertSubmitControlNoInputs(record: DetailedRecord) {
    if (!record.site_id && !record.site_code) {
      throw new BadRequestError('Site is required before submitting this NPI record.');
    }
  }

  private buildWorkflowData(
    record: DetailedRecord,
    status: string,
    controlNo?: string,
  ): WorkflowActionResponse {
    const resolvedControlNo = String(controlNo ?? record.control_no ?? '');

    return {
      id: record.npi_lot_id,
      recordId: record.npi_lot_id,
      status,
      controlNo: resolvedControlNo || undefined,
      controlNoState: resolvedControlNo
        ? controlNumberService.getControlNoState(resolvedControlNo)
        : undefined,
    };
  }

  private toEmailAddress(recipient: NpiNotificationRecipient | null): EmailAddress[] {
    if (!recipient?.email) return [];

    return [
      {
        email: recipient.email,
        name: recipient.name || undefined,
      },
    ];
  }

  private toCcAddresses(context: NpiNotificationContext): EmailAddress[] {
    return context.cc
      .filter((recipient) => Boolean(recipient.email))
      .map((recipient) => ({
        email: String(recipient.email),
        name: recipient.name || undefined,
      }));
  }

  private async resolveActorName(
    userId: string,
    fallbackRecipient?: NpiNotificationRecipient | null,
  ): Promise<string> {
    if (fallbackRecipient?.userId === userId && fallbackRecipient.name) {
      return fallbackRecipient.name;
    }

    if (typeof (this.repository as any).findUserContactById === 'function') {
      const actor = await this.repository.findUserContactById(userId);
      if (actor?.name) {
        return actor.name;
      }
    }

    return userId;
  }

  private async sendWorkflowNotification(input: {
    recordId: string;
    actorUserId: string;
    eventKey: 'npi.submitted' | 'npi.checked' | 'npi.approved' | 'npi.rejected';
    subject: string;
    message: string;
    primaryRecipient: 'checker' | 'approver' | 'inspector';
    actorRecipient?: NpiNotificationRecipient | null;
  }): Promise<void> {
    if (typeof (this.repository as any).findNotificationContextById !== 'function') {
      return;
    }

    const context = await this.repository.findNotificationContextById(input.recordId);
    if (!context) {
      return;
    }

    const actorName = await this.resolveActorName(input.actorUserId, input.actorRecipient);
    const resolvedMessage = input.message.replace('{actorName}', actorName);
    const primaryRecipient =
      input.primaryRecipient === 'checker'
        ? context.checker
        : input.primaryRecipient === 'approver'
          ? context.approver
          : context.inspector;

    try {
      const result = await this.notifications.sendWorkflowNotification({
        eventKey: input.eventKey,
        recordId: context.recordId,
        controlNo: context.controlNo,
        supplierName: context.supplierName,
        subject: input.subject.replace('{supplierName}', context.supplierName),
        message: resolvedMessage,
        to: this.toEmailAddress(primaryRecipient),
        cc: this.toCcAddresses(context),
      });

      console.log(
        '[npi] workflow email notification processed',
        JSON.stringify({
          recordId: context.recordId,
          eventKey: input.eventKey,
          transport: result.transport,
          delivered: result.delivered,
          skipped: result.skipped ?? false,
          subject: result.subject,
          recipients: result.recipients,
          referenceId: result.referenceId ?? null,
        }),
      );
    } catch (error) {
      console.error(
        '[npi] workflow email notification failed',
        JSON.stringify({
          recordId: input.recordId,
          eventKey: input.eventKey,
          primaryRecipient: input.primaryRecipient,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

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

    this.assertSubmitControlNoInputs(record);
    const parityState = await npiLegacyParityService.evaluateDetailedRecord(existing);
    if (parityState.submitBlockers.length > 0) {
      throw new BadRequestError(parityState.submitBlockers[0]?.message || 'This record is not ready for submission.');
    }

    const now = new Date();
    let controlNo = String(record.control_no || '');
    await this.repository.executeTransaction(async (trx) => {
      controlNo = await controlNumberService.finalizeNpi(
        {
          siteId: record.site_id,
          siteCode: record.site_code,
          date: now,
        },
        trx,
      );

      await trx
        .updateTable('NPI_LOTS')
        .set({
          control_no: controlNo,
          request_status: getNpiDbStatus(NPI_WORKFLOW_STAGE.CHECKER),
          submitted_date: now,
          last_update: now,
          updateby: userId,
        })
        .where('npi_lot_id', '=', record.npi_lot_id)
        .execute();
    });

    await this.sendWorkflowNotification({
      recordId: record.npi_lot_id,
      actorUserId: userId,
      actorRecipient: typeof (this.repository as any).findNotificationContextById === 'function'
        ? await this.repository.findUserContactById(userId)
        : null,
      eventKey: 'npi.submitted',
      subject: '<NPI> Awaiting Approval - {supplierName}',
      message: 'The report has been submitted by {actorName}',
      primaryRecipient: 'checker',
    });

    return {
      success: true,
      data: this.buildWorkflowData(record, getNpiDbStatus(NPI_WORKFLOW_STAGE.CHECKER), controlNo),
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

    await this.sendWorkflowNotification({
      recordId: record.npi_lot_id,
      actorUserId: userId,
      actorRecipient: typeof (this.repository as any).findUserContactById === 'function'
        ? await this.repository.findUserContactById(userId)
        : null,
      eventKey: 'npi.checked',
      subject: '<NPI> Awaiting Approval - {supplierName}',
      message: 'The report has been reviewed and checked by {actorName}',
      primaryRecipient: 'approver',
    });

    return {
      success: true,
      data: this.buildWorkflowData(record, getNpiDbStatus(NPI_WORKFLOW_STAGE.APPROVER)),
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

    await this.sendWorkflowNotification({
      recordId: record.npi_lot_id,
      actorUserId: userId,
      actorRecipient: typeof (this.repository as any).findUserContactById === 'function'
        ? await this.repository.findUserContactById(userId)
        : null,
      eventKey: 'npi.approved',
      subject: '<NPI> Approved - {supplierName}',
      message: 'The report has been reviewed and approved by {actorName}',
      primaryRecipient: 'inspector',
    });

    return {
      success: true,
      data: this.buildWorkflowData(record, getNpiDbStatus(NPI_WORKFLOW_STAGE.ACCEPT)),
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

      await this.sendWorkflowNotification({
        recordId: record.npi_lot_id,
        actorUserId: userId,
        actorRecipient: typeof (this.repository as any).findUserContactById === 'function'
          ? await this.repository.findUserContactById(userId)
          : null,
        eventKey: 'npi.rejected',
        subject: '<NPI> Rejected - {supplierName}',
        message: 'The report has been reviewed and rejected by {actorName}',
        primaryRecipient: 'approver',
      });

      return {
        success: true,
        data: this.buildWorkflowData(record, getNpiDbStatus(NPI_WORKFLOW_STAGE.REJECT_CHECKER)),
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

      await this.sendWorkflowNotification({
        recordId: record.npi_lot_id,
        actorUserId: userId,
        actorRecipient: typeof (this.repository as any).findUserContactById === 'function'
          ? await this.repository.findUserContactById(userId)
          : null,
        eventKey: 'npi.rejected',
        subject: '<NPI> Rejected - {supplierName}',
        message: 'The report has been reviewed and rejected by {actorName}',
        primaryRecipient: 'inspector',
      });

      return {
        success: true,
        data: this.buildWorkflowData(record, getNpiDbStatus(NPI_WORKFLOW_STAGE.REJECT_APPROVER)),
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
