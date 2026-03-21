import {
  SQPR_LEGACY_FORM_CODE,
  SQPR_LEGACY_QUEUE_STAGE,
  SQPR_LEGACY_STAGE_CODE,
  SQPR_STAGE_LABEL,
  SQPR_WORKFLOW_ACTION,
  SQPR_WORKFLOW_STAGE,
  type SqprWorkflowAction,
  type SqprWorkflowStage,
} from './sqpr-workflow.constants.js';

type Nullable<T> = T | null | undefined;

export interface SqprWorkflowActorContext {
  userId?: string | null;
  roleName?: string | null;
}

export interface SqprWorkflowRecordLike {
  request_status?: string | number | null;
  incharge_id?: Nullable<string>;
  incharge_name?: Nullable<string>;
  incharge_remarks?: Nullable<string>;
  submit_date?: Nullable<string | Date>;
  checker_id?: Nullable<string>;
  checker_name?: Nullable<string>;
  checker_remarks?: Nullable<string>;
  checker_date?: Nullable<string | Date>;
  approver_id?: Nullable<string>;
  approver_name?: Nullable<string>;
  approver_remarks?: Nullable<string>;
  approver_date?: Nullable<string | Date>;
}

export interface SqprWorkflowMetadata {
  workflowStage: SqprWorkflowStage;
  workflowStageCode: string;
  workflowStageName: SqprWorkflowStage;
  workflowStageLabel: string;
  availableActions: SqprWorkflowAction[];
  nextApproverId: string | null;
  nextApproverName: string | null;
}

const DIRECT_STAGE_BY_STATUS: Record<string, SqprWorkflowStage> = {
  DR: SQPR_WORKFLOW_STAGE.DRAFT,
  DRFT: SQPR_WORKFLOW_STAGE.DRAFT,
  DRAFT: SQPR_WORKFLOW_STAGE.DRAFT,
  SU: SQPR_WORKFLOW_STAGE.CHECKER,
  SUBM: SQPR_WORKFLOW_STAGE.CHECKER,
  SUBMITTED: SQPR_WORKFLOW_STAGE.CHECKER,
  AC: SQPR_WORKFLOW_STAGE.CHECKER,
  AWAITING_CHECKED: SQPR_WORKFLOW_STAGE.CHECKER,
  AA: SQPR_WORKFLOW_STAGE.CHECKER,
  AWAITING_APPROVAL: SQPR_WORKFLOW_STAGE.CHECKER,
  CK: SQPR_WORKFLOW_STAGE.APPROVER,
  CHECKED: SQPR_WORKFLOW_STAGE.APPROVER,
  AP: SQPR_WORKFLOW_STAGE.ISSUER,
  APRV: SQPR_WORKFLOW_STAGE.ISSUER,
  APPROVED: SQPR_WORKFLOW_STAGE.ISSUER,
  IS: SQPR_WORKFLOW_STAGE.ACCEPT,
  ISSU: SQPR_WORKFLOW_STAGE.ACCEPT,
  ISSUED: SQPR_WORKFLOW_STAGE.ACCEPT,
  CL: SQPR_WORKFLOW_STAGE.ACCEPT,
  CLOSED: SQPR_WORKFLOW_STAGE.ACCEPT,
};

function actorMatches(actorId: Nullable<string>, userId?: Nullable<string>) {
  return Boolean(actorId && userId && actorId === userId);
}

function hasValue(value: Nullable<string | Date>) {
  return value !== null && value !== undefined && value !== '';
}

function resolveRejectStage(record?: SqprWorkflowRecordLike | null) {
  if (hasValue(record?.approver_date) || hasValue(record?.approver_remarks)) {
    return SQPR_WORKFLOW_STAGE.REJECT_APPROVER;
  }

  return SQPR_WORKFLOW_STAGE.REJECT_CHECKER;
}

