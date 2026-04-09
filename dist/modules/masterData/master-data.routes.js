import express from 'express';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { requirePermission } from '../../shared/middleware/requirePermission.js';
import { requireAnyPermission } from '../../shared/middleware/requireAnyPermission.js';
import * as ctrl from './master-data.controller.js';
const router = express.Router();
// All master data endpoints require authentication
router.use(requireAuth);
// Workflow-safe lookup endpoints
router.get('/lookup/sites', ctrl.sitesCtrl.getAll);
router.get('/lookup/suppliers', ctrl.suppliersCtrl.getAll);
router.get('/lookup/products', ctrl.productsCtrl.getAll);
router.get('/lookup/models', ctrl.modelsCtrl.getAll);
router.get('/lookup/mfg-areas', ctrl.mfgAreasCtrl.getAll);
router.get('/lookup/defect-categories', ctrl.defectCatsCtrl.getAll);
router.get('/lookup/defects', ctrl.defectsCtrl.getAll);
router.get('/lookup/defect-classes', ctrl.defectClassesCtrl.getAll);
router.get('/lookup/dispositions', ctrl.dispositionsCtrl.getAll);
router.get('/lookup/severity', ctrl.severityCtrl.getAll);
router.get('/lookup/aql', ctrl.aqlCtrl.getAll);
router.get('/lookup/inspection-categories', ctrl.inspCatsCtrl.getAll);
router.get('/lookup/inspection-methods', ctrl.inspMethodsCtrl.getAll);
router.get('/lookup/inspectors', ctrl.inspectorsCtrl.getAll);
router.get('/lookup/mnr-types', ctrl.generalMasterCtrl.getAll);
router.get('/lookup/general', ctrl.generalMasterCtrl.getAll);
router.get('/lookup/parts', ctrl.partClassCtrl.getAll);
router.get('/lookup/part-types', ctrl.partTypesCtrl.getAll);
router.get('/lookup/part-data-categories', ctrl.partDataCatsCtrl.getAll);
router.get('/lookup/part-dim-categories', ctrl.partDimCatsCtrl.getAll);
router.get('/lookup/part-noise-categories', ctrl.partNoiseCatsCtrl.getAll);
router.get('/lookup/parts-catalog', ctrl.partsCatalogCtrl.getAll);
router.get('/lookup/supplier-incharges', ctrl.supplierInchargesCtrl.getAll);
router.get('/lookup/supplier-information', ctrl.supplierInfoCtrl.getAll);
router.get('/lookup/supplier-information/by-supplier/:supplierId', ctrl.getSupplierInfoBySupplier);
router.get('/lookup/control-no-preview/sqmp', ctrl.getSqmpControlNoPreview);
router.get('/lookup/control-no-preview/sfr', ctrl.getSfrControlNoPreview);
router.get('/lookup/audit-categories', ctrl.auditCatsCtrl.getAll);
router.get('/lookup/audit-types', ctrl.auditTypesCtrl.getAll);
router.get('/lookup/five-m1e-categories', ctrl.fiveM1ECatsCtrl.getAll);
const maintenanceAccess = (formIds) => ({
    list: requireAnyPermission(formIds, 'viewlist'),
    add: requireAnyPermission(formIds, 'add'),
    edit: requireAnyPermission(formIds, 'edit'),
    delete: requireAnyPermission(formIds, 'delete'),
});
const SITES = maintenanceAccess(['SITE-06-01', 'SITE-06-02']);
const SUPPLIERS = maintenanceAccess(['SUPPLIER-06-01', 'SUPPLIER-06-02']);
const ROLES = maintenanceAccess(['ROLES-06-01', 'ROLES-06-02']);
const MODELS = maintenanceAccess(['MODEL-06-01', 'MODEL-06-02']);
const PRODUCTS = maintenanceAccess(['PRODUCT-06-01', 'PRODUCT-06-02']);
const MFG_AREAS = maintenanceAccess(['MFGAREA-08-01', 'MFGAREA-08-02']);
const DEFECT_CATEGORIES = maintenanceAccess(['DEFECTCATEGORY-07-01', 'DEFECTCATEGORY-07-02']);
const DEFECTS = maintenanceAccess(['DEFECT-07-01', 'DEFECT-07-02']);
const DEFECT_CLASSES = maintenanceAccess(['DEFECTCLASS-07-01', 'DEFECTCLASS-07-02']);
const DISPOSITIONS = maintenanceAccess(['DISPOSITION-06-01', 'DISPOSITION-06-02']);
const SEVERITY = maintenanceAccess(['SEVERITY-09-01', 'SEVERITY-09-02']);
const AQL = maintenanceAccess(['AQL-06-01', 'AQL-06-02']);
const INSPECTION_CATEGORIES = maintenanceAccess(['INSPECTIONCATEGORY-09-01', 'INSPECTIONCATEGORY-09-02']);
const INSPECTION_METHODS = maintenanceAccess(['INSPECTIONMETHOD-09-01', 'INSPECTIONMETHOD-09-02']);
const INSPECTORS = maintenanceAccess(['INSPECTOR-08-01', 'INSPECTOR-08-02']);
const MNR_TYPES = maintenanceAccess(['MNRTYPE-02-01', 'MNRTYPE-02-02']);
const PARTS = maintenanceAccess(['PART-06-01', 'PART-06-02']);
const PART_TYPES = maintenanceAccess(['PARTTYPE-06-01', 'PARTTYPE-06-02']);
const PART_DATA_CATEGORIES = maintenanceAccess(['PARTDATACATEGORY-08-01', 'PARTDATACATEGORY-08-02']);
const PART_DIM_CATEGORIES = maintenanceAccess(['PARTDIMENSIONCATEGORY-08-01', 'PARTDIMENSIONCATEGORY-08-02']);
const PART_NOISE_CATEGORIES = maintenanceAccess(['PARTNOISECATEGORY-08-01', 'PARTNOISECATEGORY-08-02']);
const PARTS_CATALOG = maintenanceAccess(['PART-06-01', 'PART-06-02']);
const FORMS = maintenanceAccess(['FORMS-06-01', 'FORMS-06-02']);
const ROLE_ACCESS = maintenanceAccess(['ROLESACCESS-06-01', 'ROLESACCESS-06-02']);
const SUPPLIER_INCHARGES = maintenanceAccess(['SUPPLIERINCHARGE-08-01', 'SUPPLIERINCHARGE-08-02']);
const SUPPLIER_INFORMATION = maintenanceAccess([
    'SUPPLIERINFORMATION-02-01',
    'SUPPLIERINFORMATION-02-02',
    'SUPPLIERINFORMATION-02-03',
    'SUPPLIERINFORMATION-02-04',
]);
const AUDIT_CATEGORIES = maintenanceAccess(['AUDITCATEGORY-06-01', 'AUDITCATEGORY-06-02']);
const AUDIT_TYPES = maintenanceAccess(['AUDITTYPE-06-01', 'AUDITTYPE-06-02']);
const CRITERIAS = maintenanceAccess(['CRITERIA-06-01', 'CRITERIA-06-02']);
const REGISTRATIONS = maintenanceAccess(['REGISTRATION-07-01', 'REGISTRATION-07-02']);
const FAQ = maintenanceAccess(['FAQITEM-02-01', 'FAQITEM-02-02']);
const GROUPS = maintenanceAccess(['GROUP-10-01', 'GROUP-10-02']);
const CERTIFICATIONS = maintenanceAccess(['CERTIFICATION-08-01', 'CERTIFICATION-08-02']);
const MESSAGES = maintenanceAccess(['MESSAGEINFO-07-01', 'MESSAGEINFO-07-02']);
const FIVE_M1E_CATEGORIES = maintenanceAccess(['PARTCLASSCATEGORY-07-01', 'PARTCLASSCATEGORY-07-02']);
const COARSE_MAINTENANCE = {
    list: requirePermission('MAINTENANCE', 'viewlist'),
    add: requirePermission('MAINTENANCE', 'add'),
    edit: requirePermission('MAINTENANCE', 'edit'),
    delete: requirePermission('MAINTENANCE', 'delete'),
};
// ============================================================================
// Core Lookups
// ============================================================================
router.get('/sites', SITES.list, ctrl.sitesCtrl.getAll);
router.post('/sites', SITES.add, ctrl.sitesCtrl.create);
router.put('/sites/:id', SITES.edit, ctrl.sitesCtrl.update);
router.delete('/sites/:id', SITES.delete, ctrl.sitesCtrl.delete);
router.get('/suppliers', SUPPLIERS.list, ctrl.suppliersCtrl.getAll);
router.post('/suppliers', SUPPLIERS.add, ctrl.suppliersCtrl.create);
router.put('/suppliers/:id', SUPPLIERS.edit, ctrl.suppliersCtrl.update);
router.delete('/suppliers/:id', SUPPLIERS.delete, ctrl.suppliersCtrl.delete);
router.get('/roles', ROLES.list, ctrl.rolesCtrl.getAll);
router.post('/roles', ROLES.add, ctrl.rolesCtrl.create);
router.put('/roles/:id', ROLES.edit, ctrl.rolesCtrl.update);
router.delete('/roles/:id', ROLES.delete, ctrl.rolesCtrl.delete);
router.get('/models', MODELS.list, ctrl.modelsCtrl.getAll);
router.post('/models', MODELS.add, ctrl.modelsCtrl.create);
router.put('/models/:id', MODELS.edit, ctrl.modelsCtrl.update);
router.delete('/models/:id', MODELS.delete, ctrl.modelsCtrl.delete);
router.get('/products', PRODUCTS.list, ctrl.productsCtrl.getAll);
router.post('/products', PRODUCTS.add, ctrl.productsCtrl.create);
router.put('/products/:id', PRODUCTS.edit, ctrl.productsCtrl.update);
router.delete('/products/:id', PRODUCTS.delete, ctrl.productsCtrl.delete);
router.get('/mfg-areas', MFG_AREAS.list, ctrl.mfgAreasCtrl.getAll);
router.post('/mfg-areas', MFG_AREAS.add, ctrl.mfgAreasCtrl.create);
router.put('/mfg-areas/:id', MFG_AREAS.edit, ctrl.mfgAreasCtrl.update);
router.delete('/mfg-areas/:id', MFG_AREAS.delete, ctrl.mfgAreasCtrl.delete);
// ============================================================================
// Defects & Dispositions
// ============================================================================
router.get('/defect-categories', DEFECT_CATEGORIES.list, ctrl.defectCatsCtrl.getAll);
router.post('/defect-categories', DEFECT_CATEGORIES.add, ctrl.defectCatsCtrl.create);
router.put('/defect-categories/:id', DEFECT_CATEGORIES.edit, ctrl.defectCatsCtrl.update);
router.delete('/defect-categories/:id', DEFECT_CATEGORIES.delete, ctrl.defectCatsCtrl.delete);
router.get('/defects', DEFECTS.list, ctrl.defectsCtrl.getAll);
router.post('/defects', DEFECTS.add, ctrl.defectsCtrl.create);
router.put('/defects/:id', DEFECTS.edit, ctrl.defectsCtrl.update);
router.delete('/defects/:id', DEFECTS.delete, ctrl.defectsCtrl.delete);
router.get('/defect-classes', DEFECT_CLASSES.list, ctrl.defectClassesCtrl.getAll);
router.post('/defect-classes', DEFECT_CLASSES.add, ctrl.defectClassesCtrl.create);
router.put('/defect-classes/:id', DEFECT_CLASSES.edit, ctrl.defectClassesCtrl.update);
router.delete('/defect-classes/:id', DEFECT_CLASSES.delete, ctrl.defectClassesCtrl.delete);
router.get('/dispositions', DISPOSITIONS.list, ctrl.dispositionsCtrl.getAll);
router.post('/dispositions', DISPOSITIONS.add, ctrl.dispositionsCtrl.create);
router.put('/dispositions/:id', DISPOSITIONS.edit, ctrl.dispositionsCtrl.update);
router.delete('/dispositions/:id', DISPOSITIONS.delete, ctrl.dispositionsCtrl.delete);
router.get('/severity', SEVERITY.list, ctrl.severityCtrl.getAll);
router.post('/severity', SEVERITY.add, ctrl.severityCtrl.create);
router.put('/severity/:id', SEVERITY.edit, ctrl.severityCtrl.update);
router.delete('/severity/:id', SEVERITY.delete, ctrl.severityCtrl.delete);
router.get('/aql', AQL.list, ctrl.aqlCtrl.getAll);
router.post('/aql', AQL.add, ctrl.aqlCtrl.create);
router.put('/aql/:id', AQL.edit, ctrl.aqlCtrl.update);
router.delete('/aql/:id', AQL.delete, ctrl.aqlCtrl.delete);
// ============================================================================
// Inspections & General
// ============================================================================
router.get('/inspection-categories', INSPECTION_CATEGORIES.list, ctrl.inspCatsCtrl.getAll);
router.post('/inspection-categories', INSPECTION_CATEGORIES.add, ctrl.inspCatsCtrl.create);
router.put('/inspection-categories/:id', INSPECTION_CATEGORIES.edit, ctrl.inspCatsCtrl.update);
router.delete('/inspection-categories/:id', INSPECTION_CATEGORIES.delete, ctrl.inspCatsCtrl.delete);
router.get('/inspection-methods', INSPECTION_METHODS.list, ctrl.inspMethodsCtrl.getAll);
router.post('/inspection-methods', INSPECTION_METHODS.add, ctrl.inspMethodsCtrl.create);
router.put('/inspection-methods/:id', INSPECTION_METHODS.edit, ctrl.inspMethodsCtrl.update);
router.delete('/inspection-methods/:id', INSPECTION_METHODS.delete, ctrl.inspMethodsCtrl.delete);
router.get('/inspectors', INSPECTORS.list, ctrl.inspectorsCtrl.getAll);
router.post('/inspectors', INSPECTORS.add, ctrl.inspectorsCtrl.create);
router.put('/inspectors/:id', INSPECTORS.edit, ctrl.inspectorsCtrl.update);
router.delete('/inspectors/:id', INSPECTORS.delete, ctrl.inspectorsCtrl.delete);
// MNR Types maps to both '/mnr-types' and '/general' in legacy
router.get('/mnr-types', MNR_TYPES.list, ctrl.generalMasterCtrl.getAll);
router.post('/mnr-types', MNR_TYPES.add, ctrl.generalMasterCtrl.create);
router.put('/mnr-types/:id', MNR_TYPES.edit, ctrl.generalMasterCtrl.update);
router.delete('/mnr-types/:id', MNR_TYPES.delete, ctrl.generalMasterCtrl.delete);
router.get('/general', MNR_TYPES.list, ctrl.generalMasterCtrl.getAll);
router.post('/general', MNR_TYPES.add, ctrl.generalMasterCtrl.create);
router.put('/general/:id', MNR_TYPES.edit, ctrl.generalMasterCtrl.update);
router.delete('/general/:id', MNR_TYPES.delete, ctrl.generalMasterCtrl.delete);
// ============================================================================
// Parts Catalog
// ============================================================================
router.get('/parts', PARTS.list, ctrl.partClassCtrl.getAll);
router.post('/parts', PARTS.add, ctrl.partClassCtrl.create);
router.put('/parts/:id', PARTS.edit, ctrl.partClassCtrl.update);
router.delete('/parts/:id', PARTS.delete, ctrl.partClassCtrl.delete);
router.get('/part-types', PART_TYPES.list, ctrl.partTypesCtrl.getAll);
router.post('/part-types', PART_TYPES.add, ctrl.partTypesCtrl.create);
router.put('/part-types/:id', PART_TYPES.edit, ctrl.partTypesCtrl.update);
router.delete('/part-types/:id', PART_TYPES.delete, ctrl.partTypesCtrl.delete);
router.get('/part-data-categories', PART_DATA_CATEGORIES.list, ctrl.partDataCatsCtrl.getAll);
router.post('/part-data-categories', PART_DATA_CATEGORIES.add, ctrl.partDataCatsCtrl.create);
router.put('/part-data-categories/:id', PART_DATA_CATEGORIES.edit, ctrl.partDataCatsCtrl.update);
router.delete('/part-data-categories/:id', PART_DATA_CATEGORIES.delete, ctrl.partDataCatsCtrl.delete);
router.get('/part-dim-categories', PART_DIM_CATEGORIES.list, ctrl.partDimCatsCtrl.getAll);
router.post('/part-dim-categories', PART_DIM_CATEGORIES.add, ctrl.partDimCatsCtrl.create);
router.put('/part-dim-categories/:id', PART_DIM_CATEGORIES.edit, ctrl.partDimCatsCtrl.update);
router.delete('/part-dim-categories/:id', PART_DIM_CATEGORIES.delete, ctrl.partDimCatsCtrl.delete);
router.get('/part-noise-categories', PART_NOISE_CATEGORIES.list, ctrl.partNoiseCatsCtrl.getAll);
router.post('/part-noise-categories', PART_NOISE_CATEGORIES.add, ctrl.partNoiseCatsCtrl.create);
router.put('/part-noise-categories/:id', PART_NOISE_CATEGORIES.edit, ctrl.partNoiseCatsCtrl.update);
router.delete('/part-noise-categories/:id', PART_NOISE_CATEGORIES.delete, ctrl.partNoiseCatsCtrl.delete);
// Legacy route: parts-catalog corresponds to the PartsMaster schemas and tables
router.get('/parts-catalog', PARTS_CATALOG.list, ctrl.partsCatalogCtrl.getAll);
router.post('/parts-catalog', PARTS_CATALOG.add, ctrl.partsCatalogCtrl.create);
router.put('/parts-catalog/:id', PARTS_CATALOG.edit, ctrl.partsCatalogCtrl.update);
router.delete('/parts-catalog/:id', PARTS_CATALOG.delete, ctrl.partsCatalogCtrl.delete);
// ============================================================================
// Forms & Security
// ============================================================================
router.get('/forms', FORMS.list, ctrl.formsCtrl.getAll);
router.post('/forms/sync-registry', FORMS.edit, ctrl.syncFormRegistryInventory);
router.post('/forms', FORMS.add, ctrl.formsCtrl.create);
router.put('/forms/:id', FORMS.edit, ctrl.formsCtrl.update);
router.delete('/forms/:id', FORMS.delete, ctrl.formsCtrl.delete);
router.get('/role-access', ROLE_ACCESS.list, ctrl.roleAccessCtrl.getAll);
router.post('/role-access', ROLE_ACCESS.add, ctrl.roleAccessCtrl.create);
router.put('/role-access/:id', ROLE_ACCESS.edit, ctrl.roleAccessCtrl.update);
router.delete('/role-access/:id', ROLE_ACCESS.delete, ctrl.roleAccessCtrl.delete);
// ============================================================================
// Suppliers Ex
// ============================================================================
router.get('/supplier-incharges', SUPPLIER_INCHARGES.list, ctrl.supplierInchargesCtrl.getAll);
router.post('/supplier-incharges', SUPPLIER_INCHARGES.add, ctrl.supplierInchargesCtrl.create);
router.put('/supplier-incharges/:id', SUPPLIER_INCHARGES.edit, ctrl.supplierInchargesCtrl.update);
router.delete('/supplier-incharges/:id', SUPPLIER_INCHARGES.delete, ctrl.supplierInchargesCtrl.delete);
router.get('/supplier-information', SUPPLIER_INFORMATION.list, ctrl.supplierInfoCtrl.getAll);
router.get('/supplier-information/by-supplier/:supplierId', SUPPLIER_INFORMATION.list, ctrl.getSupplierInfoBySupplier);
router.post('/supplier-information', SUPPLIER_INFORMATION.add, ctrl.supplierInfoCtrl.create);
router.put('/supplier-information/:id', SUPPLIER_INFORMATION.edit, ctrl.supplierInfoCtrl.update);
router.delete('/supplier-information/:id', SUPPLIER_INFORMATION.delete, ctrl.supplierInfoCtrl.delete);
// ============================================================================
// Audit & QMS
// ============================================================================
router.get('/audit-categories', AUDIT_CATEGORIES.list, ctrl.auditCatsCtrl.getAll);
router.post('/audit-categories', AUDIT_CATEGORIES.add, ctrl.auditCatsCtrl.create);
router.put('/audit-categories/:id', AUDIT_CATEGORIES.edit, ctrl.auditCatsCtrl.update);
router.delete('/audit-categories/:id', AUDIT_CATEGORIES.delete, ctrl.auditCatsCtrl.delete);
router.get('/audit-types', AUDIT_TYPES.list, ctrl.auditTypesCtrl.getAll);
router.post('/audit-types', AUDIT_TYPES.add, ctrl.auditTypesCtrl.create);
router.put('/audit-types/:id', AUDIT_TYPES.edit, ctrl.auditTypesCtrl.update);
router.delete('/audit-types/:id', AUDIT_TYPES.delete, ctrl.auditTypesCtrl.delete);
router.get('/criterias', CRITERIAS.list, ctrl.criteriaCtrl.getAll);
router.post('/criterias', CRITERIAS.add, ctrl.criteriaCtrl.create);
router.put('/criterias/:id', CRITERIAS.edit, ctrl.criteriaCtrl.update);
router.delete('/criterias/:id', CRITERIAS.delete, ctrl.criteriaCtrl.delete);
router.get('/five-m1e-categories', FIVE_M1E_CATEGORIES.list, ctrl.fiveM1ECatsCtrl.getAll);
router.post('/five-m1e-categories', FIVE_M1E_CATEGORIES.add, ctrl.fiveM1ECatsCtrl.create);
router.put('/five-m1e-categories/:id', FIVE_M1E_CATEGORIES.edit, ctrl.fiveM1ECatsCtrl.update);
router.delete('/five-m1e-categories/:id', FIVE_M1E_CATEGORIES.delete, ctrl.fiveM1ECatsCtrl.delete);
router.get('/registrations', REGISTRATIONS.list, ctrl.registrationsCtrl.getAll);
router.post('/registrations', REGISTRATIONS.add, ctrl.registrationsCtrl.create);
router.put('/registrations/:id', REGISTRATIONS.edit, ctrl.registrationsCtrl.update);
router.delete('/registrations/:id', REGISTRATIONS.delete, ctrl.registrationsCtrl.delete);
// ============================================================================
// Missing Admin Tables (Groups, FAQ, Certifications, Training Programs, Messages)
// ============================================================================
router.get('/faq', FAQ.list, ctrl.faqItemsCtrl.getAll);
router.post('/faq', FAQ.add, ctrl.faqItemsCtrl.create);
router.put('/faq/:id', FAQ.edit, ctrl.faqItemsCtrl.update);
router.delete('/faq/:id', FAQ.delete, ctrl.faqItemsCtrl.delete);
router.get('/groups', GROUPS.list, ctrl.groupsCtrl.getAll);
router.post('/groups', GROUPS.add, ctrl.groupsCtrl.create);
router.put('/groups/:id', GROUPS.edit, ctrl.groupsCtrl.update);
router.delete('/groups/:id', GROUPS.delete, ctrl.groupsCtrl.delete);
router.get('/certifications', CERTIFICATIONS.list, ctrl.certificationsCtrl.getAll);
router.post('/certifications', CERTIFICATIONS.add, ctrl.certificationsCtrl.create);
router.put('/certifications/:id', CERTIFICATIONS.edit, ctrl.certificationsCtrl.update);
router.delete('/certifications/:id', CERTIFICATIONS.delete, ctrl.certificationsCtrl.delete);
router.get('/training-programs', COARSE_MAINTENANCE.list, ctrl.trainingProgramsCtrl.getAll);
router.post('/training-programs', COARSE_MAINTENANCE.add, ctrl.trainingProgramsCtrl.create);
router.put('/training-programs/:id', COARSE_MAINTENANCE.edit, ctrl.trainingProgramsCtrl.update);
router.delete('/training-programs/:id', COARSE_MAINTENANCE.delete, ctrl.trainingProgramsCtrl.delete);
router.get('/messages', MESSAGES.list, ctrl.messageInfoCtrl.getAll);
router.post('/messages', MESSAGES.add, ctrl.messageInfoCtrl.create);
router.put('/messages/:id', MESSAGES.edit, ctrl.messageInfoCtrl.update);
router.delete('/messages/:id', MESSAGES.delete, ctrl.messageInfoCtrl.delete);
export default router;
