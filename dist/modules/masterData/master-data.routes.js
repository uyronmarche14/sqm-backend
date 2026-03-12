import express from 'express';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { requirePermission } from '../../shared/middleware/requirePermission.js';
import * as ctrl from './master-data.controller.js';
const router = express.Router();
// All master data endpoints require authentication
router.use(requireAuth);
// ============================================================================
// Core Lookups
// ============================================================================
router.get('/sites', ctrl.sitesCtrl.getAll);
router.post('/sites', requirePermission('MAINTENANCE', 'add'), ctrl.sitesCtrl.create);
router.put('/sites/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.sitesCtrl.update);
router.delete('/sites/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.sitesCtrl.delete);
router.get('/suppliers', ctrl.suppliersCtrl.getAll);
router.post('/suppliers', requirePermission('MAINTENANCE', 'add'), ctrl.suppliersCtrl.create);
router.put('/suppliers/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.suppliersCtrl.update);
router.delete('/suppliers/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.suppliersCtrl.delete);
router.get('/roles', ctrl.rolesCtrl.getAll);
router.post('/roles', requirePermission('MAINTENANCE', 'add'), ctrl.rolesCtrl.create);
router.put('/roles/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.rolesCtrl.update);
router.delete('/roles/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.rolesCtrl.delete);
router.get('/models', ctrl.modelsCtrl.getAll);
router.post('/models', requirePermission('MAINTENANCE', 'add'), ctrl.modelsCtrl.create);
router.put('/models/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.modelsCtrl.update);
router.delete('/models/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.modelsCtrl.delete);
router.get('/products', ctrl.productsCtrl.getAll);
router.post('/products', requirePermission('MAINTENANCE', 'add'), ctrl.productsCtrl.create);
router.put('/products/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.productsCtrl.update);
router.delete('/products/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.productsCtrl.delete);
router.get('/mfg-areas', ctrl.mfgAreasCtrl.getAll);
router.post('/mfg-areas', requirePermission('MAINTENANCE', 'add'), ctrl.mfgAreasCtrl.create);
router.put('/mfg-areas/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.mfgAreasCtrl.update);
router.delete('/mfg-areas/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.mfgAreasCtrl.delete);
// ============================================================================
// Defects & Dispositions
// ============================================================================
router.get('/defect-categories', ctrl.defectCatsCtrl.getAll);
router.post('/defect-categories', requirePermission('MAINTENANCE', 'add'), ctrl.defectCatsCtrl.create);
router.put('/defect-categories/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.defectCatsCtrl.update);
router.delete('/defect-categories/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.defectCatsCtrl.delete);
router.get('/defects', ctrl.defectsCtrl.getAll);
router.post('/defects', requirePermission('MAINTENANCE', 'add'), ctrl.defectsCtrl.create);
router.put('/defects/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.defectsCtrl.update);
router.delete('/defects/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.defectsCtrl.delete);
router.get('/defect-classes', ctrl.defectClassesCtrl.getAll);
router.post('/defect-classes', requirePermission('MAINTENANCE', 'add'), ctrl.defectClassesCtrl.create);
router.put('/defect-classes/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.defectClassesCtrl.update);
router.delete('/defect-classes/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.defectClassesCtrl.delete);
router.get('/dispositions', ctrl.dispositionsCtrl.getAll);
router.post('/dispositions', requirePermission('MAINTENANCE', 'add'), ctrl.dispositionsCtrl.create);
router.put('/dispositions/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.dispositionsCtrl.update);
router.delete('/dispositions/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.dispositionsCtrl.delete);
router.get('/severity', ctrl.severityCtrl.getAll);
router.post('/severity', requirePermission('MAINTENANCE', 'add'), ctrl.severityCtrl.create);
router.put('/severity/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.severityCtrl.update);
router.delete('/severity/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.severityCtrl.delete);
router.get('/aql', ctrl.aqlCtrl.getAll);
router.post('/aql', requirePermission('MAINTENANCE', 'add'), ctrl.aqlCtrl.create);
router.put('/aql/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.aqlCtrl.update);
router.delete('/aql/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.aqlCtrl.delete);
// ============================================================================
// Inspections & General
// ============================================================================
router.get('/inspection-categories', ctrl.inspCatsCtrl.getAll);
router.post('/inspection-categories', requirePermission('MAINTENANCE', 'add'), ctrl.inspCatsCtrl.create);
router.put('/inspection-categories/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.inspCatsCtrl.update);
router.delete('/inspection-categories/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.inspCatsCtrl.delete);
router.get('/inspection-methods', ctrl.inspMethodsCtrl.getAll);
router.post('/inspection-methods', requirePermission('MAINTENANCE', 'add'), ctrl.inspMethodsCtrl.create);
router.put('/inspection-methods/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.inspMethodsCtrl.update);
router.delete('/inspection-methods/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.inspMethodsCtrl.delete);
router.get('/inspectors', ctrl.inspectorsCtrl.getAll);
router.post('/inspectors', requirePermission('MAINTENANCE', 'add'), ctrl.inspectorsCtrl.create);
router.put('/inspectors/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.inspectorsCtrl.update);
router.delete('/inspectors/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.inspectorsCtrl.delete);
// MNR Types maps to both '/mnr-types' and '/general' in legacy
router.get('/mnr-types', ctrl.generalMasterCtrl.getAll);
router.post('/mnr-types', requirePermission('MAINTENANCE', 'add'), ctrl.generalMasterCtrl.create);
router.put('/mnr-types/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.generalMasterCtrl.update);
router.delete('/mnr-types/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.generalMasterCtrl.delete);
router.get('/general', ctrl.generalMasterCtrl.getAll);
router.post('/general', requirePermission('MAINTENANCE', 'add'), ctrl.generalMasterCtrl.create);
router.put('/general/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.generalMasterCtrl.update);
router.delete('/general/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.generalMasterCtrl.delete);
// ============================================================================
// Parts Catalog
// ============================================================================
router.get('/parts', ctrl.partClassCtrl.getAll);
router.post('/parts', requirePermission('MAINTENANCE', 'add'), ctrl.partClassCtrl.create);
router.put('/parts/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.partClassCtrl.update);
router.delete('/parts/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.partClassCtrl.delete);
router.get('/part-types', ctrl.partTypesCtrl.getAll);
router.post('/part-types', requirePermission('MAINTENANCE', 'add'), ctrl.partTypesCtrl.create);
router.put('/part-types/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.partTypesCtrl.update);
router.delete('/part-types/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.partTypesCtrl.delete);
router.get('/part-data-categories', ctrl.partDataCatsCtrl.getAll);
router.post('/part-data-categories', requirePermission('MAINTENANCE', 'add'), ctrl.partDataCatsCtrl.create);
router.put('/part-data-categories/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.partDataCatsCtrl.update);
router.delete('/part-data-categories/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.partDataCatsCtrl.delete);
router.get('/part-dim-categories', ctrl.partDimCatsCtrl.getAll);
router.post('/part-dim-categories', requirePermission('MAINTENANCE', 'add'), ctrl.partDimCatsCtrl.create);
router.put('/part-dim-categories/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.partDimCatsCtrl.update);
router.delete('/part-dim-categories/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.partDimCatsCtrl.delete);
router.get('/part-noise-categories', ctrl.partNoiseCatsCtrl.getAll);
router.post('/part-noise-categories', requirePermission('MAINTENANCE', 'add'), ctrl.partNoiseCatsCtrl.create);
router.put('/part-noise-categories/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.partNoiseCatsCtrl.update);
router.delete('/part-noise-categories/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.partNoiseCatsCtrl.delete);
// Legacy route: parts-catalog corresponds to the PartsMaster schemas and tables
router.get('/parts-catalog', ctrl.partsCatalogCtrl.getAll);
router.post('/parts-catalog', requirePermission('MAINTENANCE', 'add'), ctrl.partsCatalogCtrl.create);
router.put('/parts-catalog/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.partsCatalogCtrl.update);
router.delete('/parts-catalog/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.partsCatalogCtrl.delete);
// ============================================================================
// Forms & Security
// ============================================================================
router.get('/forms', ctrl.formsCtrl.getAll);
router.post('/forms', requirePermission('MAINTENANCE', 'add'), ctrl.formsCtrl.create);
router.put('/forms/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.formsCtrl.update);
router.delete('/forms/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.formsCtrl.delete);
router.get('/role-access', ctrl.roleAccessCtrl.getAll);
router.post('/role-access', requirePermission('MAINTENANCE', 'add'), ctrl.roleAccessCtrl.create);
router.put('/role-access/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.roleAccessCtrl.update);
router.delete('/role-access/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.roleAccessCtrl.delete);
// ============================================================================
// Suppliers Ex
// ============================================================================
router.get('/supplier-incharges', ctrl.supplierInchargesCtrl.getAll);
router.post('/supplier-incharges', requirePermission('MAINTENANCE', 'add'), ctrl.supplierInchargesCtrl.create);
router.put('/supplier-incharges/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.supplierInchargesCtrl.update);
router.delete('/supplier-incharges/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.supplierInchargesCtrl.delete);
router.get('/supplier-information', ctrl.supplierInfoCtrl.getAll);
router.get('/supplier-information/by-supplier/:supplierId', ctrl.getSupplierInfoBySupplier);
router.post('/supplier-information', requirePermission('MAINTENANCE', 'add'), ctrl.supplierInfoCtrl.create);
router.put('/supplier-information/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.supplierInfoCtrl.update);
router.delete('/supplier-information/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.supplierInfoCtrl.delete);
// ============================================================================
// Audit & QMS
// ============================================================================
router.get('/audit-categories', ctrl.auditCatsCtrl.getAll);
router.post('/audit-categories', requirePermission('MAINTENANCE', 'add'), ctrl.auditCatsCtrl.create);
router.put('/audit-categories/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.auditCatsCtrl.update);
router.delete('/audit-categories/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.auditCatsCtrl.delete);
router.get('/audit-types', ctrl.auditTypesCtrl.getAll);
router.post('/audit-types', requirePermission('MAINTENANCE', 'add'), ctrl.auditTypesCtrl.create);
router.put('/audit-types/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.auditTypesCtrl.update);
router.delete('/audit-types/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.auditTypesCtrl.delete);
router.get('/criterias', ctrl.criteriaCtrl.getAll);
router.post('/criterias', requirePermission('MAINTENANCE', 'add'), ctrl.criteriaCtrl.create);
router.put('/criterias/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.criteriaCtrl.update);
router.delete('/criterias/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.criteriaCtrl.delete);
router.get('/five-m1e-categories', ctrl.fiveM1ECatsCtrl.getAll);
router.post('/five-m1e-categories', requirePermission('MAINTENANCE', 'add'), ctrl.fiveM1ECatsCtrl.create);
router.put('/five-m1e-categories/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.fiveM1ECatsCtrl.update);
router.delete('/five-m1e-categories/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.fiveM1ECatsCtrl.delete);
router.get('/registrations', ctrl.registrationsCtrl.getAll);
router.post('/registrations', requirePermission('MAINTENANCE', 'add'), ctrl.registrationsCtrl.create);
router.put('/registrations/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.registrationsCtrl.update);
router.delete('/registrations/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.registrationsCtrl.delete);
// ============================================================================
// Missing Admin Tables (Groups, FAQ, Certifications, Training Programs, Messages)
// ============================================================================
router.get('/faq', ctrl.faqItemsCtrl.getAll);
router.post('/faq', requirePermission('MAINTENANCE', 'add'), ctrl.faqItemsCtrl.create);
router.put('/faq/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.faqItemsCtrl.update);
router.delete('/faq/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.faqItemsCtrl.delete);
router.get('/groups', ctrl.groupsCtrl.getAll);
router.post('/groups', requirePermission('MAINTENANCE', 'add'), ctrl.groupsCtrl.create);
router.put('/groups/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.groupsCtrl.update);
router.delete('/groups/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.groupsCtrl.delete);
router.get('/certifications', ctrl.certificationsCtrl.getAll);
router.post('/certifications', requirePermission('MAINTENANCE', 'add'), ctrl.certificationsCtrl.create);
router.put('/certifications/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.certificationsCtrl.update);
router.delete('/certifications/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.certificationsCtrl.delete);
router.get('/training-programs', ctrl.trainingProgramsCtrl.getAll);
router.post('/training-programs', requirePermission('MAINTENANCE', 'add'), ctrl.trainingProgramsCtrl.create);
router.put('/training-programs/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.trainingProgramsCtrl.update);
router.delete('/training-programs/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.trainingProgramsCtrl.delete);
router.get('/messages', ctrl.messageInfoCtrl.getAll);
router.post('/messages', requirePermission('MAINTENANCE', 'add'), ctrl.messageInfoCtrl.create);
router.put('/messages/:id', requirePermission('MAINTENANCE', 'edit'), ctrl.messageInfoCtrl.update);
router.delete('/messages/:id', requirePermission('MAINTENANCE', 'delete'), ctrl.messageInfoCtrl.delete);
export default router;
