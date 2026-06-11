// =============================================================================
// WORKFLOW STATUS ENUM — Backend Single Source of Truth
// =============================================================================
// Must stay in sync with frontend: src/config/workflow.config.ts
// =============================================================================

export enum WorkflowStatusEnum {
  // Pre-Submission
  DRAFT = 'DRAFT',
  NEW = 'NEW',
  PLANNED = 'PLANNED',

  // Cycle 1: Issuance
  AWAITING_CHECKED = 'AWAITING_CHECKED',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  SUBMITTED = 'SUBMITTED',           // Legacy: 5M1E and OGI still use this
  PENDING = 'PENDING',               // Legacy: NPI still uses this
  CHECKED = 'CHECKED',
  APPROVED = 'APPROVED',
  APPROVEDWC = 'APPROVEDWC',
  REJECTED = 'REJECTED',

  // Post-Approval
  ISSUED = 'ISSUED',
  RELEASE = 'RELEASE',
  HOLD = 'HOLD',
  FAPPROVED = 'FAPPROVED',           // 5M1E: Procurement Approved
  EVALUATION = 'EVALUATION',

  // MNR Report Milestones
  IR = 'IR',
  FR = 'FR',
  REPORT = 'REPORT',
  RAR = 'RAR',

  // Cycle 2: Response
  RESPONSE_AWAITING = 'RESPONSE_AWAITING',
  RESPONSE_SUBMITTED = 'RESPONSE_SUBMITTED',
  RESPONSE_AWAITING_CHECKED = 'RESPONSE_AWAITING_CHECKED',
  RESPONSE_AWAITING_APPROVAL = 'RESPONSE_AWAITING_APPROVAL',
  RESPONSE_RECEIVED = 'RESPONSE_RECEIVED',
  RESPONSE_REJECTED = 'RESPONSE_REJECTED',

  // QMQA Response Stages
  WITH_INITIAL_REPORT = 'WITH_INITIAL_REPORT',
  WITH_FINAL_REPORT = 'WITH_FINAL_REPORT',

  // Terminal
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',

  // ─── Legacy Aliases (for backward compatibility with consuming code) ───
  /** @deprecated Use APPROVEDWC */
  APPROVED_WC = 'APPROVED_WC',
  /** @deprecated Use CANCELLED */
  CANCEL = 'CANCEL',
  /** @deprecated Use RESPONSE_REJECTED */
  RREJECTED = 'RREJECTED',
  /** @deprecated Use RESPONSE_AWAITING_APPROVAL */
  RESPONSE_AWAIT_APPROVAL = 'RESPONSE_AWAIT_APPROVAL',
  /** @deprecated Use AWAITING_APPROVAL */
  APPROVAL = 'APPROVAL',
  /** @deprecated Use RESPONSE_AWAITING_CHECKED */
  RESPONSE_CHECKED = 'RESPONSE_CHECKED',
}
