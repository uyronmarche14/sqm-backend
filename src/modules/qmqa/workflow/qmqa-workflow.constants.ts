export const QMQA_WORKFLOW_STAGE = {
  ACCEPT: 'ACCEPT',
  DRAFT: 'DRAFT',
  CHECKER: 'CHECKER',
  APPROVER: 'APPROVER',
  REJECT_CHECKER: 'REJECT_CHECKER',
  REJECT_APPROVER: 'REJECT_APPROVER',
  CANCEL: 'CANCEL',
  ISSUER: 'ISSUER',
  SUPPLIER: 'SUPPLIER',
  REJECT_SUPPLIER: 'REJECT_SUPPLIER',
  INITIAL_RESPONSE: 'INITIAL_RESPONSE',
  FINAL_RESPONSE: 'FINAL_RESPONSE',
  ISSUER_2ND: 'ISSUER_2ND',
  CHECKER_2ND: 'CHECKER_2ND',
  APPROVER_2ND: 'APPROVER_2ND',
  ISSUER_3RD: 'ISSUER_3RD',
  REJECT_ISSUER_2ND: 'REJECT_ISSUER_2ND',
  REJECT_CHECKER_2ND: 'REJECT_CHECKER_2ND',
  REJECT_APPROVER_2ND: 'REJECT_APPROVER_2ND',
  NOT_ACCEPT: 'NOT_ACCEPT',
} as const;

export type QmqaWorkflowStage =
  (typeof QMQA_WORKFLOW_STAGE)[keyof typeof QMQA_WORKFLOW_STAGE];

export const QMQA_LEGACY_STAGE_CODE: Record<QmqaWorkflowStage, string> = {
  ACCEPT: '1',
  DRAFT: '2',
  CHECKER: '3',
  APPROVER: '4',
  REJECT_CHECKER: '5',
  REJECT_APPROVER: '6',
  CANCEL: '9',
  ISSUER: '10',
  SUPPLIER: '11',
  REJECT_SUPPLIER: '12',
  INITIAL_RESPONSE: '13',
  FINAL_RESPONSE: '14',
  ISSUER_2ND: '15',
  CHECKER_2ND: '16',
  APPROVER_2ND: '17',
  ISSUER_3RD: '19',
  REJECT_ISSUER_2ND: '20',
  REJECT_CHECKER_2ND: '21',
  REJECT_APPROVER_2ND: '22',
  NOT_ACCEPT: '24',
};

export const QMQA_WORKFLOW_ACTION = {
  SUBMIT_MAIN: 'submit-main',
  CHECK_MAIN: 'check-main',
  APPROVE_MAIN: 'approve-main',
  REJECT_MAIN: 'reject-main',
  ISSUE_MAIN: 'issue-main',
  CANCEL_MAIN: 'cancel-main',
  SAVE_RESPONSE: 'save-response',
  SUBMIT_INITIAL_RESPONSE: 'submit-initial-response',
  SUBMIT_FINAL_RESPONSE: 'submit-final-response',
  SAVE_RESPONSE_REVIEW: 'save-response-review',
  SUBMIT_RESPONSE_REVIEW: 'submit-response-review',
  CHECK_RESPONSE: 'check-response',
  APPROVE_RESPONSE: 'approve-response',
  REJECT_RESPONSE: 'reject-response',
  ACCEPT_RESPONSE: 'accept-response',
  NOT_ACCEPT_RESPONSE: 'not-accept-response',
} as const;

export type QmqaWorkflowAction =
  (typeof QMQA_WORKFLOW_ACTION)[keyof typeof QMQA_WORKFLOW_ACTION];

export const QMQA_STAGE_LABEL: Record<QmqaWorkflowStage, string> = {
  ACCEPT: 'Accepted',
  DRAFT: 'Draft',
  CHECKER: 'Cycle 1 Checker',
  APPROVER: 'Cycle 1 Approver',
  REJECT_CHECKER: 'Rejected by Checker',
  REJECT_APPROVER: 'Rejected by Approver',
  CANCEL: 'Cancelled',
  ISSUER: 'Issuer',
  SUPPLIER: 'Supplier Response',
  REJECT_SUPPLIER: 'Rejected by Supplier',
  INITIAL_RESPONSE: 'Initial Response',
  FINAL_RESPONSE: 'Final Response',
  ISSUER_2ND: 'Issuer Review',
  CHECKER_2ND: 'Cycle 2 Checker',
  APPROVER_2ND: 'Cycle 2 Approver',
  ISSUER_3RD: 'Final Issuer Acceptance',
  REJECT_ISSUER_2ND: 'Rejected by Issuer Review',
  REJECT_CHECKER_2ND: 'Rejected by Cycle 2 Checker',
  REJECT_APPROVER_2ND: 'Rejected by Cycle 2 Approver',
  NOT_ACCEPT: 'Not Accepted',
};

