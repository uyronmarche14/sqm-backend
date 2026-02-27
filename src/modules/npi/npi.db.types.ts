import { Selectable, Insertable, Updateable } from 'kysely';

// ============================================================================
// NPI Module - Database Table Types
// ============================================================================

export interface NpiLotsTable {
  npi_lot_id: string;
  control_no: string;
  datecreated: Date | string;
  inspectioncat_id: string;
  site_id: string;
  supplier_id: string;
  model_id: string;
  part_id: string;
  lot_no: string;
  lot_size: number;
  invoice_no: string;
  po_no: string;
  sample_size: number;
  severity_id: string;
  severity_seq: string | null;
  inspectionmethod_id: string;
  inspection_date: Date | string;
  inspection_temp: number;
  inspection_hum: number;
  delivery_date: Date | string;
  rohs_verification: string | null;
  reference_mnr_no: string | null;
  disposition_id: string;
  inspected_by_id: string;
  data_verified_by_id: string;
  remarks: string | null;
  inspector_remarks: string | null;
  inspector_id: string;
  submitted_date: Date | string | null;
  checker_remarks: string | null;
  checker_id: string | null;
  checked_date: Date | string | null;
  approver_remarks: string | null;
  approver_id: string | null;
  approved_date: Date | string | null;
  last_update: Date | string;
  updateby: string;
  request_status: string;
  total_minor: number;
  total_major: number;
  total_critical: number;
  ssi_accept: boolean | number;
  ogi_ref_no: string | null;
  judgment: string | null;
  starttime: number;
  endtime: number;
  receivetime: number;
  endorsetime: number;
  visual_judgment: string | null;
}

export interface NpiAttachmentTable {
  npi_attachment_id: string;
  npi_lot_id: string;
  file_name: string;
  file_extension: string | null;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface NpiCcTable {
  npi_cc_id: string;
  npi_lot_id: string;
  user_id: string;
  last_update: Date | string;
  updateby: string;
}

export interface NpiDatacatTable {
  npi_datacat_id: string;
  npi_lot_id: string;
  partdatacategory_name: string;
  std_min: number;
  std_max: number;
  actual_min: number | null;
  actual_max: number | null;
  cpk: number | null;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface NpiDimensioncatTable {
  npi_dimensioncat_id: string;
  npi_lot_id: string;
  partdimensioncategory_name: string;
  std_min: number;
  std_max: number;
  actual_min: number | null;
  actual_max: number | null;
  cpk: number | null;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface NpiMaterialcertTable {
  npi_materialcert_id: string;
  npi_lot_id: string;
  component: string;
  description: string;
  required_data: string;
  judgement: boolean | number;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface NpiNoisecatTable {
  npi_noisecat_id: string;
  npi_lot_id: string;
  partnoisecategory_name: string;
  std_min: number;
  std_max: number;
  actual_min: number | null;
  actual_max: number | null;
  cpk: number | null;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface NpiVisualcatTable {
  npi_visualcat_id: string;
  npi_lot_id: string;
  defectclass_id: string;
  defect_id: string;
  quantity: number;
  last_update: Date | string;
  updateby: string;
}

// Helper types
export type NpiLot = Selectable<NpiLotsTable>;
export type NewNpiLot = Insertable<NpiLotsTable>;
export type NpiLotUpdate = Updateable<NpiLotsTable>;
export type NpiAttachment = Selectable<NpiAttachmentTable>;
export type NpiCc = Selectable<NpiCcTable>;
export type NpiDatacat = Selectable<NpiDatacatTable>;
export type NpiDimensioncat = Selectable<NpiDimensioncatTable>;
export type NpiMaterialcert = Selectable<NpiMaterialcertTable>;
export type NpiNoisecat = Selectable<NpiNoisecatTable>;
export type NpiVisualcat = Selectable<NpiVisualcatTable>;
