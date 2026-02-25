import express from 'express';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import * as ctrl from './master-data.controller.js';

const router = express.Router();
// All master data endpoints require authentication
router.use(requireAuth);

// ============================================================================
// Core Lookups
// ============================================================================
router.get('/sites', ctrl.sitesCtrl.getAll);
router.post('/sites', ctrl.sitesCtrl.create);
router.put('/sites/:id', ctrl.sitesCtrl.update);
router.delete('/sites/:id', ctrl.sitesCtrl.delete);

router.get('/suppliers', ctrl.suppliersCtrl.getAll);
router.post('/suppliers', ctrl.suppliersCtrl.create);
router.put('/suppliers/:id', ctrl.suppliersCtrl.update);
router.delete('/suppliers/:id', ctrl.suppliersCtrl.delete);

router.get('/roles', ctrl.rolesCtrl.getAll);
router.post('/roles', ctrl.rolesCtrl.create);
router.put('/roles/:id', ctrl.rolesCtrl.update);
router.delete('/roles/:id', ctrl.rolesCtrl.delete);

router.get('/models', ctrl.modelsCtrl.getAll);
router.post('/models', ctrl.modelsCtrl.create);
router.put('/models/:id', ctrl.modelsCtrl.update);
router.delete('/models/:id', ctrl.modelsCtrl.delete);

router.get('/products', ctrl.productsCtrl.getAll);
router.post('/products', ctrl.productsCtrl.create);
router.put('/products/:id', ctrl.productsCtrl.update);
router.delete('/products/:id', ctrl.productsCtrl.delete);

router.get('/mfg-areas', ctrl.mfgAreasCtrl.getAll);
router.post('/mfg-areas', ctrl.mfgAreasCtrl.create);
// mfgAreas lacked update/delete in legacy, but the factory easily supports them! We'll expose them since they are safe:
router.put('/mfg-areas/:id', ctrl.mfgAreasCtrl.update); 
router.delete('/mfg-areas/:id', ctrl.mfgAreasCtrl.delete);

// ============================================================================
// Defects & Dispositions
// ============================================================================
router.get('/defect-categories', ctrl.defectCatsCtrl.getAll);
router.post('/defect-categories', ctrl.defectCatsCtrl.create);
router.put('/defect-categories/:id', ctrl.defectCatsCtrl.update);
router.delete('/defect-categories/:id', ctrl.defectCatsCtrl.delete);

router.get('/defects', ctrl.defectsCtrl.getAll);
router.post('/defects', ctrl.defectsCtrl.create);
router.put('/defects/:id', ctrl.defectsCtrl.update);
router.delete('/defects/:id', ctrl.defectsCtrl.delete);

router.get('/defect-classes', ctrl.defectClassesCtrl.getAll);
router.post('/defect-classes', ctrl.defectClassesCtrl.create);
router.put('/defect-classes/:id', ctrl.defectClassesCtrl.update);
router.delete('/defect-classes/:id', ctrl.defectClassesCtrl.delete);

router.get('/dispositions', ctrl.dispositionsCtrl.getAll);
router.post('/dispositions', ctrl.dispositionsCtrl.create);
router.put('/dispositions/:id', ctrl.dispositionsCtrl.update);
router.delete('/dispositions/:id', ctrl.dispositionsCtrl.delete);

router.get('/severity', ctrl.severityCtrl.getAll);
router.post('/severity', ctrl.severityCtrl.create);
router.put('/severity/:id', ctrl.severityCtrl.update);
router.delete('/severity/:id', ctrl.severityCtrl.delete);

router.get('/aql', ctrl.aqlCtrl.getAll);
router.post('/aql', ctrl.aqlCtrl.create);
router.put('/aql/:id', ctrl.aqlCtrl.update);
router.delete('/aql/:id', ctrl.aqlCtrl.delete);

// ============================================================================
// Inspections & General
// ============================================================================
router.get('/inspection-categories', ctrl.inspCatsCtrl.getAll);
router.post('/inspection-categories', ctrl.inspCatsCtrl.create);
router.put('/inspection-categories/:id', ctrl.inspCatsCtrl.update);
router.delete('/inspection-categories/:id', ctrl.inspCatsCtrl.delete);

