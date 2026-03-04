import { Generated, Selectable, Insertable, Updateable } from 'kysely';

// ============================================================================
// 5M1E Module - Database Table Types
// Source of truth: schema-5m1e.sql + old fiveM1E.repository.js
// ============================================================================

// ---------------------------------------------------------------------------
// 1. TBL_5M1E_Application — Main application record
// ---------------------------------------------------------------------------
export interface FiveM1EApplicationTable {
  ID: Generated<number>;
  ControlNo: string;
  Title: string | null;
  SupplierID: string | null;
  SupplierCN: string | null;
  VendorID: string | null;
  ItemID: string | null;
  SiteID: string | null;
  CommodityID: string | null;
  ModelID: string | null;
  EngineerRemarks: string | null;
  ReportNo: string | null;
  DateRegister: Date | string | null;
  Class: string | null;
  ClassType: string | null;
  ImpactDate: string | null;

  // Attributes (01-10)
  Attribute01: string | null;
  Attribute02: string | null;
  Attribute03: string | null;
  Attribute04: string | null;
  Attribute05: string | null;
  Attribute06: string | null;
  Attribute07: string | null;
  Attribute08: string | null;
  Attribute09: string | null;
  Attribute10: string | null;

  CreatedBy: string | null;
  CreateDate: Date | string | null;
  ModifiedDate: Date | string | null;

  // Dedicated Evaluation Columns (replacing generic Attribute05-10)
  RankID: string | null;                        // 5M1E Rank/Category from maintenance table
  ChangeQCProcess: boolean | number | null;     // Change of QC Process Chart
  ChangeSupplierSpec: boolean | number | null;  // Change of Supplier Specification
  ProcessAuditResult: string | null;            // ACCEPTED / ACCEPTED_WITH_CONDITIONS / NOT_ACCEPTED
  // NOTE: EnvironmentalApproval lives in TBL_5M1E_Approval (EnviCheckerNecessary/EnviAppproverNecessary)
}

// ---------------------------------------------------------------------------
// 2. TBL_5M1E_Approval — Full approval workflow
// ---------------------------------------------------------------------------
export interface FiveM1EApprovalTable {
  ID: Generated<number>;
  ControlNo: string;
  Status: string | null;

  // MPD Section
  MPDPIC: string | null;
  MPDChecker: string | null;
  MPDCheckerName: string | null;
  MPDCheckerStatus: boolean | number | null;
  MPDChkrDtAprd: string | null;
  MPDApprover: string | null;
  MPDApproverName: string | null;
  MPDApproverStatus: boolean | number | null;
  MPDAprDtAprd: string | null;

  // HDE
  HDEPIC: string | null;

  // Reviewer
  Reviewer: string | null;
  ReviewerName: string | null;
  ReviewerStatus: boolean | number | null;
  IssueDate: string | null;

  // Checker (General)
  Checker: string | null;
  CheckerName: string | null;
  ChkrDtAprd: string | null;
  ChkrStatus: string | null;

  // Approver (General)
  Approver: string | null;
  ApproverName: string | null;
  ApproverDtAprd: string | null;
  AprStatus: string | null;

  // Final Approver
  FinalApprover: string | null;
  FAName: string | null;
  FADtAprd: string | null;
  FAStatus: string | null;

  // Sequence
  ApprovalSeq: number | null;

  // Design Checker
  DSCheckerNecessary: string;
  DesignCheckerID: string | null;
  DesignCheckerName: string | null;
  DesignCheckerStatus: boolean | number | null;
  DesignCheckerDtAprd: string | null;

  // Design Approver
  DSAppproverNecessary: string;
  DesignApproverID: string | null;
  DesignApproverName: string | null;
  DesignApproverStatus: boolean | number | null;
  DesignApproverDtAprd: string | null;

  // Environment Checker
  EnviCheckerNecessary: string;
  EnviCheckerID: string | null;
  EnviCheckerName: string | null;
  EnviCheckerStatus: boolean | number | null;
  EnviCheckerDtAprd: string | null;

  // Environment Approver
  EnviAppproverNecessary: string;
  EnviApproverID: string | null;
  EnviApproveName: string | null;
  EnviApproveStatus: boolean | number | null;
  EnviApproveDtAprd: string | null;

  // QA Checker
  QACheckerID: string | null;
  QACheckerName: string | null;
  QACheckerStatus: boolean | number | null;
  QACheckerDtAprd: string | null;

  // Misc
  RevisedSequence: number | null;
  CR: string | null;

  // Evaluation IC
  EvaluationIC: string | null;
  EvaluationICName: string | null;
  EvaluationICDtAprd: string | null;
  EvaluationICStatus: boolean | number | null;

  // Rejection
  RejectedBy: string | null;
  RejectedDate: string | null;

  CreateDate: Date | string | null;
  ModifiedDate: Date | string | null;
}

// ---------------------------------------------------------------------------
// 3. TBL_5M1E_ActionItems — Action items per report
// ---------------------------------------------------------------------------
export interface FiveM1EActionItemsTable {
  ID: Generated<number>;
  ControlNo: string | null;
  ActionItem: string | null;
  FirstTargetDt: string | null;
  SecondTargetDt: string | null;
  ThirdTargetDt: string | null;
  PIC: string | null;
  PICName: string | null;
  VerificationResult: string | null;
  Remarks: string | null;
  CreateDate: Date | string | null;
  ModifiedDate: Date | string | null;
  Attribute01: string | null;
  Attribute02: string | null;
  Attribute03: string | null;
  Attribute04: string | null;
  Attribute05: string | null;
}

