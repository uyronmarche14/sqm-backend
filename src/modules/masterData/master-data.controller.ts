import { Request, Response, NextFunction } from 'express';
import { masterDataService, mappers } from './master-data.service.js';
import * as schemas from './master-data.schema.js';
import * as repos from './master-data.repository.js';
import { controlNumberService } from '../../shared/services/control-number.service.js';

type ControllerOptions = {
  repo: any;
  mapper: (row: any) => any;
  schema: any;
  idCol: string;
  toDB: (id: string, payload: any, userId: string) => any;
};

/**
 * Higher-Order Function to generate boilerplate Express CRUD controllers.
 * Dramatically reduces controller size while maintaining type safety and validation.
 */
const createController = (options: ControllerOptions) => ({
  getAll: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await masterDataService.getAll(options));
    } catch (e) { console.error('[MasterData] GET ALL error:', e); next(e); }
  },
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = options.schema.parse(req.body);
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      res.status(201).json(await masterDataService.create(options, payload, userId));
    } catch (e) { console.error('[MasterData] CREATE error:', e); next(e); }
  },
  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = schemas.ParamIdSchema.parse(req.params);
      const payload = options.schema.parse(req.body);
      const userId = (req as any).user?.userId || (req as any).user?.id || 'SYSTEM';
      res.json(await masterDataService.update(options, id, payload, userId));
    } catch (e) { console.error('[MasterData] UPDATE error:', e); next(e); }
  },
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = schemas.ParamIdSchema.parse(req.params);
      await masterDataService.delete(options, id);
      res.json({ message: 'Deleted' });
    } catch (e) { console.error('[MasterData] DELETE error:', e); next(e); }
  }
});

const b = (val: string | number | boolean | undefined | null) => (val === true || val === 1 ? 1 : 0);
const s = (val: string | undefined | null) => val || '';

// ============================================================================
// Core Lookups
// ============================================================================

