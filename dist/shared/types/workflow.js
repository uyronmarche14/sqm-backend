// =============================================================================
// WORKFLOW STATUS ENUM — Backend Single Source of Truth
// =============================================================================
// Must stay in sync with frontend: src/config/workflow.config.ts
// =============================================================================
export var WorkflowStatusEnum;
(function (WorkflowStatusEnum) {
    // Pre-Submission
    WorkflowStatusEnum["DRAFT"] = "DRAFT";
    WorkflowStatusEnum["NEW"] = "NEW";
    WorkflowStatusEnum["PLANNED"] = "PLANNED";
    // Cycle 1: Issuance
    WorkflowStatusEnum["AWAITING_CHECKED"] = "AWAITING_CHECKED";
    WorkflowStatusEnum["AWAITING_APPROVAL"] = "AWAITING_APPROVAL";
    WorkflowStatusEnum["SUBMITTED"] = "SUBMITTED";
    WorkflowStatusEnum["PENDING"] = "PENDING";
    WorkflowStatusEnum["CHECKED"] = "CHECKED";
    WorkflowStatusEnum["APPROVED"] = "APPROVED";
    WorkflowStatusEnum["APPROVEDWC"] = "APPROVEDWC";
    WorkflowStatusEnum["REJECTED"] = "REJECTED";
    // Post-Approval
    WorkflowStatusEnum["ISSUED"] = "ISSUED";
    WorkflowStatusEnum["RELEASE"] = "RELEASE";
    WorkflowStatusEnum["HOLD"] = "HOLD";
    WorkflowStatusEnum["FAPPROVED"] = "FAPPROVED";
    WorkflowStatusEnum["EVALUATION"] = "EVALUATION";
    // MNR Report Milestones
    WorkflowStatusEnum["IR"] = "IR";
    WorkflowStatusEnum["FR"] = "FR";
    WorkflowStatusEnum["REPORT"] = "REPORT";
    WorkflowStatusEnum["RAR"] = "RAR";
    // Cycle 2: Response
    WorkflowStatusEnum["RESPONSE_AWAITING"] = "RESPONSE_AWAITING";
    WorkflowStatusEnum["RESPONSE_SUBMITTED"] = "RESPONSE_SUBMITTED";
    WorkflowStatusEnum["RESPONSE_AWAITING_CHECKED"] = "RESPONSE_AWAITING_CHECKED";
    WorkflowStatusEnum["RESPONSE_AWAITING_APPROVAL"] = "RESPONSE_AWAITING_APPROVAL";
    WorkflowStatusEnum["RESPONSE_RECEIVED"] = "RESPONSE_RECEIVED";
    WorkflowStatusEnum["RESPONSE_REJECTED"] = "RESPONSE_REJECTED";
    // QMQA Response Stages
    WorkflowStatusEnum["WITH_INITIAL_REPORT"] = "WITH_INITIAL_REPORT";
    WorkflowStatusEnum["WITH_FINAL_REPORT"] = "WITH_FINAL_REPORT";
    // Terminal
    WorkflowStatusEnum["CLOSED"] = "CLOSED";
    WorkflowStatusEnum["CANCELLED"] = "CANCELLED";
    // ─── Legacy Aliases (for backward compatibility with consuming code) ───
    /** @deprecated Use APPROVEDWC */
    WorkflowStatusEnum["APPROVED_WC"] = "APPROVED_WC";
    /** @deprecated Use CANCELLED */
    WorkflowStatusEnum["CANCEL"] = "CANCEL";
    /** @deprecated Use RESPONSE_REJECTED */
    WorkflowStatusEnum["RREJECTED"] = "RREJECTED";
    /** @deprecated Use RESPONSE_AWAITING_APPROVAL */
    WorkflowStatusEnum["RESPONSE_AWAIT_APPROVAL"] = "RESPONSE_AWAIT_APPROVAL";
    /** @deprecated Use AWAITING_APPROVAL */
    WorkflowStatusEnum["APPROVAL"] = "APPROVAL";
    /** @deprecated Use RESPONSE_AWAITING_CHECKED */
    WorkflowStatusEnum["RESPONSE_CHECKED"] = "RESPONSE_CHECKED";
})(WorkflowStatusEnum || (WorkflowStatusEnum = {}));
