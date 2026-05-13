import { Selectable, Insertable, Updateable } from 'kysely';

// ============================================================================
// SQPR Module - Database Table Types
// ============================================================================

export interface SqprTable {
  sqpr_id: string;
  control_no: string;
  site_id: string;
  supplier_id: string | null;
  attention_id: string | null;
  attention: string | null;
  fiscal_year: number;
  report_type: number;
  month: number;
  file_id: string;
  file_name: string;
  file_extension: string;
  remarks: string | null;
  date_created: Date | string;
  incharge_id: string;
  incharge_remarks: string | null;
  submit_date: Date | string | null;
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

export interface SqprAttachmentTable {
  sqpr_attachment_id: string;
  sqpr_id: string;
  file_name: string;
  file_extension: string;
  attachment_type?: string | null;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface SqprCcTable {
  sqpr_cc_id: string;
  sqpr_id: string;
  user_id: string;
  last_update: Date | string;
  updateby: string;
}

export interface SqprCustomerClaimTable {
  sqpr_customer_claim_id: string;
  sqpr_id: string;
  supplier_id: string;
  part_id: string;
  customer_id: string;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface SqprDetailTable {
  sqpr_detail_id: string;
  sqpr_id: string;
  detail_type: number;
  supplier_id: string;
  value: number;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
  Is_percentage: boolean | number | null;
}

export interface SqprLarTable {
  sqpr_lar_id: string;
  control_no: string;
  site_id: string;
  fiscal_year: number;
  report_type: number;
  month: number;
  file_id: string;
  file_name: string;
  file_extension: string;
  remarks: string | null;
  date_created: Date | string;
  worst_lar_remarks: string | null;
  worst_dppm_remarks: string | null;
  incharge_id: string;
  incharge_remarks: string | null;
  submit_date: Date | string | null;
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

export interface SqprLarCcTable {
  sqpr_lar_cc_id: string;
  sqpr_lar_id: string;
  user_id: string;
  last_update: Date | string;
  updateby: string;
}

export interface SqprLarDetailTable {
  sqpr_lar_detail_id: string;
  sqpr_lar_id: string;
  detail_type: number;
  supplier_id: string;
  value: number;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface SqprQualityRiskTable {
  sqpr_quality_risk_id: string;
  sqpr_id: string;
  supplier_id: string;
  part_id: string;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

// Helper types
export type Sqpr = Selectable<SqprTable>;
export type NewSqpr = Insertable<SqprTable>;
export type SqprUpdate = Updateable<SqprTable>;
export type SqprAttachment = Selectable<SqprAttachmentTable>;
export type SqprCc = Selectable<SqprCcTable>;
export type SqprDetail = Selectable<SqprDetailTable>;
export type SqprLar = Selectable<SqprLarTable>;
export type NewSqprLar = Insertable<SqprLarTable>;
export type SqprLarUpdate = Updateable<SqprLarTable>;
export type SqprLarCc = Selectable<SqprLarCcTable>;
export type NewSqprLarCc = Insertable<SqprLarCcTable>;
export type SqprLarDetail = Selectable<SqprLarDetailTable>;
export type NewSqprLarDetail = Insertable<SqprLarDetailTable>;
export type SqprQualityRisk = Selectable<SqprQualityRiskTable>;
