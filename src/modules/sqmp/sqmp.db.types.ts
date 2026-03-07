import { Selectable, Insertable, Updateable } from 'kysely';

// ============================================================================
// SQMP Module - Database Table Types
// ============================================================================

export interface SqmpTable {
  sqmp_id: string;
  control_no: string;
  registration_date: Date | string;
  site_id: string;
  supplier_id: string;
  attention_id: string;
  fiscal_year: number;
  semester: number;
  issued_date: Date | string | null;
  due_date: Date | string;
  model_id: string;
  revision: number;
  remarks: string | null;
  main_document_remarks: string | null;
  appendix_sheet_remarks: string | null;
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

export interface SqmpAppendixTable {
  sqmp_appendix_id: string;
  sqmp_id: string;
  file_name: string;
  file_extension: string;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface SqmpCcTable {
  sqmp_cc_id: string;
  sqmp_id: string;
  user_id: string;
  last_update: Date | string;
  updateby: string;
}

export interface SqmpDocumentTable {
  sqmp_document_id: string;
  sqmp_id: string;
  file_name: string;
  file_extension: string;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface SqmpResponseTable {
  sqmp_response_id: string;
  sqmp_id: string;
  response_date: Date | string;
  main_document_remarks: string | null;
  appendix_sheet_remarks: string | null;
  closure_remarks: string | null;
  issuer_id: string | null;
  issuer_remarks: string | null;
  issuer_date: Date | string | null;
  checker_id: string | null;
  checker_remarks: string | null;
  checker_date: Date | string | null;
  approver_id: string | null;
  approver_remarks: string | null;
  approver_date: Date | string | null;
  remarks: string | null;
  accept_date: Date | string | null;
  last_update: Date | string;
  updateby: string;
}

export interface SqmpResponseAppendixTable {
  sqmp_response_appendix_id: string;
  sqmp_response_id: string;
  file_name: string;
  file_extension: string;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface SqmpResponseClosureTable {
  sqmp_response_closure_id: string;
  sqmp_response_id: string;
  file_name: string;
  file_extension: string;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface SqmpResponseDocumentTable {
  sqmp_response_document_id: string;
  sqmp_response_id: string;
  file_name: string;
  file_extension: string;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface SqmpStatusRemarksTable {
  sqmp_status_remarks_id: string;
  sqmp_id: string;
  remarks: string | null;
  request_status: string;
  remarks_by_id: string;
  remarks_date: Date | string;
}

// Helper types
export type Sqmp = Selectable<SqmpTable>;
export type NewSqmp = Insertable<SqmpTable>;
export type SqmpUpdate = Updateable<SqmpTable>;
export type SqmpAppendix = Selectable<SqmpAppendixTable>;
export type SqmpCc = Selectable<SqmpCcTable>;
export type SqmpDocument = Selectable<SqmpDocumentTable>;
export type SqmpResponse = Selectable<SqmpResponseTable>;
export type NewSqmpResponse = Insertable<SqmpResponseTable>;
