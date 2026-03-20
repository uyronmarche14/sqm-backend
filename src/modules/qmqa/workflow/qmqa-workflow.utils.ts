import {
  QMQA_LEGACY_STAGE_CODE,
  QMQA_STAGE_LABEL,
  QMQA_WORKFLOW_ACTION,
  QMQA_WORKFLOW_STAGE,
  type QmqaWorkflowAction,
  type QmqaWorkflowStage,
} from './qmqa-workflow.constants.js';

type Nullable<T> = T | null | undefined;

export interface QmqaWorkflowActorContext {
  userId?: string | null;
  supplierIds?: string[];
  roleName?: string | null;
}

export interface QmqaWorkflowRecordLike {
  request_status?: string | number | null;
  supplier_id?: Nullable<string>;
  encoder_id?: Nullable<string>;
  encoder_name?: Nullable<string>;
  issuer_id?: Nullable<string>;
  issuer_name?: Nullable<string>;
  issuer_date?: Nullable<string | Date>;
  issuer_remarks?: Nullable<string>;
  checker_id?: Nullable<string>;
  checker_name?: Nullable<string>;
  checker_date?: Nullable<string | Date>;
  checker_remarks?: Nullable<string>;
  approver_id?: Nullable<string>;
  approver_name?: Nullable<string>;
  approver_date?: Nullable<string | Date>;
  approver_remarks?: Nullable<string>;
  attention_id?: Nullable<string>;
  attention_name?: Nullable<string>;
}

export interface QmqaWorkflowResponseLike {
  checker_id?: Nullable<string>;
  checker_name?: Nullable<string>;
  checker_date?: Nullable<string | Date>;
  checker_remarks?: Nullable<string>;
  approver_id?: Nullable<string>;
  approver_name?: Nullable<string>;
  approver_date?: Nullable<string | Date>;
  approver_remarks?: Nullable<string>;
  issuer_date?: Nullable<string | Date>;
  issuer_remarks?: Nullable<string>;
  accept_date?: Nullable<string | Date>;
}

export interface QmqaWorkflowMetadata {
  workflowStage: QmqaWorkflowStage;
  workflowStageCode: string;
  workflowStageName: QmqaWorkflowStage;
  workflowStageLabel: string;
  availableActions: QmqaWorkflowAction[];
  nextApproverId: string | null;
  nextApproverName: string | null;
}

const DIRECT_STAGE_BY_STATUS: Record<string, QmqaWorkflowStage> = {
  DR: QMQA_WORKFLOW_STAGE.DRAFT,
  AP: QMQA_WORKFLOW_STAGE.ISSUER,
  IS: QMQA_WORKFLOW_STAGE.SUPPLIER,
  WI: QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE,
  WF: QMQA_WORKFLOW_STAGE.FINAL_RESPONSE,
  CA: QMQA_WORKFLOW_STAGE.CANCEL,
  CC: QMQA_WORKFLOW_STAGE.CANCEL,
  CL: QMQA_WORKFLOW_STAGE.ACCEPT,
  CANCEL: QMQA_WORKFLOW_STAGE.CANCEL,
  CANCELLED: QMQA_WORKFLOW_STAGE.CANCEL,
  CLOSED: QMQA_WORKFLOW_STAGE.ACCEPT,
  APPROVED: QMQA_WORKFLOW_STAGE.ISSUER,
  ISSUED: QMQA_WORKFLOW_STAGE.SUPPLIER,
  WITH_INITIAL_REPORT: QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE,
  WITH_FINAL_REPORT: QMQA_WORKFLOW_STAGE.FINAL_RESPONSE,
  ACCEPT: QMQA_WORKFLOW_STAGE.ACCEPT,
  ACCEPTED: QMQA_WORKFLOW_STAGE.ACCEPT,
};

const QUEUE_STAGE_BY_STATUS: Record<string, QmqaWorkflowStage> = {
  SU: QMQA_WORKFLOW_STAGE.CHECKER,
  AC: QMQA_WORKFLOW_STAGE.CHECKER,
  AA: QMQA_WORKFLOW_STAGE.CHECKER,
  SUBMITTED: QMQA_WORKFLOW_STAGE.CHECKER,
  AWAITING_CHECKED: QMQA_WORKFLOW_STAGE.CHECKER,
  AWAITING_APPROVAL: QMQA_WORKFLOW_STAGE.APPROVER,
  CHECKED: QMQA_WORKFLOW_STAGE.APPROVER,
  CK: QMQA_WORKFLOW_STAGE.APPROVER,
};

