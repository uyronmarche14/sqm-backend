export const NPI_WORKFLOW_STAGE = {
  DRAFT: 'DRAFT',
  CHECKER: 'CHECKER',
  APPROVER: 'APPROVER',
  ACCEPT: 'ACCEPT',
  REJECT_CHECKER: 'REJECT_CHECKER',
  REJECT_APPROVER: 'REJECT_APPROVER',
  LOT_TRACKING: 'LOT_TRACKING',
  CANCELLED: 'CANCELLED',
} as const;

export type NpiWorkflowStage =
  (typeof NPI_WORKFLOW_STAGE)[keyof typeof NPI_WORKFLOW_STAGE];

export const NPI_WORKFLOW_ACTION = {
  SUBMIT: 'submit',
  CHECK: 'check',
  APPROVE: 'approve',
  REJECT: 'reject',
} as const;

export type NpiWorkflowAction =
  (typeof NPI_WORKFLOW_ACTION)[keyof typeof NPI_WORKFLOW_ACTION];

export const NPI_STAGE_DEFINITIONS: Record<
  NpiWorkflowStage,
  {
    legacyStageCode: number;
    dbCode: string;
    workflowStatus: 'DRAFT' | 'PENDING' | 'CHECKED' | 'APPROVED' | 'REJECTED' | 'LARMONITORING' | 'CANCELLED';
    label: string;
  }
> = {
  DRAFT: {
    legacyStageCode: 2,
    dbCode: 'DR',
    workflowStatus: 'DRAFT',
    label: 'Draft',
  },
  CHECKER: {
    legacyStageCode: 3,
    dbCode: 'SU',
    workflowStatus: 'PENDING',
    label: 'Awaiting Checker',
  },
  APPROVER: {
    legacyStageCode: 4,
    dbCode: 'CK',
    workflowStatus: 'CHECKED',
    label: 'Awaiting Approver',
  },
  ACCEPT: {
    legacyStageCode: 1,
    dbCode: 'AP',
    workflowStatus: 'APPROVED',
    label: 'Accepted',
  },
  REJECT_CHECKER: {
    legacyStageCode: 5,
    dbCode: 'R5',
    workflowStatus: 'REJECTED',
    label: 'Rejected by Checker',
  },
  REJECT_APPROVER: {
    legacyStageCode: 6,
    dbCode: 'R6',
    workflowStatus: 'REJECTED',
    label: 'Rejected by Approver',
  },
  LOT_TRACKING: {
    legacyStageCode: 25,
    dbCode: 'LT',
    workflowStatus: 'LARMONITORING',
    label: 'Lot Tracking',
  },
  CANCELLED: {
    legacyStageCode: 9,
    dbCode: 'CA',
    workflowStatus: 'CANCELLED',
    label: 'Cancelled',
  },
};
