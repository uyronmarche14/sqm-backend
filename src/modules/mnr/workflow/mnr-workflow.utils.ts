import {
  MNR_DB_STATUS_TO_STAGE,
  MNR_LEGACY_STAGE_CODE,
  MNR_STAGE_LABEL,
  MNR_STAGE_TO_DB_STATUS,
  MNR_WORKFLOW_ACTION,
  MNR_WORKFLOW_STAGE,
  type MnrWorkflowAction,
  type MnrWorkflowStage,
} from './mnr-workflow.constants.js';

type Nullable<T> = T | null | undefined;

export interface MnrWorkflowActorContext {
  userId?: string | null;
  supplierId?: string | null;
  roleName?: string | null;
}

export interface MnrWorkflowRecordLike {
  request_status?: string | number | null;
  report_issuance_8d?: number | boolean | null;
  supplier_id?: Nullable<string>;
  encoder_id?: Nullable<string>;
  encoder_name?: Nullable<string>;
  issuer_id?: Nullable<string>;
  issuer_name?: Nullable<string>;
  checker_id?: Nullable<string>;
  checker_name?: Nullable<string>;
  approver_id?: Nullable<string>;
  approver_name?: Nullable<string>;
  attention_id?: Nullable<string>;
}

export interface MnrWorkflowResponseLike {
  checker_id?: Nullable<string>;
  checker_name?: Nullable<string>;
  approver_id?: Nullable<string>;
  approver_name?: Nullable<string>;
}

export interface MnrWorkflowMetadata {
  workflowStage: MnrWorkflowStage;
  workflowStageCode: string;
  workflowStageName: MnrWorkflowStage;
  workflowStageLabel: string;
  availableActions: MnrWorkflowAction[];
  nextApproverId: string | null;
  nextApproverName: string | null;
}

const UPPER_ALIAS_TO_STAGE: Record<string, MnrWorkflowStage> = {
  DRAFT: MNR_WORKFLOW_STAGE.DRAFT,
  CHECKER: MNR_WORKFLOW_STAGE.CHECKER,
  APPROVER: MNR_WORKFLOW_STAGE.APPROVER,
  ISSUER: MNR_WORKFLOW_STAGE.ISSUER,
  SUPPLIER: MNR_WORKFLOW_STAGE.SUPPLIER,
  INITIAL_RESPONSE: MNR_WORKFLOW_STAGE.INITIAL_RESPONSE,
  FINAL_RESPONSE: MNR_WORKFLOW_STAGE.FINAL_RESPONSE,
  ISSUER_2ND: MNR_WORKFLOW_STAGE.ISSUER_2ND,
  CHECKER_2ND: MNR_WORKFLOW_STAGE.CHECKER_2ND,
  APPROVER_2ND: MNR_WORKFLOW_STAGE.APPROVER_2ND,
  ISSUER_3RD: MNR_WORKFLOW_STAGE.ISSUER_3RD,
  ACCEPT: MNR_WORKFLOW_STAGE.ACCEPT,
  NOT_ACCEPT: MNR_WORKFLOW_STAGE.NOT_ACCEPT,
  CANCEL: MNR_WORKFLOW_STAGE.CANCEL,
  CANCELLED: MNR_WORKFLOW_STAGE.CANCEL,
  REJECT_CHECKER: MNR_WORKFLOW_STAGE.REJECT_CHECKER,
  REJECT_APPROVER: MNR_WORKFLOW_STAGE.REJECT_APPROVER,
  REJECT_SUPPLIER: MNR_WORKFLOW_STAGE.REJECT_SUPPLIER,
  REJECT_ISSUER_2ND: MNR_WORKFLOW_STAGE.REJECT_ISSUER_2ND,
  REJECT_CHECKER_2ND: MNR_WORKFLOW_STAGE.REJECT_CHECKER_2ND,
  REJECT_APPROVER_2ND: MNR_WORKFLOW_STAGE.REJECT_APPROVER_2ND,
  LOT_TRACKING: MNR_WORKFLOW_STAGE.LOT_TRACKING,
  SUBMITTED: MNR_WORKFLOW_STAGE.CHECKER,
  CHECKED: MNR_WORKFLOW_STAGE.APPROVER,
  APPROVED: MNR_WORKFLOW_STAGE.ISSUER,
  ISSUED: MNR_WORKFLOW_STAGE.SUPPLIER,
  RESPONSE_AWAITING: MNR_WORKFLOW_STAGE.ISSUER_2ND,
  RESPONSE_SUBMITTED: MNR_WORKFLOW_STAGE.REJECT_ISSUER_2ND,
  RESPONSE_RECEIVED: MNR_WORKFLOW_STAGE.ISSUER_3RD,
  RESPONSE_AWAITING_CHECKED: MNR_WORKFLOW_STAGE.CHECKER_2ND,
  RESPONSE_CHECKED: MNR_WORKFLOW_STAGE.CHECKER_2ND,
  RESPONSE_AWAITING_APPROVAL: MNR_WORKFLOW_STAGE.APPROVER_2ND,
  RESPONSE_REJECTED: MNR_WORKFLOW_STAGE.NOT_ACCEPT,
  IR: MNR_WORKFLOW_STAGE.INITIAL_RESPONSE,
  FR: MNR_WORKFLOW_STAGE.FINAL_RESPONSE,
  WITH_INITIAL_REPORT: MNR_WORKFLOW_STAGE.REJECT_CHECKER_2ND,
  WITH_FINAL_REPORT: MNR_WORKFLOW_STAGE.REJECT_APPROVER_2ND,
  CLOSED: MNR_WORKFLOW_STAGE.ACCEPT,
  REJECTED: MNR_WORKFLOW_STAGE.REJECT_CHECKER,
};