const REJECT_STAGE_BY_STATUS: Record<string, QmqaWorkflowStage> = {
  RE: QMQA_WORKFLOW_STAGE.REJECT_CHECKER,
  RR: QMQA_WORKFLOW_STAGE.REJECT_APPROVER,
  REJECTED: QMQA_WORKFLOW_STAGE.REJECT_CHECKER,
};

function actorMatches(actorId: Nullable<string>, userId?: Nullable<string>) {
  return Boolean(actorId && userId && actorId === userId);
}

function hasValue(value: Nullable<string | Date>) {
  return Boolean(value);
}

export function isQmqaSupplierActor(
  record: { attention_id?: string | null; supplier_id?: string | null },
  actor?: QmqaWorkflowActorContext,
) {
  return (
    actorMatches(record.attention_id, actor?.userId) ||
    Boolean(
      record.supplier_id &&
      actor?.supplierIds?.length &&
      actor.supplierIds.includes(record.supplier_id),
    )
  );
}

function resolveLegacyQueueStageFromResponse(
  raw: string,
  response?: QmqaWorkflowResponseLike | null,
) {
  if (raw === 'RA' || raw === 'RESPONSE_AWAIT_APPROVAL' || raw === 'RESPONSE_AWAITING_APPROVAL') {
    if (hasValue(response?.approver_date)) {
      return QMQA_WORKFLOW_STAGE.ISSUER_3RD;
    }

    if (hasValue(response?.checker_date)) {
      return QMQA_WORKFLOW_STAGE.APPROVER_2ND;
    }

    if (hasValue(response?.issuer_date)) {
      return QMQA_WORKFLOW_STAGE.CHECKER_2ND;
    }

    return QMQA_WORKFLOW_STAGE.CHECKER_2ND;
  }

  if (raw === 'RJ' || raw === 'RESPONSE_REJECTED') {
    if (hasValue(response?.approver_date)) {
      return QMQA_WORKFLOW_STAGE.NOT_ACCEPT;
    }

    if (hasValue(response?.checker_date)) {
      return QMQA_WORKFLOW_STAGE.REJECT_APPROVER_2ND;
    }

    if (hasValue(response?.issuer_date)) {
      return QMQA_WORKFLOW_STAGE.REJECT_CHECKER_2ND;
    }

    return QMQA_WORKFLOW_STAGE.REJECT_SUPPLIER;
  }

  return null;
}

function resolveLegacyRejectStage(record: QmqaWorkflowRecordLike) {
  if (hasValue(record.approver_date) || hasValue(record.approver_remarks)) {
    return QMQA_WORKFLOW_STAGE.REJECT_APPROVER;
  }

  return QMQA_WORKFLOW_STAGE.REJECT_CHECKER;
}

export function normalizeQmqaWorkflowStage(
  value: string | number | null | undefined,
  response?: QmqaWorkflowResponseLike | null,
  record?: QmqaWorkflowRecordLike | null,
): QmqaWorkflowStage {
  if (value === null || value === undefined || value === '') {
    return QMQA_WORKFLOW_STAGE.DRAFT;
  }

  const raw = String(value).trim();

  for (const [stage, code] of Object.entries(QMQA_LEGACY_STAGE_CODE)) {
    if (code === raw) {
      return stage as QmqaWorkflowStage;
    }
  }

  const upperRaw = raw.toUpperCase();
  const directStage = DIRECT_STAGE_BY_STATUS[upperRaw];
  if (directStage) {
    return directStage;
  }

  const queueStage = QUEUE_STAGE_BY_STATUS[upperRaw];
  if (queueStage) {
    return queueStage;
  }

  const cycle2Stage = resolveLegacyQueueStageFromResponse(upperRaw, response);
  if (cycle2Stage) {
    return cycle2Stage;
  }

  if (upperRaw in REJECT_STAGE_BY_STATUS) {
    return record ? resolveLegacyRejectStage(record) : REJECT_STAGE_BY_STATUS[upperRaw]!;
  }

  return QMQA_WORKFLOW_STAGE.DRAFT;
}

