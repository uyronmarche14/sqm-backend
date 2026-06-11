import { v4 as uuidv4 } from 'uuid';
import { ForbiddenError, NotFoundError, BadRequestError } from '../../../shared/errors/AppError.js';
import { sqmpRepository } from '../sqmp.repository.js';
import { userRepository } from '../../users/user.repository.js';
import { sqmpResponseService } from '../response/response.service.js';
import {
  SQMP_STAGE_CODE,
  SQMP_WORKFLOW_ACTION,
  type SqmpWorkflowAction,
} from './workflow.constants.js';
import {
  SQMP_LEGACY_STATUS_REMARK,
  buildSqmpWorkflowMetadata,
  canUserAccessSqmpRecord,
  resolveSqmpStageCode,
} from './workflow.utils.js';
import type { SQMPResponseUpsertInput } from '../response/response.schema.js';

interface WorkflowActorContext {
  roleName: string;
  recordData: NonNullable<Awaited<ReturnType<typeof sqmpRepository.findByIdDetailed>>>;
  latestResponse: any;
  userSiteId: string | null;
  supplierIds: string[];
  availableActions: SqmpWorkflowAction[];
}

interface WorkflowTransitionResult {
  success: true;
  data: { id: string };
  message: string;
}

export class SqmpWorkflowService {
  private async getRoleName(roleId?: string): Promise<string> {
    if (!roleId) return 'UNKNOWN';
    const roleObj = await userRepository.findRoleById(roleId);
    return roleObj?.role_name || 'UNKNOWN';
  }

  private async getActorContext(sqmpId: string, userId: string, roleId?: string): Promise<WorkflowActorContext> {
    const roleName = await this.getRoleName(roleId);
    const user = userId ? await userRepository.findById(userId) : null;
    const recordData = await sqmpRepository.findByIdDetailed(sqmpId);

    if (!recordData) {
      throw new NotFoundError('SQM Plan not found');
    }

    const latestResponse = recordData.responses?.[recordData.responses.length - 1];
    const supplierIds = roleName.toUpperCase().includes('SUPPLIER')
      ? await sqmpRepository.findSupplierIdsByUserId(userId)
      : [];

    if (!canUserAccessSqmpRecord({
      record: recordData.record,
      latestResponse,
      userId,
      roleName,
      userSiteId: user?.site_id || null,
      supplierIds,
    })) {
      throw new ForbiddenError('Access Denied: You do not have permission to access this SQM Plan.');
    }

    const metadata = buildSqmpWorkflowMetadata({
      record: recordData.record,
      latestResponse,
      userId,
      roleName,
      userSiteId: user?.site_id || null,
      supplierIds,
    });

    return {
      roleName,
      recordData,
      latestResponse,
      userSiteId: user?.site_id || null,
      supplierIds,
      availableActions: metadata.availableActions,
    };
  }

  private ensureAction(context: WorkflowActorContext, action: SqmpWorkflowAction, message: string) {
    if (!context.availableActions.includes(action)) {
      throw new ForbiddenError(message);
    }
  }

  private ensureStage(record: any, expected: string[], message: string, latestResponse?: any) {
    if (!expected.includes(resolveSqmpStageCode(record, latestResponse))) {
      throw new BadRequestError(message);
    }
  }

  private async insertStatusRemark(trx: any, sqmpId: string, requestStatus: string, userId: string, remarks?: string | null) {
    await trx.insertInto('SQMP_STATUS_REMARKS').values({
      sqmp_status_remarks_id: uuidv4(),
      sqmp_id: sqmpId,
      remarks: remarks || null,
      request_status: requestStatus,
      remarks_by_id: userId,
      remarks_date: new Date(),
    }).execute();
  }

  private async updateMainStatus(trx: any, sqmpId: string, userId: string, updates: Record<string, unknown>) {
    await trx.updateTable('SQMP')
      .set({
        ...updates,
        last_update: new Date(),
        updateby: userId,
      })
      .where('sqmp_id', '=', sqmpId)
      .execute();
  }

