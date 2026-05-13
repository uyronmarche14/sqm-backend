type Nullable<T> = T | null | undefined;

export type SpcTrendWorkflowStage =
  | 'DRAFT'
  | 'CHECKER'
  | 'APPROVER'
  | 'REJECT_CHECKER'
  | 'REJECT_APPROVER'
  | 'ISSUER'
  | 'ISSUED';

export type SpcTrendWorkflowAction =
  | 'save'
  | 'submit'
  | 'resubmit'
  | 'check'
  | 'approve'
  | 'reject'
  | 'issue';

export interface SpcTrendWorkflowRecordLike {
  request_status?: Nullable<string>;
  incharge_id?: Nullable<string>;
  checker_id?: Nullable<string>;
  approver_id?: Nullable<string>;
}

function normalizeStatus(value: Nullable<string>) {
  return String(value || '').trim().toUpperCase();
}

export function normalizeSpcTrendWorkflowStage(
  requestStatus: Nullable<string>,
  record?: Pick<SpcTrendWorkflowRecordLike, 'checker_id' | 'approver_id'>,
): SpcTrendWorkflowStage {
  switch (normalizeStatus(requestStatus)) {
    case '2':
    case 'DR':
    case 'DRAFT':
      return 'DRAFT';
    case '3':
    case 'SU':
    case 'SUBMITTED':
    case 'AWAITING_CHECKED':
      return 'CHECKER';
    case '4':
    case 'CHECKED':
    case 'AWAITING_APPROVAL':
      return 'APPROVER';
    case '5':
      return 'REJECT_CHECKER';
    case '6':
    case 'REJECTED':
      return record?.approver_id ? 'REJECT_APPROVER' : 'REJECT_CHECKER';
    case '10':
    case 'APPROVED':
      return 'ISSUER';
    case '1':
    case 'ISSUED':
      return 'ISSUED';
    default:
      return 'DRAFT';
  }
}

export function getSpcTrendCompatibilityStatus(
  requestStatus: Nullable<string>,
  record?: Pick<SpcTrendWorkflowRecordLike, 'checker_id' | 'approver_id'>,
) {
  const stage = normalizeSpcTrendWorkflowStage(requestStatus, record);
  switch (stage) {
    case 'DRAFT':
      return 'DRAFT';
    case 'CHECKER':
      return 'AWAITING_CHECKED';
    case 'APPROVER':
      return 'AWAITING_APPROVAL';
    case 'REJECT_CHECKER':
    case 'REJECT_APPROVER':
      return 'REJECTED';
    case 'ISSUER':
      return 'APPROVED';
    case 'ISSUED':
      return 'ISSUED';
  }
}

export function getSpcTrendStageOwnerId(record: SpcTrendWorkflowRecordLike) {
  const stage = normalizeSpcTrendWorkflowStage(record.request_status, record);
  switch (stage) {
    case 'DRAFT':
    case 'REJECT_CHECKER':
    case 'REJECT_APPROVER':
    case 'ISSUER':
    case 'ISSUED':
      return record.incharge_id || null;
    case 'CHECKER':
      return record.checker_id || null;
    case 'APPROVER':
      return record.approver_id || null;
  }
}

function getWorkflowStageLabel(stage: SpcTrendWorkflowStage) {
  switch (stage) {
    case 'DRAFT':
      return 'Draft';
    case 'CHECKER':
      return 'Awaiting Checked';
    case 'APPROVER':
      return 'Awaiting Approval';
    case 'REJECT_CHECKER':
      return 'Rejected by Checker';
    case 'REJECT_APPROVER':
      return 'Rejected by Approver';
    case 'ISSUER':
      return 'Approved';
    case 'ISSUED':
      return 'Issued';
  }
}

export function buildSpcTrendWorkflowMetadata(
  record: SpcTrendWorkflowRecordLike,
  actor?: { userId?: string | null },
) {
  const stage = normalizeSpcTrendWorkflowStage(record.request_status, record);
  const ownerId = getSpcTrendStageOwnerId(record);
  const actorUserId = actor?.userId || null;
  const isOwner = Boolean(actorUserId && ownerId && actorUserId === ownerId);

  let availableActions: SpcTrendWorkflowAction[] = [];

  switch (stage) {
    case 'DRAFT':
      if (isOwner) availableActions = ['save', 'submit'];
      break;
    case 'REJECT_CHECKER':
    case 'REJECT_APPROVER':
      if (isOwner) availableActions = ['save', 'resubmit', 'submit'];
      break;
    case 'CHECKER':
      if (isOwner) availableActions = ['check', 'reject'];
      break;
    case 'APPROVER':
      if (isOwner) availableActions = ['approve', 'reject'];
      break;
    case 'ISSUER':
      if (isOwner) availableActions = ['issue'];
      break;
    case 'ISSUED':
      availableActions = [];
      break;
  }

  return {
    workflowStage: stage,
    workflowStageLabel: getWorkflowStageLabel(stage),
    availableActions,
  };
}
