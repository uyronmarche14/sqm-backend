import { Insertable, Selectable, Updateable } from 'kysely';

export interface SpcTable {
  spc_id: string;
  control_no: string;
  upload_date: Date | string;
  incharge_id: string;
  site_id: string;
  supplier_id: string;
  part_id: string;
  remarks: string | null;
  submit_date: Date | string | null;
  request_status: string;
  last_update: Date | string;
  updateby: string;
}

export interface SpcAttachmentTable {
  spc_attachment_id: string;
  spc_id: string;
  file_name: string;
  file_extension: string | null;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface SpcLotTable {
  spc_lot_id: string;
  spc_id: string;
  lot_no: string;
  invoice_no: string;
  lot_size: number;
  last_update: Date | string;
  updateby: string;
}

export interface SupplierSpcRecipientTable {
  supplier_spcrecipient_id: string;
  supplier_id: string;
  user_id: string;
  last_update: Date | string;
  updateby: string;
}

export interface SpcWorkflowTable {
  spc_workflow_id: string;
  spc_id: string;
  supplier_incharge_id: string | null;
  issuer_id: string | null;
  checker_id: string | null;
  approver_id: string | null;
  issuer_remarks: string | null;
  checker_remarks: string | null;
  approver_remarks: string | null;
  checked_at: Date | string | null;
  approved_at: Date | string | null;
  rejected_at: Date | string | null;
  issued_at: Date | string | null;
  last_action_by: string | null;
  last_update: Date | string;
  updateby: string;
}

export type Spc = Selectable<SpcTable>;
export type NewSpc = Insertable<SpcTable>;
export type SpcUpdate = Updateable<SpcTable>;
export type SpcAttachment = Selectable<SpcAttachmentTable>;
export type NewSpcAttachment = Insertable<SpcAttachmentTable>;
export type SpcAttachmentUpdate = Updateable<SpcAttachmentTable>;
export type SpcWorkflow = Selectable<SpcWorkflowTable>;
export type NewSpcWorkflow = Insertable<SpcWorkflowTable>;
export type SpcWorkflowUpdate = Updateable<SpcWorkflowTable>;