function resolveAwaitingStage(record?: SqprWorkflowRecordLike | null) {
  if (hasValue(record?.checker_date) || hasValue(record?.checker_remarks)) {
    return SQPR_WORKFLOW_STAGE.APPROVER;
  }

  return SQPR_WORKFLOW_STAGE.CHECKER;
}

export function normalizeSqprWorkflowStage(
  value: string | number | null | undefined,
  record?: SqprWorkflowRecordLike | null,
): SqprWorkflowStage {
  if (value === null || value === undefined || value === '') {
    return SQPR_WORKFLOW_STAGE.DRAFT;
  }

  const raw = String(value).trim();

  for (const [stage, code] of Object.entries(SQPR_LEGACY_STAGE_CODE)) {
    if (code === raw) {
      return stage as SqprWorkflowStage;
    }
  }

  if (raw === SQPR_LEGACY_QUEUE_STAGE.AWAITING_APPROVAL) {
    return resolveAwaitingStage(record);
  }

  if (raw === SQPR_LEGACY_QUEUE_STAGE.REJECTED) {
    return resolveRejectStage(record);
  }

  const upperRaw = raw.toUpperCase();
  const directStage = DIRECT_STAGE_BY_STATUS[upperRaw];
  if (directStage) {
    return directStage;
  }

  if (upperRaw === 'RE' || upperRaw === 'RJ' || upperRaw === 'RJCT' || upperRaw === 'REJECTED') {
    return resolveRejectStage(record);
  }

  return SQPR_WORKFLOW_STAGE.UNKNOWN;
}

export function getSqprCompatibilityStatus(
  stageOrValue: SqprWorkflowStage | string | number | null | undefined,
  record?: SqprWorkflowRecordLike | null,
) {
  const stage = Object.values(SQPR_WORKFLOW_STAGE).includes(stageOrValue as SqprWorkflowStage)
    ? (stageOrValue as SqprWorkflowStage)
    : normalizeSqprWorkflowStage(stageOrValue, record);

  switch (stage) {
    case SQPR_WORKFLOW_STAGE.DRAFT:
      return 'DRAFT';
    case SQPR_WORKFLOW_STAGE.CHECKER:
    case SQPR_WORKFLOW_STAGE.APPROVER:
      return 'SUBMITTED';
    case SQPR_WORKFLOW_STAGE.REJECT_CHECKER:
    case SQPR_WORKFLOW_STAGE.REJECT_APPROVER:
      return 'REJECTED';
    case SQPR_WORKFLOW_STAGE.ISSUER:
      return 'APPROVED';
    case SQPR_WORKFLOW_STAGE.ACCEPT:
      return 'ISSUED';
    default:
      return 'DRAFT';
  }
}

export function getSqprCompatibilityRequestStatus(
  stageOrValue: SqprWorkflowStage | string | number | null | undefined,
  record?: SqprWorkflowRecordLike | null,
) {
  const stage = Object.values(SQPR_WORKFLOW_STAGE).includes(stageOrValue as SqprWorkflowStage)
    ? (stageOrValue as SqprWorkflowStage)
    : normalizeSqprWorkflowStage(stageOrValue, record);

  switch (stage) {
    case SQPR_WORKFLOW_STAGE.DRAFT:
      return 'DRFT';
    case SQPR_WORKFLOW_STAGE.CHECKER:
    case SQPR_WORKFLOW_STAGE.APPROVER:
      return 'SUBM';
    case SQPR_WORKFLOW_STAGE.REJECT_CHECKER:
    case SQPR_WORKFLOW_STAGE.REJECT_APPROVER:
      return 'RJCT';
    case SQPR_WORKFLOW_STAGE.ISSUER:
      return 'APRV';
    case SQPR_WORKFLOW_STAGE.ACCEPT:
      return 'ISSU';
    default:
      return 'DRFT';
  }
}

