import {
  FIVE_M1E_WORKFLOW_ACTION,
  FIVE_M1E_WORKFLOW_STAGE,
  FIVE_M1E_WORKFLOW_STAGE_CODE,
  FIVE_M1E_WORKFLOW_STAGE_LABEL,
  FiveM1EWorkflowAction,
  FiveM1EWorkflowStage,
} from './fiveM1E-workflow.constants.js';

type RecordLike = Record<string, unknown>;

type ActorContext = {
  actorUserId?: string;
  owner?: {
    id: string | null;
    name: string | null;
  };
  ownerMode?: FiveM1EWorkflowOwnerMode;
  eligibleActorUserIds?: string[];
  actorHasStageAccess?: boolean;
};

const CIP_SITE_ID = '9E8EDBF4-A226-48F7-A780-A8B82CD13A50';
const CLASS_C_ID = '10C66925-75F6-41C6-AEBC-8D6DE526800A';

export type FiveM1EWorkflowMetadata = {
  workflowStage: FiveM1EWorkflowStage;
  workflowStageCode: string;
  workflowStageLabel: string;
  availableActions: FiveM1EWorkflowAction[];
  nextApproverId: string | null;
  nextApproverName: string | null;
  ownerMode: FiveM1EWorkflowOwnerMode;
};

export type FiveM1EWorkflowOwnerMode =
  | 'assigned'
  | 'role-fallback'
  | 'shared-queue'
  | 'unresolved';

function getValue(record: RecordLike, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
}

function getString(record: RecordLike, ...keys: string[]) {
  const value = getValue(record, ...keys);
  return value == null ? undefined : String(value);
}

function getStatus(recordOrStatus: RecordLike | string | undefined) {
  if (!recordOrStatus) return undefined;
  if (typeof recordOrStatus === 'string') {
    return recordOrStatus.toUpperCase();
  }

  return getString(recordOrStatus, 'approval_status', 'status', 'Status')?.toUpperCase();
}

function getBooleanish(record: RecordLike, ...keys: string[]) {
  const value = getValue(record, ...keys);
  if (value == null) return false;

  const normalized = String(value).trim().toLowerCase();
  return normalized === 'yes' || normalized === 'true' || normalized === '1';
}

