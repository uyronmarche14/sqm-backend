import { Selectable, Insertable } from 'kysely';

// ============================================================================
// Master Data - Database Table Types
// ============================================================================

export interface GenericMasterDataTable {
  active_flag: boolean | number | null;
  last_update?: Date | string | null;
  updateby?: string | null;
  creation_date?: Date | string | null;
}

// --- Suppliers ---
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

export interface SuppliersUserTable {
  Id: string;
  supplier_id: string;
  user_id: string;
  active_flag: boolean | number | null;
  last_update: Date | string | null;
  updatedby: string | null;
}

// --- Sites ---
export interface MfgSitesTable {
  site_id: string;
  site_name: string;
}

// --- Parts ---
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

export interface PartClassTable extends GenericMasterDataTable {
  partclass_id: string;
  partclass_name: string;
  partclass_desc: string | null;
  site_id: string | null;
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

export interface PartClassCategoriesTable {
  Category_ID: string;
  Category_name: string;
  Category_desc: string | null;
  Partclass_id: string | null;
  Active_flag: boolean | number | null;
  Last_update: Date | string | null;
  updateby: string | null;
}

// --- Models & Products ---
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

// --- Manufacturing ---
export interface MfgAreasTable extends GenericMasterDataTable {
  mfg_area_id: string;
  mfg_area_name: string;
  mfg_area_desc: string | null;
}

// --- Defects ---
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

export interface DefectClassTable extends GenericMasterDataTable {
  defectclass_id: string;
  defectclass_name: string;
  defectclass_desc: string | null;
}

// --- Quality ---
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

export interface AqlLevelTable {
  aqllevel_id: string;
  aql_id: string;
  severity_id: string;
  lot_size_min: number;
  lot_size_max: number;
  active_flag: boolean | number | null;
  last_update: Date | string | null;
  updateby: string | null;
}

export interface AqlLevelClassTable {
  aqllevelclass_id: string;
  aqllevel_id: string;
  defectclass_id: string;
  samplesize: number;
  accept: number;
  reject: number;
}

export interface MaterialCertsTable extends GenericMasterDataTable {
  materialcert_id: string;
  part_id: string | null;
  component: string;
  required_data: string;
  materialcert_desc: string | null;
}

// --- Inspection ---
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

// --- MNR Types ---
export interface MnrTypesTable extends GenericMasterDataTable {
  mnrtype_id: string;
  mnrtype_name: string;
  mnrtype_desc: string | null;
}

// --- Forms & Role Access ---
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

// --- Supplier Information ---
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

// --- Audit ---
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

// --- Admin Tables ---
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

export interface RegistrationsTable extends GenericMasterDataTable {
  registration_id: string;
  confirmation_code: string;
  user_id: string;
  registration_type: number | null;
  confirmed: boolean | number | null;
  confirmation_date: Date | string | null;
}

// Helper types
export type Supplier = Selectable<SuppliersTable>;
export type NewSupplier = Insertable<SuppliersTable>;
export type Part = Selectable<PartsTable>;
export type NewPart = Insertable<PartsTable>;
export type Model = Selectable<ModelsTable>;
export type Product = Selectable<ProductsTable>;
export type MfgSite = Selectable<MfgSitesTable>;