export function normalizeMnrWorkflowStage(
  value: string | number | null | undefined,
): MnrWorkflowStage {
  if (value === null || value === undefined || value === '') {
    return MNR_WORKFLOW_STAGE.DRAFT;
  }

  const raw = String(value).trim();

  if (raw in MNR_DB_STATUS_TO_STAGE) {
    return MNR_DB_STATUS_TO_STAGE[raw]!;
  }

  for (const [stage, code] of Object.entries(MNR_LEGACY_STAGE_CODE)) {
    if (code === raw) {
      return stage as MnrWorkflowStage;
    }
  }

  const alias = UPPER_ALIAS_TO_STAGE[raw.toUpperCase()];
  return alias || MNR_WORKFLOW_STAGE.DRAFT;
}

export function getMnrDbStatus(stage: MnrWorkflowStage): string {
  return MNR_STAGE_TO_DB_STATUS[stage] || 'DR';
}

function actorMatches(actorId: Nullable<string>, userId?: Nullable<string>) {
  return Boolean(actorId && userId && actorId === userId);
}

function supplierActorMatches(
  record: MnrWorkflowRecordLike,
  actor: MnrWorkflowActorContext | undefined,
) {
  return (
    actorMatches(record.attention_id, actor?.userId) ||
    Boolean(record.supplier_id && actor?.supplierId && record.supplier_id === actor.supplierId)
  );
}

function resolveCycle2Checker(
  latestResponse?: MnrWorkflowResponseLike | null,
) {
  return {
    id: latestResponse?.checker_id || null,
    name: latestResponse?.checker_name || null,
  };
}

function resolveCycle2Approver(
  latestResponse?: MnrWorkflowResponseLike | null,
) {
  return {
    id: latestResponse?.approver_id || null,
    name: latestResponse?.approver_name || null,
  };
}