// ---------------------------------------------------------------------------
// 4. TBL_5M1E_AI_Attachment — Action item attachments
// ---------------------------------------------------------------------------
export interface FiveM1EAIAttachmentTable {
  ID: Generated<number>;
  ChkItemID: number;
  FileName: string;
  CreateDate: Date | string | null;
  ModifiedDate: Date | string | null;
  attribute1: string | null;
  attribute2: string | null;
  attribute3: string | null;
  attribute4: string | null;
  attribute5: string | null;
}

// ---------------------------------------------------------------------------
// 5. TBL_5M1E_Attachment — Report-level attachments
// ---------------------------------------------------------------------------
export interface FiveM1EAttachmentTable {
  ID: Generated<number>;
  ControlNo: string;
  FileName: string;
  CreateDate: Date | string | null;
  ModifiedDate: Date | string | null;
  Attribute1: string | null;
  Attribute2: string | null;
  Attribute3: string | null;
  Attribute4: string | null;
  Attribute5: string | null;
}

// ---------------------------------------------------------------------------
// 6. TBL_5M1E_CheckItems — Check items per report
// ---------------------------------------------------------------------------
export interface FiveM1ECheckItemsTable {
  ID: Generated<number>;
  ControlNo: string;
  CheckItem: string;
  Judgement: string;
  Remarks: string | null;
  CreateDate: Date | string | null;
  ModifiedDate: Date | string | null;
  Attribute1: string | null;
  Attribute2: string | null;
  Attribute3: string | null;
  Attribute4: string | null;
  Attribute5: string | null;
}

// ---------------------------------------------------------------------------
// 7. TBL_5M1E_CI_Attachment — Check item attachments
// ---------------------------------------------------------------------------
export interface FiveM1ECIAttachmentTable {
  ID: Generated<number>;
  ChkItemID: number;
  FileName: string;
  CreateDate: Date | string | null;
  ModifiedDate: Date | string | null;
  attribute1: string | null;
  attribute2: string | null;
  attribute3: string | null;
  attribute4: string | null;
  attribute5: string | null;
}

// ---------------------------------------------------------------------------
// 8. TBL_5M1E_PartsPerReport — Parts linked to a report
// ---------------------------------------------------------------------------
export interface FiveM1EPartsPerReportTable {
  TagID: number;
  PartsTag: string;
  part_id: string;
  DateAdded: Date | string;
}

// ---------------------------------------------------------------------------
// 9. TBL_5M1E_Status_Remarks — Status change history
// ---------------------------------------------------------------------------
export interface FiveM1EStatusRemarksTable {
  ID: Generated<number>;
  ControlNo: string;
  Remarks: string | null;
  RemarkBy: string;
  Status: string;
  CreateDate: Date | string | null;
  attribute1: string | null;
  attribute2: string | null;
  attribute3: string | null;
  attribute4: string | null;
  attribute5: string | null;
}

// ---------------------------------------------------------------------------
// 10. TBL_5M1E_EmailDailyNotification — Email notification tracking
// ---------------------------------------------------------------------------
export interface FiveM1EEmailDailyNotificationTable {
  ID: string;
  ControlNo: string;
  MPDPICstatus: boolean | number | null;
  HDEPICstatus: boolean | number | null;
  StartDate: Date | string | null;
  FinalApproverStatus: boolean | number | null;
}

// ---------------------------------------------------------------------------
// 11. TBL_5M1E_EmailElements — Email template elements
// ---------------------------------------------------------------------------
export interface FiveM1EEmailElementsTable {
  ElementID: number;
  ElementName: string;
  ElementValue: string;
  Attribute1: string;
  Attribute2: string;
  Attribute3: string;
}

// ============================================================================
// Helper Types
// ============================================================================
export type FiveM1EApp = Selectable<FiveM1EApplicationTable>;
export type NewFiveM1EApp = Insertable<FiveM1EApplicationTable>;
export type FiveM1EAppUpdate = Updateable<FiveM1EApplicationTable>;

export type FiveM1EApproval = Selectable<FiveM1EApprovalTable>;
export type NewFiveM1EApproval = Insertable<FiveM1EApprovalTable>;
export type FiveM1EApprovalUpdate = Updateable<FiveM1EApprovalTable>;

export type FiveM1EActionItem = Selectable<FiveM1EActionItemsTable>;
export type NewFiveM1EActionItem = Insertable<FiveM1EActionItemsTable>;

export type FiveM1EAttachment = Selectable<FiveM1EAttachmentTable>;
export type NewFiveM1EAttachment = Insertable<FiveM1EAttachmentTable>;

export type FiveM1ECheckItem = Selectable<FiveM1ECheckItemsTable>;
export type NewFiveM1ECheckItem = Insertable<FiveM1ECheckItemsTable>;

export type FiveM1EPartPerReport = Selectable<FiveM1EPartsPerReportTable>;
export type NewFiveM1EPartPerReport = Insertable<FiveM1EPartsPerReportTable>;

export type FiveM1EStatusRemark = Selectable<FiveM1EStatusRemarksTable>;
export type NewFiveM1EStatusRemark = Insertable<FiveM1EStatusRemarksTable>;
