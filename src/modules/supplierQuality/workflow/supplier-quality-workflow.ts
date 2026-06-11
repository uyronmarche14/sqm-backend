export type SupplierQualityWorkflowStage =
  | 'DRAFT'
  | 'CHECKER'
  | 'APPROVER'
  | 'REJECT_CHECKER'
  | 'REJECT_APPROVER'
  | 'ISSUER'
  | 'ISSUED'
  | 'UNKNOWN';

export type SupplierQualityWorkflowAction =
  | 'save'
  | 'submit'
  | 'resubmit'
  | 'check'
  | 'approve'
  | 'reject'
  | 'issue';

type Nullable<T> = T | null | undefined;

export interface SupplierQualityWorkflowRecordLike {
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

export interface SupplierQualityWorkflowMetadata {
  workflowStage: SupplierQualityWorkflowStage;
  workflowStageCode: string;
  workflowStageLabel: string;
  compatibilityStatus:
    | 'DRAFT'
    | 'AWAITING_CHECKED'
    | 'AWAITING_APPROVAL'
    | 'REJECTED'
    | 'APPROVED'
    | 'ISSUED';
  availableActions: SupplierQualityWorkflowAction[];
  nextApproverId: string | null;
  nextApproverName: string | null;
}

function hasValue(value: Nullable<string | Date>) {
  return value !== null && value !== undefined && value !== '';
}

function actorMatches(actorId: Nullable<string>, userId?: Nullable<string>) {
  return Boolean(actorId && userId && actorId === userId);
}

export function normalizeSupplierQualityWorkflowStage(
  value: string | number | null | undefined,
  record?: SupplierQualityWorkflowRecordLike | null,
): SupplierQualityWorkflowStage {
  const raw = String(value ?? '').trim().toUpperCase();

  switch (raw) {
    case 'CHECKER':
    case '':
    case '2':
    case 'DR':
    case 'DRFT':
    case 'DRAFT':
      if (raw === 'CHECKER') {
        return 'CHECKER';
      }
      return 'DRAFT';
    case 'APPROVER':
    case '3':
    case 'SU':
    case 'SUBM':
    case 'SUBMITTED':
    case 'AC':
    case 'AWAITING_CHECKED':
      if (raw === 'APPROVER') {
        return 'APPROVER';
      }
      return 'CHECKER';
    case 'REJECT_CHECKER':
    case '4':
    case 'CK':
    case 'CHECKED':
    case 'AA':
    case 'AAPPROVAL':
    case 'AWAITING_APPROVAL':
      if (raw === 'REJECT_CHECKER') {
        return 'REJECT_CHECKER';
      }
      return 'APPROVER';
    case 'REJECT_APPROVER':
    case '5':
      if (raw === 'REJECT_APPROVER') {
        return 'REJECT_APPROVER';
      }
      return 'REJECT_CHECKER';
    case 'ISSUER':
    case '6':
      if (raw === 'ISSUER') {
        return 'ISSUER';
      }
      return 'REJECT_APPROVER';
    case '10':
    case 'AP':
    case 'APRV':
    case 'APPROVED':
      return 'ISSUER';
    case '1':
    case 'IS':
    case 'ISSU':
    case 'ISSUED':
      return 'ISSUED';
    case 'RE':
    case 'RJ':
    case 'RJCT':
    case 'REJECTED':
      return hasValue(record?.approver_date) || hasValue(record?.approver_remarks)
        ? 'REJECT_APPROVER'
        : 'REJECT_CHECKER';
    default:
      return 'UNKNOWN';
  }
}

export function getSupplierQualityCompatibilityStatus(
  stageOrStatus: string | number | null | undefined,
  record?: SupplierQualityWorkflowRecordLike | null,
): SupplierQualityWorkflowMetadata['compatibilityStatus'] {
  const stage = normalizeSupplierQualityWorkflowStage(stageOrStatus, record);

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
    default:
      return 'DRAFT';
  }
}

export function getSupplierQualityStageOwnerId(
  record: SupplierQualityWorkflowRecordLike,
  stageOrStatus?: string | number | null,
) {
  const stage = normalizeSupplierQualityWorkflowStage(stageOrStatus ?? record.request_status, record);

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
    default:
      return null;
  }
}

export function buildSupplierQualityWorkflowMetadata(
  record: SupplierQualityWorkflowRecordLike,
  actor?: { userId?: string | null },
): SupplierQualityWorkflowMetadata {
  const stage = normalizeSupplierQualityWorkflowStage(record.request_status, record);
  const actorUserId = actor?.userId || null;

  let availableActions: SupplierQualityWorkflowAction[] = [];
  switch (stage) {
    case 'DRAFT':
      if (actorMatches(record.incharge_id, actorUserId)) {
        availableActions = ['save', 'submit'];
      }
      break;
    case 'CHECKER':
      if (actorMatches(record.checker_id, actorUserId)) {
        availableActions = ['check', 'reject'];
      }
      break;
    case 'APPROVER':
      if (actorMatches(record.approver_id, actorUserId)) {
        availableActions = ['approve', 'reject'];
      }
      break;
    case 'REJECT_CHECKER':
    case 'REJECT_APPROVER':
      if (actorMatches(record.incharge_id, actorUserId)) {
        availableActions = ['save', 'resubmit', 'submit'];
      }
      break;
    case 'ISSUER':
      if (actorMatches(record.incharge_id, actorUserId)) {
        availableActions = ['issue'];
      }
      break;
    default:
      availableActions = [];
  }

  const compatibilityStatus = getSupplierQualityCompatibilityStatus(stage, record);
  const nextApprover =
    stage === 'DRAFT'
      ? { id: record.checker_id || null, name: record.checker_name || null }
      : stage === 'CHECKER'
        ? { id: record.approver_id || null, name: record.approver_name || null }
        : stage === 'APPROVER'
          ? { id: record.incharge_id || null, name: record.incharge_name || null }
          : stage === 'REJECT_CHECKER' || stage === 'REJECT_APPROVER' || stage === 'ISSUER'
            ? { id: record.incharge_id || null, name: record.incharge_name || null }
            : { id: null, name: null };

  return {
    workflowStage: stage,
    workflowStageCode: String(record.request_status || ''),
    workflowStageLabel: compatibilityStatus,
    compatibilityStatus,
    availableActions,
    nextApproverId: nextApprover.id,
    nextApproverName: nextApprover.name,
  };
}