  private async updateResponseStatus(trx: any, responseId: string, userId: string, updates: Record<string, unknown>) {
    await trx.updateTable('SQMP_RESPONSE')
      .set({
        ...updates,
        last_update: new Date(),
        updateby: userId,
      })
      .where('sqmp_response_id', '=', responseId)
      .execute();
  }

  async submitMain(sqmpId: string, remarks: string | undefined, userId: string, roleId?: string): Promise<WorkflowTransitionResult> {
    const context = await this.getActorContext(sqmpId, userId, roleId);
    this.ensureAction(context, SQMP_WORKFLOW_ACTION.SUBMIT_MAIN, 'Only the issuer or owner can submit this SQM Plan.');
    this.ensureStage(
      context.recordData.record,
      [SQMP_STAGE_CODE.DRAFT, SQMP_STAGE_CODE.REJECTED_BY_CHECKER, SQMP_STAGE_CODE.REJECTED_BY_APPROVER],
      'Invalid Transition: Only draft or rejected plans can be submitted.',
      context.latestResponse,
    );

    await sqmpRepository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, sqmpId, userId, {
        issuer_date: new Date(),
        issuer_remarks: remarks || null,
        checker_date: null,
        checker_remarks: null,
        approver_date: null,
        approver_remarks: null,
        request_status: SQMP_STAGE_CODE.CHECKER,
      });

