import { Selectable, Insertable, Updateable } from 'kysely';

// ============================================================================
// MNR Module - Database Table Types
// ============================================================================

export interface MnrLotsTable {
  mnr_id: string;
  control_no: string;
  date_created: Date | string;
  issued_date: Date | string | null;
  site_id: string;
  product_id: string;
  supplier_id: string;
  model_id: string;
  mfg_area_id: string;
  defectcategory_id: string;
  mnrtype_id: string;
  attention_id: string;
  reference_no: string | null;
  initial_report_date: Date | string;
  due_date: Date | string;
  actual_initial_report_date: Date | string | null;
  actual_final_report_date: Date | string | null;
  rtv: boolean | number;
  rtv_total_qty: number | null;
  rtv_remarks: string | null;
  sort: boolean | number;
  sort_sorted: number | null;
  sort_rejected: number | null;
  sort_reject_rate: number | null;
  sort_remarks: string | null;
  sort_rework: boolean | number | null;
  other: boolean | number;
  other_affected_qty: number | null;
  other_affected_doc: string | null;
  other_remarks: string | null;
  encoder_id: string;
  encoder_date: Date | string | null;
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
  remarks: string | null;
  report_issuance_8d?: boolean | number | null;
  recurrence_ref?: string | null;
}

export interface MnrDetailsTable {
  mnr_detail_id: string;
  mnr_id: string;
  part_id: string;
  defect_id: string;
  defectclass_id: string | null;
  defect_qty: number;
  ca: boolean | number;
  inspection_date: Date | string | null;
  invoice_no: string | null;
  invoice_qty: number | null;
  lot_no: string | null;
  lot_size: number | null;
  sample_size: number | null;
  group_line: string | null;
  area_defect: string | null;
  cavity_no: string | null;
  tray_no: string | null;
  encounter_date: Date | string | null;
  verification_date: Date | string | null;
  verified_by: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface MnrResponseTable {
  mnr_response_id: string;
  mnr_id: string;
  d1: string | null;
  d2: string | null;
  d3: string | null;
  d4: string | null;
  d5: string | null;
  d6: string | null;
  d7: string | null;
  d8: string | null;
  invoice_no: string | null;
  lot_size: number | null;
  lot_no: string | null;
  eta: string | null;
  marking: string | null;
  rtv_received: number | null;
  replacement_date: Date | string | null;
  replacement_qty: number | null;
  ncv_invoice_no: string | null;
  label: string | null;
  last_update: Date | string;
  updateby: string;
  issuer_remarks: string | null;
  issuer_date: Date | string | null;
  checker_id: string | null;
  checker_remarks: string | null;
  checker_date: Date | string | null;
  approver_id: string | null;
  approver_remarks: string | null;
  approver_date: Date | string | null;
  attention_date: Date | string | null;
  accept_date: Date | string | null;
  remarks: string | null;
}

export interface MnrVerificationTable {
  mnr_verification_id: string;
  mnr_id: string;
  received_date: Date | string;
  invoice_no: string;
  judgment: string;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface MnrCcTable {
  mnr_cc_id: string;
  mnr_id: string;
  user_id: string;
  last_update: Date | string;
  updateby: string;
}

export interface MnrAttachmentTable {
  mnr_attachment_id: string;
  mnr_id: string;
  file_name: string;
  file_extension: string;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface MnrResponseAttachmentTable {
  mnr_response_attachment_id: string;
  mnr_response_id: string;
  file_name: string;
  file_extension: string;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

// Helper types
export type MnrLot = Selectable<MnrLotsTable>;
export type NewMnrLot = Insertable<MnrLotsTable>;
export type MnrLotUpdate = Updateable<MnrLotsTable>;
export type MnrDetail = Selectable<MnrDetailsTable>;
export type NewMnrDetail = Insertable<MnrDetailsTable>;
export type MnrResponse = Selectable<MnrResponseTable>;
export type NewMnrResponse = Insertable<MnrResponseTable>;
export type MnrVerification = Selectable<MnrVerificationTable>;
export type MnrCc = Selectable<MnrCcTable>;
export type MnrAttachment = Selectable<MnrAttachmentTable>;
export type MnrResponseAttachment = Selectable<MnrResponseAttachmentTable>;
