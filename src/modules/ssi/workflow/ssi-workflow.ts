import type { SsiActorContext, SsiRecord, SsiStatus, SsiWorkflowAction } from '../types/ssi.types.js';

const STATUS_LABELS: Record<SsiStatus, string> = {
  PLANNED: 'Planned',
  DRAFT: 'Draft',
  AWAITING_CHECKED: 'Awaiting Checked',
  AWAITING_APPROVAL: 'Awaiting Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ISSUED: 'Issued',
  WITH_INITIAL_REPORT: 'With Initial Report',
  WITH_FINAL_REPORT: 'With Final Report',
  RESPONSE_AWAIT_APPROVAL: 'Response Awaiting Approval',
  RESPONSE_REJECTED: 'Response Rejected',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

export function getSsiWorkflowStageLabel(status: SsiStatus) {
  return STATUS_LABELS[status] || status;
}

export function getNextStatusForAction(
  currentStatus: SsiStatus,
  action: SsiWorkflowAction,
): SsiStatus {
  switch (action) {
    case 'save-draft':
      return currentStatus === 'PLANNED' ? 'DRAFT' : currentStatus;
    case 'submit':
      return 'AWAITING_CHECKED';
    case 'resubmit':
      return 'AWAITING_CHECKED';
    case 'check':
      return 'AWAITING_APPROVAL';
    case 'approve':
      if (currentStatus === 'RESPONSE_AWAIT_APPROVAL') return 'CLOSED';
      return 'APPROVED';
    case 'reject':
      if (currentStatus === 'RESPONSE_AWAIT_APPROVAL') return 'RESPONSE_REJECTED';
      return 'REJECTED';
    case 'issue':
      return 'ISSUED';
    case 'cancel':
      return 'CANCELLED';
    case 'save-response':
      return currentStatus === 'ISSUED' ? 'WITH_INITIAL_REPORT' : 'WITH_FINAL_REPORT';
    case 'submit-response':
      return 'RESPONSE_AWAIT_APPROVAL';
    case 'review-response':
      return 'CLOSED';
    case 'generate-certificate':
    default:
      return currentStatus;
  }
}

function isSupplierActor(record: SsiRecord, actor: SsiActorContext) {
  return Boolean(actor.userId && actor.supplierIds.includes(record.supplierId));
}

function isIssuer(record: SsiRecord, actor: SsiActorContext) {
  return Boolean(actor.userId && (record.createdBy === actor.userId || record.sqePicId === actor.userId));
}

function isAssignedApprover(record: SsiRecord, actor: SsiActorContext, role: 'CHECKER' | 'APPROVER') {
  return Boolean(
    actor.userId &&
      record.approvers.some((entry) => entry.role === role && entry.userId === actor.userId),
  );
}

export function computeSsiAvailableActions(record: SsiRecord, actor: SsiActorContext): SsiWorkflowAction[] {
  const actions = new Set<SsiWorkflowAction>();
  const status = record.status;

  if (isIssuer(record, actor)) {
    if (status === 'DRAFT') {
      actions.add('save-draft');
      actions.add('submit');
    }
    if (status === 'REJECTED') {
      actions.add('save-draft');
      actions.add('resubmit');
    }
    if (status === 'APPROVED') {
      actions.add('issue');
    }
    if (status === 'ISSUED' || status === 'WITH_INITIAL_REPORT' || status === 'WITH_FINAL_REPORT' || status === 'RESPONSE_REJECTED') {
      actions.add('save-response');
      actions.add('submit-response');
    }
  }

  if (isAssignedApprover(record, actor, 'CHECKER') && status === 'AWAITING_CHECKED') {
    actions.add('check');
    actions.add('reject');
  }

  if (isAssignedApprover(record, actor, 'APPROVER') && status === 'AWAITING_APPROVAL') {
    actions.add('approve');
    actions.add('reject');
  }

  if (isAssignedApprover(record, actor, 'APPROVER') && status === 'RESPONSE_AWAIT_APPROVAL') {
    actions.add('review-response');
    actions.add('approve');
    actions.add('reject');
  }

  if (isSupplierActor(record, actor) && status === 'ISSUED') {
    actions.add('save-response');
    actions.add('submit-response');
  }

  if (status === 'APPROVED' && isIssuer(record, actor)) {
    actions.add('generate-certificate');
  }

  return Array.from(actions);
}

export function getNextApprover(record: SsiRecord) {
  if (record.status === 'AWAITING_CHECKED') {
    const checker = record.approvers.find((entry) => entry.role === 'CHECKER');
    return {
      nextApproverId: checker?.userId || null,
      nextApproverName: checker?.userName || null,
    };
  }

  if (record.status === 'AWAITING_APPROVAL' || record.status === 'RESPONSE_AWAIT_APPROVAL') {
    const approver = record.approvers.find((entry) => entry.role === 'APPROVER');
    return {
      nextApproverId: approver?.userId || null,
      nextApproverName: approver?.userName || null,
    };
  }

  return {
    nextApproverId: null,
    nextApproverName: null,
  };
}