export function getQmqaCompatibilityStatus(
  stageOrValue: QmqaWorkflowStage | string | number | null | undefined,
  response?: QmqaWorkflowResponseLike | null,
  record?: QmqaWorkflowRecordLike | null,
) {
  const stage = Object.values(QMQA_WORKFLOW_STAGE).includes(stageOrValue as QmqaWorkflowStage)
    ? (stageOrValue as QmqaWorkflowStage)
    : normalizeQmqaWorkflowStage(stageOrValue, response, record);

  switch (stage) {
    case QMQA_WORKFLOW_STAGE.ACCEPT:
      return 'CLOSED';
    case QMQA_WORKFLOW_STAGE.DRAFT:
      return 'DRAFT';
    case QMQA_WORKFLOW_STAGE.CHECKER:
      return 'AWAITING_CHECKED';
    case QMQA_WORKFLOW_STAGE.APPROVER:
      return 'AWAITING_APPROVAL';
    case QMQA_WORKFLOW_STAGE.REJECT_CHECKER:
    case QMQA_WORKFLOW_STAGE.REJECT_APPROVER:
      return 'REJECTED';
    case QMQA_WORKFLOW_STAGE.CANCEL:
      return 'CANCELLED';
    case QMQA_WORKFLOW_STAGE.ISSUER:
      return 'APPROVED';
    case QMQA_WORKFLOW_STAGE.SUPPLIER:
      return 'ISSUED';
    case QMQA_WORKFLOW_STAGE.REJECT_SUPPLIER:
    case QMQA_WORKFLOW_STAGE.REJECT_ISSUER_2ND:
    case QMQA_WORKFLOW_STAGE.REJECT_CHECKER_2ND:
    case QMQA_WORKFLOW_STAGE.REJECT_APPROVER_2ND:
    case QMQA_WORKFLOW_STAGE.NOT_ACCEPT:
      return 'RESPONSE_REJECTED';
    case QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE:
      return 'WITH_INITIAL_REPORT';
    case QMQA_WORKFLOW_STAGE.FINAL_RESPONSE:
      return 'WITH_FINAL_REPORT';
    case QMQA_WORKFLOW_STAGE.ISSUER_2ND:
    case QMQA_WORKFLOW_STAGE.CHECKER_2ND:
    case QMQA_WORKFLOW_STAGE.APPROVER_2ND:
    case QMQA_WORKFLOW_STAGE.ISSUER_3RD:
      return 'RESPONSE_AWAIT_APPROVAL';
    default:
      return 'DRAFT';
  }
}

function resolveCycle2Checker(response?: QmqaWorkflowResponseLike | null) {
  return {
    id: response?.checker_id || null,
    name: response?.checker_name || null,
  };
}

function resolveCycle2Approver(response?: QmqaWorkflowResponseLike | null) {
  return {
    id: response?.approver_id || null,
    name: response?.approver_name || null,
  };
}

