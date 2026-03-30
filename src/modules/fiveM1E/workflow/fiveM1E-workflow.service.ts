import { BadRequestError, ForbiddenError, NotFoundError } from '../../../shared/errors/AppError.js';
import { permissionService, type PermissionAction } from '../../../shared/services/permission.service.js';
import { fiveM1ERepository } from '../fiveM1E.repository.js';
import {
  buildFiveM1EWorkflowMetadata,
  getFiveM1EWorkflowActionForStage,
  getFiveM1EWorkflowStageFormIds,
  normalizeFiveM1EWorkflowStage,
  resolveFiveM1EWorkflowStageOwner,
  type FiveM1EWorkflowMetadata,
  type FiveM1EWorkflowOwnerMode,
} from './fiveM1E-workflow.utils.js';
import { FIVE_M1E_WORKFLOW_ACTION, FIVE_M1E_WORKFLOW_STAGE } from './fiveM1E-workflow.constants.js';
import { controlNumberService } from '../../../shared/services/control-number.service.js';
import { isAdminRole } from '../../../shared/utils/admin.utils.js';
import {
  fiveM1ENotificationService,
  type FiveM1ENotificationService,
} from '../../../shared/notifications/fivem1e-notification.service.js';

type FiveM1EWorkflowRecord = Record<string, unknown>;

function getString(record: FiveM1EWorkflowRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }
  return undefined;
}

function getCanonicalControlNo(record: FiveM1EWorkflowRecord, fallback: string) {
  return getString(record, 'ControlNo', 'control_no') || fallback;
}

function normalizeRequestedFinalStatus(requestedStatus?: string) {
  const normalized = requestedStatus?.trim().toUpperCase();
  if (
    normalized === 'APPROVEDWC' ||
    normalized === 'APPROVED W/CONDITION' ||
    normalized === 'APPROVED W/ CONDITION' ||
    normalized === 'APPROVED WITH CONDITION' ||
    normalized === 'APRDWCOND'
  ) {
    return 'APRDWCOND';
  }

  return 'APPROVED';
}

export class FiveM1EWorkflowService {
  constructor(
    private readonly repository = fiveM1ERepository,
    private readonly permissions = permissionService,
    private readonly notifications: FiveM1ENotificationService = fiveM1ENotificationService,
  ) {}

  private async getRecordOrThrow(controlNo: string) {
    const record = await this.repository.findWithApproval(controlNo);
    if (!record) {
      throw new NotFoundError(`5M1E Application ${controlNo} not found`);
    }
    return record as FiveM1EWorkflowRecord;
  }

  private async hasStageFormAccess(
    userId: string,
    stage: ReturnType<typeof normalizeFiveM1EWorkflowStage>,
  ) {
    const action = getFiveM1EWorkflowActionForStage(stage);
    if (!action) {
      return false;
    }
    return this.hasPermissionOnStageForms(userId, stage, action);
  }

  private async hasStageUpdateAccess(
    userId: string,
    stage: ReturnType<typeof normalizeFiveM1EWorkflowStage>,
  ) {
    return this.hasPermissionOnStageForms(userId, stage, 'edit');
  }

  private async hasPermissionOnStageForms(
    userId: string,
    stage: ReturnType<typeof normalizeFiveM1EWorkflowStage>,
    action: PermissionAction,
  ) {
    const formIds = getFiveM1EWorkflowStageFormIds(stage);

    if (!action || formIds.length === 0) {
      return false;
    }

    for (const formId of formIds) {
      if (await this.permissions.checkRolePermission(userId, formId, action)) {
        return true;
      }
    }

    return false;
  }

  private async findStageEligibleUsers(
    stage: ReturnType<typeof normalizeFiveM1EWorkflowStage>,
    permissionAction?: PermissionAction,
  ) {
    const action = permissionAction ?? getFiveM1EWorkflowActionForStage(stage);
    const formIds = getFiveM1EWorkflowStageFormIds(stage);

    if (!action || formIds.length === 0) {
      return [];
    }

    const eligible = new Map<string, { userId: string; fullName: string | null }>();
    for (const formId of formIds) {
      const users = await this.permissions.findUsersWithRolePermission(formId, action);
      for (const user of users) {
        eligible.set(user.userId, user);
      }
    }

    return Array.from(eligible.values());
  }

