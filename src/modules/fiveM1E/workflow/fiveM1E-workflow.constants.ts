export const FIVE_M1E_WORKFLOW_STAGE = {
  UNKNOWN: 'UNKNOWN',
  DRAFT: 'DRAFT',
  RAR: 'RAR',
  REJECTED: 'REJECTED',
  MPD_CHECKER: 'MPD_CHECKER',
  MPD_APPROVER: 'MPD_APPROVER',
  REVIEWER: 'REVIEWER',
  EVALUATION_IC: 'EVALUATION_IC',
  SQE_CHECKER: 'SQE_CHECKER',
  SQE_APPROVER: 'SQE_APPROVER',
  FINAL_APPROVER: 'FINAL_APPROVER',
  DESIGN_APPROVER: 'DESIGN_APPROVER',
  ENVI_APPROVER: 'ENVI_APPROVER',
  QA_CHECKER: 'QA_CHECKER',
  FOR_RELEASE: 'FOR_RELEASE',
  SUPPLIER_UPDATE: 'SUPPLIER_UPDATE',
  APPROVED: 'APPROVED',
  APPROVED_WITH_CONDITION: 'APPROVED_WITH_CONDITION',
  RELEASED: 'RELEASED',
} as const;

export type FiveM1EWorkflowStage =
  (typeof FIVE_M1E_WORKFLOW_STAGE)[keyof typeof FIVE_M1E_WORKFLOW_STAGE];

export const FIVE_M1E_WORKFLOW_ACTION = {
  SUBMIT: 'submit',
  CHECK: 'check',
  APPROVE: 'approve',
  REJECT: 'reject',
  RELEASE: 'release',
} as const;

export type FiveM1EWorkflowAction =
  (typeof FIVE_M1E_WORKFLOW_ACTION)[keyof typeof FIVE_M1E_WORKFLOW_ACTION];

export const FIVE_M1E_WORKFLOW_STAGE_CODE: Record<FiveM1EWorkflowStage, string> = {
  UNKNOWN: '0',
  DRAFT: 'DRAFT',
  RAR: 'RAR',
  REJECTED: 'REJECTED',
  MPD_CHECKER: '1',
  MPD_APPROVER: '2',
  REVIEWER: '4',
  EVALUATION_IC: '501',
  SQE_CHECKER: '5',
  SQE_APPROVER: '6',
  FINAL_APPROVER: '7',
  DESIGN_APPROVER: '10',
  ENVI_APPROVER: '12',
  QA_CHECKER: '13',
  FOR_RELEASE: '8',
  SUPPLIER_UPDATE: '16',
  APPROVED: '15',
  APPROVED_WITH_CONDITION: '14',
  RELEASED: 'RELEASE',
};

export const FIVE_M1E_WORKFLOW_STAGE_LABEL: Record<FiveM1EWorkflowStage, string> = {
  UNKNOWN: 'Unknown',
  DRAFT: 'Draft',
  RAR: 'Rejected And Revised',
  REJECTED: 'Rejected',
  MPD_CHECKER: 'Awaiting MPD Checker',
  MPD_APPROVER: 'Awaiting MPD Approver',
  REVIEWER: 'Awaiting Reviewer',
  EVALUATION_IC: 'Awaiting Evaluation IC',
  SQE_CHECKER: 'For Checked',
  SQE_APPROVER: 'For Approved',
  FINAL_APPROVER: 'Awaiting Final Approver',
  DESIGN_APPROVER: 'Awaiting Design Approver',
  ENVI_APPROVER: 'Awaiting Environment Approver',
  QA_CHECKER: 'Awaiting QA Checker',
  FOR_RELEASE: 'For Release',
  SUPPLIER_UPDATE: 'Supplier Update',
  APPROVED: 'Approved',
  APPROVED_WITH_CONDITION: 'Approved With Condition',
  RELEASED: 'Released',
};
