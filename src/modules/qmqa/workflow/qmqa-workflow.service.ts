import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../shared/errors/AppError.js';
import { qmqaRepository, type QmqaRepository } from '../qmqa.repository.js';
import { qmqaService } from '../qmqa.service.js';
import {
  QMQA_LEGACY_STAGE_CODE,
  QMQA_WORKFLOW_STAGE,
  type QmqaWorkflowStage,
} from './qmqa-workflow.constants.js';
import {
  buildQmqaWorkflowMetadata,
  getQmqaCompatibilityStatus,
  isQmqaSupplierActor,
  normalizeQmqaWorkflowStage,
} from './qmqa-workflow.utils.js';
import { isAdminUser } from '../../../shared/utils/admin.utils.js';
import { hasRolePermission } from '../../../shared/utils/role-permission.utils.js';
import {
  logAdminBypass,
  logAssignmentGrant,
  logRolePermissionGrant,
  logPermissionDenied,
} from '../../../shared/utils/permission-audit.utils.js';

interface WorkflowContext {
  record: Record<string, any>;
  latestResponse: Record<string, any> | null;
  supplierIds: string[];
}

interface TransitionResult {
  success: true;
  data: Record<string, any>;
  message: string;
}

export class QmqaWorkflowService {
  constructor(private repository: QmqaRepository = qmqaRepository) {}

  private async getWorkflowContext(id: string, userId?: string): Promise<WorkflowContext> {
    const record = await this.repository.findRecordByIdDetailed(id);
    if (!record) {
      throw new NotFoundError('QMQA Record not found');
    }

    const latestResponse = await this.repository.findResponseByQmqaId(record.qmqa_id) || null;
    const supplierIds = userId
      ? await this.repository.findSupplierIdsByUserId(userId)
      : [];

    return {
      record,
      latestResponse,
      supplierIds,
    };
  }

