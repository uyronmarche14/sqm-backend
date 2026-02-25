import { Generated, Selectable, Insertable, Updateable } from 'kysely';

// ============================================================================
// 1. Database Interface (The "Type-Type" Engine)
// This interface defines all tables and columns in your MSSQL database.
// ============================================================================

export interface Database {
  // Legacy tables prefix
  TBL_5M1E_Application: FiveM1EApplicationTable;
  TBL_5M1E_Approval: FiveM1EApprovalTable;
  
  // Master Data Tables
  USERS: UsersTable;
  ROLES: RolesTable;
  SUPPLIERS: SuppliersTable;
  SUPPLIERSUSER: SuppliersUserTable;
  MFG_SITES: MfgSitesTable;
  PARTS: PartsTable;
  PARTCLASS: PartClassTable;
  MODELS: ModelsTable;
  PRODUCTS: ProductsTable;
  MFG_AREAS: MfgAreasTable;
  DEFECTCATEGORIES: DefectCategoriesTable;
  DEFECTS: DefectsTable;
  DEFECTCLASS: DefectClassTable;
  DISPOSITIONS: DispositionsTable;
  SEVERITY: SeverityTable;
  AQL: AQLTable;
  INSPECTIONCATEGORIES: InspectionCategoriesTable;
  INSPECTIONMETHODS: InspectionMethodsTable;
  INSPECTORS: InspectorsTable;
  MNRTYPE: MnrTypesTable;
  PARTTYPES: PartTypesTable;
  PARTDATACATEGORIES: PartDataCategoriesTable;
  PARTDIMENSIONCATEGORIES: PartDimensionCategoriesTable;
  PARTNOISECATEGORIES: PartNoiseCategoriesTable;
  FORMS: FormsTable;
  ROLE_ACCESS: RoleAccessTable;
  SUPPLIER_INFORMATION: SupplierInformationTable;
  AUDITCATEGORY: AuditCategoryTable;
  AUDITTYPE: AuditTypeTable;
  CRITERIAS: CriteriasTable;
  PARTCLASSCATEGORIES: PartClassCategoriesTable;
  REGISTRATIONS: RegistrationsTable;
  
  // Added Missing Tables
  FAQ_ITEM: FAQItemTable;
  CERTIFICATIONS: CertificationsTable;
  GROUPS: GroupsTable;
  TRAINING_PROGRAMS: TrainingProgramsTable;
  MESSAGE_INFO: MessageInfoTable;

