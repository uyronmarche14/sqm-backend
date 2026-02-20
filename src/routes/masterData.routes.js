import express from 'express';
import { 
    getSites, createSite, updateSite, deleteSite,
    getSuppliers, createSupplier, updateSupplier, deleteSupplier,
    getRoles, 
    getModels, createModel, updateModel, deleteModel,
    getProducts, createProduct, updateProduct, deleteProduct,
    getMfgAreas, createMfgArea,
    getParts, createPart,
    getDefectCategories, createDefectCategory,
    getDefects, createDefect,
    getDefectClasses, createDefectClass, updateDefectClass, deleteDefectClass,
    getDispositions, createDisposition,
    getSeverity, createSeverity, updateSeverity, deleteSeverity,
    getAQL, createAQL, updateAQL, deleteAQL,
    getInspectionCategories, createInspectionCategory, updateInspectionCategory, deleteInspectionCategory,
    getInspectionMethods, createInspectionMethod, updateInspectionMethod, deleteInspectionMethod,
    getInspectors,
    getMnrTypes, createGeneralMaster, updateGeneralMaster, deleteGeneralMaster,
    
    // Parts Catalog Imports
    getPartTypes, createPartType, updatePartType, deletePartType,
    getPartDataCategories, createPartDataCategory, updatePartDataCategory, deletePartDataCategory,
    getPartDimensionCategories, createPartDimensionCategory, updatePartDimensionCategory, deletePartDimensionCategory,
    getPartNoiseCategories, createPartNoiseCategory, updatePartNoiseCategory, deletePartNoiseCategory,
    getPartsCatalog, createPartMaster, updatePartMaster, deletePartMaster,

    // New Entities
    createInspector, updateInspector, deleteInspector,
    createRole, updateRole, deleteRole,
    getForms, createForm, updateForm, deleteForm,
    getRoleAccess, createRoleAccess, updateRoleAccess, deleteRoleAccess,
    
    // Supplier Incharges
    getSupplierIncharges, createSupplierIncharge, updateSupplierIncharge, deleteSupplierIncharge,

    // Supplier Information (Contacts)
    // Supplier Information (Contacts)
    getSupplierInformation, getAllSupplierInformation, createSupplierInformation, updateSupplierInformation, deleteSupplierInformation,
    
    // Audit & 5M1E
    getAuditCategories, createAuditCategory, updateAuditCategory, deleteAuditCategory,
    getAuditTypes, createAuditType, updateAuditType, deleteAuditType,
    getCriterias, createCriteria, updateCriteria, deleteCriteria,
    getFiveM1ECategories, createFiveM1ECategory, updateFiveM1ECategory, deleteFiveM1ECategory,
    
    // Registrations
    getRegistrations, createRegistration, updateRegistration, deleteRegistration
} from '../controllers/masterData.controller.js';

import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticateToken);

// Existing
router.get('/sites', getSites);
router.post('/sites', createSite);
router.put('/sites/:id', updateSite);
router.delete('/sites/:id', deleteSite);

router.get('/suppliers', getSuppliers);
router.post('/suppliers', createSupplier);
router.put('/suppliers/:id', updateSupplier);
router.delete('/suppliers/:id', deleteSupplier);

router.get('/roles', getRoles);

// New Maintenance CRUDs
router.get('/models', getModels);
router.post('/models', createModel);
router.put('/models/:id', updateModel);
router.delete('/models/:id', deleteModel);

router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// UUID Based Maintenance
router.get('/mfg-areas', getMfgAreas);
router.post('/mfg-areas', createMfgArea);

router.get('/parts', getParts);
router.post('/parts', createPart);

router.get('/defect-categories', getDefectCategories);
router.post('/defect-categories', createDefectCategory);

router.get('/defects', getDefects);
router.post('/defects', createDefect);

router.get('/defect-classes', getDefectClasses);
router.post('/defect-classes', createDefectClass);
router.put('/defect-classes/:id', updateDefectClass);
router.delete('/defect-classes/:id', deleteDefectClass);

router.get('/dispositions', getDispositions);
router.post('/dispositions', createDisposition);

router.get('/severity', getSeverity);
router.post('/severity', createSeverity);
router.put('/severity/:id', updateSeverity);
router.delete('/severity/:id', deleteSeverity);

router.get('/aql', getAQL);
router.post('/aql', createAQL);
router.put('/aql/:id', updateAQL);
router.delete('/aql/:id', deleteAQL);

router.get('/inspection-categories', getInspectionCategories);
router.post('/inspection-categories', createInspectionCategory);
router.put('/inspection-categories/:id', updateInspectionCategory);
router.delete('/inspection-categories/:id', deleteInspectionCategory);

router.get('/inspection-methods', getInspectionMethods);
router.post('/inspection-methods', createInspectionMethod);
router.put('/inspection-methods/:id', updateInspectionMethod);
router.delete('/inspection-methods/:id', deleteInspectionMethod);

router.get('/inspectors', getInspectors);

