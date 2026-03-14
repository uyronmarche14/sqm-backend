export const SQPR_WORKFLOW_STAGE = {
  UNKNOWN: 'UNKNOWN',
  DRAFT: 'DRAFT',
  CHECKER: 'CHECKER',
  APPROVER: 'APPROVER',
  REJECT_CHECKER: 'REJECT_CHECKER',
  REJECT_APPROVER: 'REJECT_APPROVER',
  ISSUER: 'ISSUER',
  ACCEPT: 'ACCEPT',
} as const;

export type SqprWorkflowStage =
  (typeof SQPR_WORKFLOW_STAGE)[keyof typeof SQPR_WORKFLOW_STAGE];

export const SQPR_LEGACY_STAGE_CODE: Record<SqprWorkflowStage, string> = {
  UNKNOWN: '0',
  DRAFT: '2',
  CHECKER: '3',
  APPROVER: '4',
  REJECT_CHECKER: '5',
  REJECT_APPROVER: '6',
  ISSUER: '10',
  ACCEPT: '1',
};

export const SQPR_WORKFLOW_ACTION = {
  SAVE: 'save',
  SUBMIT: 'submit',
  DELETE: 'delete',
  CHECK: 'check',
  APPROVE: 'approve',
  REJECT: 'reject',
  RESUBMIT: 'resubmit',
  ISSUE: 'issue',
} as const;

export type SqprWorkflowAction =
  (typeof SQPR_WORKFLOW_ACTION)[keyof typeof SQPR_WORKFLOW_ACTION];

export const SQPR_STAGE_LABEL: Record<SqprWorkflowStage, string> = {
  UNKNOWN: 'Unknown',
  DRAFT: 'Draft',
  CHECKER: 'Awaiting Checker',
  APPROVER: 'Awaiting Approver',
  REJECT_CHECKER: 'Rejected by Checker',
  REJECT_APPROVER: 'Rejected by Approver',
  ISSUER: 'Awaiting Issue',
  ACCEPT: 'Issued',
};

export const SQPR_LEGACY_FORM_CODE = {
  DRAFT: 'SQPR-03-01',
  AWAITING_APPROVAL: 'SQPR-03-02',
  REJECTED: 'SQPR-03-03',
  TRACKING: 'SQPR-03-04',
} as const;

export const SQPR_LEGACY_QUEUE_STAGE = {
  AWAITING_APPROVAL: '7',
  REJECTED: '8',
} as const;
