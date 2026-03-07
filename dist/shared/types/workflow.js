export var WorkflowStatusEnum;
(function (WorkflowStatusEnum) {
    WorkflowStatusEnum["DRAFT"] = "DRAFT";
    WorkflowStatusEnum["NEW"] = "NEW";
    WorkflowStatusEnum["PENDING"] = "PENDING";
    WorkflowStatusEnum["SUBMITTED"] = "SUBMITTED";
    // Evaluation / Technical Phases
    WorkflowStatusEnum["FAPPROVED"] = "FAPPROVED";
    WorkflowStatusEnum["EVALUATION"] = "EVALUATION";
    WorkflowStatusEnum["CHECKED"] = "CHECKED";
    WorkflowStatusEnum["APPROVED"] = "APPROVED";
    WorkflowStatusEnum["APPROVED_WC"] = "APPROVED_WC";
    WorkflowStatusEnum["APPROVEDWC"] = "APPROVEDWC";
    WorkflowStatusEnum["REJECTED"] = "REJECTED";
    WorkflowStatusEnum["RAR"] = "RAR";
    WorkflowStatusEnum["ISSUED"] = "ISSUED";
    WorkflowStatusEnum["FR"] = "FR";
    WorkflowStatusEnum["IR"] = "IR";
    WorkflowStatusEnum["REPORT"] = "REPORT";
    WorkflowStatusEnum["RESPONSE_AWAITING"] = "RESPONSE_AWAITING";
    WorkflowStatusEnum["RESPONSE_AWAIT_APPROVAL"] = "RESPONSE_AWAIT_APPROVAL";
    WorkflowStatusEnum["RESPONSE_RECEIVED"] = "RESPONSE_RECEIVED";
    WorkflowStatusEnum["RREJECTED"] = "RREJECTED";
    WorkflowStatusEnum["RELEASE"] = "RELEASE";
    WorkflowStatusEnum["HOLD"] = "HOLD";
    WorkflowStatusEnum["CANCEL"] = "CANCEL";
    WorkflowStatusEnum["CLOSED"] = "CLOSED";
})(WorkflowStatusEnum || (WorkflowStatusEnum = {}));