  private async resolveOwnership(record: FiveM1EWorkflowRecord) {
    const stage = normalizeFiveM1EWorkflowStage(record);
    const explicitOwner = resolveFiveM1EWorkflowStageOwner(record, stage);
    const action = getFiveM1EWorkflowActionForStage(stage);
    const isExplicitApprovalAssigneeStage =
      stage === FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER ||
      stage === FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER;

    if (!action) {
      return {
        owner: explicitOwner,
        ownerMode: (explicitOwner.id ? 'assigned' : 'unresolved') as FiveM1EWorkflowOwnerMode,
        eligibleActorUserIds: explicitOwner.id ? [explicitOwner.id] : [],
      };
    }

    if (
      explicitOwner.id &&
      (isExplicitApprovalAssigneeStage || (await this.hasStageFormAccess(explicitOwner.id, stage)))
    ) {
      return {
        owner: explicitOwner,
        ownerMode: 'assigned' as FiveM1EWorkflowOwnerMode,
        eligibleActorUserIds: [explicitOwner.id],
      };
    }

    // SQE checker and approver stages must remain explicitly assigned.
    // Role access may still make the queue readable, but only the recorded assignee
    // may receive actionable workflow ownership for check/approve.
    if (isExplicitApprovalAssigneeStage) {
      return {
        owner: explicitOwner,
        ownerMode: 'unresolved' as FiveM1EWorkflowOwnerMode,
        eligibleActorUserIds: [],
      };
    }

    const eligibleUsers = await this.findStageEligibleUsers(stage);
    if (eligibleUsers.length === 1) {
      const [user] = eligibleUsers;
      return {
        owner: {
          id: user.userId,
          name: user.fullName,
        },
        ownerMode: 'role-fallback' as FiveM1EWorkflowOwnerMode,
        eligibleActorUserIds: [user.userId],
      };
    }

    if (eligibleUsers.length > 1) {
      return {
        owner: {
          id: null,
          name: null,
        },
        ownerMode: 'shared-queue' as FiveM1EWorkflowOwnerMode,
        eligibleActorUserIds: eligibleUsers.map((user) => user.userId),
      };
    }

    console.warn(`[5M1E Workflow] No eligible owner resolved for ${getString(record, 'ControlNo', 'control_no') || 'unknown'} at stage ${stage}.`);
    return {
      owner: {
        id: null,
        name: null,
      },
      ownerMode: 'unresolved' as FiveM1EWorkflowOwnerMode,
      eligibleActorUserIds: [],
    };
  }

  async getWorkflowMetadata(record: FiveM1EWorkflowRecord, actorUserId?: string): Promise<FiveM1EWorkflowMetadata> {
    const stage = normalizeFiveM1EWorkflowStage(record);
    const ownership = await this.resolveOwnership(record);
    const createdBy = getString(record, 'CreatedBy', 'created_by');
    const supplierEditableStage =
      stage === FIVE_M1E_WORKFLOW_STAGE.DRAFT ||
      stage === FIVE_M1E_WORKFLOW_STAGE.RAR ||
      stage === FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE;
    const actorHasStageAccess =
      supplierEditableStage
        ? await this.hasStageFormAccess(actorUserId || '', stage)
        : actorUserId
          ? await this.hasStageFormAccess(actorUserId, stage)
          : false;
    const isExplicitApprovalAssignee =
      Boolean(actorUserId) &&
      ownership.ownerMode === 'assigned' &&
      ownership.owner.id === actorUserId &&
      (stage === FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER ||
        stage === FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER);
    const effectiveStageAccess = actorHasStageAccess || isExplicitApprovalAssignee;

    return buildFiveM1EWorkflowMetadata(record, {
      actorUserId,
      actorHasStageAccess:
        supplierEditableStage && actorUserId
          ? createdBy === actorUserId && effectiveStageAccess
          : effectiveStageAccess,
      owner: ownership.owner,
      ownerMode: ownership.ownerMode,
      eligibleActorUserIds: ownership.eligibleActorUserIds,
    });
  }

  async canUserUpdateRecord(controlNo: string, userId: string) {
    const record = await this.getRecordOrThrow(controlNo);
    const stage = normalizeFiveM1EWorkflowStage(record);
    const createdBy = getString(record, 'CreatedBy', 'created_by');
    const isEditorQueueStage =
      stage === FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER ||
      stage === FIVE_M1E_WORKFLOW_STAGE.REVIEWER ||
      stage === FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC;

    if (
      stage === FIVE_M1E_WORKFLOW_STAGE.UNKNOWN ||
      stage === FIVE_M1E_WORKFLOW_STAGE.REJECTED ||
      stage === FIVE_M1E_WORKFLOW_STAGE.RELEASED
    ) {
      return false;
    }

    if (
      stage === FIVE_M1E_WORKFLOW_STAGE.DRAFT ||
      stage === FIVE_M1E_WORKFLOW_STAGE.RAR ||
      stage === FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE
    ) {
      return Boolean(createdBy && createdBy === userId && (await this.hasStageUpdateAccess(userId, stage)));
    }

    if (!(await this.hasStageUpdateAccess(userId, stage))) {
      return false;
    }

    if (isEditorQueueStage) {
      return true;
    }

    const explicitOwner = resolveFiveM1EWorkflowStageOwner(record, stage);
    if (explicitOwner.id === userId) {
      return true;
    }

    const eligibleEditors = await this.findStageEligibleUsers(stage, 'edit');
    if (eligibleEditors.length === 1) {
      return eligibleEditors[0].userId === userId;
    }

    if (eligibleEditors.length > 1) {
      return eligibleEditors.some((candidate) => candidate.userId === userId);
    }

    return false;
  }