export function getSqprLegacyFormCodeForStage(stageOrValue: SqprWorkflowStage | string | number | null | undefined, record?: SqprWorkflowRecordLike | null) {
  const stage = Object.values(SQPR_WORKFLOW_STAGE).includes(stageOrValue as SqprWorkflowStage)
    ? (stageOrValue as SqprWorkflowStage)
    : normalizeSqprWorkflowStage(stageOrValue, record);

  switch (stage) {
    case SQPR_WORKFLOW_STAGE.DRAFT:
      return SQPR_LEGACY_FORM_CODE.DRAFT;
    case SQPR_WORKFLOW_STAGE.CHECKER:
    case SQPR_WORKFLOW_STAGE.APPROVER:
      return SQPR_LEGACY_FORM_CODE.AWAITING_APPROVAL;
    case SQPR_WORKFLOW_STAGE.REJECT_CHECKER:
    case SQPR_WORKFLOW_STAGE.REJECT_APPROVER:
      return SQPR_LEGACY_FORM_CODE.REJECTED;
    case SQPR_WORKFLOW_STAGE.ISSUER:
    case SQPR_WORKFLOW_STAGE.ACCEPT:
      return SQPR_LEGACY_FORM_CODE.TRACKING;
    default:
      return SQPR_LEGACY_FORM_CODE.DRAFT;
  }
}

export function getSqprStageOwnerId(record: SqprWorkflowRecordLike, stageOrValue?: SqprWorkflowStage | string | number | null) {
  const stage = stageOrValue
    ? normalizeSqprWorkflowStage(stageOrValue, record)
    : normalizeSqprWorkflowStage(record.request_status, record);

  switch (stage) {
    case SQPR_WORKFLOW_STAGE.DRAFT:
    case SQPR_WORKFLOW_STAGE.REJECT_CHECKER:
    case SQPR_WORKFLOW_STAGE.REJECT_APPROVER:
    case SQPR_WORKFLOW_STAGE.ISSUER:
      return record.incharge_id || null;
    case SQPR_WORKFLOW_STAGE.CHECKER:
      return record.checker_id || null;
    case SQPR_WORKFLOW_STAGE.APPROVER:
      return record.approver_id || null;
    default:
      return null;
  }
}

function resolveNextApprover(record: SqprWorkflowRecordLike, stage: SqprWorkflowStage) {
  switch (stage) {
    case SQPR_WORKFLOW_STAGE.DRAFT:
      return {
        id: record.checker_id || null,
        name: record.checker_name || null,
      };
    case SQPR_WORKFLOW_STAGE.CHECKER:
      return {
        id: record.checker_id || null,
        name: record.checker_name || null,
      };
    case SQPR_WORKFLOW_STAGE.APPROVER:
      return {
        id: record.approver_id || null,
        name: record.approver_name || null,
      };
    case SQPR_WORKFLOW_STAGE.REJECT_CHECKER:
    case SQPR_WORKFLOW_STAGE.REJECT_APPROVER:
    case SQPR_WORKFLOW_STAGE.ISSUER:
      return {
        id: record.incharge_id || null,
        name: record.incharge_name || null,
      };
    default:
      return {
        id: null,
        name: null,
      };
  }
}