export const sitesCtrl = createController({
  repo: repos.sitesRepo, mapper: mappers.site, schema: schemas.SiteSchema, idCol: 'site_id',
  toDB: (id, p, userId) => ({ site_id: id, site_name: p.name, site_code: s(p.code), site_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

export const suppliersCtrl = createController({
  repo: repos.suppliersRepo, mapper: mappers.supplier, schema: schemas.SupplierSchema, idCol: 'supplier_id',
  toDB: (id, p, userId) => ({ supplier_id: id, supplier_name: p.name, site_id: p.siteId, location: s(p.location), supplier_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

export const rolesCtrl = createController({
  repo: repos.rolesRepo, mapper: mappers.role, schema: schemas.RoleSchema, idCol: 'role_id',
  toDB: (id, p, userId) => ({ role_id: id, role_name: p.name, role_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

export const modelsCtrl = createController({
  repo: repos.modelsRepo, mapper: mappers.model, schema: schemas.ModelSchema, idCol: 'model_id',
  toDB: (id, p, userId) => ({ model_id: id, model_name: p.name, model_no: s(p.code), model_desc: s(p.description), product_id: p.productId, site_id: p.siteId, active_flag: b(p.isActive), updateby: userId })
});

export const productsCtrl = createController({
  repo: repos.productsRepo, mapper: mappers.product, schema: schemas.ProductSchema, idCol: 'product_id',
  toDB: (id, p, userId) => ({ product_id: id, product_name: p.name, product_code: s(p.code), product_desc: s(p.description), site_id: p.siteId, active_flag: b(p.isActive), updateby: userId })
});

export const mfgAreasCtrl = createController({
  repo: repos.mfgAreasRepo, mapper: mappers.mfgArea, schema: schemas.MfgAreaSchema, idCol: 'mfg_area_id',
  toDB: (id, p, userId) => ({ mfg_area_id: id, mfg_area_name: p.mfg_area_name, mfg_area_desc: s(p.mfg_area_desc), active_flag: b(p.active_flag), updateby: userId })
});

// ============================================================================
// Defects & Dispositions
// ============================================================================

export const defectCatsCtrl = createController({
  repo: repos.defectCategoriesRepo, mapper: mappers.defectCat, schema: schemas.DefectCategorySchema, idCol: 'defectcategory_id',
  toDB: (id, p, userId) => ({ defectcategory_id: id, defectcategory_name: p.name, defectcategory_acronym: s(p.acronym), defectcategory_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

export const defectsCtrl = createController({
  repo: repos.defectsRepo, mapper: mappers.defect, schema: schemas.DefectSchema, idCol: 'defect_id',
  toDB: (id, p, userId) => ({ defect_id: id, defect_name: p.name, defect_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

export const defectClassesCtrl = createController({
  repo: repos.defectClassesRepo, mapper: mappers.defectClass, schema: schemas.DefectClassSchema, idCol: 'defectclass_id',
  toDB: (id, p, userId) => ({ defectclass_id: id, defectclass_name: p.name, defectclass_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

export const dispositionsCtrl = createController({
  repo: repos.dispositionsRepo, mapper: mappers.disposition, schema: schemas.DispositionSchema, idCol: 'disposition_id',
  toDB: (id, p, userId) => ({ disposition_id: id, disposition_name: p.name, disposition_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

export const severityCtrl = createController({
  repo: repos.severityRepo, mapper: mappers.severity, schema: schemas.SeveritySchema, idCol: 'severity_id',
  toDB: (id, p, userId) => ({ severity_id: id, severity_name: p.name, severity_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

export const aqlCtrl = createController({
  repo: repos.aqlRepo, mapper: mappers.aql, schema: schemas.AQLSchema, idCol: 'aql_id',
  toDB: (id, p, userId) => ({ aql_id: id, aql_name: p.name, minor: s(p.minor), major: s(p.major), site_id: p.siteId, aql_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

// ============================================================================
// Inspections & General
// ============================================================================

export const inspCatsCtrl = createController({
  repo: repos.inspectionCategoriesRepo, mapper: mappers.inspCat, schema: schemas.InspectionCategorySchema, idCol: 'inspectioncat_id',
  toDB: (id, p, userId) => ({ inspectioncat_id: id, inspectioncat_name: p.name, inspectioncat_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

export const inspMethodsCtrl = createController({
  repo: repos.inspectionMethodsRepo, mapper: mappers.inspMethod, schema: schemas.InspectionMethodSchema, idCol: 'inspectionmethod_id',
  toDB: (id, p, userId) => ({ inspectionmethod_id: id, inspectionmethod_name: p.name, inspectionmethod_desc: s(p.description), default_temp: p.defaultTemp, default_hum: p.defaultHum, default_value: b(p.defaultValue), active_flag: b(p.isActive), updateby: userId })
});

export const inspectorsCtrl = createController({
  repo: repos.inspectorsRepo, mapper: mappers.inspector, schema: schemas.InspectorSchema, idCol: 'inspector_id',
  toDB: (id, p, userId) => ({ inspector_id: id, inspector_name: p.name, inspector_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

export const generalMasterCtrl = createController({
  repo: repos.mnrTypesRepo, mapper: mappers.mnrType, schema: schemas.GeneralMasterSchema, idCol: 'mnrtype_id',
  toDB: (id, p, userId) => ({ mnrtype_id: id, mnrtype_name: p.mnrtype_name, mnrtype_desc: s(p.mnrtype_desc), active_flag: b(p.active_flag), updateby: userId })
});

// ============================================================================
// Parts Catalog
// ============================================================================

export const partClassCtrl = createController({
  repo: repos.partsRepo, mapper: mappers.partClass, schema: schemas.PartClassSchema, idCol: 'partclass_id',
  toDB: (id, p, userId) => ({ partclass_id: id, partclass_name: p.name, partclass_desc: s(p.description), site_id: p.siteId, active_flag: b(p.isActive), updateby: userId })
});

export const partTypesCtrl = createController({
  repo: repos.partTypesRepo, mapper: mappers.partType, schema: schemas.PartTypeSchema, idCol: 'parttype_id',
  toDB: (id, p, userId) => ({ parttype_id: id, parttype_name: p.name, parttype_code: s(p.code), parttype_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

export const partDataCatsCtrl = createController({
  repo: repos.partDataCatsRepo, mapper: mappers.partDataCat, schema: schemas.PartCategoryParamSchema, idCol: 'partdatacategory_id',
  toDB: (id, p, userId) => ({ partdatacategory_id: id, partdatacategory_name: p.name, part_id: p.parentId, minimum: p.min, maximum: p.max, partdatacategory_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

export const partDimCatsCtrl = createController({
  repo: repos.partDimCatsRepo, mapper: mappers.partDimCat, schema: schemas.PartCategoryParamSchema, idCol: 'partdimensioncategory_id',
  toDB: (id, p, userId) => ({ partdimensioncategory_id: id, partdimensioncategory_name: p.name, part_id: p.parentId, minimum: p.min, maximum: p.max, partdimensioncategory_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

export const partNoiseCatsCtrl = createController({
  repo: repos.partNoiseCatsRepo, mapper: mappers.partNoiseCat, schema: schemas.PartCategoryParamSchema, idCol: 'partnoisecategory_id',
  toDB: (id, p, userId) => ({ partnoisecategory_id: id, partnoisecategory_name: p.name, part_id: p.parentId, minimum: p.min, maximum: p.max, partnoisecategory_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

export const partsCatalogCtrl = createController({
  repo: repos.partsCatalogRepo, mapper: mappers.partMaster, schema: schemas.PartMasterSchema, idCol: 'part_id',
  toDB: (id, p, userId) => ({ part_id: id, part_code: p.code, part_name: p.name, site_id: p.siteId, part_desc: s(p.description), partclass_id: p.classId, parttype_id: p.typeId, aql_id: p.aqlId || '0', active_flag: b(p.active_flag), updateby: userId })
});

// ============================================================================
// Forms & Security
// ============================================================================

export const formsCtrl = createController({
  repo: repos.formsRepo, mapper: mappers.form, schema: schemas.FormSchema, idCol: 'form_id',
  toDB: (id, p, userId) => ({ form_id: id, form_name: p.name, form_url: p.url, menu_group: p.menuGroup, icon: s(p.icon), form_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

export const roleAccessCtrl = createController({
  repo: repos.roleAccessRepo, mapper: mappers.roleAccess, schema: schemas.RoleAccessSchema, idCol: 'roleaccess_id',
  toDB: (id, p, userId) => ({ roleaccess_id: id, role_id: p.roleId, form_id: p.formId, roleaccess_desc: s(p.description), 
    can_view: b(p.permissions.view), can_add: b(p.permissions.add), can_edit: b(p.permissions.edit), can_delete: b(p.permissions.delete),
    can_approve: b(p.permissions.approve), can_check: b(p.permissions.check), can_print: b(p.permissions.print), can_export: b(p.permissions.export),
    can_viewlist: b(p.permissions.viewList || p.permissions.view_list), per_site: b(p.permissions.perSite), can_attach: b(p.permissions.canAttach), pic: b(p.permissions.pic),
    active_flag: b(p.isActive), updateby: userId 
  })
});

// ============================================================================
// Suppliers Ex
// ============================================================================

export const supplierInchargesCtrl = createController({
  repo: repos.supplierInchargesRepo, mapper: mappers.supplierIncharge, schema: schemas.SupplierInchargeSchema, idCol: 'Id',
  toDB: (id, p, userId) => ({ Id: id, supplier_id: p.supplierId, user_id: p.userId, active_flag: b(p.isActive), updatedby: userId }) // note updatedby instead of updateby in legacy
});

export const supplierInfoCtrl = createController({
  repo: repos.supplierInfoRepo, mapper: mappers.supplierInfo, schema: schemas.SupplierInfoSchema, idCol: 'supplier_information_id',
  toDB: (id, p, userId) => ({ supplier_information_id: id, supplier_id: p.supplierId, first_name: p.firstName, middle_name: s(p.middleName), last_name: p.lastName, supplier_information_desc: s(p.description), attachment_id: s(p.attachmentId), attachment_name: s(p.attachmentName), attachment_extension: s(p.attachmentExtension), active_flag: b(p.isActive), updateby: userId })
});

// Note: SupplierInfo has a specific endpoint '/by-supplier/:supplierId' in legacy routes.
export const getSupplierInfoBySupplier = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { supplierId } = req.params;
    const rows = await repos.supplierInfoRepo.findAll();
    // Manual filter since we don't have a customized findBySupplier implementation yet
    // In a prod env we'd add `findBySupplier` to the repo, but this maintains 100% route compatibility
    const filtered = (rows as any[]).filter(r => r.supplier_id === supplierId);
    res.json(filtered.map(mappers.supplierInfo));
  } catch (e) { next(e); }
};

export const getSqmpControlNoPreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const controlNo = await controlNumberService.previewSqmp({
      fiscalYear: req.query.fiscalYear as string | undefined,
      siteId: req.query.siteId as string | undefined,
      siteCode: req.query.siteCode as string | undefined,
      semester: req.query.semester as string | undefined,
      series: req.query.series as string | undefined,
      revision: req.query.revision as string | undefined,
    });

    res.json({
      controlNo,
      controlNoState: controlNumberService.getControlNoState(controlNo),
    });
  } catch (e) { next(e); }
};

export const getSfrControlNoPreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const controlNo = await controlNumberService.previewSfr({
      fiscalYear: req.query.fiscalYear as string | undefined,
      frequency: req.query.frequency as string | undefined,
      supplierCode: req.query.supplierCode as string | undefined,
      series: req.query.series as string | undefined,
    });

    res.json({
      controlNo,
      controlNoState: controlNumberService.getControlNoState(controlNo),
    });
  } catch (e) { next(e); }
};

// ============================================================================
// Audit & QMS
// ============================================================================

export const auditCatsCtrl = createController({
  repo: repos.auditCategoriesRepo, mapper: mappers.auditCat, schema: schemas.AuditCategorySchema, idCol: 'audit_category_id',
  toDB: (id, p, userId) => ({ audit_category_id: id, audit_category_name: p.name, audit_category_code: p.code, audit_category_desc: s(p.description), with_rating: b(p.withRating), with_auditees: b(p.withAuditees), with_auditors: b(p.withAuditors), with_attendees: b(p.withAttendees), with_audit_plan: b(p.withAuditPlan), active_flag: b(p.isActive), updateby: userId })
});

export const auditTypesCtrl = createController({
  repo: repos.auditTypesRepo, mapper: mappers.auditType, schema: schemas.AuditTypeSchema, idCol: 'audit_type_id',
  toDB: (id, p, userId) => ({ audit_type_id: id, audit_type_name: p.name, audit_type_desc: s(p.description), audit_category_id: p.categoryId, active_flag: b(p.isActive), updateby: userId })
});

export const criteriaCtrl = createController({
  repo: repos.criteriaRepo, mapper: mappers.criteria, schema: schemas.CriteriaSchema, idCol: 'criteria_id',
  toDB: (id, p, userId) => ({ criteria_id: id, criteria_name: p.name, criteria_desc: s(p.description), active_flag: b(p.isActive), updateby: userId })
});

export const fiveM1ECatsCtrl = createController({
  repo: repos.fiveM1ECatsRepo, mapper: mappers.fiveM1ECat, schema: schemas.FiveM1ECategorySchema, idCol: 'Category_ID',
  toDB: (id, p, userId) => ({ Category_ID: id, Category_name: p.name, Category_desc: s(p.description), Partclass_id: p.partClassId, Active_flag: b(p.isActive), updateby: userId })
});

export const registrationsCtrl = createController({
  repo: repos.registrationsRepo, mapper: mappers.registration, schema: schemas.RegistrationSchema, idCol: 'registration_id',
  toDB: (id, p, userId) => ({ registration_id: id, confirmation_code: p.confirmationCode, user_id: p.userId, registration_type: p.registrationType, confirmed: 0, active_flag: b(p.isActive), updateby: userId }) // Legacy forced confirmed=0 on insert
});

// ============================================================================
// Missing Admin Tables (Groups, FAQ, Certifications, Training Programs, Messages)
// ============================================================================

export const faqItemsCtrl = createController({
  repo: repos.faqItemsRepo, mapper: mappers.faqItem, schema: schemas.FAQItemSchema, idCol: 'faq_item_id',
  toDB: (id, p, userId) => ({ faq_item_id: id, question: p.question, answer: p.answer, faq_category: p.faq_category ?? 0, sequence: p.sequence ?? 0, faq_item_desc: s(p.faq_item_desc), active_flag: b(p.active_flag), updateby: userId })
});

export const certificationsCtrl = createController({
  repo: repos.certificationsRepo, mapper: mappers.certification, schema: schemas.CertificationSchema, idCol: 'certification_id',
  toDB: (id, p, userId) => ({ certification_id: id, certification_name: p.certification_name, certification_desc: s(p.certification_desc), active_flag: b(p.active_flag), updateby: userId })
});

export const groupsCtrl = createController({
  repo: repos.groupsRepo, mapper: mappers.group, schema: schemas.GroupSchema, idCol: 'group_id',
  toDB: (id, p, userId) => ({ group_id: id, group_name: p.group_name, group_desc: s(p.group_desc), active_flag: b(p.active_flag), updateby: userId })
});

export const trainingProgramsCtrl = createController({
  repo: repos.trainingProgramsRepo, mapper: mappers.trainingProgram, schema: schemas.TrainingProgramSchema, idCol: 'training_program_id',
  toDB: (id, p, userId) => ({ training_program_id: id, training_program_name: p.training_program_name, training_program_desc: s(p.training_program_desc), active_flag: b(p.active_flag), updateby: userId })
});

export const messageInfoCtrl = createController({
  repo: repos.messageInfoRepo, mapper: mappers.messageInfo, schema: schemas.MessageInfoSchema, idCol: 'messageinfo_id',
  toDB: (id, p, userId) => ({ messageinfo_id: id, key_name: p.key_name, value: p.value || '', active_flag: b(p.active_flag), updateby: userId })
});