      await this.insertStatusRemark(trx, sqmpId, SQMP_STAGE_CODE.CHECKER, userId, remarks || 'Submitted to checker');
    });

    return {
      success: true,
      data: { id: sqmpId },
      message: 'SQM Plan submitted to checker',
    };
  }

  async checkMain(sqmpId: string, remarks: string | undefined, userId: string, roleId?: string): Promise<WorkflowTransitionResult> {
    const context = await this.getActorContext(sqmpId, userId, roleId);
    this.ensureAction(context, SQMP_WORKFLOW_ACTION.CHECK_MAIN, 'Only the assigned checker can check this SQM Plan.');
    this.ensureStage(
      context.recordData.record,
      [SQMP_STAGE_CODE.CHECKER],
      'Invalid Transition: Plan is not awaiting checker action.',
      context.latestResponse,
    );

    await sqmpRepository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, sqmpId, userId, {
        checker_date: new Date(),
        checker_remarks: remarks || null,
        request_status: SQMP_STAGE_CODE.APPROVER,
      });

      await this.insertStatusRemark(trx, sqmpId, SQMP_STAGE_CODE.APPROVER, userId, remarks || 'Checked by assigned checker');
    });

    return {
      success: true,
      data: { id: sqmpId },
      message: 'SQM Plan checked and routed to approver',
    };
  }

  async approveMain(sqmpId: string, remarks: string | undefined, userId: string, roleId?: string): Promise<WorkflowTransitionResult> {
    const context = await this.getActorContext(sqmpId, userId, roleId);
    this.ensureAction(context, SQMP_WORKFLOW_ACTION.APPROVE_MAIN, 'Only the assigned approver can approve this SQM Plan.');
    this.ensureStage(
      context.recordData.record,
      [SQMP_STAGE_CODE.APPROVER],
      'Invalid Transition: Plan is not awaiting approver action.',
      context.latestResponse,
    );

    await sqmpRepository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, sqmpId, userId, {
        approver_date: new Date(),
        approver_remarks: remarks || null,
        request_status: SQMP_STAGE_CODE.ISSUER,
      });

      await this.insertStatusRemark(trx, sqmpId, SQMP_STAGE_CODE.ISSUER, userId, remarks || 'Approved and routed to issuer');
    });

    return {
      success: true,
      data: { id: sqmpId },
      message: 'SQM Plan approved and routed back to issuer',
    };
  }

  async rejectMain(sqmpId: string, remarks: string | undefined, userId: string, roleId?: string): Promise<WorkflowTransitionResult> {
    const context = await this.getActorContext(sqmpId, userId, roleId);
    this.ensureAction(context, SQMP_WORKFLOW_ACTION.REJECT_MAIN, 'Only the active checker or approver can reject this SQM Plan.');

    const currentStage = resolveSqmpStageCode(context.recordData.record, context.latestResponse);
    const targetStatus = currentStage === SQMP_STAGE_CODE.CHECKER
      ? SQMP_STAGE_CODE.REJECTED_BY_CHECKER
      : currentStage === SQMP_STAGE_CODE.APPROVER
        ? SQMP_STAGE_CODE.REJECTED_BY_APPROVER
        : null;

    if (!targetStatus) {
      throw new BadRequestError('Invalid Transition: Plan cannot be rejected at this stage.');
    }

    await sqmpRepository.executeTransaction(async (trx) => {
      if (targetStatus === SQMP_STAGE_CODE.REJECTED_BY_CHECKER) {
        await this.updateMainStatus(trx, sqmpId, userId, {
          checker_date: new Date(),
          checker_remarks: remarks || null,
          request_status: targetStatus,
        });
      } else {
        await this.updateMainStatus(trx, sqmpId, userId, {
          approver_date: new Date(),
          approver_remarks: remarks || null,
          request_status: targetStatus,
        });
      }

      await this.insertStatusRemark(trx, sqmpId, targetStatus, userId, remarks || 'Rejected');
    });

    return {
      success: true,
      data: { id: sqmpId },
      message: 'SQM Plan rejected',
    };
  }

  async issueMain(sqmpId: string, remarks: string | undefined, userId: string, roleId?: string): Promise<WorkflowTransitionResult> {
    const context = await this.getActorContext(sqmpId, userId, roleId);
    this.ensureAction(context, SQMP_WORKFLOW_ACTION.ISSUE_MAIN, 'Only the assigned issuer can issue this SQM Plan.');
    this.ensureStage(
      context.recordData.record,
      [SQMP_STAGE_CODE.ISSUER],
      'Invalid Transition: Plan is not ready for issuance.',
      context.latestResponse,
    );

    await sqmpRepository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, sqmpId, userId, {
        issued_date: new Date(),
        request_status: SQMP_STAGE_CODE.SUPPLIER,
      });

      await this.insertStatusRemark(
        trx,
        sqmpId,
        SQMP_STAGE_CODE.SUPPLIER,
        userId,
        remarks || SQMP_LEGACY_STATUS_REMARK.issuedToSupplier,
      );
    });

    return {
      success: true,
      data: { id: sqmpId },
      message: 'SQM Plan issued to supplier',
    };
  }

  async cancelMain(sqmpId: string, remarks: string | undefined, userId: string, roleId?: string): Promise<WorkflowTransitionResult> {
    const context = await this.getActorContext(sqmpId, userId, roleId);
    this.ensureAction(context, SQMP_WORKFLOW_ACTION.CANCEL_MAIN, 'Only the assigned issuer can cancel this SQM Plan.');
    this.ensureStage(
      context.recordData.record,
      [
        SQMP_STAGE_CODE.DRAFT,
        SQMP_STAGE_CODE.CHECKER,
        SQMP_STAGE_CODE.APPROVER,
        SQMP_STAGE_CODE.REJECTED_BY_CHECKER,
        SQMP_STAGE_CODE.REJECTED_BY_APPROVER,
        SQMP_STAGE_CODE.ISSUER,
      ],
      'Invalid Transition: Closed or supplier-stage plans cannot be cancelled here.',
      context.latestResponse,
    );

    const combinedRemarks = [context.recordData.record.issuer_remarks, remarks]
      .filter(Boolean)
      .join('\n');

    await sqmpRepository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, sqmpId, userId, {
        issuer_remarks: combinedRemarks || null,
        request_status: SQMP_STAGE_CODE.CANCELLED,
      });

      await this.insertStatusRemark(
        trx,
        sqmpId,
        SQMP_STAGE_CODE.CANCELLED,
        userId,
        remarks || SQMP_LEGACY_STATUS_REMARK.cancelled,
      );
    });

    return {
      success: true,
      data: { id: sqmpId },
      message: 'SQM Plan cancelled',
    };
  }

  async saveResponse(sqmpId: string, payload: SQMPResponseUpsertInput, userId: string, roleId?: string, files: any[] = []) {
    const context = await this.getActorContext(sqmpId, userId, roleId);
    this.ensureAction(context, SQMP_WORKFLOW_ACTION.SAVE_RESPONSE, 'Only the assigned supplier can save this response.');
    this.ensureStage(
      context.recordData.record,
      [
        SQMP_STAGE_CODE.SUPPLIER,
        SQMP_STAGE_CODE.NOT_ACCEPTED_BY_ISSUER,
      ],
      'Invalid Transition: Supplier response cannot be edited at this stage.',
      context.latestResponse,
    );

    return sqmpResponseService.saveSupplierResponseContent(sqmpId, payload, userId, roleId || '', files);
  }

  async submitResponse(sqmpId: string, payload: SQMPResponseUpsertInput, userId: string, roleId?: string, files: any[] = []): Promise<WorkflowTransitionResult> {
    await this.saveResponse(sqmpId, payload, userId, roleId, files);
    const latestResponse = await sqmpRepository.findLatestResponse(sqmpId);

    if (!latestResponse) {
      throw new NotFoundError('Response record not found after save.');
    }

    await sqmpRepository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, sqmpId, userId, {
        request_status: SQMP_STAGE_CODE.ISSUER_2ND,
      });

      await this.updateResponseStatus(trx, latestResponse.sqmp_response_id, userId, {
        issuer_date: null,
        issuer_remarks: null,
        checker_date: null,
        checker_remarks: null,
        approver_date: null,
        approver_remarks: null,
        accept_date: null,
        remarks: null,
      });

      await this.insertStatusRemark(
        trx,
        sqmpId,
        SQMP_STAGE_CODE.ISSUER_2ND,
        userId,
        SQMP_LEGACY_STATUS_REMARK.submittedBySupplier,
      );
    });

    return {
      success: true,
      data: { id: sqmpId },
      message: 'Supplier response submitted to issuer',
    };
  }

  async saveClosure(sqmpId: string, payload: SQMPResponseUpsertInput, userId: string, roleId?: string, files: any[] = []) {
    const context = await this.getActorContext(sqmpId, userId, roleId);
    this.ensureAction(context, SQMP_WORKFLOW_ACTION.SAVE_CLOSURE, 'Only the assigned issuer can save closure setup.');
    this.ensureStage(
      context.recordData.record,
      [
        SQMP_STAGE_CODE.ISSUER_2ND,
        SQMP_STAGE_CODE.REJECTED_BY_CHECKER_2ND,
        SQMP_STAGE_CODE.REJECTED_BY_APPROVER_2ND,
      ],
      'Invalid Transition: Closure setup is not editable at this stage.',
      context.latestResponse,
    );

    return sqmpResponseService.saveClosureContent(sqmpId, payload, userId, roleId || '', files);
  }

  async submitClosure(sqmpId: string, payload: SQMPResponseUpsertInput, userId: string, roleId?: string, files: any[] = []): Promise<WorkflowTransitionResult> {
    await this.saveClosure(sqmpId, payload, userId, roleId, files);
    const latestResponse = await sqmpRepository.findLatestResponse(sqmpId);

    if (!latestResponse) {
      throw new NotFoundError('Closure record not found after save.');
    }

    if (!latestResponse.checker_id || !latestResponse.approver_id) {
      throw new BadRequestError('Closure checker and approver must both be assigned before submission.');
    }

    await sqmpRepository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, sqmpId, userId, {
        request_status: SQMP_STAGE_CODE.CHECKER_2ND,
      });

      await this.updateResponseStatus(trx, latestResponse.sqmp_response_id, userId, {
        issuer_date: new Date(),
        issuer_remarks: payload.issuer_remarks || null,
        checker_date: null,
        checker_remarks: null,
        approver_date: null,
        approver_remarks: null,
      });

      await this.insertStatusRemark(
        trx,
        sqmpId,
        SQMP_STAGE_CODE.CHECKER_2ND,
        userId,
        payload.issuer_remarks || 'Closure submitted to checker',
      );
    });

    return {
      success: true,
      data: { id: sqmpId },
      message: 'Closure submitted to checker',
    };
  }

  async checkClosure(sqmpId: string, remarks: string | undefined, userId: string, roleId?: string): Promise<WorkflowTransitionResult> {
    const context = await this.getActorContext(sqmpId, userId, roleId);
    this.ensureAction(context, SQMP_WORKFLOW_ACTION.CHECK_CLOSURE, 'Only the assigned cycle 2 checker can check this closure.');
    this.ensureStage(
      context.recordData.record,
      [SQMP_STAGE_CODE.CHECKER_2ND],
      'Invalid Transition: Closure is not awaiting checker action.',
      context.latestResponse,
    );

    const latestResponse = await sqmpRepository.findLatestResponse(sqmpId);
    if (!latestResponse) throw new NotFoundError('Response record not found.');

    await sqmpRepository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, sqmpId, userId, {
        request_status: SQMP_STAGE_CODE.APPROVER_2ND,
      });

      await this.updateResponseStatus(trx, latestResponse.sqmp_response_id, userId, {
        checker_date: new Date(),
        checker_remarks: remarks || null,
      });

      await this.insertStatusRemark(trx, sqmpId, SQMP_STAGE_CODE.APPROVER_2ND, userId, remarks || 'Closure checked');
    });

    return {
      success: true,
      data: { id: sqmpId },
      message: 'Closure checked and routed to approver',
    };
  }

  async approveClosure(sqmpId: string, remarks: string | undefined, userId: string, roleId?: string): Promise<WorkflowTransitionResult> {
    const context = await this.getActorContext(sqmpId, userId, roleId);
    this.ensureAction(context, SQMP_WORKFLOW_ACTION.APPROVE_CLOSURE, 'Only the assigned cycle 2 approver can approve this closure.');
    this.ensureStage(
      context.recordData.record,
      [SQMP_STAGE_CODE.APPROVER_2ND],
      'Invalid Transition: Closure is not awaiting approver action.',
      context.latestResponse,
    );

    const latestResponse = await sqmpRepository.findLatestResponse(sqmpId);
    if (!latestResponse) throw new NotFoundError('Response record not found.');

    await sqmpRepository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, sqmpId, userId, {
        request_status: SQMP_STAGE_CODE.ISSUER_3RD,
      });

      await this.updateResponseStatus(trx, latestResponse.sqmp_response_id, userId, {
        approver_date: new Date(),
        approver_remarks: remarks || null,
      });

      await this.insertStatusRemark(trx, sqmpId, SQMP_STAGE_CODE.ISSUER_3RD, userId, remarks || 'Closure approved');
    });

    return {
      success: true,
      data: { id: sqmpId },
      message: 'Closure approved and routed to issuer for final acceptance',
    };
  }

  async rejectClosure(sqmpId: string, remarks: string | undefined, userId: string, roleId?: string): Promise<WorkflowTransitionResult> {
    const context = await this.getActorContext(sqmpId, userId, roleId);
    this.ensureAction(context, SQMP_WORKFLOW_ACTION.REJECT_CLOSURE, 'Only the active cycle 2 checker or approver can reject this closure.');

    const currentStage = resolveSqmpStageCode(context.recordData.record, context.latestResponse);
    const latestResponse = await sqmpRepository.findLatestResponse(sqmpId);
    if (!latestResponse) throw new NotFoundError('Response record not found.');

    let targetStage: string;
    let responseUpdates: Record<string, unknown>;

    if (currentStage === SQMP_STAGE_CODE.CHECKER_2ND) {
      targetStage = SQMP_STAGE_CODE.REJECTED_BY_CHECKER_2ND;
      responseUpdates = {
        checker_date: new Date(),
        checker_remarks: remarks || null,
      };
    } else if (currentStage === SQMP_STAGE_CODE.APPROVER_2ND) {
      targetStage = SQMP_STAGE_CODE.REJECTED_BY_APPROVER_2ND;
      responseUpdates = {
        approver_date: new Date(),
        approver_remarks: remarks || null,
      };
    } else {
      throw new BadRequestError('Invalid Transition: Closure cannot be rejected at this stage.');
    }

    await sqmpRepository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, sqmpId, userId, {
        request_status: targetStage,
      });
      await this.updateResponseStatus(trx, latestResponse.sqmp_response_id, userId, responseUpdates);
      await this.insertStatusRemark(trx, sqmpId, targetStage, userId, remarks || 'Closure rejected');
    });

    return {
      success: true,
      data: { id: sqmpId },
      message: 'Closure rejected',
    };
  }

  async acceptClosure(sqmpId: string, remarks: string | undefined, userId: string, roleId?: string): Promise<WorkflowTransitionResult> {
    return this.completeClosure(sqmpId, remarks, userId, roleId, SQMP_STAGE_CODE.CLOSED, 'SQM Plan closed');
  }

  async notAcceptClosure(sqmpId: string, remarks: string | undefined, userId: string, roleId?: string): Promise<WorkflowTransitionResult> {
    return this.completeClosure(sqmpId, remarks, userId, roleId, SQMP_STAGE_CODE.NOT_ACCEPTED_BY_ISSUER, 'Closure not accepted by issuer');
  }

  private async completeClosure(
    sqmpId: string,
    remarks: string | undefined,
    userId: string,
    roleId: string | undefined,
    targetStage: string,
    message: string,
  ): Promise<WorkflowTransitionResult> {
    const context = await this.getActorContext(sqmpId, userId, roleId);
    const action = targetStage === SQMP_STAGE_CODE.CLOSED
      ? SQMP_WORKFLOW_ACTION.ACCEPT_CLOSURE
      : SQMP_WORKFLOW_ACTION.NOT_ACCEPT_CLOSURE;

    this.ensureAction(context, action, 'Only the assigned issuer can complete final closure acceptance.');
    this.ensureStage(
      context.recordData.record,
      [SQMP_STAGE_CODE.ISSUER_3RD],
      'Invalid Transition: Final issuer acceptance is not available at this stage.',
      context.latestResponse,
    );

    const latestResponse = await sqmpRepository.findLatestResponse(sqmpId);
    if (!latestResponse) throw new NotFoundError('Response record not found.');

    await sqmpRepository.executeTransaction(async (trx) => {
      await this.updateMainStatus(trx, sqmpId, userId, {
        request_status: targetStage,
      });

      await this.updateResponseStatus(trx, latestResponse.sqmp_response_id, userId, {
        accept_date: new Date(),
        remarks: remarks || null,
      });

      await this.insertStatusRemark(trx, sqmpId, targetStage, userId, remarks || message);
    });

    return {
      success: true,
      data: { id: sqmpId },
      message,
    };
  }

  async getWorkflowMetadataForRecord(record: any, latestResponse: any, userId?: string, roleId?: string) {
    const roleName = await this.getRoleName(roleId);
    const user = userId ? await userRepository.findById(userId) : null;
    const supplierIds = userId && roleName.toUpperCase().includes('SUPPLIER')
      ? await sqmpRepository.findSupplierIdsByUserId(userId)
      : [];

    return buildSqmpWorkflowMetadata({
      record,
      latestResponse,
      userId,
      roleName,
      userSiteId: user?.site_id || null,
      supplierIds,
    });
  }
}

export const sqmpWorkflowService = new SqmpWorkflowService();