export function buildSqprWorkflowMetadata(
  record: SqprWorkflowRecordLike,
  options: { actor?: SqprWorkflowActorContext } = {},
): SqprWorkflowMetadata {
  const stage = normalizeSqprWorkflowStage(record.request_status, record);
  const actorUserId = options.actor?.userId || null;
  const nextApprover = resolveNextApprover(record, stage);
  let availableActions: SqprWorkflowAction[] = [];

  switch (stage) {
    case SQPR_WORKFLOW_STAGE.DRAFT:
      if (actorMatches(record.incharge_id, actorUserId)) {
        availableActions = [
          SQPR_WORKFLOW_ACTION.SAVE,
          SQPR_WORKFLOW_ACTION.SUBMIT,
          SQPR_WORKFLOW_ACTION.DELETE,
        ];
      }
      break;
    case SQPR_WORKFLOW_STAGE.CHECKER:
      if (actorMatches(record.checker_id, actorUserId)) {
        availableActions = [
          SQPR_WORKFLOW_ACTION.CHECK,
          SQPR_WORKFLOW_ACTION.REJECT,
        ];
      }
      break;
    case SQPR_WORKFLOW_STAGE.APPROVER:
      if (actorMatches(record.approver_id, actorUserId)) {
        availableActions = [
          SQPR_WORKFLOW_ACTION.APPROVE,
          SQPR_WORKFLOW_ACTION.REJECT,
        ];
      }
      break;
    case SQPR_WORKFLOW_STAGE.REJECT_CHECKER:
    case SQPR_WORKFLOW_STAGE.REJECT_APPROVER:
      if (actorMatches(record.incharge_id, actorUserId)) {
        availableActions = [
          SQPR_WORKFLOW_ACTION.SAVE,
          SQPR_WORKFLOW_ACTION.RESUBMIT,
        ];
      }
      break;
    case SQPR_WORKFLOW_STAGE.ISSUER:
      if (actorMatches(record.incharge_id, actorUserId)) {
        availableActions = [SQPR_WORKFLOW_ACTION.ISSUE];
      }
      break;
    default:
      availableActions = [];
  }

  return {
    workflowStage: stage,
    workflowStageCode: SQPR_LEGACY_STAGE_CODE[stage],
    workflowStageName: stage,
    workflowStageLabel: SQPR_STAGE_LABEL[stage],
    availableActions,
    nextApproverId: nextApprover.id,
    nextApproverName: nextApprover.name,
  };
}

export function matchesSqprStatusFilter(
  record: SqprWorkflowRecordLike,
  statusFilter?: string | string[] | null,
) {
  if (!statusFilter) {
    return true;
  }

  const values = Array.isArray(statusFilter)
    ? statusFilter
    : String(statusFilter)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

  if (values.length === 0 || values.includes('all')) {
    return true;
  }

  const stage = normalizeSqprWorkflowStage(record.request_status, record);
  const compatibilityStatus = getSqprCompatibilityStatus(stage, record);
  const compatibilityCode = getSqprCompatibilityRequestStatus(stage, record);
  const legacyFormCode = getSqprLegacyFormCodeForStage(stage, record);
  const isTrackingSurfaceStage =
    stage === SQPR_WORKFLOW_STAGE.ISSUER || stage === SQPR_WORKFLOW_STAGE.ACCEPT;

  return values.some((rawValue) => {
    const value = rawValue.toUpperCase();

    if (value === compatibilityStatus) return true;
    if (value === compatibilityCode) return true;
    if (value === legacyFormCode.toUpperCase()) return true;

    switch (value) {
      case 'DR':
      case 'DRAFT':
        return stage === SQPR_WORKFLOW_STAGE.DRAFT;
      case 'SU':
      case 'SUBMITTED':
      case 'CHECKED':
      case 'CK':
      case 'AWAITING_APPROVAL':
      case 'AWAITING_CHECKED':
        return stage === SQPR_WORKFLOW_STAGE.CHECKER || stage === SQPR_WORKFLOW_STAGE.APPROVER;
      case 'AP':
      case 'APPROVED':
        return stage === SQPR_WORKFLOW_STAGE.ISSUER;
      case 'IS':
      case 'ISSUED':
      case 'TRACKING':
      case 'SEARCH':
      case 'REPORT':
      case 'REPORTS':
      case 'ACHIEVEMENT':
      case 'CLOSED':
        return isTrackingSurfaceStage;
      case 'RJ':
      case 'REJECTED':
        return stage === SQPR_WORKFLOW_STAGE.REJECT_CHECKER || stage === SQPR_WORKFLOW_STAGE.REJECT_APPROVER;
      default:
        return false;
    }
  });
}