export function buildMnrWorkflowMetadata(
  record: MnrWorkflowRecordLike,
  options: {
    latestResponse?: MnrWorkflowResponseLike | null;
    actor?: MnrWorkflowActorContext;
  } = {},
): MnrWorkflowMetadata {
  const stage = normalizeMnrWorkflowStage(record.request_status);
  const actorUserId = options.actor?.userId || null;
  const cycle2Checker = resolveCycle2Checker(options.latestResponse);
  const cycle2Approver = resolveCycle2Approver(options.latestResponse);

  let nextApproverId: string | null = null;
  let nextApproverName: string | null = null;
  let availableActions: MnrWorkflowAction[] = [];

  switch (stage) {
    case MNR_WORKFLOW_STAGE.DRAFT:
      nextApproverId = record.checker_id || null;
      nextApproverName = record.checker_name || null;
      if (
        actorMatches(record.issuer_id, actorUserId) ||
        actorMatches(record.encoder_id, actorUserId)
      ) {
        availableActions = [
          MNR_WORKFLOW_ACTION.SUBMIT_MAIN,
          MNR_WORKFLOW_ACTION.CANCEL_MAIN,
        ];
      }
      break;
    case MNR_WORKFLOW_STAGE.CHECKER:
      nextApproverId = record.checker_id || null;
      nextApproverName = record.checker_name || null;
      if (actorMatches(record.checker_id, actorUserId)) {
        availableActions = [
          MNR_WORKFLOW_ACTION.CHECK_MAIN,
          MNR_WORKFLOW_ACTION.REJECT_MAIN,
        ];
      }
      break;
    case MNR_WORKFLOW_STAGE.APPROVER:
      nextApproverId = record.approver_id || null;
      nextApproverName = record.approver_name || null;
      if (actorMatches(record.approver_id, actorUserId)) {
        availableActions = [
          MNR_WORKFLOW_ACTION.APPROVE_MAIN,
          MNR_WORKFLOW_ACTION.REJECT_MAIN,
        ];
      }
      break;
    case MNR_WORKFLOW_STAGE.REJECT_CHECKER:
    case MNR_WORKFLOW_STAGE.REJECT_APPROVER:
      nextApproverId = record.issuer_id || record.encoder_id || null;
      nextApproverName = record.issuer_name || record.encoder_name || null;
      if (
        actorMatches(record.issuer_id, actorUserId) ||
        actorMatches(record.encoder_id, actorUserId)
      ) {
        availableActions = [MNR_WORKFLOW_ACTION.SUBMIT_MAIN];
      }
      break;
    case MNR_WORKFLOW_STAGE.ISSUER:
      nextApproverId = record.issuer_id || null;
      nextApproverName = record.issuer_name || null;
      if (actorMatches(record.issuer_id, actorUserId)) {
        availableActions = [
          MNR_WORKFLOW_ACTION.ISSUE_MAIN,
          MNR_WORKFLOW_ACTION.CANCEL_MAIN,
        ];
      }
      break;
    case MNR_WORKFLOW_STAGE.SUPPLIER:
      if (Boolean(record.report_issuance_8d)) {
        nextApproverId = record.attention_id || null;
        nextApproverName = null;
      } else {
        nextApproverId = record.issuer_id || null;
        nextApproverName = record.issuer_name || null;
      }
      if (Boolean(record.report_issuance_8d) && supplierActorMatches(record, options.actor)) {
        availableActions = [
          MNR_WORKFLOW_ACTION.SAVE_INITIAL_RESPONSE,
          MNR_WORKFLOW_ACTION.SUBMIT_INITIAL_RESPONSE,
        ];
      } else if (!Boolean(record.report_issuance_8d) && actorMatches(record.issuer_id, actorUserId)) {
        availableActions = [MNR_WORKFLOW_ACTION.CLOSE];
      }
      break;
    case MNR_WORKFLOW_STAGE.INITIAL_RESPONSE:
      nextApproverId = record.attention_id || null;
      nextApproverName = null;
      if (supplierActorMatches(record, options.actor)) {
        availableActions = [
          MNR_WORKFLOW_ACTION.SAVE_FINAL_RESPONSE,
          MNR_WORKFLOW_ACTION.SUBMIT_FINAL_RESPONSE,
        ];
      }
      break;
    case MNR_WORKFLOW_STAGE.FINAL_RESPONSE:
      nextApproverId = record.issuer_id || null;
      nextApproverName = record.issuer_name || null;
      if (actorMatches(record.issuer_id, actorUserId)) {
        availableActions = [
          MNR_WORKFLOW_ACTION.SAVE_RESPONSE_REVIEW,
          MNR_WORKFLOW_ACTION.SUBMIT_RESPONSE_REVIEW,
        ];
      }
      break;
    case MNR_WORKFLOW_STAGE.ISSUER_2ND:
      nextApproverId = record.issuer_id || null;
      nextApproverName = record.issuer_name || null;
      if (actorMatches(record.issuer_id, actorUserId)) {
        availableActions = [
          MNR_WORKFLOW_ACTION.SAVE_RESPONSE_REVIEW,
          MNR_WORKFLOW_ACTION.SUBMIT_RESPONSE_REVIEW,
          MNR_WORKFLOW_ACTION.REJECT_RESPONSE,
        ];
      }
      break;
    case MNR_WORKFLOW_STAGE.CHECKER_2ND:
      nextApproverId = cycle2Checker.id;
      nextApproverName = cycle2Checker.name;
      if (actorMatches(cycle2Checker.id, actorUserId)) {
        availableActions = [
          MNR_WORKFLOW_ACTION.CHECK_RESPONSE,
          MNR_WORKFLOW_ACTION.REJECT_RESPONSE,
        ];
      }
      break;
    case MNR_WORKFLOW_STAGE.APPROVER_2ND:
      nextApproverId = cycle2Approver.id;
      nextApproverName = cycle2Approver.name;
      if (actorMatches(cycle2Approver.id, actorUserId)) {
        availableActions = [
          MNR_WORKFLOW_ACTION.APPROVE_RESPONSE,
          MNR_WORKFLOW_ACTION.REJECT_RESPONSE,
        ];
      }
      break;
    case MNR_WORKFLOW_STAGE.ISSUER_3RD:
      nextApproverId = record.issuer_id || null;
      nextApproverName = record.issuer_name || null;
      if (actorMatches(record.issuer_id, actorUserId)) {
        availableActions = [
          MNR_WORKFLOW_ACTION.ACCEPT_RESPONSE,
          MNR_WORKFLOW_ACTION.NOT_ACCEPT_RESPONSE,
        ];
      }
      break;
    case MNR_WORKFLOW_STAGE.REJECT_ISSUER_2ND:
    case MNR_WORKFLOW_STAGE.NOT_ACCEPT:
      nextApproverId = record.attention_id || null;
      nextApproverName = null;
      if (supplierActorMatches(record, options.actor)) {
        availableActions = [
          MNR_WORKFLOW_ACTION.SAVE_INITIAL_RESPONSE,
          MNR_WORKFLOW_ACTION.SUBMIT_INITIAL_RESPONSE,
        ];
      }
      break;
    case MNR_WORKFLOW_STAGE.REJECT_CHECKER_2ND:
    case MNR_WORKFLOW_STAGE.REJECT_APPROVER_2ND:
      nextApproverId = record.issuer_id || null;
      nextApproverName = record.issuer_name || null;
      if (actorMatches(record.issuer_id, actorUserId)) {
        availableActions = [
          MNR_WORKFLOW_ACTION.SAVE_RESPONSE_REVIEW,
          MNR_WORKFLOW_ACTION.SUBMIT_RESPONSE_REVIEW,
        ];
      }
      break;
    default:
      break;
  }

  return {
    workflowStage: stage,
    workflowStageCode: MNR_LEGACY_STAGE_CODE[stage],
    workflowStageName: stage,
    workflowStageLabel: MNR_STAGE_LABEL[stage],
    availableActions,
    nextApproverId,
    nextApproverName,
  };
}