router.get('/inspection-methods', ctrl.inspMethodsCtrl.getAll);
router.post('/inspection-methods', ctrl.inspMethodsCtrl.create);
router.put('/inspection-methods/:id', ctrl.inspMethodsCtrl.update);
router.delete('/inspection-methods/:id', ctrl.inspMethodsCtrl.delete);

router.get('/inspectors', ctrl.inspectorsCtrl.getAll);
router.post('/inspectors', ctrl.inspectorsCtrl.create);
router.put('/inspectors/:id', ctrl.inspectorsCtrl.update);
router.delete('/inspectors/:id', ctrl.inspectorsCtrl.delete);

// MNR Types maps to both '/mnr-types' and '/general' in legacy
router.get('/mnr-types', ctrl.generalMasterCtrl.getAll);
router.post('/mnr-types', ctrl.generalMasterCtrl.create);
router.put('/mnr-types/:id', ctrl.generalMasterCtrl.update);
router.delete('/mnr-types/:id', ctrl.generalMasterCtrl.delete);

router.get('/general', ctrl.generalMasterCtrl.getAll);
router.post('/general', ctrl.generalMasterCtrl.create);
router.put('/general/:id', ctrl.generalMasterCtrl.update);
router.delete('/general/:id', ctrl.generalMasterCtrl.delete);

// ============================================================================
// Parts Catalog
// ============================================================================
router.get('/parts', ctrl.partClassCtrl.getAll);
router.post('/parts', ctrl.partClassCtrl.create);
router.put('/parts/:id', ctrl.partClassCtrl.update);
router.delete('/parts/:id', ctrl.partClassCtrl.delete);

router.get('/part-types', ctrl.partTypesCtrl.getAll);
router.post('/part-types', ctrl.partTypesCtrl.create);
router.put('/part-types/:id', ctrl.partTypesCtrl.update);
router.delete('/part-types/:id', ctrl.partTypesCtrl.delete);

router.get('/part-data-categories', ctrl.partDataCatsCtrl.getAll);
router.post('/part-data-categories', ctrl.partDataCatsCtrl.create);
router.put('/part-data-categories/:id', ctrl.partDataCatsCtrl.update);
router.delete('/part-data-categories/:id', ctrl.partDataCatsCtrl.delete);

router.get('/part-dim-categories', ctrl.partDimCatsCtrl.getAll);
router.post('/part-dim-categories', ctrl.partDimCatsCtrl.create);
router.put('/part-dim-categories/:id', ctrl.partDimCatsCtrl.update);
router.delete('/part-dim-categories/:id', ctrl.partDimCatsCtrl.delete);

router.get('/part-noise-categories', ctrl.partNoiseCatsCtrl.getAll);
router.post('/part-noise-categories', ctrl.partNoiseCatsCtrl.create);
router.put('/part-noise-categories/:id', ctrl.partNoiseCatsCtrl.update);
router.delete('/part-noise-categories/:id', ctrl.partNoiseCatsCtrl.delete);

// Legacy route: parts-catalog corresponds to the PartsMaster schemas and tables
router.get('/parts-catalog', ctrl.partsCatalogCtrl.getAll);
router.post('/parts-catalog', ctrl.partsCatalogCtrl.create);
router.put('/parts-catalog/:id', ctrl.partsCatalogCtrl.update);
router.delete('/parts-catalog/:id', ctrl.partsCatalogCtrl.delete);

// ============================================================================
// Forms & Security
// ============================================================================
router.get('/forms', ctrl.formsCtrl.getAll);
router.post('/forms', ctrl.formsCtrl.create);
router.put('/forms/:id', ctrl.formsCtrl.update);
router.delete('/forms/:id', ctrl.formsCtrl.delete);

router.get('/role-access', ctrl.roleAccessCtrl.getAll);
router.post('/role-access', ctrl.roleAccessCtrl.create);
router.put('/role-access/:id', ctrl.roleAccessCtrl.update);
router.delete('/role-access/:id', ctrl.roleAccessCtrl.delete);