export function getApprovalSeq(record: RecordLike) {
  const raw = getValue(record, 'approval_seq', 'approvalSeq', 'ApprovalSeq');
  if (raw === undefined || raw === null || raw === '') {
    return undefined;
  }

  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function isDesignRequired(record: RecordLike) {
  return getBooleanish(
    record,
    'ds_checker_necessary',
    'DSCheckerNecessary',
    'ds_approver_necessary',
    'DSAppproverNecessary',
  );
}

export function isEnviRequired(record: RecordLike) {
  return getBooleanish(
    record,
    'envi_checker_necessary',
    'EnviCheckerNecessary',
    'envi_approver_necessary',
    'EnviAppproverNecessary',
  );
}

export function isCipClassC(record: RecordLike) {
  const siteId = getString(record, 'site_id', 'SiteID', 'siteid');
  const classId = getString(record, 'class_id', 'Class', 'class');
  return siteId?.toUpperCase() === CIP_SITE_ID && classId?.toUpperCase() === CLASS_C_ID;
}

export function getPostSqeApprovalSeq(record: RecordLike) {
  if (isDesignRequired(record)) return 10;
  if (isEnviRequired(record)) return 12;
  if (isCipClassC(record)) return 7;
  return 13;
}

export function getPostDesignApprovalSeq(record: RecordLike) {
  if (isEnviRequired(record)) return 12;
  if (isCipClassC(record)) return 7;
  return 13;
}

export function getPostEnviApprovalSeq(record: RecordLike) {
  if (isCipClassC(record)) return 7;
  return 13;
}

export function normalizeFiveM1EWorkflowStage(recordOrStatus: RecordLike | string | undefined) {
  const status = getStatus(recordOrStatus);
  const approvalSeq =
    typeof recordOrStatus === 'object' && recordOrStatus !== null ? getApprovalSeq(recordOrStatus) : undefined;

  switch (status) {
    case 'DRAFT':
      return FIVE_M1E_WORKFLOW_STAGE.DRAFT;
    case 'RAR':
    case 'REJECTED AND REVISED':
    case 'REJECTED/REVISED':
      return FIVE_M1E_WORKFLOW_STAGE.RAR;
    case 'REJECTED':
      return FIVE_M1E_WORKFLOW_STAGE.REJECTED;
    case 'APPROVEDWC':
    case 'APRDWCOND':
    case 'APPROVED W/CONDITION':
    case 'APPROVED W/ CONDITION':
      return FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION;
    case 'APPROVED':
      return approvalSeq === 15 ? FIVE_M1E_WORKFLOW_STAGE.RELEASED : FIVE_M1E_WORKFLOW_STAGE.APPROVED;
    case 'FOR RELEASE':
      return approvalSeq === 8 ? FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE : FIVE_M1E_WORKFLOW_STAGE.UNKNOWN;
    case 'RELEASE':
    case 'RELEASED':
      return FIVE_M1E_WORKFLOW_STAGE.RELEASED;
    case 'SUBMITTED':
      if (approvalSeq === undefined || approvalSeq === 0 || approvalSeq === 1) {
        return FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER;
      }
      return FIVE_M1E_WORKFLOW_STAGE.UNKNOWN;
    case 'CHECKED':
      if (approvalSeq === 2) return FIVE_M1E_WORKFLOW_STAGE.MPD_APPROVER;
      if (approvalSeq === 6) return FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER;
      if (approvalSeq === 7) return FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER;
      return FIVE_M1E_WORKFLOW_STAGE.UNKNOWN;
    case 'FOR APPROVAL':
    case 'FAPPROVED':
      if (approvalSeq === 2) return FIVE_M1E_WORKFLOW_STAGE.MPD_APPROVER;
      if (approvalSeq === 3 || approvalSeq === 4 || approvalSeq === 500) return FIVE_M1E_WORKFLOW_STAGE.REVIEWER;
      if (approvalSeq === 501) return FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC;
      if (approvalSeq === 5) return FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER;
      if (approvalSeq === 6) return FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER;
      if (approvalSeq === 7) return FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER;
      if (approvalSeq === 8) return FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE;
      if (approvalSeq === 10) return FIVE_M1E_WORKFLOW_STAGE.DESIGN_APPROVER;
      if (approvalSeq === 12) return FIVE_M1E_WORKFLOW_STAGE.ENVI_APPROVER;
      if (approvalSeq === 13) return FIVE_M1E_WORKFLOW_STAGE.QA_CHECKER;
      if (approvalSeq === 16) return FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE;
      return FIVE_M1E_WORKFLOW_STAGE.UNKNOWN;
    case 'SUPPLIER UPDATE':
      return FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE;
    default:
      return FIVE_M1E_WORKFLOW_STAGE.UNKNOWN;
  }
}

export function resolveFiveM1EWorkflowStageOwner(record: RecordLike, stage: FiveM1EWorkflowStage) {
  switch (stage) {
    case FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER:
      return {
        id: getString(record, 'mpd_checker', 'MPDChecker', 'mpd_pic', 'MPDPIC') ?? null,
        name: getString(record, 'mpd_checker_name', 'MPDCheckerName', 'mpd_pic_name', 'MPDPICName') ?? null,
      };
    case FIVE_M1E_WORKFLOW_STAGE.MPD_APPROVER:
      return {
        id: getString(record, 'mpd_approver', 'MPDApprover') ?? null,
        name: getString(record, 'mpd_approver_name', 'MPDApproverName') ?? null,
      };
    case FIVE_M1E_WORKFLOW_STAGE.REVIEWER:
      return {
        id: getString(record, 'reviewer', 'Reviewer') ?? null,
        name: getString(record, 'reviewer_full_name', 'reviewer_name', 'ReviewerName') ?? null,
      };
    case FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC:
      return {
        id: getString(record, 'evaluation_ic', 'EvaluationIC') ?? null,
        name: getString(record, 'evaluation_ic_name', 'EvaluationICName') ?? null,
      };
    case FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER:
      return {
        id: getString(record, 'checker', 'Checker') ?? null,
        name: getString(record, 'checker_full_name', 'checker_name', 'CheckerName') ?? null,
      };
    case FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER:
      return {
        id: getString(record, 'approver', 'Approver') ?? null,
        name: getString(record, 'approver_full_name', 'approver_name', 'ApproverName') ?? null,
      };
    case FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER:
      return {
        id: getString(record, 'final_approver', 'FinalApprover') ?? null,
        name: getString(record, 'fa_full_name', 'fa_name', 'FAName') ?? null,
      };
    case FIVE_M1E_WORKFLOW_STAGE.DESIGN_APPROVER:
      return {
        id: getString(record, 'design_approver_id', 'DesignApproverID') ?? null,
        name: getString(record, 'design_approver_id_name', 'design_approver_name', 'DesignApproverName') ?? null,
      };
    case FIVE_M1E_WORKFLOW_STAGE.ENVI_APPROVER:
      return {
        id: getString(record, 'envi_approver_id', 'EnviApproverID') ?? null,
        name: getString(record, 'envi_approver_full_name', 'envi_approve_name', 'EnviApproveName') ?? null,
      };
    case FIVE_M1E_WORKFLOW_STAGE.QA_CHECKER:
      return {
        id: getString(record, 'qa_checker_id', 'QACheckerID') ?? null,
        name: getString(record, 'qa_checker_full_name', 'qa_checker_name', 'QACheckerName') ?? null,
      };
    case FIVE_M1E_WORKFLOW_STAGE.APPROVED:
    case FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION:
      return {
        id: getString(record, 'final_approver', 'FinalApprover') ?? null,
        name: getString(record, 'fa_full_name', 'fa_name', 'FAName') ?? null,
      };
    case FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE:
      return {
        id: getString(record, 'final_approver', 'FinalApprover') ?? null,
        name: getString(record, 'fa_full_name', 'fa_name', 'FAName') ?? null,
      };
    default:
      return {
        id: null,
        name: null,
      };
  }
}

export function getFiveM1EWorkflowStageFormIds(stage: FiveM1EWorkflowStage) {
  switch (stage) {
    case FIVE_M1E_WORKFLOW_STAGE.DRAFT:
      return ['5M1EMAIN-11-01', '5M1ESupplier_Submition'];
    case FIVE_M1E_WORKFLOW_STAGE.RAR:
    case FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE:
      return ['5M1ERAR-06-17', '5M1ESupplier_Submition'];
    case FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER:
    case FIVE_M1E_WORKFLOW_STAGE.MPD_APPROVER:
      return ['5M1EApprovalSecDes-06-17'];
    case FIVE_M1E_WORKFLOW_STAGE.REVIEWER:
    case FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC:
    case FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER:
    case FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER:
    case FIVE_M1E_WORKFLOW_STAGE.FINAL_APPROVER:
    case FIVE_M1E_WORKFLOW_STAGE.DESIGN_APPROVER:
    case FIVE_M1E_WORKFLOW_STAGE.ENVI_APPROVER:
    case FIVE_M1E_WORKFLOW_STAGE.QA_CHECKER:
      return ['5M1EApprovalSecEnvi-06-17', '5M1EApprovalSecQA-06-17'];
    case FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE:
      return ['5M1ERELEASE-06-17', '5M1EApprovalSecSQE-06-17', '5M1EJudgementSec-06-17'];
    case FIVE_M1E_WORKFLOW_STAGE.APPROVED:
      return ['5M1ERELEASE-06-17', '5M1EApprovalSecSQE-06-17', '5M1EJudgementSec-06-17'];
    case FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION:
      return ['5M1ERELEASE-06-17', '5M1EApprovalSecSQE-06-17', '5M1EJudgementSec-06-17'];
    case FIVE_M1E_WORKFLOW_STAGE.RELEASED:
      return ['5M1ERELEASE-06-17', '5M1EJudgementSec-06-17'];
    default:
      return [];
  }
}

export function getFiveM1EWorkflowActionForStage(stage: FiveM1EWorkflowStage): FiveM1EWorkflowAction | null {
  switch (stage) {
    case FIVE_M1E_WORKFLOW_STAGE.DRAFT:
    case FIVE_M1E_WORKFLOW_STAGE.RAR:
    case FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE:
    case FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER:
    case FIVE_M1E_WORKFLOW_STAGE.REVIEWER:
    case FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC:
      return FIVE_M1E_WORKFLOW_ACTION.SUBMIT;
    case FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER:
      return FIVE_M1E_WORKFLOW_ACTION.CHECK;
    case FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER:
      return FIVE_M1E_WORKFLOW_ACTION.APPROVE;
    case FIVE_M1E_WORKFLOW_STAGE.APPROVED:
    case FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION:
    case FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE:
      return FIVE_M1E_WORKFLOW_ACTION.RELEASE;
    default:
      return null;
  }
}

function isAssignedActor(ownerId: string | null, actorUserId?: string) {
  return Boolean(ownerId && actorUserId && ownerId === actorUserId);
}

function isEligibleWorkflowActor(
  ownerId: string | null,
  ownerMode: FiveM1EWorkflowOwnerMode,
  actorUserId?: string,
  eligibleActorUserIds: string[] = [],
) {
  if (!actorUserId) {
    return false;
  }

  if (ownerMode === 'shared-queue') {
    return eligibleActorUserIds.includes(actorUserId);
  }

  return isAssignedActor(ownerId, actorUserId);
}

export function buildFiveM1EWorkflowMetadata(record: RecordLike, context: ActorContext = {}): FiveM1EWorkflowMetadata {
  const workflowStage = normalizeFiveM1EWorkflowStage(record);
  const actorUserId = context.actorUserId;
  const availableActions: FiveM1EWorkflowAction[] = [];
  const createdBy = getString(record, 'CreatedBy', 'created_by');
  const owner = context.owner ?? resolveFiveM1EWorkflowStageOwner(record, workflowStage);
  const ownerMode =
    context.ownerMode ?? (owner.id ? 'assigned' : 'unresolved');
  const actorHasStageAccess = context.actorHasStageAccess ?? true;
  const isActionableActor =
    actorHasStageAccess &&
    isEligibleWorkflowActor(owner.id, ownerMode, actorUserId, context.eligibleActorUserIds);
  const isEditorQueueStage =
    workflowStage === FIVE_M1E_WORKFLOW_STAGE.MPD_CHECKER ||
    workflowStage === FIVE_M1E_WORKFLOW_STAGE.REVIEWER ||
    workflowStage === FIVE_M1E_WORKFLOW_STAGE.EVALUATION_IC;

  if (
    (workflowStage === FIVE_M1E_WORKFLOW_STAGE.DRAFT ||
      workflowStage === FIVE_M1E_WORKFLOW_STAGE.RAR ||
      workflowStage === FIVE_M1E_WORKFLOW_STAGE.SUPPLIER_UPDATE) &&
    actorUserId &&
    createdBy === actorUserId &&
    actorHasStageAccess
  ) {
    availableActions.push(FIVE_M1E_WORKFLOW_ACTION.SUBMIT);
  }

  if (isEditorQueueStage && actorHasStageAccess) {
    availableActions.push(FIVE_M1E_WORKFLOW_ACTION.SUBMIT);
  }

  if (workflowStage === FIVE_M1E_WORKFLOW_STAGE.SQE_CHECKER) {
    if (isActionableActor) {
      availableActions.push(FIVE_M1E_WORKFLOW_ACTION.CHECK, FIVE_M1E_WORKFLOW_ACTION.REJECT);
    }
  }

  if (workflowStage === FIVE_M1E_WORKFLOW_STAGE.SQE_APPROVER) {
    if (isActionableActor) {
      availableActions.push(FIVE_M1E_WORKFLOW_ACTION.APPROVE, FIVE_M1E_WORKFLOW_ACTION.REJECT);
    }
  }

  if (
    (workflowStage === FIVE_M1E_WORKFLOW_STAGE.APPROVED ||
      workflowStage === FIVE_M1E_WORKFLOW_STAGE.APPROVED_WITH_CONDITION ||
      workflowStage === FIVE_M1E_WORKFLOW_STAGE.FOR_RELEASE) &&
    isActionableActor
  ) {
    availableActions.push(FIVE_M1E_WORKFLOW_ACTION.RELEASE);
  }

  return {
    workflowStage,
    workflowStageCode: FIVE_M1E_WORKFLOW_STAGE_CODE[workflowStage],
    workflowStageLabel: FIVE_M1E_WORKFLOW_STAGE_LABEL[workflowStage],
    availableActions,
    nextApproverId: owner.id,
    nextApproverName: owner.name,
    ownerMode,
  };
}
