// ============================================================================
// Database Type Barrel - Re-exports all module table types
// Each module owns its own db.types.ts for maintainability.
// ============================================================================

// --- Module Re-exports ---
export * from '../../modules/fiveM1E/fiveM1E.db.types.js';
export * from '../../modules/users/user.db.types.js';
export * from '../../modules/masterData/master-data.db.types.js';
export * from '../../modules/mnr/mnr.db.types.js';
export * from '../../modules/npi/npi.db.types.js';
export * from '../../modules/ogi/ogi.db.types.js';
export * from '../../modules/qmqa/qmqa.db.types.js';
export * from '../../modules/sqmp/sqmp.db.types.js';
export * from '../../modules/sqpr/sqpr.db.types.js';
export * from '../../modules/training/training.db.types.js';

// --- Import table interfaces for Database mapping ---
import type {
  FiveM1EApplicationTable, FiveM1EApprovalTable, FiveM1EActionItemsTable,
  FiveM1EAIAttachmentTable, FiveM1EAttachmentTable, FiveM1ECheckItemsTable,
  FiveM1ECIAttachmentTable, FiveM1EPartsPerReportTable, FiveM1EStatusRemarksTable,
  FiveM1EEmailDailyNotificationTable, FiveM1EEmailElementsTable
} from '../../modules/fiveM1E/fiveM1E.db.types.js';
import type { UsersTable, RolesTable, PasswordResetTokensTable } from '../../modules/users/user.db.types.js';
import type {
  SuppliersTable, SuppliersUserTable, MfgSitesTable, PartsTable, PartClassTable,
  ModelsTable, ProductsTable, MfgAreasTable, DefectCategoriesTable, DefectsTable,
  DefectClassTable, DispositionsTable, SeverityTable, AQLTable, InspectionCategoriesTable,
  InspectionMethodsTable, InspectorsTable, MnrTypesTable, PartTypesTable,
  PartDataCategoriesTable, PartDimensionCategoriesTable, PartNoiseCategoriesTable,
  AqlLevelTable, AqlLevelClassTable, MaterialCertsTable,
  FormsTable, RoleAccessTable, SupplierInformationTable, AuditCategoryTable,
  AuditTypeTable, CriteriasTable, PartClassCategoriesTable, RegistrationsTable,
  FAQItemTable, CertificationsTable, GroupsTable, TrainingProgramsTable, MessageInfoTable
} from '../../modules/masterData/master-data.db.types.js';
import type {
  MnrLotsTable, MnrDetailsTable, MnrResponseTable, MnrVerificationTable,
  MnrCcTable, MnrAttachmentTable, MnrResponseAttachmentTable
} from '../../modules/mnr/mnr.db.types.js';
import type {
  NpiLotsTable, NpiAttachmentTable, NpiCcTable, NpiDatacatTable,
  NpiDimensioncatTable, NpiMaterialcertTable, NpiNoisecatTable, NpiVisualcatTable
} from '../../modules/npi/npi.db.types.js';
import type { OgiTable, OgiAttachmentTable, OgiLotsTable } from '../../modules/ogi/ogi.db.types.js';
import type {
  QmqaTable, QmqaAttachmentTable, QmqaAuditPlanTable, QmqaCcTable,
  QmqaPlanAttachmentTable, QmqaResponseTable, QmqaResponseFinalTable,
  QmqaResponseInitialTable, QmqaResponseVerificationTable,
  QmqaNcTable, QmqaScoreTable
} from '../../modules/qmqa/qmqa.db.types.js';
import type {
  SqmpTable, SqmpAppendixTable, SqmpCcTable, SqmpDocumentTable,
  SqmpResponseTable, SqmpResponseAppendixTable, SqmpResponseClosureTable,
  SqmpResponseDocumentTable, SqmpStatusRemarksTable
} from '../../modules/sqmp/sqmp.db.types.js';
import type {
  SqprTable, SqprAttachmentTable, SqprCcTable, SqprCustomerClaimTable,
  SqprDetailTable, SqprLarTable, SqprLarCcTable, SqprLarDetailTable,
  SqprQualityRiskTable
} from '../../modules/sqpr/sqpr.db.types.js';
import type {
  SqeTrainingAttendeesTable,
  SqeTrainingScheduleTable,
} from '../../modules/training/training.db.types.js';

// ============================================================================
// Database Interface (The "Type-Type" Engine)
// Maps SQL table names → TypeScript table interfaces
// ============================================================================

export interface Database {
  // 5M1E Module (11 tables)
  TBL_5M1E_Application: FiveM1EApplicationTable;
  TBL_5M1E_Approval: FiveM1EApprovalTable;
  TBL_5M1E_ActionItems: FiveM1EActionItemsTable;
  TBL_5M1E_AI_Attachment: FiveM1EAIAttachmentTable;
  TBL_5M1E_Attachment: FiveM1EAttachmentTable;
  TBL_5M1E_CheckItems: FiveM1ECheckItemsTable;
  TBL_5M1E_CI_Attachment: FiveM1ECIAttachmentTable;
  TBL_5M1E_PartsPerReport: FiveM1EPartsPerReportTable;
  TBL_5M1E_Status_Remarks: FiveM1EStatusRemarksTable;
  TBL_5M1E_EmailDailyNotification: FiveM1EEmailDailyNotificationTable;
  TBL_5M1E_EmailElements: FiveM1EEmailElementsTable;

  // Users & Roles
  USERS: UsersTable;
  ROLES: RolesTable;
  PASSWORD_RESET_TOKENS: PasswordResetTokensTable;

  // Master Data
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
  AQLLEVEL: AqlLevelTable;
  AQLLEVELCLASS: AqlLevelClassTable;
  INSPECTIONCATEGORIES: InspectionCategoriesTable;
  INSPECTIONMETHODS: InspectionMethodsTable;
  INSPECTORS: InspectorsTable;
  MATERIALCERTS: MaterialCertsTable;
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
  NPI_LOTS: NpiLotsTable;
  NPI_ATTACHMENT: NpiAttachmentTable;
  NPI_CC: NpiCcTable;
  NPI_DATACAT: NpiDatacatTable;
  NPI_DIMENSIONCAT: NpiDimensioncatTable;
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
  QMQA_NC: QmqaNcTable;
  QMQA_SCORE: QmqaScoreTable;

  // Training Module
  SQE_TRAINING_SCHEDULE: SqeTrainingScheduleTable;
  SQE_TRAINING_ATTENDEES: SqeTrainingAttendeesTable;
}