  async canUserDeleteRecord(controlNo: string, userId: string, roleName?: string | null) {
    if (isAdminRole(roleName)) {
      return true;
    }

    const record = await this.getRecordOrThrow(controlNo);
    const stage = normalizeFiveM1EWorkflowStage(record);
    const createdBy = getString(record, 'CreatedBy', 'created_by');

    return Boolean(
      userId &&
      createdBy &&
      createdBy === userId &&
      (
        stage === FIVE_M1E_WORKFLOW_STAGE.DRAFT ||
        stage === FIVE_M1E_WORKFLOW_STAGE.RAR ||
        stage === FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE
      ),
    );
  }

  async canUserPerformAction(
    controlNo: string,
    userId: string,
    action: typeof FIVE_M1E_WORKFLOW_ACTION[keyof typeof FIVE_M1E_WORKFLOW_ACTION],
  ) {
    const record = await this.getRecordOrThrow(controlNo);
    const metadata = await this.getWorkflowMetadata(record, userId);

    return metadata.availableActions.includes(action);
  }

  private async ensureActor(
    record: FiveM1EWorkflowRecord,
    userId: string,
    action: typeof FIVE_M1E_WORKFLOW_ACTION[keyof typeof FIVE_M1E_WORKFLOW_ACTION],
    message: string,
  ) {
    const metadata = await this.getWorkflowMetadata(record, userId);
    if (!metadata.availableActions.includes(action)) {
      throw new ForbiddenError(message);
    }
  }

  private async persistStatusRemark(controlNo: string, userId: string, status: string, remarks?: string) {
    if (!remarks) return;
    await this.repository.insertStatusRemark(controlNo, {
      remarks,
      remark_by: userId,
      status,
    });
  }

  private async finalizeTemporaryControlNo(record: FiveM1EWorkflowRecord, controlNo: string) {
    if (!controlNo.toUpperCase().startsWith('TMP_')) {
      return controlNo;
    }

    let nextControlNo: string;

    try {
      nextControlNo = await controlNumberService.buildFiveM1EFinal({
        siteId: getString(record, 'SiteID', 'site_id'),
        siteCode: getString(record, 'site_code'),
        partTypeId: getString(record, 'CommodityID', 'commodity_id'),
        partTypeCode: getString(record, 'part_type_code', 'parttype_code'),
        productId: getString(record, 'Attribute03', 'attribute_03'),
        productCode: getString(record, 'product_code'),
      });
    } catch (error) {
      if (!(error instanceof BadRequestError)) {
        throw error;
      }

      nextControlNo = controlNumberService.buildFiveM1ESubmitted({
        recordId: getString(record, 'ID', 'id'),
        currentControlNo: controlNo,
      });
    }

    await this.repository.renameControlNo(controlNo, nextControlNo);
    return nextControlNo;
  }

  private async buildResult(record: FiveM1EWorkflowRecord, controlNo: string, actorUserId?: string) {
    const metadata = await this.getWorkflowMetadata(record, actorUserId);
    const normalizedStatus =
      metadata.workflowStage === FIVE_M1E_WORKFLOW_STAGE.RELEASED
        ? 'RELEASE'
        : getString(record, 'approval_status', 'status', 'Status');
    return {
      success: true,
      data: {
        recordId: getString(record, 'ID', 'id'),
        controlNo,
        controlNoState: controlNumberService.getControlNoState(controlNo),
        status: normalizedStatus,
        ...metadata,
      },
    };
  }

  private isSameSqeActor(record: FiveM1EWorkflowRecord) {
    const checkerId = getString(record, 'checker', 'Checker');
    const approverId = getString(record, 'approver', 'Approver');
    return Boolean(checkerId && approverId && checkerId === approverId);
  }