// ============================================================================
// Suppliers Ex
// ============================================================================
router.get('/supplier-incharges', ctrl.supplierInchargesCtrl.getAll);
router.post('/supplier-incharges', ctrl.supplierInchargesCtrl.create);
router.put('/supplier-incharges/:id', ctrl.supplierInchargesCtrl.update);
router.delete('/supplier-incharges/:id', ctrl.supplierInchargesCtrl.delete);

router.get('/supplier-information', ctrl.supplierInfoCtrl.getAll);
router.get('/supplier-information/by-supplier/:supplierId', ctrl.getSupplierInfoBySupplier);
router.post('/supplier-information', ctrl.supplierInfoCtrl.create);
router.put('/supplier-information/:id', ctrl.supplierInfoCtrl.update);
router.delete('/supplier-information/:id', ctrl.supplierInfoCtrl.delete);

// ============================================================================
// Audit & QMS
// ============================================================================
router.get('/audit-categories', ctrl.auditCatsCtrl.getAll);
router.post('/audit-categories', ctrl.auditCatsCtrl.create);
router.put('/audit-categories/:id', ctrl.auditCatsCtrl.update);
router.delete('/audit-categories/:id', ctrl.auditCatsCtrl.delete);

router.get('/audit-types', ctrl.auditTypesCtrl.getAll);
router.post('/audit-types', ctrl.auditTypesCtrl.create);
router.put('/audit-types/:id', ctrl.auditTypesCtrl.update);
router.delete('/audit-types/:id', ctrl.auditTypesCtrl.delete);

router.get('/criterias', ctrl.criteriaCtrl.getAll);
router.post('/criterias', ctrl.criteriaCtrl.create);
router.put('/criterias/:id', ctrl.criteriaCtrl.update);
router.delete('/criterias/:id', ctrl.criteriaCtrl.delete);

router.get('/five-m1e-categories', ctrl.fiveM1ECatsCtrl.getAll);
router.post('/five-m1e-categories', ctrl.fiveM1ECatsCtrl.create);
router.put('/five-m1e-categories/:id', ctrl.fiveM1ECatsCtrl.update);
router.delete('/five-m1e-categories/:id', ctrl.fiveM1ECatsCtrl.delete);

router.get('/registrations', ctrl.registrationsCtrl.getAll);
router.post('/registrations', ctrl.registrationsCtrl.create);
router.put('/registrations/:id', ctrl.registrationsCtrl.update);
router.delete('/registrations/:id', ctrl.registrationsCtrl.delete);

// ============================================================================
// Missing Admin Tables (Groups, FAQ, Certifications, Training Programs, Messages)
// ============================================================================
router.get('/faq', ctrl.faqItemsCtrl.getAll);
router.post('/faq', ctrl.faqItemsCtrl.create);
router.put('/faq/:id', ctrl.faqItemsCtrl.update);
router.delete('/faq/:id', ctrl.faqItemsCtrl.delete);

router.get('/groups', ctrl.groupsCtrl.getAll);
router.post('/groups', ctrl.groupsCtrl.create);
router.put('/groups/:id', ctrl.groupsCtrl.update);
router.delete('/groups/:id', ctrl.groupsCtrl.delete);

router.get('/certifications', ctrl.certificationsCtrl.getAll);
router.post('/certifications', ctrl.certificationsCtrl.create);
router.put('/certifications/:id', ctrl.certificationsCtrl.update);
router.delete('/certifications/:id', ctrl.certificationsCtrl.delete);

router.get('/training-programs', ctrl.trainingProgramsCtrl.getAll);
router.post('/training-programs', ctrl.trainingProgramsCtrl.create);
router.put('/training-programs/:id', ctrl.trainingProgramsCtrl.update);
router.delete('/training-programs/:id', ctrl.trainingProgramsCtrl.delete);

router.get('/messages', ctrl.messageInfoCtrl.getAll);
router.post('/messages', ctrl.messageInfoCtrl.create);
router.put('/messages/:id', ctrl.messageInfoCtrl.update);
router.delete('/messages/:id', ctrl.messageInfoCtrl.delete);

export default router;