// 14. MNR TYPES
router.get('/mnr-types', getMnrTypes);
router.post('/mnr-types', createGeneralMaster);
router.put('/mnr-types/:id', updateGeneralMaster);
router.delete('/mnr-types/:id', deleteGeneralMaster);

// 14.5 GENERAL MASTER (Alias for MNR TYPES to match Frontend)
router.get('/general', getMnrTypes);
router.post('/general', createGeneralMaster);
router.put('/general/:id', updateGeneralMaster);
router.delete('/general/:id', deleteGeneralMaster);

// ============================================================================
// PARTS CATALOG ROUTES
// ============================================================================

// 15. PART TYPES
router.get('/part-types', getPartTypes);
router.post('/part-types', createPartType);
router.put('/part-types/:id', updatePartType);
router.delete('/part-types/:id', deletePartType);

// 16. PART DATA CATEGORIES
router.get('/part-data-categories', getPartDataCategories);
router.post('/part-data-categories', createPartDataCategory);
router.put('/part-data-categories/:id', updatePartDataCategory);
router.delete('/part-data-categories/:id', deletePartDataCategory);

// 17. PART DIMENSION CATEGORIES
router.get('/part-dim-categories', getPartDimensionCategories);
router.post('/part-dim-categories', createPartDimensionCategory);
router.put('/part-dim-categories/:id', updatePartDimensionCategory);
router.delete('/part-dim-categories/:id', deletePartDimensionCategory);

// 18. PART NOISE CATEGORIES
router.get('/part-noise-categories', getPartNoiseCategories);
router.post('/part-noise-categories', createPartNoiseCategory);
router.put('/part-noise-categories/:id', updatePartNoiseCategory);
router.delete('/part-noise-categories/:id', deletePartNoiseCategory);

// 19. PARTS CATALOG (MASTER)
// 19. PARTS CATALOG (MASTER)
router.get('/parts-catalog', getPartsCatalog);
router.post('/parts-catalog', createPartMaster);
router.put('/parts-catalog/:id', updatePartMaster);
router.delete('/parts-catalog/:id', deletePartMaster);

// ============================================================================
// NEW ENTITES ROUTES
// ============================================================================

// INSPECTORS
router.post('/inspectors', createInspector);
router.put('/inspectors/:id', updateInspector);
router.delete('/inspectors/:id', deleteInspector);

// ROLES
router.post('/roles', createRole);
router.put('/roles/:id', updateRole);
router.delete('/roles/:id', deleteRole);

// FORMS
router.get('/forms', getForms);
router.post('/forms', createForm);
router.put('/forms/:id', updateForm);
router.delete('/forms/:id', deleteForm);

// ROLE ACCESS
router.get('/role-access', getRoleAccess);
router.post('/role-access', createRoleAccess);
router.put('/role-access/:id', updateRoleAccess);
router.delete('/role-access/:id', deleteRoleAccess);

// SUPPLIER INCHARGES
router.get('/supplier-incharges', getSupplierIncharges);
router.post('/supplier-incharges', createSupplierIncharge);
router.put('/supplier-incharges/:id', updateSupplierIncharge);
router.delete('/supplier-incharges/:id', deleteSupplierIncharge);

// SUPPLIER INFORMATION (Contact Persons)
router.get('/supplier-information', getAllSupplierInformation);
router.get('/supplier-information/by-supplier/:supplierId', getSupplierInformation);
router.post('/supplier-information', createSupplierInformation);
router.put('/supplier-information/:id', updateSupplierInformation);
router.delete('/supplier-information/:id', deleteSupplierInformation);

// ============================================================================
// NEW ENTITES ROUTES
// ============================================================================

// AUDIT CATEGORIES
router.get('/audit-categories', getAuditCategories);
router.post('/audit-categories', createAuditCategory);
router.put('/audit-categories/:id', updateAuditCategory);
router.delete('/audit-categories/:id', deleteAuditCategory);

// AUDIT TYPES
router.get('/audit-types', getAuditTypes);
router.post('/audit-types', createAuditType);
router.put('/audit-types/:id', updateAuditType);
router.delete('/audit-types/:id', deleteAuditType);

// CRITERIA
router.get('/criterias', getCriterias);
router.post('/criterias', createCriteria);
router.put('/criterias/:id', updateCriteria);
router.delete('/criterias/:id', deleteCriteria);

// 5M1E CATEGORIES (PART CLASS CATEGORIES)
router.get('/five-m1e-categories', getFiveM1ECategories);
router.post('/five-m1e-categories', createFiveM1ECategory);
router.put('/five-m1e-categories/:id', updateFiveM1ECategory);
router.delete('/five-m1e-categories/:id', deleteFiveM1ECategory);

// REGISTRATIONS
router.get('/registrations', getRegistrations);
router.post('/registrations', createRegistration);
router.put('/registrations/:id', updateRegistration);
router.delete('/registrations/:id', deleteRegistration);

export default router;
