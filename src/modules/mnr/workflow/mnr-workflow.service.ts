import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../shared/errors/AppError.js';
import { mnrRepository, type MnrRepository } from '../mnr.repository.js';
import { mnrService } from '../mnr.service.js';
import {
  buildMnrWorkflowMetadata,
  getMnrDbStatus,
  normalizeMnrWorkflowStage,
} from './mnr-workflow.utils.js';
import { MNR_WORKFLOW_STAGE } from './mnr-workflow.constants.js';
import { isAdminUser } from '../../../shared/utils/admin.utils.js';
import { hasRolePermission } from '../../../shared/utils/role-permission.utils.js';
import {
  logAdminBypass,
  logAssignmentGrant,
  logRolePermissionGrant,
  logPermissionDenied,
} from '../../../shared/utils/permission-audit.utils.js';
import { controlNumberService } from '../../../shared/services/control-number.service.js';

export class MnrWorkflowService {
  private isSupplierResponseActor(
    record: { attention_id?: string | null; supplier_id?: string | null },
    userId: string,
    supplierId?: string | null,
  ) {
    return (
      Boolean(record.attention_id && record.attention_id === userId) ||
      Boolean(record.supplier_id && supplierId && record.supplier_id === supplierId)
    );
  }

  /**
   * Three-layer permission check for workflow actions
   * Layer 1: Admin Bypass - Admins can perform any action
   * Layer 2: Assignment Lock - If someone is assigned, only they can act
   * Layer 3: Role Fallback - If unassigned, check role permissions
   */
  private async ensureActor(
    record: Record<string, any>,
    userId: string,
    roleId: string | undefined,
    action: string,
    assignedUserId: string | null | undefined,
    message: string
  ): Promise<void> {
    // LAYER 1: ADMIN BYPASS
    const isAdmin = await isAdminUser(roleId);
    if (isAdmin) {
      await logAdminBypass(
        userId,
        roleId,
        action,
        'MNR',
        record.mnr_id,
        `Admin bypassed ${action} permission check`
      );
      return;
    }

    // LAYER 2: ASSIGNMENT LOCK
    if (assignedUserId) {
      // Someone is assigned - only they can act
      if (assignedUserId === userId) {
        await logAssignmentGrant(
          userId,
          roleId,
          action,
          'MNR',
          record.mnr_id,
          `User is assigned for ${action}`
        );
        return;
      } else {
        // Assignment lock - deny access
        await logPermissionDenied(
          userId,
          roleId,
          action,
          'MNR',
          record.mnr_id,
          `Record assigned to different user: ${assignedUserId}`
        );
        throw new ForbiddenError(message);
      }
    }

    // LAYER 3: ROLE FALLBACK
    // No one assigned - check role permissions
    let permissionType: 'approve' | 'check' | 'edit' | undefined;
    if (action.includes('approve')) permissionType = 'approve';
    else if (action.includes('check')) permissionType = 'check';
    else permissionType = 'edit';

    if (permissionType) {
      const hasPermission = await hasRolePermission(roleId, permissionType, 'MNR-MAIN');
      if (hasPermission) {
        await logRolePermissionGrant(
          userId,
          roleId,
          action,
          'MNR',
          record.mnr_id,
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
      'MNR',
      record.mnr_id,
      `No assignment and no role permission for ${action}`
    );
    throw new ForbiddenError(`You don't have permission to ${action} this record`);
  }

  /**
   * Special permission check for supplier response actions
   * Suppliers have different permission logic
   */
  private async ensureSupplierActor(
    record: { attention_id?: string | null; supplier_id?: string | null; mnr_id: string },
    userId: string,
    roleId: string | undefined,
    supplierId: string | null | undefined,
    action: string,
    message: string
  ): Promise<void> {
    // LAYER 1: ADMIN BYPASS
    const isAdmin = await isAdminUser(roleId);
    if (isAdmin) {
      await logAdminBypass(
        userId,
        roleId,
        action,
        'MNR',
        record.mnr_id,
        `Admin bypassed ${action} permission check`
      );
      return;
    }

    // LAYER 2: SUPPLIER CHECK
    if (this.isSupplierResponseActor(record, userId, supplierId)) {
      await logAssignmentGrant(
        userId,
        roleId,
        action,
        'MNR',
        record.mnr_id,
        `Supplier user authorized for ${action}`
      );
      return;
    }

    // Deny access
    await logPermissionDenied(
      userId,
      roleId,
      action,
      'MNR',
      record.mnr_id,
      'User is not the assigned supplier contact'
    );
    throw new ForbiddenError(message);
  }

  constructor(private repository: MnrRepository = mnrRepository) {}

  private async getExistingRecord(id: string) {
    const existing = await this.repository.findByIdDetailed(id);
    if (!existing) throw new NotFoundError('MNR Record not found');
    return existing;
  }

  private async updateLotsWorkflow(
    recordId: string,
    values: Record<string, unknown>,
  ) {
    await this.repository.executeTransaction(async (trx) => {
      await trx
        .updateTable('MNR_LOTS')
        .set(values as never)
        .where('mnr_id', '=', recordId)
        .execute();
    });
  }

  private getActorNames(
    record: Record<string, any>,
    latestResponse?: Record<string, any> | null,
    userId?: string,
  ) {
    return buildMnrWorkflowMetadata(record, {
      latestResponse,
      actor: { userId },
    });
  }

  private resolveLatestResponse(existing: { response?: Record<string, any> | null }) {
    return existing.response || null;
  }

  private ensureCycle2Checker(latestResponse: Record<string, any> | null) {
    if (!latestResponse?.checker_id) {
      throw new BadRequestError('Cycle 2 checker is not assigned on the latest MNR response.');
    }

    return {
      id: latestResponse.checker_id,
      name: latestResponse.checker_name || null,
    };
  }

  private ensureCycle2Approver(latestResponse: Record<string, any> | null) {
    if (!latestResponse?.approver_id) {
      throw new BadRequestError('Cycle 2 approver is not assigned on the latest MNR response.');
    }

    return {
      id: latestResponse.approver_id,
      name: latestResponse.approver_name || null,
    };
  }

  async submitMain(id: string, userId: string, roleId?: string, remarks?: string) {
    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const stage = normalizeMnrWorkflowStage(record.request_status);

    if (
      stage !== MNR_WORKFLOW_STAGE.DRAFT &&
      stage !== MNR_WORKFLOW_STAGE.REJECT_CHECKER &&
      stage !== MNR_WORKFLOW_STAGE.REJECT_APPROVER
    ) {
      throw new BadRequestError(`Cannot submit MNR from ${stage}`);
    }

    // Check if user is issuer or encoder
    const assignedUserId = record.issuer_id || record.encoder_id;
    await this.ensureActor(record, userId, roleId, 'submit', assignedUserId, 'Only the issuer or originator can submit this MNR.');

    const now = new Date();
    let controlNo = String(record.control_no || '');
    await this.repository.executeTransaction(async (trx) => {
      controlNo = await controlNumberService.finalizeMnr(
        {
          siteId: record.site_id,
          siteCode: record.site_code,
          defectCategoryId: record.defectcategory_id,
          defectCategoryAcronym: record.defectcategory_acronym,
          date: now,
        },
        trx,
      );

      await trx
        .updateTable('MNR_LOTS')
        .set({
          control_no: controlNo,
          request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.CHECKER),
          issuer_date: now,
          issuer_remarks: remarks || null,
          last_update: now,
          updateby: userId,
        } as never)
        .where('mnr_id', '=', record.mnr_id)
        .execute();
    });

    return {
      success: true,
      data: {
        id: record.mnr_id,
        status: getMnrDbStatus(MNR_WORKFLOW_STAGE.CHECKER),
        controlNo: controlNo,
        controlNoState: controlNumberService.getControlNoState(controlNo),
        ...this.getActorNames({
          ...record,
          control_no: controlNo,
          request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.CHECKER),
        }, undefined, userId),
      },
      message: 'MNR submitted for checker approval',
    };
  }