  // MNR Module
  MNR_LOTS: MnrLotsTable;
  MNR_DETAILS: MnrDetailsTable;
  MNR_RESPONSE: MnrResponseTable;
  MNR_VERIFICATION: MnrVerificationTable;
  MNR_CC: MnrCcTable;
  MNR_ATTACHMENT: MnrAttachmentTable;
  MNR_RESPONSE_ATTACHMENT: MnrResponseAttachmentTable;
  // SQPR Module
  SQPR: SqprTable;
  SQPR_ATTACHMENT: SqprAttachmentTable;
  SQPR_CC: SqprCcTable;
  SQPR_CUSTOMER_CLAIM: SqprCustomerClaimTable;
  SQPR_DETAIL: SqprDetailTable;
  SQPR_LAR: SqprLarTable;
  SQPR_LAR_CC: SqprLarCcTable;
  SQPR_LAR_DETAIL: SqprLarDetailTable;
  SQPR_QUALITY_RISK: SqprQualityRiskTable;
  // SQMP Module
  SQMP: SqmpTable;
  SQMP_APPENDIX: SqmpAppendixTable;
  SQMP_CC: SqmpCcTable;
  SQMP_DOCUMENT: SqmpDocumentTable;
  SQMP_RESPONSE: SqmpResponseTable;
  SQMP_RESPONSE_APPENDIX: SqmpResponseAppendixTable;
  SQMP_RESPONSE_CLOSURE: SqmpResponseClosureTable;
  SQMP_RESPONSE_DOCUMENT: SqmpResponseDocumentTable;
  SQMP_STATUS_REMARKS: SqmpStatusRemarksTable;
  // NPI Module
  NPI_ATTACHMENT: NpiAttachmentTable;
  NPI_CC: NpiCcTable;
  NPI_DATACAT: NpiDatacatTable;
  NPI_DIMENSIONCAT: NpiDimensioncatTable;
  NPI_LOTS: NpiLotsTable;
  NPI_MATERIALCERT: NpiMaterialcertTable;
  NPI_NOISECAT: NpiNoisecatTable;
  NPI_VISUALCAT: NpiVisualcatTable;
  // OGI Module
  OGI: OgiTable;
  OGI_ATTACHMENT: OgiAttachmentTable;
  OGI_LOTS: OgiLotsTable;
  // QMQA Module
  QMQA: QmqaTable;
  QMQA_ATTACHMENT: QmqaAttachmentTable;
  QMQA_AUDIT_PLAN: QmqaAuditPlanTable;
  QMQA_CC: QmqaCcTable;
  QMQA_PLAN_ATTACHMENT: QmqaPlanAttachmentTable;
  QMQA_RESPONSE: QmqaResponseTable;
  QMQA_RESPONSE_FINAL: QmqaResponseFinalTable;
  QMQA_RESPONSE_INITIAL: QmqaResponseInitialTable;
  QMQA_RESPONSE_VERIFICATION: QmqaResponseVerificationTable;
}

// ============================================================================
// 2. Table Definitions
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

export interface GenericMasterDataTable {
  active_flag: boolean | number | null;
  last_update?: Date | string | null;
  updateby?: string | null;
  creation_date?: Date | string | null;
}

export interface PartClassTable extends GenericMasterDataTable {
  partclass_id: string;
  partclass_name: string;
  partclass_desc: string | null;
  site_id: string | null;
}

export interface ModelsTable extends GenericMasterDataTable {
  model_id: string;
  model_name: string;
  model_no: string | null;
  model_desc: string | null;
  product_id: string | null;
  site_id: string | null;
}

export interface ProductsTable extends GenericMasterDataTable {
  product_id: string;
  product_name: string;
  product_code: string | null;
  product_desc: string | null;
  site_id: string | null;
}

export interface MfgAreasTable extends GenericMasterDataTable {
  mfg_area_id: string;
  mfg_area_name: string;
  mfg_area_desc: string | null;
}

export interface DefectCategoriesTable extends GenericMasterDataTable {
  defectcategory_id: string;
  defectcategory_name: string;
  defectcategory_acronym: string | null;
  defectcategory_desc: string | null;
}

export interface DefectsTable extends GenericMasterDataTable {
  defect_id: string;
  defect_name: string;
  defect_desc: string | null;
}

export interface DispositionsTable extends GenericMasterDataTable {
  disposition_id: string;
  disposition_name: string;
  disposition_desc: string | null;
}

export interface SeverityTable extends GenericMasterDataTable {
  severity_id: string;
  severity_name: string;
  severity_desc: string | null;
}

export interface AQLTable extends GenericMasterDataTable {
  aql_id: string;
  aql_name: string;
  minor: string | null;
  major: string | null;
  site_id: string | null;
  aql_desc: string | null;
}

export interface InspectionCategoriesTable extends GenericMasterDataTable {
  inspectioncat_id: string;
  inspectioncat_name: string;
  inspectioncat_desc: string | null;
}

export interface InspectionMethodsTable extends GenericMasterDataTable {
  inspectionmethod_id: string;
  inspectionmethod_name: string;
  inspectionmethod_desc: string | null;
}

export interface InspectorsTable extends GenericMasterDataTable {
  inspector_id: string;
  inspector_name: string;
  inspector_desc: string | null;
}

