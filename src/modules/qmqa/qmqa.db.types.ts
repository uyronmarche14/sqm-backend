import { Selectable, Insertable, Updateable } from 'kysely';

// ============================================================================
// QMQA Module - Database Table Types
// ============================================================================

export interface QmqaTable {
  qmqa_id: string;
  qmqa_audit_plan_id: string;
  created_date: Date | string;
  audit_type_id: string;
  attention_id: string | null;
  pic_auditor_id: string | null;
  due_date: Date | string | null;
  audit_date: Date | string;
  issued_date: Date | string | null;
  audit_rating: number | null;
  auditees: string | null;
  auditors: string | null;
  attendees: string | null;
  remarks: string | null;
  encoder_id: string;
  encoder_date: Date | string;
  issuer_id: string;
  issuer_remarks: string | null;
  issuer_date: Date | string | null;
  checker_id: string | null;
  checker_remarks: string | null;
  checker_date: Date | string | null;
  approver_id: string | null;
  approver_remarks: string | null;
  approver_date: Date | string | null;
  request_status: string;
  last_update: Date | string;
  updateby: string;
}

export interface QmqaAttachmentTable {
  qmqa_attachment_id: string;
  qmqa_id: string;
  file_name: string;
  file_extension: string;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface QmqaAuditPlanTable {
  qmqa_audit_plan_id: string;
  control_no: string;
  created_date: Date | string;
  site_id: string;
  supplier_id: string;
  audit_category_id: string;
  audit_plan_date: Date | string;
  sqe_pic_id: string;
  remarks: string | null;
  request_status: string;
  last_update: Date | string;
  updateby: string;
}

export interface QmqaCcTable {
  qmqa_cc_id: string;
  qmqa_id: string;
  user_id: string;
  last_update: Date | string;
  updateby: string;
}

export interface QmqaPlanAttachmentTable {
  qmqa_plan_attachment_id: string;
  qmqa_id: string;
  file_name: string;
  file_extension: string;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface QmqaResponseTable {
  qmqa_response_id: string;
  qmqa_id: string;
  skip_initial: boolean | number | null;
  initial_report_date: Date | string | null;
  final_report_date: Date | string | null;
  initial_remarks: string | null;
  final_remarks: string | null;
  issuer_remarks: string | null;
  issuer_date: Date | string | null;
  checker_id: string | null;
  checker_remarks: string | null;
  checker_date: Date | string | null;
  approver_id: string | null;
  approver_remarks: string | null;
  approver_date: Date | string | null;
  last_update: Date | string;
  updateby: string;
  accept_date: Date | string | null;
  remarks: string | null;
  verification_remarks: string | null;
}

export interface QmqaResponseFinalTable {
  qmqa_response_final_attachment_id: string;
  qmqa_response_id: string;
  file_name: string;
  file_extension: string;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface QmqaResponseInitialTable {
  qmqa_response_initial_attachment_id: string;
  qmqa_response_id: string;
  file_name: string;
  file_extension: string;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface QmqaResponseVerificationTable {
  qmqa_response_verification_attachment_id: string;
  qmqa_response_id: string;
  file_name: string;
  file_extension: string;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface QmqaNcTable {
  qmqa_nc_id: string;
  qmqa_id: string;
  nc_description: string | null;
  severity: string | null;
  finding_date: Date | string | null;
  closed_date: Date | string | null;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface QmqaScoreTable {
  qmqa_score_id: string;
  qmqa_id: string;
  category_id: string | null;
  score: number | null;
  weight: number | null;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

// Helper types
export type Qmqa = Selectable<QmqaTable>;
export type NewQmqa = Insertable<QmqaTable>;
export type QmqaUpdate = Updateable<QmqaTable>;
export type QmqaAuditPlan = Selectable<QmqaAuditPlanTable>;
export type NewQmqaAuditPlan = Insertable<QmqaAuditPlanTable>;
export type QmqaAuditPlanUpdate = Updateable<QmqaAuditPlanTable>;
export type QmqaResponseRow = Selectable<QmqaResponseTable>;
export type NewQmqaResponse = Insertable<QmqaResponseTable>;
export type QmqaAttachment = Selectable<QmqaAttachmentTable>;
export type QmqaCc = Selectable<QmqaCcTable>;