export function buildQmqaWorkflowMetadata(
  record: QmqaWorkflowRecordLike,
  options: {
    latestResponse?: QmqaWorkflowResponseLike | null;
    actor?: QmqaWorkflowActorContext;
  } = {},
): QmqaWorkflowMetadata {
  const latestResponse = options.latestResponse || null;
  const stage = normalizeQmqaWorkflowStage(record.request_status, latestResponse, record);
  const actorUserId = options.actor?.userId || null;
  const cycle2Checker = resolveCycle2Checker(latestResponse);
  const cycle2Approver = resolveCycle2Approver(latestResponse);

  let nextApproverId: string | null = null;
  let nextApproverName: string | null = null;
  let availableActions: QmqaWorkflowAction[] = [];

  switch (stage) {
    case QMQA_WORKFLOW_STAGE.DRAFT:
      nextApproverId = record.checker_id || null;
      nextApproverName = record.checker_name || null;
      if (
        actorMatches(record.issuer_id, actorUserId) ||
        actorMatches(record.encoder_id, actorUserId)
      ) {
        availableActions = [
          QMQA_WORKFLOW_ACTION.SUBMIT_MAIN,
          QMQA_WORKFLOW_ACTION.CANCEL_MAIN,
        ];
      }
      break;
    case QMQA_WORKFLOW_STAGE.CHECKER:
      nextApproverId = record.checker_id || null;
      nextApproverName = record.checker_name || null;
      if (actorMatches(record.checker_id, actorUserId)) {
        availableActions = [
          QMQA_WORKFLOW_ACTION.CHECK_MAIN,
          QMQA_WORKFLOW_ACTION.REJECT_MAIN,
        ];
      }
      break;
    case QMQA_WORKFLOW_STAGE.APPROVER:
      nextApproverId = record.approver_id || null;
      nextApproverName = record.approver_name || null;
      if (actorMatches(record.approver_id, actorUserId)) {
        availableActions = [
          QMQA_WORKFLOW_ACTION.APPROVE_MAIN,
          QMQA_WORKFLOW_ACTION.REJECT_MAIN,
        ];
      }
      break;
    case QMQA_WORKFLOW_STAGE.REJECT_CHECKER:
    case QMQA_WORKFLOW_STAGE.REJECT_APPROVER:
      nextApproverId = record.issuer_id || record.encoder_id || null;
      nextApproverName = record.issuer_name || record.encoder_name || null;
      if (
        actorMatches(record.issuer_id, actorUserId) ||
        actorMatches(record.encoder_id, actorUserId)
      ) {
        availableActions = [QMQA_WORKFLOW_ACTION.SUBMIT_MAIN];
      }
      break;
    case QMQA_WORKFLOW_STAGE.ISSUER:
      nextApproverId = record.issuer_id || null;
      nextApproverName = record.issuer_name || null;
      if (actorMatches(record.issuer_id, actorUserId)) {
        availableActions = [
          QMQA_WORKFLOW_ACTION.ISSUE_MAIN,
          QMQA_WORKFLOW_ACTION.CANCEL_MAIN,
        ];
      }
      break;
    case QMQA_WORKFLOW_STAGE.SUPPLIER:
    case QMQA_WORKFLOW_STAGE.REJECT_SUPPLIER:
      nextApproverId = record.attention_id || null;
      nextApproverName = record.attention_name || null;
      if (isQmqaSupplierActor(record, options.actor)) {
        availableActions = [
          QMQA_WORKFLOW_ACTION.SAVE_RESPONSE,
          QMQA_WORKFLOW_ACTION.SUBMIT_INITIAL_RESPONSE,
        ];
      }
      break;
    case QMQA_WORKFLOW_STAGE.INITIAL_RESPONSE:
      nextApproverId = record.attention_id || null;
      nextApproverName = record.attention_name || null;
      if (isQmqaSupplierActor(record, options.actor)) {
        availableActions = [
          QMQA_WORKFLOW_ACTION.SAVE_RESPONSE,
          QMQA_WORKFLOW_ACTION.SUBMIT_FINAL_RESPONSE,
        ];
      }
      break;
    case QMQA_WORKFLOW_STAGE.FINAL_RESPONSE:
      nextApproverId = record.issuer_id || null;
      nextApproverName = record.issuer_name || null;
      if (actorMatches(record.issuer_id, actorUserId)) {
        availableActions = [
          QMQA_WORKFLOW_ACTION.SAVE_RESPONSE_REVIEW,
          QMQA_WORKFLOW_ACTION.SUBMIT_RESPONSE_REVIEW,
        ];
      }
      break;
    case QMQA_WORKFLOW_STAGE.ISSUER_2ND:
      nextApproverId = record.issuer_id || null;
      nextApproverName = record.issuer_name || null;
      if (actorMatches(record.issuer_id, actorUserId)) {
        availableActions = [
          QMQA_WORKFLOW_ACTION.SAVE_RESPONSE_REVIEW,
          QMQA_WORKFLOW_ACTION.SUBMIT_RESPONSE_REVIEW,
          QMQA_WORKFLOW_ACTION.REJECT_RESPONSE,
        ];
      }
      break;
    case QMQA_WORKFLOW_STAGE.CHECKER_2ND:
      nextApproverId = cycle2Checker.id;
      nextApproverName = cycle2Checker.name;
      if (actorMatches(cycle2Checker.id, actorUserId)) {
        availableActions = [
          QMQA_WORKFLOW_ACTION.CHECK_RESPONSE,
          QMQA_WORKFLOW_ACTION.REJECT_RESPONSE,
        ];
      }
      break;
    case QMQA_WORKFLOW_STAGE.APPROVER_2ND:
      nextApproverId = cycle2Approver.id;
      nextApproverName = cycle2Approver.name;
      if (actorMatches(cycle2Approver.id, actorUserId)) {
        availableActions = [
          QMQA_WORKFLOW_ACTION.APPROVE_RESPONSE,
          QMQA_WORKFLOW_ACTION.REJECT_RESPONSE,
        ];
      }
      break;
    case QMQA_WORKFLOW_STAGE.ISSUER_3RD:
      nextApproverId = record.issuer_id || null;
      nextApproverName = record.issuer_name || null;
      if (actorMatches(record.issuer_id, actorUserId)) {
        availableActions = [
          QMQA_WORKFLOW_ACTION.ACCEPT_RESPONSE,
          QMQA_WORKFLOW_ACTION.NOT_ACCEPT_RESPONSE,
        ];
      }
      break;
    case QMQA_WORKFLOW_STAGE.REJECT_ISSUER_2ND:
    case QMQA_WORKFLOW_STAGE.NOT_ACCEPT:
      nextApproverId = record.attention_id || null;
      nextApproverName = record.attention_name || null;
      if (isQmqaSupplierActor(record, options.actor)) {
        availableActions = [
          QMQA_WORKFLOW_ACTION.SAVE_RESPONSE,
          QMQA_WORKFLOW_ACTION.SUBMIT_FINAL_RESPONSE,
        ];
      }
      break;
    case QMQA_WORKFLOW_STAGE.REJECT_CHECKER_2ND:
    case QMQA_WORKFLOW_STAGE.REJECT_APPROVER_2ND:
      nextApproverId = record.issuer_id || null;
      nextApproverName = record.issuer_name || null;
      if (actorMatches(record.issuer_id, actorUserId)) {
        availableActions = [
          QMQA_WORKFLOW_ACTION.SAVE_RESPONSE_REVIEW,
          QMQA_WORKFLOW_ACTION.SUBMIT_RESPONSE_REVIEW,
        ];
      }
      break;
    default:
      break;
  }

  return {
    workflowStage: stage,
    workflowStageCode: QMQA_LEGACY_STAGE_CODE[stage],
    workflowStageName: stage,
    workflowStageLabel: QMQA_STAGE_LABEL[stage],
    availableActions,
    nextApproverId,
    nextApproverName,
  };
}