export interface MnrTypesTable extends GenericMasterDataTable {
  mnrtype_id: string;
  mnrtype_name: string;
  mnrtype_desc: string | null;
}

// ==========================================
// MNR Module Tables
// ==========================================
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

export interface DefectClassTable extends GenericMasterDataTable {
  defectclass_id: string;
  defectclass_name: string;
  defectclass_desc: string | null;
}

export interface PartTypesTable extends GenericMasterDataTable {
  parttype_id: string;
  parttype_name: string;
  parttype_code: string | null;
  parttype_desc: string | null;
}

export interface PartDataCategoriesTable extends GenericMasterDataTable {
  partdatacategory_id: string;
  partdatacategory_name: string;
  part_id: string | null;
  minimum: number | null;
  maximum: number | null;
  partdatacategory_desc: string | null;
}

export interface PartDimensionCategoriesTable extends GenericMasterDataTable {
  partdimensioncategory_id: string;
  partdimensioncategory_name: string;
  part_id: string | null;
  minimum: number | null;
  maximum: number | null;
  partdimensioncategory_desc: string | null;
}

export interface PartNoiseCategoriesTable extends GenericMasterDataTable {
  partnoisecategory_id: string;
  partnoisecategory_name: string;
  part_id: string | null;
  minimum: number | null;
  maximum: number | null;
  partnoisecategory_desc: string | null;
}

export interface FormsTable extends GenericMasterDataTable {
  form_id: string;
  form_name: string;
  form_url: string | null;
  menu_group: string | null;
  icon: string | null;
  form_desc: string | null;
}

export interface RoleAccessTable extends GenericMasterDataTable {
  roleaccess_id: string;
  role_id: string;
  form_id: string;
  roleaccess_desc: string | null;
  can_view: boolean | number | null;
  can_add: boolean | number | null;
  can_edit: boolean | number | null;
  can_delete: boolean | number | null;
  can_approve: boolean | number | null;
  can_check: boolean | number | null;
  can_print: boolean | number | null;
  can_export: boolean | number | null;
  can_viewlist: boolean | number | null;
  per_site: boolean | number | null;
  can_attach: boolean | number | null;
  pic: boolean | number | null;
}

export interface SupplierInformationTable extends GenericMasterDataTable {
  supplier_information_id: string;
  supplier_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  supplier_information_desc: string | null;
  attachment_id: string | null;
  attachment_name: string | null;
  attachment_extension: string | null;
}

export interface AuditCategoryTable extends GenericMasterDataTable {
  audit_category_id: string;
  audit_category_name: string;
  audit_category_code: string | null;
  audit_category_desc: string | null;
  with_rating: boolean | number | null;
  with_auditees: boolean | number | null;
  with_auditors: boolean | number | null;
  with_attendees: boolean | number | null;
  with_audit_plan: boolean | number | null;
}

export interface AuditTypeTable extends GenericMasterDataTable {
  audit_type_id: string;
  audit_type_name: string;
  audit_type_desc: string | null;
  audit_category_id: string | null;
}

export interface CriteriasTable extends GenericMasterDataTable {
  criteria_id: string;
  criteria_name: string;
  criteria_desc: string | null;
}

export interface FAQItemTable extends GenericMasterDataTable {
  faq_item_id: string;
  faq_category: number;
  question: string;
  answer: string;
  sequence: number;
  faq_item_desc: string | null;
}

export interface CertificationsTable extends GenericMasterDataTable {
  certification_id: string;
  certification_name: string;
  certification_desc: string | null;
}

export interface GroupsTable extends GenericMasterDataTable {
  group_id: string;
  group_name: string;
  group_desc: string | null;
}

export interface TrainingProgramsTable extends GenericMasterDataTable {
  training_program_id: string;
  training_program_name: string;
  training_program_desc: string | null;
}

export interface MessageInfoTable extends GenericMasterDataTable {
  messageinfo_id: string;
  key_name: string;
  value: string | null;
}