  private getStage(context: WorkflowContext): QmqaWorkflowStage {
    return normalizeQmqaWorkflowStage(
      context.record.request_status,
      context.latestResponse,
      context.record,
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
    action: 'submit' | 'check' | 'approve' | 'reject' | 'issue' | 'cancel',
    assignmentField: string | null,
    message: string
  ): Promise<void> {
    // LAYER 1: ADMIN BYPASS
    const isAdmin = await isAdminUser(roleId);
    if (isAdmin) {
      await logAdminBypass(
        userId,
        roleId,
        action,
        'QMQA',
        record.qmqa_id,
        `Admin bypassed ${action} permission check`
      );
      return;
    }

    // LAYER 2: ASSIGNMENT LOCK
    if (assignmentField) {
      const ownerId = record[assignmentField];
      if (ownerId) {
        // Someone is assigned - only they can act
        if (ownerId === userId) {
          await logAssignmentGrant(
            userId,
            roleId,
            action,
            'QMQA',
            record.qmqa_id,
            `User is assigned as ${assignmentField} for ${action}`
          );
          return;
        } else {
          // Assignment lock - deny access
          await logPermissionDenied(
            userId,
            roleId,
            action,
            'QMQA',
            record.qmqa_id,
            `Record assigned to different user: ${ownerId}`
          );
          throw new ForbiddenError(message);
        }
      }
    }

    // LAYER 3: ROLE FALLBACK
    // No one assigned - check role permissions
    let permissionType: 'approve' | 'check' | 'edit' | undefined;
    if (action === 'approve') permissionType = 'approve';
    else if (action === 'check') permissionType = 'check';
    else if (action === 'submit' || action === 'reject' || action === 'issue' || action === 'cancel') permissionType = 'edit';

    if (permissionType) {
      const hasPermission = await hasRolePermission(roleId, permissionType, 'QMQA-MAIN');
      if (hasPermission) {
        await logRolePermissionGrant(
          userId,
          roleId,
          action,
          'QMQA',
          record.qmqa_id,
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
      'QMQA',
      record.qmqa_id,
      `No assignment and no role permission for ${action}`
    );
    throw new ForbiddenError(`You don't have permission to ${action} this record`);
  }

  /**
   * Special permission check for supplier response actions
   */
  private async ensureSupplierActor(
    record: Record<string, any>,
    userId: string,
    roleId: string | undefined,
    supplierIds: string[],
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
        'QMQA',
        record.qmqa_id,
        `Admin bypassed supplier ${action} permission check`
      );
      return;
    }

    // LAYER 2: SUPPLIER CHECK
    if (isQmqaSupplierActor(record, { userId, supplierIds })) {
      await logAssignmentGrant(
        userId,
        roleId,
        action,
        'QMQA',
        record.qmqa_id,
        `User is assigned supplier for ${action}`
      );
      return;
    }

    // Permission denied
    await logPermissionDenied(
      userId,
      roleId,
      action,
      'QMQA',
      record.qmqa_id,
      `User is not the assigned supplier`
    );
    throw new ForbiddenError(message);
  }

  private ensureRemarks(remarks?: string | null) {
    if (!remarks?.trim()) {
      throw new BadRequestError('Remarks are required for this action.');
    }
  }

  private ensureLatestResponse(context: WorkflowContext) {
    if (!context.latestResponse?.qmqa_response_id) {
      throw new BadRequestError('QMQA response data is missing for this workflow step.');
    }

    return context.latestResponse;
  }

  private async updateMainStatus(
    trx: any,
    qmqaId: string,
    userId: string,
    updates: Record<string, unknown>,
  ) {
    await trx.updateTable('QMQA')
      .set({
        ...updates,
        last_update: new Date(),
        updateby: userId,
      })
      .where('qmqa_id', '=', qmqaId)
      .execute();
  }

  private async updateResponseStatus(
    trx: any,
    responseId: string,
    userId: string,
    updates: Record<string, unknown>,
  ) {
    await trx.updateTable('QMQA_RESPONSE')
      .set({
        ...updates,
        last_update: new Date(),
        updateby: userId,
      })
      .where('qmqa_response_id', '=', responseId)
      .execute();
  }

  private buildResult(
    record: Record<string, any>,
    latestResponse: Record<string, any> | null,
    userId: string,
    message: string,
  ): TransitionResult {
    const metadata = buildQmqaWorkflowMetadata(record, {
      latestResponse,
      actor: {
        userId,
      },
    });

    return {
      success: true,
      data: {
        id: record.qmqa_id,
        status: getQmqaCompatibilityStatus(
          metadata.workflowStage,
          latestResponse,
          record,
        ),
        request_status: QMQA_LEGACY_STAGE_CODE[metadata.workflowStage],
        ...metadata,
      },
      message,
    };
  }

  private async refetchResult(id: string, userId: string, message: string) {
    const record = await this.repository.findRecordByIdDetailed(id);
    if (!record) {
      throw new NotFoundError('QMQA Record not found after workflow update.');
    }

    const latestResponse = await this.repository.findResponseByQmqaId(id) || null;
    return this.buildResult(record, latestResponse, userId, message);
  }

  async submitMain(id: string, userId: string, roleId?: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    if (
      stage !== QMQA_WORKFLOW_STAGE.DRAFT &&
      stage !== QMQA_WORKFLOW_STAGE.REJECT_CHECKER &&
      stage !== QMQA_WORKFLOW_STAGE.REJECT_APPROVER
    ) {
      throw new BadRequestError(`Cannot submit QMQA from ${stage}.`);
    }

    // Check issuer_id or encoder_id
    const assignedUserId = context.record.issuer_id || context.record.encoder_id;
    await this.ensureActor(
      context.record,
      userId,
      roleId,
      'submit',
      assignedUserId ? (context.record.issuer_id ? 'issuer_id' : 'encoder_id') : null,
      'Only the issuer or originator can submit this QMQA.'
    );

    const now = new Date();

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.CHECKER],
        issuer_date: now,
        issuer_remarks: remarks || null,
        checker_date: null,
        checker_remarks: null,
        approver_date: null,
        approver_remarks: null,
      });
    });

    return this.refetchResult(id, userId, 'QMQA submitted to cycle 1 checker');
  }

  async checkMain(id: string, userId: string, roleId?: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    if (this.getStage(context) !== QMQA_WORKFLOW_STAGE.CHECKER) {
      throw new BadRequestError('Only cycle 1 checker-stage QMQA records can be checked.');
    }

    await this.ensureActor(
      context.record,
      userId,
      roleId,
      'check',
      'checker_id',
      'Only the assigned checker can check this QMQA.'
    );

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.APPROVER],
        checker_date: new Date(),
        checker_remarks: remarks || null,
      });
    });

    return this.refetchResult(id, userId, 'QMQA checked and routed to approver');
  }

  async approveMain(id: string, userId: string, roleId?: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    if (this.getStage(context) !== QMQA_WORKFLOW_STAGE.APPROVER) {
      throw new BadRequestError('Only cycle 1 approver-stage QMQA records can be approved.');
    }

    await this.ensureActor(
      context.record,
      userId,
      roleId,
      'approve',
      'approver_id',
      'Only the assigned approver can approve this QMQA.'
    );

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER],
        approver_date: new Date(),
        approver_remarks: remarks || null,
      });
    });

    return this.refetchResult(id, userId, 'QMQA approved and routed back to issuer');
  }

  async rejectMain(id: string, userId: string, roleId?: string, remarks?: string) {
    this.ensureRemarks(remarks);

    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);
    const now = new Date();

    await this.repository.executeTransaction(async (trx) => {
      if (stage === QMQA_WORKFLOW_STAGE.CHECKER) {
        await this.ensureActor(
          context.record,
          userId,
          roleId,
          'reject',
          'checker_id',
          'Only the assigned checker can reject this QMQA.'
        );

        await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
          request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_CHECKER],
          checker_date: now,
          checker_remarks: remarks,
        });
        return;
      }

      if (stage === QMQA_WORKFLOW_STAGE.APPROVER) {
        await this.ensureActor(
          context.record,
          userId,
          roleId,
          'reject',
          'approver_id',
          'Only the assigned approver can reject this QMQA.'
        );

        await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
          request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_APPROVER],
          approver_date: now,
          approver_remarks: remarks,
        });
        return;
      }

      throw new BadRequestError(`Cannot reject QMQA from ${stage}.`);
    });

    return this.refetchResult(id, userId, 'QMQA rejected');
  }

  async issueMain(id: string, userId: string, roleId?: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    if (this.getStage(context) !== QMQA_WORKFLOW_STAGE.ISSUER) {
      throw new BadRequestError('Only issuer-stage QMQA records can be issued.');
    }

    await this.ensureActor(
      context.record,
      userId,
      roleId,
      'issue',
      'issuer_id',
      'Only the assigned issuer can issue this QMQA.'
    );

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.SUPPLIER],
        issued_date: new Date(),
        issuer_remarks: remarks || context.record.issuer_remarks || null,
      });
    });

    return this.refetchResult(id, userId, 'QMQA issued to supplier');
  }

  async cancelMain(id: string, userId: string, roleId?: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    if (
      stage !== QMQA_WORKFLOW_STAGE.DRAFT &&
      stage !== QMQA_WORKFLOW_STAGE.ISSUER
    ) {
      throw new BadRequestError(`Cannot cancel QMQA from ${stage}.`);
    }

    // Check issuer_id or encoder_id
    const assignedUserId = context.record.issuer_id || context.record.encoder_id;
    await this.ensureActor(
      context.record,
      userId,
      roleId,
      'cancel',
      assignedUserId ? (context.record.issuer_id ? 'issuer_id' : 'encoder_id') : null,
      'Only the issuer or originator can cancel this QMQA.'
    );

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.CANCEL],
        remarks: remarks || context.record.remarks || null,
      });
    });

    return this.refetchResult(id, userId, 'QMQA cancelled');
  }

  async saveResponse(
    id: string,
    userId: string,
    roleId?: string,
    payload: Record<string, any> = {},
    files: any[] = [],
  ) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    const saveableSupplierStages: QmqaWorkflowStage[] = [
        QMQA_WORKFLOW_STAGE.SUPPLIER,
        QMQA_WORKFLOW_STAGE.REJECT_SUPPLIER,
        QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE,
        QMQA_WORKFLOW_STAGE.FINAL_RESPONSE,
        QMQA_WORKFLOW_STAGE.REJECT_ISSUER_2ND,
        QMQA_WORKFLOW_STAGE.NOT_ACCEPT,
      ];

    if (!saveableSupplierStages.includes(stage)) {
      throw new BadRequestError(`Cannot save supplier response from ${stage}.`);
    }

    await this.ensureSupplierActor(
      context.record,
      userId,
      roleId,
      context.supplierIds,
      'saveResponse',
      'Only the assigned supplier can update this QMQA response.'
    );

    const initialSectionStages: QmqaWorkflowStage[] = [
      QMQA_WORKFLOW_STAGE.SUPPLIER,
      QMQA_WORKFLOW_STAGE.REJECT_SUPPLIER,
    ];

    const section = initialSectionStages.includes(stage)
      ? 'initial'
      : 'final';

    await qmqaService.saveSupplierResponseContent(
      context.record.qmqa_id,
      userId,
      payload,
      files,
      section,
    );

    return this.refetchResult(id, userId, 'QMQA response saved');
  }

  async submitInitialResponse(
    id: string,
    userId: string,
    roleId?: string,
    payload: Record<string, any> = {},
    files: any[] = [],
  ) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    const initialSubmitStages: QmqaWorkflowStage[] = [
      QMQA_WORKFLOW_STAGE.SUPPLIER,
      QMQA_WORKFLOW_STAGE.REJECT_SUPPLIER,
    ];

    if (!initialSubmitStages.includes(stage)) {
      throw new BadRequestError(`Cannot submit initial response from ${stage}.`);
    }

    await this.ensureSupplierActor(
      context.record,
      userId,
      roleId,
      context.supplierIds,
      'submitInitialResponse',
      'Only the assigned supplier can submit the initial response.'
    );

    await qmqaService.saveSupplierResponseContent(
      context.record.qmqa_id,
      userId,
      payload,
      files,
      'initial',
    );

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE],
      });
    });

    return this.refetchResult(id, userId, 'Initial response submitted');
  }

  async submitFinalResponse(
    id: string,
    userId: string,
    roleId?: string,
    payload: Record<string, any> = {},
    files: any[] = [],
  ) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    const finalSubmitStages: QmqaWorkflowStage[] = [
        QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE,
        QMQA_WORKFLOW_STAGE.FINAL_RESPONSE,
        QMQA_WORKFLOW_STAGE.REJECT_ISSUER_2ND,
        QMQA_WORKFLOW_STAGE.NOT_ACCEPT,
      ];

    if (!finalSubmitStages.includes(stage)) {
      throw new BadRequestError(`Cannot submit final response from ${stage}.`);
    }

    await this.ensureSupplierActor(
      context.record,
      userId,
      roleId,
      context.supplierIds,
      'submitFinalResponse',
      'Only the assigned supplier can submit the final response.'
    );

    await qmqaService.saveSupplierResponseContent(
      context.record.qmqa_id,
      userId,
      payload,
      files,
      'final',
    );

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.FINAL_RESPONSE],
      });
    });

    return this.refetchResult(id, userId, 'Final response submitted');
  }

  async saveResponseReview(id: string, userId: string, roleId?: string, payload: Record<string, any> = {}) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    const issuerReviewStages: QmqaWorkflowStage[] = [
        QMQA_WORKFLOW_STAGE.FINAL_RESPONSE,
        QMQA_WORKFLOW_STAGE.ISSUER_2ND,
        QMQA_WORKFLOW_STAGE.REJECT_CHECKER_2ND,
        QMQA_WORKFLOW_STAGE.REJECT_APPROVER_2ND,
      ];

    if (!issuerReviewStages.includes(stage)) {
      throw new BadRequestError(`Cannot save issuer review from ${stage}.`);
    }

    await this.ensureActor(
      context.record,
      userId,
      roleId,
      'submit',
      'issuer_id',
      'Only the assigned issuer can save the response review.'
    );

    await qmqaService.saveResponseReviewContent(context.record.qmqa_id, userId, payload);

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ISSUER_2ND],
      });
    });

    return this.refetchResult(id, userId, 'Response review saved');
  }

  async submitResponseReview(id: string, userId: string, roleId?: string, payload: Record<string, any> = {}) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    const issuerReviewSubmitStages: QmqaWorkflowStage[] = [
        QMQA_WORKFLOW_STAGE.FINAL_RESPONSE,
        QMQA_WORKFLOW_STAGE.ISSUER_2ND,
        QMQA_WORKFLOW_STAGE.REJECT_CHECKER_2ND,
        QMQA_WORKFLOW_STAGE.REJECT_APPROVER_2ND,
      ];

    if (!issuerReviewSubmitStages.includes(stage)) {
      throw new BadRequestError(`Cannot submit issuer review from ${stage}.`);
    }

    await this.ensureActor(
      context.record,
      userId,
      roleId,
      'submit',
      'issuer_id',
      'Only the assigned issuer can submit the response review.'
    );

    await qmqaService.saveResponseReviewContent(context.record.qmqa_id, userId, payload);
    const latestResponse = await this.repository.findResponseByQmqaId(context.record.qmqa_id);

    if (!latestResponse?.checker_id || !latestResponse?.approver_id) {
      throw new BadRequestError('Cycle 2 checker and approver must be assigned before submission.');
    }

    await this.repository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.CHECKER_2ND],
      });
    });

    return this.refetchResult(id, userId, 'Response review submitted to cycle 2 checker');
  }

  async checkResponse(id: string, userId: string, roleId?: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    if (this.getStage(context) !== QMQA_WORKFLOW_STAGE.CHECKER_2ND) {
      throw new BadRequestError('Only cycle 2 checker-stage QMQA records can be checked.');
    }

    const latestResponse = this.ensureLatestResponse(context);

    await this.ensureActor(
      { ...context.record, checker_id: latestResponse.checker_id },
      userId,
      roleId,
      'check',
      'checker_id',
      'Only the assigned cycle 2 checker can check this response.'
    );

    await this.repository.executeTransaction(async (trx) => {
      await this.updateResponseStatus(trx, latestResponse.qmqa_response_id, userId, {
        checker_date: new Date(),
        checker_remarks: remarks || null,
      });
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.APPROVER_2ND],
      });
    });

    return this.refetchResult(id, userId, 'Response checked and routed to cycle 2 approver');
  }

  async approveResponse(id: string, userId: string, roleId?: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    if (this.getStage(context) !== QMQA_WORKFLOW_STAGE.APPROVER_2ND) {
      throw new BadRequestError('Only cycle 2 approver-stage QMQA records can be approved.');
    }

    const latestResponse = this.ensureLatestResponse(context);

    await this.ensureActor(
      { ...context.record, approver_id: latestResponse.approver_id },
      userId,
      roleId,
      'approve',
      'approver_id',
      'Only the assigned cycle 2 approver can approve this response.'
    );

    await this.repository.executeTransaction(async (trx) => {
      await this.updateResponseStatus(trx, latestResponse.qmqa_response_id, userId, {
        approver_date: new Date(),
        approver_remarks: remarks || null,
        accept_date: new Date(), // Directly accept and close
      });
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ACCEPT],
      });
    });

    return this.refetchResult(id, userId, 'Response approved and closed');
  }

  async rejectResponse(id: string, userId: string, roleId?: string, remarks?: string) {
    this.ensureRemarks(remarks);

    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);
    const latestResponse = this.ensureLatestResponse(context);
    const now = new Date();

    await this.repository.executeTransaction(async (trx) => {
      if (stage === QMQA_WORKFLOW_STAGE.ISSUER_2ND) {
        await this.ensureActor(
          context.record,
          userId,
          roleId,
          'reject',
          'issuer_id',
          'Only the assigned issuer can reject this response at issuer review.'
        );

        await this.updateResponseStatus(trx, latestResponse.qmqa_response_id, userId, {
          issuer_date: now,
          issuer_remarks: remarks,
        });
        await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
          request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_ISSUER_2ND],
        });
        return;
      }

      if (stage === QMQA_WORKFLOW_STAGE.CHECKER_2ND) {
        await this.ensureActor(
          { ...context.record, checker_id: latestResponse.checker_id },
          userId,
          roleId,
          'reject',
          'checker_id',
          'Only the assigned cycle 2 checker can reject this response.'
        );

        await this.updateResponseStatus(trx, latestResponse.qmqa_response_id, userId, {
          checker_date: now,
          checker_remarks: remarks,
        });
        await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
          request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_CHECKER_2ND],
        });
        return;
      }

      if (stage === QMQA_WORKFLOW_STAGE.APPROVER_2ND) {
        await this.ensureActor(
          { ...context.record, approver_id: latestResponse.approver_id },
          userId,
          roleId,
          'reject',
          'approver_id',
          'Only the assigned cycle 2 approver can reject this response.'
        );

        await this.updateResponseStatus(trx, latestResponse.qmqa_response_id, userId, {
          approver_date: now,
          approver_remarks: remarks,
        });
        await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
          request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.REJECT_APPROVER_2ND],
        });
        return;
      }

      throw new BadRequestError(`Cannot reject QMQA response from ${stage}.`);
    });

    return this.refetchResult(id, userId, 'QMQA response rejected');
  }

  async acceptResponse(id: string, userId: string, roleId?: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    if (this.getStage(context) !== QMQA_WORKFLOW_STAGE.ISSUER_3RD) {
      throw new BadRequestError('Only final-issuer-stage QMQA records can be accepted.');
    }

    await this.ensureActor(
      context.record,
      userId,
      roleId,
      'approve',
      'issuer_id',
      'Only the assigned issuer can accept this response.'
    );

    const latestResponse = this.ensureLatestResponse(context);

    await this.repository.executeTransaction(async (trx) => {
      await this.updateResponseStatus(trx, latestResponse.qmqa_response_id, userId, {
        accept_date: new Date(),
        remarks: remarks || latestResponse.remarks || null,
      });
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.ACCEPT],
      });
    });

    return this.refetchResult(id, userId, 'QMQA response accepted and closed');
  }

  async notAcceptResponse(id: string, userId: string, roleId?: string, remarks?: string) {
    this.ensureRemarks(remarks);

    const context = await this.getWorkflowContext(id, userId);
    if (this.getStage(context) !== QMQA_WORKFLOW_STAGE.ISSUER_3RD) {
      throw new BadRequestError('Only final-issuer-stage QMQA records can be marked as not accepted.');
    }

    await this.ensureActor(
      context.record,
      userId,
      roleId,
      'reject',
      'issuer_id',
      'Only the assigned issuer can mark this response as not accepted.'
    );

    const latestResponse = this.ensureLatestResponse(context);

    await this.repository.executeTransaction(async (trx) => {
      await this.updateResponseStatus(trx, latestResponse.qmqa_response_id, userId, {
        remarks,
      });
      await this.updateMainStatus(trx, context.record.qmqa_id, userId, {
        request_status: QMQA_LEGACY_STAGE_CODE[QMQA_WORKFLOW_STAGE.NOT_ACCEPT],
      });
    });

    return this.refetchResult(id, userId, 'QMQA response marked as not accepted');
  }

  async submit(id: string, userId: string, roleId?: string, remarks?: string) {
    return this.submitMain(id, userId, roleId, remarks);
  }

  async check(id: string, userId: string, roleId?: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    if (stage === QMQA_WORKFLOW_STAGE.CHECKER) {
      return this.checkMain(id, userId, roleId, remarks);
    }

    if (stage === QMQA_WORKFLOW_STAGE.CHECKER_2ND) {
      return this.checkResponse(id, userId, roleId, remarks);
    }

    throw new BadRequestError(`Cannot check QMQA from ${stage}.`);
  }

  async approve(id: string, userId: string, roleId?: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    if (stage === QMQA_WORKFLOW_STAGE.APPROVER) {
      return this.approveMain(id, userId, roleId, remarks);
    }

    if (stage === QMQA_WORKFLOW_STAGE.APPROVER_2ND) {
      return this.approveResponse(id, userId, roleId, remarks);
    }

    if (stage === QMQA_WORKFLOW_STAGE.ISSUER_3RD) {
      return this.acceptResponse(id, userId, roleId, remarks);
    }

    throw new BadRequestError(`Cannot approve QMQA from ${stage}.`);
  }

  async reject(id: string, userId: string, roleId?: string, remarks?: string) {
    const context = await this.getWorkflowContext(id, userId);
    const stage = this.getStage(context);

    if (
      stage === QMQA_WORKFLOW_STAGE.CHECKER ||
      stage === QMQA_WORKFLOW_STAGE.APPROVER
    ) {
      return this.rejectMain(id, userId, roleId, remarks);
    }

    if (
      stage === QMQA_WORKFLOW_STAGE.ISSUER_2ND ||
      stage === QMQA_WORKFLOW_STAGE.CHECKER_2ND ||
      stage === QMQA_WORKFLOW_STAGE.APPROVER_2ND
    ) {
      return this.rejectResponse(id, userId, roleId, remarks);
    }

    if (stage === QMQA_WORKFLOW_STAGE.ISSUER_3RD) {
      return this.notAcceptResponse(id, userId, roleId, remarks);
    }

    throw new BadRequestError(`Cannot reject QMQA from ${stage}.`);
  }

  async issue(id: string, userId: string, roleId?: string, remarks?: string) {
    return this.issueMain(id, userId, roleId, remarks);
  }

  async cancel(id: string, userId: string, roleId?: string, remarks?: string) {
    return this.cancelMain(id, userId, roleId, remarks);
  }

  async verify(
    id: string,
    userId: string,
    roleId?: string,
    payload: {
      verification_remarks?: string;
      cycle2_checker_id?: string;
      cycle2_checker_remarks?: string;
      cycle2_approver_id?: string;
      cycle2_approver_remarks?: string;
    } = {},
  ) {
    return this.submitResponseReview(id, userId, roleId, {
      verification_remarks: payload.verification_remarks,
      cycle2_checker_id: payload.cycle2_checker_id,
      cycle2_checker_remarks: payload.cycle2_checker_remarks,
      cycle2_approver_id: payload.cycle2_approver_id,
      cycle2_approver_remarks: payload.cycle2_approver_remarks,
    });
  }

  async saveInitialReport(
    id: string,
    userId: string,
    roleId?: string,
    payload: {
      skip_initial?: boolean;
      initial_remarks?: string | null;
      is_submit?: boolean;
    } = {},
    files: any[] = [],
  ) {
    if (payload.is_submit) {
      return this.submitInitialResponse(id, userId, roleId, payload, files);
    }

    return this.saveResponse(id, userId, roleId, payload, files);
  }

  async submitFinalReport(
    id: string,
    userId: string,
    roleId?: string,
    payload: {
      final_remarks?: string | null;
      is_submit?: boolean;
    } = {},
    files: any[] = [],
  ) {
    if (payload.is_submit) {
      return this.submitFinalResponse(id, userId, roleId, payload, files);
    }

    return this.saveResponse(id, userId, roleId, payload, files);
  }
}

export const qmqaWorkflowService = new QmqaWorkflowService();