const STATUS_FILTERS: Record<string, string[]> = {
  DRAFT: ['2', 'DR'],
  REJECTED: ['5', '6', 'RE', 'RR'],
  AWAITING_APPROVAL: ['4', 'CK'],
  AWAITING_CHECKED: ['3', 'AA', 'AC', 'SU'],
  APPROVED: ['10', 'AP'],
  ISSUED: ['11', 'IS'],
  WITH_INITIAL_REPORT: ['13', 'WI'],
  WITH_FINAL_REPORT: ['14', 'WF'],
  RESPONSE_AWAIT_APPROVAL: ['16', '17', 'RA'],
  RESPONSE_AWAITING_APPROVAL: ['16', '17', 'RA'],
  RESPONSE_AWAITING_CHECKED: ['16', 'RA'],
  RESPONSE_REJECTED: ['12', '20', '21', '22', '24', 'RJ'],
  CANCEL: ['9', 'CA', 'CC'],
  CLOSED: ['1', 'CL'],
  ACCEPT: ['1', 'CL'],
  ACCEPTED: ['1', 'CL'],
};

export function resolveQmqaStatusFilter(status?: string | string[] | null) {
  if (!status) {
    return undefined;
  }

  const requested = Array.isArray(status)
    ? status.flatMap((s) => s.split(',')).map((s) => s.trim()).filter(Boolean)
    : status
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

  const mapped = new Set<string>();

  for (const entry of requested) {
    const upperEntry = entry.toUpperCase();
    const values = STATUS_FILTERS[upperEntry];

    if (values?.length) {
      for (const value of values) {
        mapped.add(value);
      }
      continue;
    }

    mapped.add(entry);
  }

  if (mapped.size === 0) {
    return undefined;
  }

  return Array.from(mapped);
}