  private getNotificationFallbackFormIds(stage: ReturnType<typeof normalizeFiveM1EWorkflowStage>) {
    if (stage === FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER) {
      return ['5M1EApprovalSecDes-06-17'];
    }

    if (
      stage === FIVE_M1E_WORKFLOW_STAGE.REVIEWER ||
      stage === FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC ||
      stage === FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER ||
      stage === FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER ||
      stage === FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER ||
      stage === FIVE_M1E_WORKFLOW_STAGE.DESIGN_APPROVER ||
      stage === FIVE_M1E_WORKFLOW_STAGE.ENVI_APPROVER ||
      stage === FIVE_M1E_WORKFLOW_STAGE.QA_CHECKER ||
      stage === FIVE_M1E_WORKFLOW_STAGE.APPROVED ||
      stage === FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION ||
      stage === FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE
    ) {
      return ['5M1EApprovalSecEnvi-06-17', '5M1EApprovalSecQA-06-17'];
    }

    return [];
  }

  private async resolveActorName(userId: string, record: FiveM1EWorkflowRecord) {
    const actor = (await this.repository.findUserContactsByIds([userId])) as Array<{ fullName?: string | null }>;
    if (actor[0]?.fullName) {
      return String(actor[0].fullName);
    }

    return getString(record, 'created_by_name', 'reviewer_full_name', 'checker_full_name', 'approver_full_name') || userId;
  }

