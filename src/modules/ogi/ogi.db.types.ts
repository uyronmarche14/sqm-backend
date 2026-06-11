import { Selectable, Insertable, Updateable } from 'kysely';

// ============================================================================
// OGI Module - Database Table Types
// ============================================================================

export interface OgiTable {
  ogi_id: string;
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

export interface OgiAttachmentTable {
  ogi_attachment_id: string;
  ogi_id: string;
  file_name: string;
  file_extension: string | null;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface OgiLotsTable {
  ogi_lot_id: string;
  ogi_id: string;
  lot_no: string;
  invoice_no: string;
  lot_size: number;
  last_update: Date | string;
  updateby: string;
}

// Helper types
export type Ogi = Selectable<OgiTable>;
export type NewOgi = Insertable<OgiTable>;
export type OgiUpdate = Updateable<OgiTable>;
export type OgiAttachment = Selectable<OgiAttachmentTable>;
export type OgiLot = Selectable<OgiLotsTable>;