  async checkMain(id: string, userId: string, roleId?: string, remarks?: string) {
    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const stage = normalizeMnrWorkflowStage(record.request_status);
    if (stage !== MNR_WORKFLOW_STAGE.CHECKER) {
      throw new BadRequestError(`Cannot check MNR from ${stage}`);
    }
    
    await this.ensureActor(record, userId, roleId, 'check', record.checker_id, 'Only the assigned checker can check this MNR.');

    const now = new Date();
    await this.updateLotsWorkflow(record.mnr_id, {
      request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.APPROVER),
      checker_date: now,
      checker_remarks: remarks || null,
      last_update: now,
      updateby: userId,
    });

    return {
      success: true,
      data: {
        id: record.mnr_id,
        status: getMnrDbStatus(MNR_WORKFLOW_STAGE.APPROVER),
        ...this.getActorNames({
          ...record,
          request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.APPROVER),
        }, undefined, userId),
      },
      message: 'MNR checked successfully',
    };
  }

  async approveMain(id: string, userId: string, roleId?: string, remarks?: string) {
    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const stage = normalizeMnrWorkflowStage(record.request_status);
    if (stage !== MNR_WORKFLOW_STAGE.APPROVER) {
      throw new BadRequestError(`Cannot approve MNR from ${stage}`);
    }
    
    await this.ensureActor(record, userId, roleId, 'approve', record.approver_id, 'Only the assigned approver can approve this MNR.');

    const now = new Date();
    await this.updateLotsWorkflow(record.mnr_id, {
      request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.ISSUER),
      approver_date: now,
      approver_remarks: remarks || null,
      last_update: now,
      updateby: userId,
    });

    return {
      success: true,
      data: {
        id: record.mnr_id,
        status: getMnrDbStatus(MNR_WORKFLOW_STAGE.ISSUER),
        ...this.getActorNames({
          ...record,
          request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.ISSUER),
        }, undefined, userId),
      },
      message: 'MNR approved successfully',
    };
  }

  async rejectMain(id: string, userId: string, roleId?: string, remarks?: string) {
    if (!remarks) {
      throw new BadRequestError('Remarks are required for rejection.');
    }

    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const stage = normalizeMnrWorkflowStage(record.request_status);
    const now = new Date();

    if (stage === MNR_WORKFLOW_STAGE.CHECKER) {
      await this.ensureActor(record, userId, roleId, 'reject', record.checker_id, 'Only the assigned checker can reject this MNR.');

      await this.updateLotsWorkflow(record.mnr_id, {
        request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.REJECT_CHECKER),
        checker_date: now,
        checker_remarks: remarks,
        last_update: now,
        updateby: userId,
      });

      return {
        success: true,
        data: {
          id: record.mnr_id,
          status: getMnrDbStatus(MNR_WORKFLOW_STAGE.REJECT_CHECKER),
          ...this.getActorNames({
            ...record,
            request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.REJECT_CHECKER),
          }, undefined, userId),
        },
        message: 'MNR rejected by checker',
      };
    }

    if (stage === MNR_WORKFLOW_STAGE.APPROVER) {
      await this.ensureActor(record, userId, roleId, 'reject', record.approver_id, 'Only the assigned approver can reject this MNR.');

      await this.updateLotsWorkflow(record.mnr_id, {
        request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.REJECT_APPROVER),
        approver_date: now,
        approver_remarks: remarks,
        last_update: now,
        updateby: userId,
      });

      return {
        success: true,
        data: {
          id: record.mnr_id,
          status: getMnrDbStatus(MNR_WORKFLOW_STAGE.REJECT_APPROVER),
          ...this.getActorNames({
            ...record,
            request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.REJECT_APPROVER),
          }, undefined, userId),
        },
        message: 'MNR rejected by approver',
      };
    }

    throw new BadRequestError(`Cannot reject MNR from ${stage}`);
  }

  async issueMain(id: string, userId: string, roleId?: string, remarks?: string) {
    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const stage = normalizeMnrWorkflowStage(record.request_status);
    if (stage !== MNR_WORKFLOW_STAGE.ISSUER) {
      throw new BadRequestError(`Cannot issue MNR from ${stage}`);
    }
    
    await this.ensureActor(record, userId, roleId, 'issue', record.issuer_id, 'Only the assigned issuer can issue this MNR.');

    const now = new Date();
    await this.updateLotsWorkflow(record.mnr_id, {
      request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.SUPPLIER),
      issued_date: now,
      issuer_remarks: remarks || record.issuer_remarks || null,
      last_update: now,
      updateby: userId,
    });

    return {
      success: true,
      data: {
        id: record.mnr_id,
        status: getMnrDbStatus(MNR_WORKFLOW_STAGE.SUPPLIER),
        ...buildMnrWorkflowMetadata({
          ...record,
          request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.SUPPLIER),
        }),
      },
      message: 'MNR issued successfully',
    };
  }

  async cancelMain(id: string, userId: string, roleId?: string, remarks?: string) {
    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const stage = normalizeMnrWorkflowStage(record.request_status);

    if (
      stage !== MNR_WORKFLOW_STAGE.DRAFT &&
      stage !== MNR_WORKFLOW_STAGE.ISSUER
    ) {
      throw new BadRequestError(`Cannot cancel MNR from ${stage}`);
    }

    const assignedUserId = record.issuer_id || record.encoder_id;
    await this.ensureActor(record, userId, roleId, 'cancel', assignedUserId, 'Only the issuer or originator can cancel this MNR.');

    const now = new Date();
    await this.updateLotsWorkflow(record.mnr_id, {
      request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.CANCEL),
      remarks: remarks || record.remarks || null,
      last_update: now,
      updateby: userId,
    });

    return {
      success: true,
      data: {
        id: record.mnr_id,
        status: getMnrDbStatus(MNR_WORKFLOW_STAGE.CANCEL),
        ...buildMnrWorkflowMetadata({
          ...record,
          request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.CANCEL),
        }),
      },
      message: 'MNR cancelled successfully',
    };
  }

  async saveInitialResponse(
    id: string,
    userId: string,
    roleId: string | undefined,
    responsePayload: Record<string, any>,
    supplierId?: string | null,
  ) {
    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const stage = normalizeMnrWorkflowStage(record.request_status);
    if (
      stage !== MNR_WORKFLOW_STAGE.SUPPLIER &&
      stage !== MNR_WORKFLOW_STAGE.REJECT_ISSUER_2ND &&
      stage !== MNR_WORKFLOW_STAGE.NOT_ACCEPT
    ) {
      throw new BadRequestError(`Cannot save initial response from ${stage}`);
    }
    
    await this.ensureSupplierActor(record, userId, roleId, supplierId, 'save_initial_response', 'Only the assigned supplier can save the initial response.');

    const result = await mnrService.saveResponseContent(record.mnr_id, responsePayload, userId);
    return {
      ...result,
      data: {
        ...result.data,
        ...this.getActorNames(record),
        status: getMnrDbStatus(MNR_WORKFLOW_STAGE.SUPPLIER),
      },
    };
  }

  async submitInitialResponse(
    id: string,
    userId: string,
    responsePayload: Record<string, any>,
    supplierId?: string | null,
  ) {
    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const stage = normalizeMnrWorkflowStage(record.request_status);
    if (
      stage !== MNR_WORKFLOW_STAGE.SUPPLIER &&
      stage !== MNR_WORKFLOW_STAGE.REJECT_ISSUER_2ND &&
      stage !== MNR_WORKFLOW_STAGE.NOT_ACCEPT
    ) {
      throw new BadRequestError(`Cannot submit initial response from ${stage}`);
    }
    if (!this.isSupplierResponseActor(record, userId, supplierId)) {
      throw new ForbiddenError('Only the assigned supplier can submit the initial response.');
    }

    await mnrService.saveResponseContent(record.mnr_id, responsePayload, userId);
    const now = new Date();
    await this.updateLotsWorkflow(record.mnr_id, {
      request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.INITIAL_RESPONSE),
      actual_initial_report_date: now,
      last_update: now,
      updateby: userId,
    });

    return {
      success: true,
      data: {
        id: record.mnr_id,
        status: getMnrDbStatus(MNR_WORKFLOW_STAGE.INITIAL_RESPONSE),
        ...this.getActorNames({
          ...record,
          request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.INITIAL_RESPONSE),
        }),
      },
      message: 'Initial response submitted successfully',
    };
  }

  async saveFinalResponse(
    id: string,
    userId: string,
    responsePayload: Record<string, any>,
    supplierId?: string | null,
  ) {
    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const stage = normalizeMnrWorkflowStage(record.request_status);
    if (stage !== MNR_WORKFLOW_STAGE.INITIAL_RESPONSE) {
      throw new BadRequestError(`Cannot save final response from ${stage}`);
    }
    if (!this.isSupplierResponseActor(record, userId, supplierId)) {
      throw new ForbiddenError('Only the assigned supplier can save the final response.');
    }

    const result = await mnrService.saveResponseContent(record.mnr_id, responsePayload, userId);
    return {
      ...result,
      data: {
        ...result.data,
        ...this.getActorNames(record),
        status: getMnrDbStatus(MNR_WORKFLOW_STAGE.INITIAL_RESPONSE),
      },
    };
  }

  async submitFinalResponse(
    id: string,
    userId: string,
    responsePayload: Record<string, any>,
    supplierId?: string | null,
  ) {
    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const stage = normalizeMnrWorkflowStage(record.request_status);
    if (stage !== MNR_WORKFLOW_STAGE.INITIAL_RESPONSE) {
      throw new BadRequestError(`Cannot submit final response from ${stage}`);
    }
    if (!this.isSupplierResponseActor(record, userId, supplierId)) {
      throw new ForbiddenError('Only the assigned supplier can submit the final response.');
    }

    await mnrService.saveResponseContent(record.mnr_id, responsePayload, userId);
    const now = new Date();
    await this.updateLotsWorkflow(record.mnr_id, {
      request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.FINAL_RESPONSE),
      actual_final_report_date: now,
      last_update: now,
      updateby: userId,
    });

    return {
      success: true,
      data: {
        id: record.mnr_id,
        status: getMnrDbStatus(MNR_WORKFLOW_STAGE.FINAL_RESPONSE),
        ...this.getActorNames({
          ...record,
          request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.FINAL_RESPONSE),
        }),
      },
      message: 'Final response submitted successfully',
    };
  }

  async saveResponseReview(
    id: string,
    userId: string,
    responsePayload: Record<string, any>,
  ) {
    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const stage = normalizeMnrWorkflowStage(record.request_status);
    if (
      stage !== MNR_WORKFLOW_STAGE.FINAL_RESPONSE &&
      stage !== MNR_WORKFLOW_STAGE.ISSUER_2ND &&
      stage !== MNR_WORKFLOW_STAGE.REJECT_CHECKER_2ND &&
      stage !== MNR_WORKFLOW_STAGE.REJECT_APPROVER_2ND
    ) {
      throw new BadRequestError(`Cannot save response review from ${stage}`);
    }
    if (record.issuer_id !== userId) {
      throw new ForbiddenError('Only the assigned issuer can save response review content.');
    }

    await mnrService.saveResponseContent(record.mnr_id, responsePayload, userId);
    const nextStage = MNR_WORKFLOW_STAGE.ISSUER_2ND;
    const now = new Date();
    await this.updateLotsWorkflow(record.mnr_id, {
      request_status: getMnrDbStatus(nextStage),
      last_update: now,
      updateby: userId,
    });

    const latestResponse = {
      checker_id: responsePayload.cycle2CheckerId || responsePayload.checker || null,
      approver_id: responsePayload.cycle2ApproverId || responsePayload.approver || null,
    };

    return {
      success: true,
      data: {
        id: record.mnr_id,
        status: getMnrDbStatus(nextStage),
        ...this.getActorNames({
          ...record,
          request_status: getMnrDbStatus(nextStage),
        }, latestResponse),
      },
      message: 'Response review saved successfully',
    };
  }

  async submitResponseReview(
    id: string,
    userId: string,
    responsePayload: Record<string, any>,
  ) {
    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const stage = normalizeMnrWorkflowStage(record.request_status);
    if (
      stage !== MNR_WORKFLOW_STAGE.FINAL_RESPONSE &&
      stage !== MNR_WORKFLOW_STAGE.ISSUER_2ND &&
      stage !== MNR_WORKFLOW_STAGE.REJECT_CHECKER_2ND &&
      stage !== MNR_WORKFLOW_STAGE.REJECT_APPROVER_2ND
    ) {
      throw new BadRequestError(`Cannot submit response review from ${stage}`);
    }
    if (record.issuer_id !== userId) {
      throw new ForbiddenError('Only the assigned issuer can submit response review.');
    }

    await mnrService.saveResponseContent(record.mnr_id, responsePayload, userId);
    const now = new Date();
    await this.updateLotsWorkflow(record.mnr_id, {
      request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.CHECKER_2ND),
      last_update: now,
      updateby: userId,
    });

    const latestResponse = {
      checker_id: responsePayload.cycle2CheckerId || responsePayload.checker || null,
      checker_name: responsePayload.cycle2CheckerName || null,
      approver_id: responsePayload.cycle2ApproverId || responsePayload.approver || null,
      approver_name: responsePayload.cycle2ApproverName || null,
    };

    return {
      success: true,
      data: {
        id: record.mnr_id,
        status: getMnrDbStatus(MNR_WORKFLOW_STAGE.CHECKER_2ND),
        ...this.getActorNames({
          ...record,
          request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.CHECKER_2ND),
        }, latestResponse),
      },
      message: 'Response review submitted for cycle 2 checking',
    };
  }

  async checkResponse(id: string, userId: string, remarks?: string) {
    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const latestResponse = this.resolveLatestResponse(existing);
    const stage = normalizeMnrWorkflowStage(record.request_status);

    if (stage !== MNR_WORKFLOW_STAGE.CHECKER_2ND) {
      throw new BadRequestError(`Cannot check MNR response from ${stage}`);
    }

    const cycle2Checker = this.ensureCycle2Checker(latestResponse);
    if (cycle2Checker.id !== userId) {
      throw new ForbiddenError('Only the assigned cycle 2 checker can check this MNR response.');
    }

    const now = new Date();
    await this.updateLotsWorkflow(record.mnr_id, {
      request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.APPROVER_2ND),
      last_update: now,
      updateby: userId,
    });

    await this.repository.executeTransaction(async (trx) => {
      await trx
        .updateTable('MNR_RESPONSE')
        .set({
          checker_date: now,
          checker_remarks: remarks || latestResponse?.checker_remarks || null,
          last_update: now,
          updateby: userId,
        } as never)
        .where('mnr_id', '=', record.mnr_id)
        .execute();
    });

    return {
      success: true,
      data: {
        id: record.mnr_id,
        status: getMnrDbStatus(MNR_WORKFLOW_STAGE.APPROVER_2ND),
        ...this.getActorNames(
          {
            ...record,
            request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.APPROVER_2ND),
          },
          latestResponse,
        ),
      },
      message: 'MNR response checked successfully',
    };
  }

  async approveResponse(id: string, userId: string, remarks?: string) {
    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const latestResponse = this.resolveLatestResponse(existing);
    const stage = normalizeMnrWorkflowStage(record.request_status);

    if (stage !== MNR_WORKFLOW_STAGE.APPROVER_2ND) {
      throw new BadRequestError(`Cannot approve MNR response from ${stage}`);
    }

    const cycle2Approver = this.ensureCycle2Approver(latestResponse);
    if (cycle2Approver.id !== userId) {
      throw new ForbiddenError('Only the assigned cycle 2 approver can approve this MNR response.');
    }

    const now = new Date();
    await this.updateLotsWorkflow(record.mnr_id, {
      request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.ISSUER_3RD),
      last_update: now,
      updateby: userId,
    });

    await this.repository.executeTransaction(async (trx) => {
      await trx
        .updateTable('MNR_RESPONSE')
        .set({
          approver_date: now,
          approver_remarks: remarks || latestResponse?.approver_remarks || null,
          last_update: now,
          updateby: userId,
        } as never)
        .where('mnr_id', '=', record.mnr_id)
        .execute();
    });

    return {
      success: true,
      data: {
        id: record.mnr_id,
        status: getMnrDbStatus(MNR_WORKFLOW_STAGE.ISSUER_3RD),
        ...this.getActorNames(
          {
            ...record,
            request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.ISSUER_3RD),
          },
          latestResponse,
        ),
      },
      message: 'MNR response approved successfully',
    };
  }

  async rejectResponse(id: string, userId: string, remarks: string) {
    if (!remarks) {
      throw new BadRequestError('Remarks are required for rejection.');
    }

    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const latestResponse = this.resolveLatestResponse(existing);
    const stage = normalizeMnrWorkflowStage(record.request_status);
    const now = new Date();

    if (stage === MNR_WORKFLOW_STAGE.ISSUER_2ND) {
      if (record.issuer_id !== userId) {
        throw new ForbiddenError('Only the assigned issuer can reject this MNR response review.');
      }

      await this.updateLotsWorkflow(record.mnr_id, {
        request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.REJECT_ISSUER_2ND),
        last_update: now,
        updateby: userId,
      });

      await this.repository.executeTransaction(async (trx) => {
        await trx
          .updateTable('MNR_RESPONSE')
          .set({
            issuer_date: now,
            issuer_remarks: remarks,
            last_update: now,
            updateby: userId,
          } as never)
          .where('mnr_id', '=', record.mnr_id)
          .execute();
      });

      return {
        success: true,
        data: {
          id: record.mnr_id,
          status: getMnrDbStatus(MNR_WORKFLOW_STAGE.REJECT_ISSUER_2ND),
          ...this.getActorNames(
            {
              ...record,
              request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.REJECT_ISSUER_2ND),
            },
            latestResponse,
          ),
        },
        message: 'MNR response returned to supplier by issuer review',
      };
    }

    if (stage === MNR_WORKFLOW_STAGE.CHECKER_2ND) {
      const cycle2Checker = this.ensureCycle2Checker(latestResponse);
      if (cycle2Checker.id !== userId) {
        throw new ForbiddenError('Only the assigned cycle 2 checker can reject this MNR response.');
      }

      await this.updateLotsWorkflow(record.mnr_id, {
        request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.REJECT_CHECKER_2ND),
        last_update: now,
        updateby: userId,
      });

      await this.repository.executeTransaction(async (trx) => {
        await trx
          .updateTable('MNR_RESPONSE')
          .set({
            checker_date: now,
            checker_remarks: remarks,
            last_update: now,
            updateby: userId,
          } as never)
          .where('mnr_id', '=', record.mnr_id)
          .execute();
      });

      return {
        success: true,
        data: {
          id: record.mnr_id,
          status: getMnrDbStatus(MNR_WORKFLOW_STAGE.REJECT_CHECKER_2ND),
          ...this.getActorNames(
            {
              ...record,
              request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.REJECT_CHECKER_2ND),
            },
            latestResponse,
          ),
        },
        message: 'MNR response rejected by cycle 2 checker',
      };
    }

    if (stage === MNR_WORKFLOW_STAGE.APPROVER_2ND) {
      const cycle2Approver = this.ensureCycle2Approver(latestResponse);
      if (cycle2Approver.id !== userId) {
        throw new ForbiddenError('Only the assigned cycle 2 approver can reject this MNR response.');
      }

      await this.updateLotsWorkflow(record.mnr_id, {
        request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.REJECT_APPROVER_2ND),
        last_update: now,
        updateby: userId,
      });

      await this.repository.executeTransaction(async (trx) => {
        await trx
          .updateTable('MNR_RESPONSE')
          .set({
            approver_date: now,
            approver_remarks: remarks,
            last_update: now,
            updateby: userId,
          } as never)
          .where('mnr_id', '=', record.mnr_id)
          .execute();
      });

      return {
        success: true,
        data: {
          id: record.mnr_id,
          status: getMnrDbStatus(MNR_WORKFLOW_STAGE.REJECT_APPROVER_2ND),
          ...this.getActorNames(
            {
              ...record,
              request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.REJECT_APPROVER_2ND),
            },
            latestResponse,
          ),
        },
        message: 'MNR response rejected by cycle 2 approver',
      };
    }

    throw new BadRequestError(`Cannot reject MNR response from ${stage}`);
  }

  async acceptResponse(id: string, userId: string, remarks?: string) {
    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const latestResponse = this.resolveLatestResponse(existing);
    const stage = normalizeMnrWorkflowStage(record.request_status);

    if (stage !== MNR_WORKFLOW_STAGE.ISSUER_3RD) {
      throw new BadRequestError(`Cannot accept MNR response from ${stage}`);
    }
    if (record.issuer_id !== userId) {
      throw new ForbiddenError('Only the assigned issuer can accept this MNR response.');
    }

    const now = new Date();
    await this.updateLotsWorkflow(record.mnr_id, {
      request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.ACCEPT),
      last_update: now,
      updateby: userId,
    });

    await this.repository.executeTransaction(async (trx) => {
      await trx
        .updateTable('MNR_RESPONSE')
        .set({
          accept_date: now,
          issuer_remarks: remarks || latestResponse?.issuer_remarks || null,
          issuer_date: now,
          last_update: now,
          updateby: userId,
        } as never)
        .where('mnr_id', '=', record.mnr_id)
        .execute();
    });

    return {
      success: true,
      data: {
        id: record.mnr_id,
        status: getMnrDbStatus(MNR_WORKFLOW_STAGE.ACCEPT),
        ...this.getActorNames(
          {
            ...record,
            request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.ACCEPT),
          },
          latestResponse,
        ),
      },
      message: 'MNR response accepted successfully',
    };
  }

  async notAcceptResponse(id: string, userId: string, remarks: string) {
    if (!remarks) {
      throw new BadRequestError('Remarks are required when the final issuer does not accept the response.');
    }

    const existing = await this.getExistingRecord(id);
    const record = existing.record;
    const latestResponse = this.resolveLatestResponse(existing);
    const stage = normalizeMnrWorkflowStage(record.request_status);

    if (stage !== MNR_WORKFLOW_STAGE.ISSUER_3RD) {
      throw new BadRequestError(`Cannot mark MNR response as not accepted from ${stage}`);
    }
    if (record.issuer_id !== userId) {
      throw new ForbiddenError('Only the assigned issuer can mark this MNR response as not accepted.');
    }

    const now = new Date();
    await this.updateLotsWorkflow(record.mnr_id, {
      request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.NOT_ACCEPT),
      last_update: now,
      updateby: userId,
    });

    await this.repository.executeTransaction(async (trx) => {
      await trx
        .updateTable('MNR_RESPONSE')
        .set({
          issuer_remarks: remarks,
          issuer_date: now,
          last_update: now,
          updateby: userId,
        } as never)
        .where('mnr_id', '=', record.mnr_id)
        .execute();
    });

    return {
      success: true,
      data: {
        id: record.mnr_id,
        status: getMnrDbStatus(MNR_WORKFLOW_STAGE.NOT_ACCEPT),
        ...this.getActorNames(
          {
            ...record,
            request_status: getMnrDbStatus(MNR_WORKFLOW_STAGE.NOT_ACCEPT),
          },
          latestResponse,
        ),
      },
      message: 'MNR response marked as not accepted',
    };
  }
}

export const mnrWorkflowService = new MnrWorkflowService();