  private async dispatchWorkflowNotification(input: {
    eventKey:
      | 'fivem1e.submitted'
      | 'fivem1e.updated'
      | 'fivem1e.assigned'
      | 'fivem1e.checked'
      | 'fivem1e.approved'
      | 'fivem1e.approved_with_condition'
      | 'fivem1e.rejected'
      | 'fivem1e.released';
    record: FiveM1EWorkflowRecord;
    controlNo: string;
    userId: string;
    pic: string;
    action: string;
    message: string;
  }) {
    try {
      const actorName = await this.resolveActorName(input.userId, input.record);
      const stage = normalizeFiveM1EWorkflowStage(input.record);
      const result = await this.notifications.sendWorkflowNotification({
        eventKey: input.eventKey,
        recordId: getString(input.record, 'ID', 'id') || input.controlNo,
        controlNo: input.controlNo,
        pic: input.pic,
        action: input.action,
        actorName,
        message: input.message,
        title: getString(input.record, 'Title', 'title'),
        record: input.record,
        fallbackFormIds: this.getNotificationFallbackFormIds(stage),
      });

      const logger = result.skipped ? console.warn : console.log;
      logger(
        '[5m1e] workflow email notification processed',
        JSON.stringify({
          controlNo: input.controlNo,
          eventKey: input.eventKey,
          pic: input.pic,
          action: input.action,
          delivered: result.delivered,
          skipped: result.skipped ?? false,
          recipientSource: result.recipientSource,
          recipients: result.recipients,
          ccRecipients: result.ccRecipients,
          referenceId: result.referenceId ?? null,
        }),
      );
    } catch (error) {
      console.error(
        '[5m1e] workflow email notification failed',
        JSON.stringify({
          controlNo: input.controlNo,
          eventKey: input.eventKey,
          pic: input.pic,
          action: input.action,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  async submitApplication(controlNo: string, userId: string, remarks?: string) {
    const record = await this.getRecordOrThrow(controlNo);
    let canonicalControlNo = getCanonicalControlNo(record, controlNo);
    const stage = normalizeFiveM1EWorkflowStage(record);
    const createdBy = getString(record, 'CreatedBy', 'created_by');

    if (
      stage !== FIVE_M1E_WORKFLOW_STAGE.DRAFT &&
      stage !== FIVE_M1E_WORKFLOW_STAGE.RAR &&
      stage !== FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE &&
      stage !== FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER &&
      stage !== FIVE_M1E_WORKFLOW_STAGE.REVIEWER &&
      stage !== FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC
    ) {
      throw new BadRequestError(`Cannot submit 5M1E from ${stage}.`);
    }

    if (
      stage === FIVE_M1E_WORKFLOW_STAGE.DRAFT ||
      stage === FIVE_M1E_WORKFLOW_STAGE.RAR ||
      stage === FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE
    ) {
      if (createdBy && createdBy !== userId) {
        throw new ForbiddenError('Only the creator can submit this 5M1E application.');
      }

      canonicalControlNo = await this.finalizeTemporaryControlNo(record, canonicalControlNo);
      await this.repository.updateApprovalStatus(canonicalControlNo, 'SUBMITTED', {
        ApprovalSeq: 1,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(canonicalControlNo, userId, 'SUBMITTED', remarks);

      const result = await this.buildResult(
          {
            ...record,
            ControlNo: canonicalControlNo,
            approval_status: 'SUBMITTED',
            approval_seq: 1,
          },
          canonicalControlNo,
          userId,
        );
      await this.dispatchWorkflowNotification({
        eventKey: stage === FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE ? 'fivem1e.updated' : 'fivem1e.submitted',
        record: {
          ...record,
          ControlNo: canonicalControlNo,
          approval_status: 'SUBMITTED',
          approval_seq: 1,
        },
        controlNo: canonicalControlNo,
        userId,
        pic: 'SUPPLIER',
        action: stage === FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE ? 'UPDATE' : 'SUBMIT',
        message: `The 5M1E application has been ${stage === FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE ? 'updated and resubmitted' : 'submitted'} by the supplier.`,
      });
      return {
        ...result,
        message: 'Application submitted successfully',
      };
    }

    await this.ensureActor(
      record,
      userId,
      FIVE_M1E_WORKFLOW_ACTION.SUBMIT,
      'Only the assigned stage owner can submit this 5M1E application to the next step.',
    );

    if (stage === FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER) {
      canonicalControlNo = await this.finalizeTemporaryControlNo(record, canonicalControlNo);

      await this.repository.updateApprovalStatus(canonicalControlNo, 'FOR APPROVAL', {
        ApprovalSeq: 4,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(canonicalControlNo, userId, 'FOR APPROVAL', remarks);

      const result = await this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 4,
          },
          canonicalControlNo,
          userId,
        );
      await this.dispatchWorkflowNotification({
        eventKey: 'fivem1e.assigned',
        record: {
          ...record,
          ControlNo: canonicalControlNo,
          approval_status: 'FOR APPROVAL',
          approval_seq: 4,
        },
        controlNo: canonicalControlNo,
        userId,
        pic: '5M1EPIC',
        action: 'ASSIGN',
        message: 'The 5M1E application has been forwarded to the For Approval stage.',
      });
      return {
        ...result,
        message: 'Application submitted to for-approval successfully',
      };
    }

    await this.repository.updateApprovalStatus(canonicalControlNo, 'FOR APPROVAL', {
      ApprovalSeq: 5,
      ModifiedDate: new Date(),
    });
    await this.persistStatusRemark(canonicalControlNo, userId, 'FOR APPROVAL', remarks);

    const result = await this.buildResult(
        {
          ...record,
          approval_status: 'FOR APPROVAL',
          approval_seq: 5,
        },
        canonicalControlNo,
        userId,
      );
    await this.dispatchWorkflowNotification({
      eventKey: 'fivem1e.assigned',
      record: {
        ...record,
        ControlNo: canonicalControlNo,
        approval_status: 'FOR APPROVAL',
        approval_seq: 5,
      },
      controlNo: canonicalControlNo,
      userId,
      pic: stage === FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC ? 'EIC' : '5M1EPIC',
      action: stage === FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC ? 'SUBMIT' : 'SENDREG',
      message: 'The 5M1E application has been forwarded to the next approval owner.',
    });
    return {
      ...result,
      message: 'Application submitted to checker successfully',
    };
  }

  async checkApplication(controlNo: string, userId: string, remarks?: string) {
    const record = await this.getRecordOrThrow(controlNo);
    const canonicalControlNo = getCanonicalControlNo(record, controlNo);
    const stage = normalizeFiveM1EWorkflowStage(record);

    if (stage === FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER) {
      await this.ensureActor(record, userId, FIVE_M1E_WORKFLOW_ACTION.CHECK, 'Only the assigned SQE checker can check this 5M1E application.');
      await this.repository.updateApprovalStatus(canonicalControlNo, 'FOR APPROVAL', {
        ApprovalSeq: 6,
        ChkrStatus: '1',
        AprStatus: getString(record, 'apr_status', 'AprStatus') ?? null,
        ChkrDtAprd: new Date(),
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(canonicalControlNo, userId, 'FOR APPROVAL', remarks);
      const result = await this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 6,
            chkr_status: '1',
            apr_status: getString(record, 'apr_status', 'AprStatus'),
          },
          canonicalControlNo,
          userId,
        );
      await this.dispatchWorkflowNotification({
        eventKey: 'fivem1e.checked',
        record: {
          ...record,
          approval_status: 'FOR APPROVAL',
          approval_seq: 6,
          chkr_status: '1',
          apr_status: getString(record, 'apr_status', 'AprStatus'),
        },
        controlNo: canonicalControlNo,
        userId,
        pic: 'SQEChecker',
        action: 'APPROVE',
        message: 'The 5M1E application has been checked and forwarded to the approver.',
      });
      return {
        ...result,
        message: 'Application checked successfully',
      };
    }

    throw new BadRequestError(`Cannot check 5M1E from ${stage}.`);
  }

  async approveApplication(controlNo: string, userId: string, remarks?: string, requestedStatus = 'APPROVED') {
    const record = await this.getRecordOrThrow(controlNo);
    const canonicalControlNo = getCanonicalControlNo(record, controlNo);
    const stage = normalizeFiveM1EWorkflowStage(record);

    if (stage === FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER) {
      await this.ensureActor(record, userId, FIVE_M1E_WORKFLOW_ACTION.APPROVE, 'Only the assigned SQE approver can approve this 5M1E application.');
      const nextStatus = normalizeRequestedFinalStatus(requestedStatus);

      if (nextStatus === 'APRDWCOND') {
        await this.repository.updateApprovalStatus(canonicalControlNo, 'APRDWCOND', {
          ApprovalSeq: 14,
          AprStatus: 'aprdwcond',
          FADtAprd: new Date(),
          ApproverDtAprd: new Date(),
          ModifiedDate: new Date(),
        });
        await this.persistStatusRemark(canonicalControlNo, userId, 'APRDWCOND', remarks);
        const result = await this.buildResult(
            {
              ...record,
              approval_status: 'APRDWCOND',
              approval_seq: 14,
              apr_status: 'aprdwcond',
            },
            canonicalControlNo,
            userId,
          );
        await this.dispatchWorkflowNotification({
          eventKey: 'fivem1e.approved_with_condition',
          record: {
            ...record,
            approval_status: 'APRDWCOND',
            approval_seq: 14,
            apr_status: 'aprdwcond',
          },
          controlNo: canonicalControlNo,
          userId,
          pic: 'SQEApprover',
          action: 'APPROVE',
          message: 'The 5M1E application has been approved with condition.',
        });
        return {
          ...result,
          message: 'Application approved successfully',
        };
      }

      await this.repository.updateApprovalStatus(canonicalControlNo, 'APPROVED', {
        ApprovalSeq: 7,
        AprStatus: 'approved',
        ApproverDtAprd: new Date(),
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(canonicalControlNo, userId, 'APPROVED', remarks);
      const result = await this.buildResult(
          {
            ...record,
            approval_status: 'APPROVED',
            approval_seq: 7,
            apr_status: 'approved',
          },
          canonicalControlNo,
          userId,
        );
      await this.dispatchWorkflowNotification({
        eventKey: 'fivem1e.approved',
        record: {
          ...record,
          approval_status: 'APPROVED',
          approval_seq: 7,
          apr_status: 'approved',
        },
        controlNo: canonicalControlNo,
        userId,
        pic: 'SQEApprover',
        action: 'APPROVE',
        message: 'The 5M1E application has been approved.',
      });
      return {
        ...result,
        message: 'Application approved successfully',
      };
    }

    throw new BadRequestError(`Cannot approve 5M1E from ${stage}.`);
  }

  async rejectApplication(controlNo: string, userId: string, remarks?: string) {
    const record = await this.getRecordOrThrow(controlNo);
    const canonicalControlNo = getCanonicalControlNo(record, controlNo);
    const stage = normalizeFiveM1EWorkflowStage(record);

    if (stage === FIVE_M1E_WORKFLOW_STAGE.DRAFT || stage === FIVE_M1E_WORKFLOW_STAGE.UNKNOWN) {
      throw new BadRequestError(`Cannot reject 5M1E from ${stage}.`);
    }

    const stageAction =
      stage === FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER ||
      stage === FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER ||
      stage === FIVE_M1E_WORKFLOW_STAGE.QA_CHECKER
        ? FIVE_M1E_WORKFLOW_ACTION.CHECK
        : stage === FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE
          ? FIVE_M1E_WORKFLOW_ACTION.RELEASE
          : FIVE_M1E_WORKFLOW_ACTION.APPROVE;

    await this.ensureActor(record, userId, stageAction, 'Only the assigned actor can reject this 5M1E application.');

    if (stage === FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER) {
      await this.repository.updateApprovalStatus(canonicalControlNo, 'REJECTED', {
        RejectedBy: userId,
        RejectedDate: new Date(),
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(canonicalControlNo, userId, 'REJECTED', remarks);
      const result = await this.buildResult({ ...record, approval_status: 'REJECTED' }, canonicalControlNo, userId);
      await this.dispatchWorkflowNotification({
        eventKey: 'fivem1e.rejected',
        record: { ...record, approval_status: 'REJECTED' },
        controlNo: canonicalControlNo,
        userId,
        pic: 'MPDPIC',
        action: 'REJECT',
        message: 'The 5M1E application has been rejected.',
      });
      return {
        ...result,
        message: 'Application rejected successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.MPD_APPROVER) {
      await this.repository.updateApprovalStatus(canonicalControlNo, 'SUBMITTED', {
        ApprovalSeq: 0,
        MPDApproverStatus: null,
        MPDAprDtAprd: null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(canonicalControlNo, userId, 'SUBMITTED', remarks);
      const result = await this.buildResult(
          {
            ...record,
            approval_status: 'SUBMITTED',
            approval_seq: 0,
            mpd_approver_status: null,
          },
          canonicalControlNo,
          userId,
        );
      await this.dispatchWorkflowNotification({
        eventKey: 'fivem1e.rejected',
        record: {
          ...record,
          approval_status: 'SUBMITTED',
          approval_seq: 0,
          mpd_approver_status: null,
        },
        controlNo: canonicalControlNo,
        userId,
        pic: 'MPDApprover',
        action: 'REJECT',
        message: 'The 5M1E application has been rejected and returned to the submitted stage.',
      });
      return {
        ...result,
        message: 'Application rejected successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.REVIEWER) {
      await this.repository.updateApprovalStatus(canonicalControlNo, 'FOR APPROVAL', {
        ApprovalSeq: 3,
        ReviewerStatus: null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(canonicalControlNo, userId, 'FOR APPROVAL', remarks);
      const result = await this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 3,
            reviewer_status: null,
          },
          canonicalControlNo,
          userId,
        );
      await this.dispatchWorkflowNotification({
        eventKey: 'fivem1e.rejected',
        record: {
          ...record,
          approval_status: 'FOR APPROVAL',
          approval_seq: 3,
          reviewer_status: null,
        },
        controlNo: canonicalControlNo,
        userId,
        pic: '5M1EPIC',
        action: 'REJECT',
        message: 'The 5M1E application has been rejected and returned to the evaluation queue.',
      });
      return {
        ...result,
        message: 'Application rejected successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER) {
      const sameSqeActor = this.isSameSqeActor(record);
      await this.repository.updateApprovalStatus(canonicalControlNo, 'FOR APPROVAL', {
        ApprovalSeq: 4,
        RevisedSequence: 5,
        ChkrStatus: null,
        AprStatus: sameSqeActor ? null : getString(record, 'apr_status', 'AprStatus') ?? null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(canonicalControlNo, userId, 'FOR APPROVAL', remarks);
      const result = await this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 4,
            revised_sequence: 5,
            chkr_status: null,
            apr_status: sameSqeActor ? null : getString(record, 'apr_status', 'AprStatus'),
          },
          canonicalControlNo,
          userId,
        );
      await this.dispatchWorkflowNotification({
        eventKey: 'fivem1e.rejected',
        record: {
          ...record,
          approval_status: 'FOR APPROVAL',
          approval_seq: 4,
          revised_sequence: 5,
          chkr_status: null,
          apr_status: sameSqeActor ? null : getString(record, 'apr_status', 'AprStatus'),
        },
        controlNo: canonicalControlNo,
        userId,
        pic: 'SQEChecker',
        action: 'REJECT',
        message: 'The 5M1E application has been rejected by the SQE checker.',
      });
      return {
        ...result,
        message: 'Application rejected successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER) {
      await this.repository.updateApprovalStatus(canonicalControlNo, 'FOR APPROVAL', {
        ApprovalSeq: 4,
        RevisedSequence: 6,
        AprStatus: null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(canonicalControlNo, userId, 'FOR APPROVAL', remarks);
      const result = await this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 4,
            revised_sequence: 6,
            apr_status: null,
          },
          canonicalControlNo,
          userId,
        );
      await this.dispatchWorkflowNotification({
        eventKey: 'fivem1e.rejected',
        record: {
          ...record,
          approval_status: 'FOR APPROVAL',
          approval_seq: 4,
          revised_sequence: 6,
          apr_status: null,
        },
        controlNo: canonicalControlNo,
        userId,
        pic: 'SQEApprover',
        action: 'REJECT',
        message: 'The 5M1E application has been rejected by the SQE approver.',
      });
      return {
        ...result,
        message: 'Application rejected successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER) {
      await this.repository.updateApprovalStatus(canonicalControlNo, 'FOR APPROVAL', {
        ApprovalSeq: 4,
        RevisedSequence: 7,
        FAStatus: null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(canonicalControlNo, userId, 'FOR APPROVAL', remarks);
      const result = await this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 4,
            revised_sequence: 7,
            fa_status: null,
          },
          canonicalControlNo,
          userId,
        );
      await this.dispatchWorkflowNotification({
        eventKey: 'fivem1e.rejected',
        record: {
          ...record,
          approval_status: 'FOR APPROVAL',
          approval_seq: 4,
          revised_sequence: 7,
          fa_status: null,
        },
        controlNo: canonicalControlNo,
        userId,
        pic: 'QAApprover',
        action: 'REJECT',
        message: 'The 5M1E application has been rejected by the final approver.',
      });
      return {
        ...result,
        message: 'Application rejected successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.DESIGN_APPROVER) {
      await this.repository.updateApprovalStatus(canonicalControlNo, 'FOR APPROVAL', {
        ApprovalSeq: 4,
        RevisedSequence: 10,
        DesignApproverStatus: null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(canonicalControlNo, userId, 'FOR APPROVAL', remarks);
      const result = await this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 4,
            revised_sequence: 10,
            design_approver_status: null,
          },
          canonicalControlNo,
          userId,
        );
      await this.dispatchWorkflowNotification({
        eventKey: 'fivem1e.rejected',
        record: {
          ...record,
          approval_status: 'FOR APPROVAL',
          approval_seq: 4,
          revised_sequence: 10,
          design_approver_status: null,
        },
        controlNo: canonicalControlNo,
        userId,
        pic: 'DESIGNApprover',
        action: 'REJECT',
        message: 'The 5M1E application has been rejected by the design approver.',
      });
      return {
        ...result,
        message: 'Application rejected successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.ENVI_APPROVER) {
      await this.repository.updateApprovalStatus(canonicalControlNo, 'FOR APPROVAL', {
        ApprovalSeq: 4,
        RevisedSequence: 12,
        EnviApproveStatus: null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(canonicalControlNo, userId, 'FOR APPROVAL', remarks);
      const result = await this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 4,
            revised_sequence: 12,
            envi_approve_status: null,
          },
          canonicalControlNo,
          userId,
        );
      await this.dispatchWorkflowNotification({
        eventKey: 'fivem1e.rejected',
        record: {
          ...record,
          approval_status: 'FOR APPROVAL',
          approval_seq: 4,
          revised_sequence: 12,
          envi_approve_status: null,
        },
        controlNo: canonicalControlNo,
        userId,
        pic: 'ENVIApprover',
        action: 'REJECT',
        message: 'The 5M1E application has been rejected by the environment approver.',
      });
      return {
        ...result,
        message: 'Application rejected successfully',
      };
    }

    if (stage === FIVE_M1E_WORKFLOW_STAGE.QA_CHECKER) {
      await this.repository.updateApprovalStatus(controlNo, 'FOR APPROVAL', {
        ApprovalSeq: 4,
        RevisedSequence: 13,
        QACheckerStatus: null,
        ModifiedDate: new Date(),
      });
      await this.persistStatusRemark(controlNo, userId, 'FOR APPROVAL', remarks);
      const result = await this.buildResult(
          {
            ...record,
            approval_status: 'FOR APPROVAL',
            approval_seq: 4,
            revised_sequence: 13,
            qa_checker_status: null,
          },
          controlNo,
          userId,
        );
      await this.dispatchWorkflowNotification({
        eventKey: 'fivem1e.rejected',
        record: {
          ...record,
          approval_status: 'FOR APPROVAL',
          approval_seq: 4,
          revised_sequence: 13,
          qa_checker_status: null,
        },
        controlNo,
        userId,
        pic: 'QAChecker',
        action: 'REJECT',
        message: 'The 5M1E application has been rejected by the QA checker.',
      });
      return {
        ...result,
        message: 'Application rejected successfully',
      };
    }

    throw new BadRequestError(`Cannot reject 5M1E from ${stage}.`);
  }

  async releaseApplication(controlNo: string, userId: string) {
    const record = await this.getRecordOrThrow(controlNo);
    const canonicalControlNo = getCanonicalControlNo(record, controlNo);
    const stage = normalizeFiveM1EWorkflowStage(record);

    if (
      stage !== FIVE_M1E_WORKFLOW_STAGE.APPROVED &&
      stage !== FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION &&
      stage !== FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE
    ) {
      throw new BadRequestError(`Cannot release 5M1E from ${stage}.`);
    }

    await this.ensureActor(record, userId, FIVE_M1E_WORKFLOW_ACTION.RELEASE, 'Only the assigned release owner can release this 5M1E application.');

    await this.repository.updateApprovalStatus(canonicalControlNo, 'RELEASE', {
      ApprovalSeq: 15,
      ModifiedDate: new Date(),
    });

    const result = await this.buildResult(
        {
          ...record,
          approval_status: 'RELEASE',
          approval_seq: 15,
        },
        canonicalControlNo,
        userId,
      );
    await this.dispatchWorkflowNotification({
      eventKey: 'fivem1e.released',
      record: {
        ...record,
        approval_status: 'RELEASE',
        approval_seq: 15,
      },
      controlNo: canonicalControlNo,
      userId,
      pic: 'MPDPIC',
      action: 'RELEASE',
      message: 'The 5M1E application has been released.',
    });
    return {
      ...result,
      message: 'Application released successfully',
    };
  }
}

export const fiveM1EWorkflowService = new FiveM1EWorkflowService();