export interface PartClassCategoriesTable {
  Category_ID: string;
  Category_name: string;
  Category_desc: string | null;
  Partclass_id: string | null;
  Active_flag: boolean | number | null;
  Last_update: Date | string | null;
  updateby: string | null;
}

export interface RegistrationsTable extends GenericMasterDataTable {
  registration_id: string;
  confirmation_code: string;
  user_id: string;
  registration_type: number | null;
  confirmed: boolean | number | null;
  confirmation_date: Date | string | null;
}

// --- 5M1E Application ---
export interface FiveM1EApplicationTable {
  ID: Generated<number>; // Generated means the DB handles insertion (Identity/Auto-increment)
  ControlNo: string;
  Title: string | null;
  SupplierID: number | null;
  SupplierCN: string | null;
  VendorID: string | null;
  ItemID: string | null;
  SiteID: number | null;
  CommodityID: number | null;
  ModelID: number | null;
  ReportNo: string | null;
  DateRegister: Date | string | null;
  Class: number | null;
  ClassType: number | null;
  ImpactDate: string | null;
  EngineerRemarks: string | null;
  
  // Attributes
  Attribute01: string | null;
  Attribute02: string | null;
  Attribute03: string | null;
  Attribute04: string | null;
  
  CreatedBy: string | null;
  CreateDate: Date | string;
  ModifiedDate: Date | string | null;
}

// --- 5M1E Approval ---
export interface FiveM1EApprovalTable {
  ID: Generated<number>;
  ControlNo: string;
  Status: string;
  
  // Approvers
  MPDPIC: string | null;
  MPDApprover: string | null;
  MPDApproverName: string | null;
  MPDApproverStatus: number | null;
  MPDAprDtAprd: string | null;

  CreateDate: Date | string;
  ModifiedDate: Date | string | null;
}

export interface RolesTable {
  role_id: string;
  role_name: string;
}

// --- Master Data: Users ---
export interface UsersTable {
  user_id: string;
  full_name: string;
  email: string | null;
  password: string | null; 
  role_id: string | null;
  site_id: string | null;
  creation_date: Date | string | null;
  active_flag: boolean | number | null;
  last_pasword_change: Date | string | null;
  local_user: boolean | number | null;
  login_flag: boolean | number | null;
  last_update: Date | string | null;
  updateby: string | null;
  new_flag: boolean | number | null;
  change_pw: boolean | number | null;
}

// --- Master Data: Suppliers ---
export interface SuppliersTable {
  supplier_id: string;
  supplier_name: string;
  supplier_cn: string | null;
  site_id: string | null;
  supplier_desc: string | null;
  location: string | null;
  active_flag: boolean | number | null;
  last_update: Date | string | null;
  updateby: string | null;
}

// --- Master Data: SuppliersUser ---
export interface SuppliersUserTable {
  Id: string;
  supplier_id: string;
  user_id: string;
  active_flag: boolean | number | null;
  last_update: Date | string | null;
  updatedby: string | null;
}

// --- Master Data: Mfg Sites ---
export interface MfgSitesTable {
  site_id: string;
  site_name: string;
}

// --- Master Data: Parts ---
export interface PartsTable {
  part_id: string; 
  part_code: string | null;
  part_name: string | null;
  site_id: string;
  part_desc: string | null;
  partclass_id: string;
  parttype_id: string;
  aql_id: string;
  active_flag: boolean | number;
  last_update: Date | string;
  updateby: string;
  Attribute1: string | null;
  Attribute2: string | null;
  Attribute3: string | null;
  Attribute4: string | null;
}

// ============================================================================
// 3. Helper Types (Optional Export for specific services)
// ============================================================================
export type FiveM1EApp = Selectable<FiveM1EApplicationTable>;
export type NewFiveM1EApp = Insertable<FiveM1EApplicationTable>;
export type FiveM1EAppUpdate = Updateable<FiveM1EApplicationTable>;
