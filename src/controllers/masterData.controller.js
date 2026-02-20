import db, { sql } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

// MAPPERS
// MAPPERS
const mapSiteToDto = (row) => ({
    id: row.site_id,
    name: row.site_name,
    code: row.site_code || '', 
    description: row.site_desc || '', 
    isActive: row.active_flag ? true : false
});

// ... (Other Mappers remain) ...

// 1. SITES (MFG_SITES - UUID)
export const getSites = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.MFG_SITES ORDER BY site_name');
        res.json(rows.map(mapSiteToDto));
    } catch (error) {
        console.error('getSites error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const createSite = async (req, res) => {
    try {
        const { site_name, site_code, site_desc } = req.body;
        const id = uuidv4();

        const pool = await db.getPool();
        const request = pool.request();
        request.input('id', sql.NVarChar, id);
        request.input('name', sql.NVarChar, site_name);
        request.input('code', sql.NVarChar, site_code || '');
        request.input('desc', sql.NVarChar, site_desc || '');

        await request.query(`
            INSERT INTO dbo.MFG_SITES (site_id, site_name, site_code, site_desc, active_flag, last_update, updateby)
            VALUES (@id, @name, @code, @desc, 1, GETDATE(), 'SYSTEM')
        `);
            
        const [rows] = await db.query(`SELECT * FROM dbo.MFG_SITES WHERE site_id = ?`, [id]);
        res.status(201).json(mapSiteToDto(rows[0]));
    } catch (error) {
        console.error('createSite error', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateSite = async (req, res) => {
    try {
        const { id } = req.params;
        const { site_name, site_code, site_desc, active_flag } = req.body;
        
        await db.query(`
            UPDATE dbo.MFG_SITES 
            SET site_name = ?, site_code = ?, site_desc = ?, active_flag = ?, last_update = GETDATE()
            WHERE site_id = ?
        `, [site_name, site_code, site_desc, active_flag ? 1 : 0, id]);
            
        const [rows] = await db.query(`SELECT * FROM dbo.MFG_SITES WHERE site_id = ?`, [id]);
        res.json(mapSiteToDto(rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteSite = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(`DELETE FROM dbo.MFG_SITES WHERE site_id = ?`, [id]);
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// SUPPLIERS (UUID based - dbo.SUPPLIERS)
const mapSupplierToDto = (row) => ({
    id: row.supplier_id,
    name: row.supplier_name,
    siteId: row.site_id,
    description: row.supplier_desc || '',
    location: row.location || '',
    isActive: row.active_flag ? true : false
});

    // ROLES (UUID based - dbo.ROLES)
    const mapRoleToDto = (row) => ({
        id: row.role_id,
        name: row.role_name,
        description: row.role_desc || '',
        isActive: row.active_flag ? true : false
    });

// 4. MODELS (Moved to near usage for clarity)

// UUID Mappers
const mapMfgAreaToDto = (row) => ({
    id: row.mfg_area_id,
    name: row.mfg_area_name,
    description: row.mfg_area_desc || '',
    isActive: row.active_flag ? true : false
});

const mapPartToDto = (row) => ({
    id: row.partclass_id,
    name: row.partclass_name,
    description: row.partclass_desc || '',
    siteId: row.site_id,
    isActive: row.active_flag ? true : false
});

const mapDefectCategoryToDto = (row) => ({
    id: row.defectcategory_id,
    name: row.defectcategory_name,
    acronym: row.defectcategory_acronym || '',
    description: row.defectcategory_desc || '',
    isActive: row.active_flag ? true : false
});

const mapDefectToDto = (row) => ({
    id: row.defect_id,
    name: row.defect_name,
    description: row.defect_desc || '',
    isActive: row.active_flag ? true : false
});

const mapDispositionToDto = (row) => ({
    id: row.disposition_id,
    name: row.disposition_name,
    description: row.disposition_desc || '',
    isActive: row.active_flag ? true : false
});

const mapSeverityToDto = (row) => ({
    id: row.severity_id,
    name: row.severity_name,
    description: row.severity_desc || '',
    isActive: row.active_flag ? true : false
});

const mapInspectionCategoryToDto = (row) => ({
    id: row.inspectioncat_id,
    name: row.inspectioncat_name,
    description: row.inspectioncat_desc || '',
    isActive: row.active_flag ? true : false
});

const mapInspectionMethodToDto = (row) => ({
    id: row.inspectionmethod_id,
    name: row.inspectionmethod_name,
    description: row.inspectionmethod_desc || '',
    isActive: row.active_flag ? true : false
});

const mapInspectorToDto = (row) => ({
    id: row.inspector_id,
    name: row.inspector_name,
    description: row.inspector_desc || '',
    isActive: row.active_flag ? true : false
});

const mapMnrTypeToDto = (row) => ({
    id: row.mnrtype_id,
    name: row.mnrtype_name,
    description: row.mnrtype_desc || '',
    isActive: row.active_flag ? true : false
});

const mapPartTypeToDto = (row) => ({
    id: row.parttype_id,
    name: row.parttype_name,
    code: row.parttype_code || '',
    description: row.parttype_desc || '',
    isActive: row.active_flag ? true : false
});

const mapPartDataCategoryToDto = (row) => ({
    id: row.partdatacategory_id,
    name: row.partdatacategory_name,
    parentId: row.part_id, // This likely links to PARTCLASS or PARTS, schema says 'part_id'
    min: row.minimum,
    max: row.maximum,
    description: row.partdatacategory_desc || '',
    isActive: row.active_flag ? true : false
});

const mapPartDimensionCategoryToDto = (row) => ({
    id: row.partdimensioncategory_id,
    name: row.partdimensioncategory_name,
    parentId: row.part_id,
    min: row.minimum,
    max: row.maximum,
    description: row.partdimensioncategory_desc || '',
    isActive: row.active_flag ? true : false
});

const mapPartNoiseCategoryToDto = (row) => ({
    id: row.partnoisecategory_id,
    name: row.partnoisecategory_name,
    parentId: row.part_id,
    min: row.minimum,
    max: row.maximum,
    description: row.partnoisecategory_desc || '',
    isActive: row.active_flag ? true : false
});

const mapPartSupplierToDto = (row) => ({
    id: row.partsupplier_id,
    partId: row.part_id,
    supplierId: row.supplier_id,
    isActive: row.active_flag ? true : false
});

const mapPartMasterToDto = (row) => ({
    id: row.part_id,
    code: row.part_code,
    name: row.part_name,
    siteId: row.site_id,
    description: row.part_desc || '',
    classId: row.partclass_id,
    typeId: row.parttype_id,
    aqlId: row.aql_id,
    isActive: row.active_flag ? true : false
});

const mapFormToDto = (row) => ({
    id: row.form_id,
    name: row.form_name,
    url: row.form_url,
    menuGroup: row.menu_group,
    icon: row.icon || '',
    description: row.form_desc || '',
    isActive: row.active_flag ? true : false
});

const mapRoleAccessToDto = (row) => ({
    id: row.roleaccess_id,
    roleId: row.role_id,
    formId: row.form_id,
    description: row.roleaccess_desc || '',
    isActive: row.active_flag ? true : false,
    permissions: {
        view: row.can_view,
        viewList: row.can_viewlist, // Needed for simple "List View" access
        add: row.can_add,
        edit: row.can_edit,
        delete: row.can_delete,
        approve: row.can_approve,
        check: row.can_check,
        print: row.can_print,
        export: row.can_export,
        
        // Scope/Utility Permissions (Found in CREATE query)
        perSite: row.per_site, 
        canAttach: row.can_attach,
        pic: row.pic
    }
});




// 2. SUPPLIERS (dbo.SUPPLIERS - UUID)
export const getSuppliers = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.SUPPLIERS ORDER BY supplier_name');
        res.json(rows.map(mapSupplierToDto));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createSupplier = async (req, res) => {
    try {
        const { name, siteId, description, location } = req.body;
        const id = uuidv4();

        const pool = await db.getPool();
        const request = pool.request();
        request.input('id', sql.NVarChar, id);
        request.input('name', sql.NVarChar, name);
        request.input('siteId', sql.NVarChar, siteId);
        request.input('desc', sql.NVarChar, description || '');
        request.input('location', sql.NVarChar, location || '');

        await request.query(`
            INSERT INTO dbo.SUPPLIERS (supplier_id, supplier_name, site_id, supplier_desc, location, active_flag, last_update, updateby)
            VALUES (@id, @name, @siteId, @desc, @location, 1, GETDATE(), 'SYSTEM')
        `);
            
        const [rows] = await db.query(`SELECT * FROM dbo.SUPPLIERS WHERE supplier_id = ?`, [id]);
        res.status(201).json(mapSupplierToDto(rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, siteId, description, location, isActive } = req.body;

        await db.query(`
            UPDATE dbo.SUPPLIERS 
            SET supplier_name = ?, site_id = ?, supplier_desc = ?, location = ?, 
                active_flag = ?, last_update = GETDATE()
            WHERE supplier_id = ?
        `, [name, siteId, description, location, isActive ? 1 : 0, id]);

        const [rows] = await db.query(`SELECT * FROM dbo.SUPPLIERS WHERE supplier_id = ?`, [id]);
        res.json(mapSupplierToDto(rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(`DELETE FROM dbo.SUPPLIERS WHERE supplier_id = ?`, [id]);
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. ROLES (dbo.ROLES - UUID)
export const getRoles = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.ROLES ORDER BY role_name');
        res.json(rows.map(mapRoleToDto));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createRole = async (req, res) => {
    try {
        const { name, description } = req.body;
        const id = uuidv4();

        const pool = await db.getPool();
        const request = pool.request();
        request.input('id', sql.NVarChar, id);
        request.input('name', sql.NVarChar, name);
        request.input('desc', sql.NVarChar, description || '');

        await request.query(`
            INSERT INTO dbo.ROLES (role_id, role_name, role_desc, active_flag, last_update, updateby)
            VALUES (@id, @name, @desc, 1, GETDATE(), 'SYSTEM')
        `);
        
        const [rows] = await db.query('SELECT * FROM dbo.ROLES WHERE role_id = ?', [id]);
        res.status(201).json(mapRoleToDto(rows[0]));
    } catch(e) { res.status(500).json({ error: e.message }); }
};

export const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isActive } = req.body;
        await db.query(`UPDATE dbo.ROLES SET role_name = ?, role_desc = ?, active_flag = ?, last_update = GETDATE() WHERE role_id = ?`,
            [name, description, isActive ? 1 : 0, id]);
        const [rows] = await db.query('SELECT * FROM dbo.ROLES WHERE role_id = ?', [id]);
        res.json(mapRoleToDto(rows[0]));
    } catch(e) { res.status(500).json({ error: e.message }); }
};

export const deleteRole = async (req, res) => {
    try {
         await db.query('DELETE FROM dbo.ROLES WHERE role_id = ?', [req.params.id]);
         res.json({ message: 'Deleted' });
    } catch(e) { res.status(500).json({ error: e.message }); }
};

// 4. MODELS (dbo.MODELS - UUID based)
const mapModelToDto = (row) => ({
    id: row.model_id,
    name: row.model_name,
    code: row.model_no || '',
    description: row.model_desc || '',
    productId: row.product_id,
    siteId: row.site_id,
    isActive: row.active_flag ? true : false
});

export const getModels = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.MODELS ORDER BY model_name');
        res.json(rows.map(mapModelToDto));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createModel = async (req, res) => {
    try {
        const { name, code, product_id, active_flag, description } = req.body;
        const id = uuidv4(); // Ensure uuidv4 is imported or use db.query('SELECT NEWID()')
        
        await db.query(`
            INSERT INTO dbo.MODELS (model_id, model_name, model_no, product_id, model_desc, active_flag, last_update, updateby)
            VALUES (?, ?, ?, ?, ?, ?, GETDATE(), 'SYSTEM')
        `, [id, name, code, product_id, description || '', active_flag ? 1 : 0]);
            
        const [rows] = await db.query(`SELECT * FROM dbo.MODELS WHERE model_id = ?`, [id]);
        res.status(201).json(mapModelToDto(rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateModel = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, product_id, active_flag, description } = req.body;
        
        await db.query(`
            UPDATE dbo.MODELS
            SET model_name = ?, model_no = ?, product_id = ?, model_desc = ?, active_flag = ?, last_update = GETDATE()
            WHERE model_id = ?
        `, [name, code, product_id, description || '', active_flag ? 1 : 0, id]);
            
        const [rows] = await db.query(`SELECT * FROM dbo.MODELS WHERE model_id = ?`, [id]);
        res.json(mapModelToDto(rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteModel = async (req, res) => {
     try {
        const { id } = req.params;
         // Soft delete or Hard delete? Usually hard delete for master data if unused
        await db.query(`DELETE FROM dbo.MODELS WHERE model_id = ?`, [id]);
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. PRODUCTS (dbo.PRODUCTS - UUID based)
const mapProductToDto = (row) => ({
    id: row.product_id,
    name: row.product_name,
    code: row.product_code || '',
    description: row.product_desc || '',
    siteId: row.site_id,
    isActive: row.active_flag ? true : false
});

export const getProducts = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.PRODUCTS ORDER BY product_name');
        res.json(rows.map(mapProductToDto));
    } catch (error) {
        console.error('Error fetching products:', error);
        res.json([]);
    }
};

export const createProduct = async (req, res) => {
   try {
        const { name, code, description, siteId } = req.body;
        const id = uuidv4();
        
        const pool = await db.getPool();
        const request = pool.request();
        request.input('id', sql.NVarChar, id);
        request.input('name', sql.NVarChar, name);
        request.input('code', sql.NVarChar, code || '');
        request.input('desc', sql.NVarChar, description || '');
        request.input('siteId', sql.NVarChar, siteId);

        await request.query(`
            INSERT INTO dbo.PRODUCTS (product_id, product_name, product_code, product_desc, site_id, active_flag, last_update, updateby)
            VALUES (@id, @name, @code, @desc, @siteId, 1, GETDATE(), 'SYSTEM')
        `);
        
        const [rows] = await db.query('SELECT * FROM dbo.PRODUCTS WHERE product_id = ?', [id]);
        res.status(201).json(mapProductToDto(rows[0]));
   } catch(e) { 
       console.error('Error creating product:', e);
       res.status(500).json({ error: e.message }); 
   }
};

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, description, siteId, isActive } = req.body;
        
        const pool = await db.getPool();
        const request = pool.request();
        request.input('id', sql.NVarChar, id);
        request.input('name', sql.NVarChar, name);
        request.input('code', sql.NVarChar, code || '');
        request.input('desc', sql.NVarChar, description || '');
        request.input('siteId', sql.NVarChar, siteId);
        request.input('active', sql.Bit, isActive !== false ? 1 : 0);

        await request.query(`
            UPDATE dbo.PRODUCTS 
            SET product_name = @name, product_code = @code, product_desc = @desc, site_id = @siteId, active_flag = @active, last_update = GETDATE(), updateby = 'SYSTEM'
            WHERE product_id = @id
        `);
        
        const [rows] = await db.query('SELECT * FROM dbo.PRODUCTS WHERE product_id = ?', [id]);
        res.json(mapProductToDto(rows[0]));
    } catch(e) { 
        console.error('Error updating product:', e);
        res.status(500).json({ error: e.message }); 
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM dbo.PRODUCTS WHERE product_id = ?', [id]);
        res.json({ success: true });
    } catch(e) { 
        console.error('Error deleting product:', e);
        res.status(500).json({ error: e.message }); 
    }
};

// 6. MFG AREAS (MFG_AREAS - UUID)
export const getMfgAreas = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.MFG_AREAS ORDER BY mfg_area_name');
        res.json(rows.map(mapMfgAreaToDto));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createMfgArea = async (req, res) => {
    try {
        const { mfg_area_name, mfg_area_desc } = req.body;
        const id = uuidv4();
        
        const pool = await db.getPool();
        const request = pool.request();
        request.input('id', sql.NVarChar, id);
        request.input('name', sql.NVarChar, mfg_area_name);
        request.input('desc', sql.NVarChar, mfg_area_desc || '');
        
        await request.query(`INSERT INTO dbo.MFG_AREAS (mfg_area_id, mfg_area_name, mfg_area_desc, active_flag, last_update, updateby) 
                        VALUES (@id, @name, @desc, 1, GETDATE(), 'SYSTEM')`);
        
        const [rows] = await db.query('SELECT * FROM dbo.MFG_AREAS WHERE mfg_area_id = ?', [id]);
        res.status(201).json(mapMfgAreaToDto(rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 7. PARTS (PARTCLASS - UUID)
export const getParts = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.PARTCLASS ORDER BY partclass_name');
        res.json(rows.map(mapPartToDto));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createPart = async (req, res) => {
    try {
        const { part_name, part_desc, site_id } = req.body;
        const id = uuidv4();
        
        const pool = await db.getPool();
        const request = pool.request();
        request.input('id', sql.NVarChar, id);
        request.input('name', sql.NVarChar, part_name);
        request.input('desc', sql.NVarChar, part_desc || '');
        request.input('site', sql.NVarChar, site_id || '0');

        await request.query(`INSERT INTO dbo.PARTCLASS (partclass_id, partclass_name, partclass_desc, site_id, active_flag, last_update, updateby)
                        VALUES (@id, @name, @desc, @site, 1, GETDATE(), 'SYSTEM')`);
        
        const [rows] = await db.query('SELECT * FROM dbo.PARTCLASS WHERE partclass_id = ?', [id]);
        res.status(201).json(mapPartToDto(rows[0]));
     } catch (error) {
         res.status(500).json({ error: error.message });
     }
};


// 8. DEFECT CATEGORIES (DEFECTCATEGORIES - UUID)
export const getDefectCategories = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.DEFECTCATEGORIES ORDER BY defectcategory_name');
        res.json(rows.map(mapDefectCategoryToDto));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createDefectCategory = async (req, res) => {
    try {
        const { defectcategory_name, defectcategory_acronym, defectcategory_desc } = req.body;
        const id = uuidv4();
        
        const pool = await db.getPool();
        const request = pool.request();
        request.input('id', sql.NVarChar, id);
        request.input('name', sql.NVarChar, defectcategory_name);
        request.input('acro', sql.NVarChar, defectcategory_acronym || '');
        request.input('desc', sql.NVarChar, defectcategory_desc || '');

        await request.query(`INSERT INTO dbo.DEFECTCATEGORIES (defectcategory_id, defectcategory_name, defectcategory_acronym, defectcategory_desc, active_flag, last_update, updateby)
                        VALUES (@id, @name, @acro, @desc, 1, GETDATE(), 'SYSTEM')`);
        
        const [rows] = await db.query('SELECT * FROM dbo.DEFECTCATEGORIES WHERE defectcategory_id = ?', [id]);
        res.status(201).json(mapDefectCategoryToDto(rows[0]));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 9. DEFECTS (DEFECTS - UUID)
export const getDefects = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.DEFECTS ORDER BY defect_name');
        res.json(rows.map(mapDefectToDto));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createDefect = async (req, res) => {
    try {
        const { defect_name, defect_desc } = req.body;
        const id = uuidv4();
        
        const pool = await db.getPool();
        const request = pool.request();
        request.input('id', sql.NVarChar, id);
        request.input('name', sql.NVarChar, defect_name);
        request.input('desc', sql.NVarChar, defect_desc || '');

        await request.query(`INSERT INTO dbo.DEFECTS (defect_id, defect_name, defect_desc, active_flag, last_update, updateby)
                        VALUES (@id, @name, @desc, 1, GETDATE(), 'SYSTEM')`);
        
        const [rows] = await db.query('SELECT * FROM dbo.DEFECTS WHERE defect_id = ?', [id]);
        res.status(201).json(mapDefectToDto(rows[0]));
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
};

// 10. DISPOSITIONS (DISPOSITIONS - UUID)
export const getDispositions = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.DISPOSITIONS ORDER BY disposition_name');
        res.json(rows.map(mapDispositionToDto));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createDisposition = async (req, res) => {
    try {
        const { disposition_name, disposition_desc } = req.body;
        const id = uuidv4();
        
        const pool = await db.getPool();
        const request = pool.request();
        request.input('id', sql.NVarChar, id);
        request.input('name', sql.NVarChar, disposition_name);
        request.input('desc', sql.NVarChar, disposition_desc || '');

        await request.query(`INSERT INTO dbo.DISPOSITIONS (disposition_id, disposition_name, disposition_desc, active_flag, last_update, updateby)
                        VALUES (@id, @name, @desc, 1, GETDATE(), 'SYSTEM')`);
        
        const [rows] = await db.query('SELECT * FROM dbo.DISPOSITIONS WHERE disposition_id = ?', [id]);
        res.status(201).json(mapDispositionToDto(rows[0]));
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
};

// 10.5 SEVERITY (SEVERITY - UUID)
export const getSeverity = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.SEVERITY ORDER BY severity_name');
        res.json(rows.map(mapSeverityToDto));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createSeverity = async (req, res) => {
    try {
        const { severity_name, severity_desc } = req.body;
        const id = uuidv4();
        
        await db.query(`INSERT INTO dbo.SEVERITY (severity_id, severity_name, severity_desc, active_flag, last_update, updateby)
                        VALUES (?, ?, ?, 1, GETDATE(), 'SYSTEM')`, [id, severity_name, severity_desc || '']);
        
        const [rows] = await db.query('SELECT * FROM dbo.SEVERITY WHERE severity_id = ?', [id]);
        res.status(201).json(mapSeverityToDto(rows[0]));
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateSeverity = async (req, res) => {
    try {
        const { id } = req.params;
        const { severity_name, severity_desc, active_flag } = req.body;
        await db.query('UPDATE dbo.SEVERITY SET severity_name = ?, severity_desc = ?, active_flag = ?, last_update = GETDATE() WHERE severity_id = ?', 
            [severity_name, severity_desc, active_flag ? 1 : 0, id]);
        const [rows] = await db.query('SELECT * FROM dbo.SEVERITY WHERE severity_id = ?', [id]);
        res.json(mapSeverityToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const deleteSeverity = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.SEVERITY WHERE severity_id = ?', [req.params.id]);
        res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};

// 11. AQL (AQL - UUID)
export const getAQL = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.AQL ORDER BY aql_name');
        res.json(rows.map(row => ({
            id: row.aql_id,
            name: row.aql_name,
            minor: row.minor,
            major: row.major,
            siteId: row.site_id,
            description: row.aql_desc || '',
            isActive: row.active_flag ? true : false
        })));
    } catch(e) { res.status(500).json({ error: e.message }); }
};

export const createAQL = async (req, res) => {
    try {
        const { name, minor, major, siteId, description } = req.body;
        const id = uuidv4();
        await db.query(`INSERT INTO dbo.AQL (aql_id, aql_name, minor, major, site_id, aql_desc, active_flag, creation_date, last_update, updateby)
                        VALUES (?, ?, ?, ?, ?, ?, 1, GETDATE(), GETDATE(), 'SYSTEM')`, 
                        [id, name, minor, major, siteId, description || '']);
        
        // Return mapped object directly to save a query if possible, or fetch back
        // fetching back for consistency
        const [rows] = await db.query('SELECT * FROM dbo.AQL WHERE aql_id = ?', [id]);
        res.status(201).json({
            id: rows[0].aql_id,
            name: rows[0].aql_name,
            minor: rows[0].minor,
            major: rows[0].major,
            siteId: rows[0].site_id,
            description: rows[0].aql_desc || '',
            isActive: rows[0].active_flag ? true : false
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
};

export const updateAQL = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, minor, major, siteId, description, isActive } = req.body;
        await db.query(`UPDATE dbo.AQL SET aql_name = ?, minor = ?, major = ?, site_id = ?, aql_desc = ?, active_flag = ?, last_update = GETDATE() WHERE aql_id = ?`,
            [name, minor, major, siteId, description, isActive ? 1 : 0, id]);
        
        const [rows] = await db.query('SELECT * FROM dbo.AQL WHERE aql_id = ?', [id]);
        res.json({
            id: rows[0].aql_id,
            name: rows[0].aql_name,
            minor: rows[0].minor,
            major: rows[0].major,
            siteId: rows[0].site_id,
            description: rows[0].aql_desc || '',
            isActive: rows[0].active_flag ? true : false
        });
    } catch(e) { res.status(500).json({ error: e.message }); }
};

export const deleteAQL = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.AQL WHERE aql_id = ?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch(e) { res.status(500).json({ error: e.message }); }
};


// 12. INSPECTION CATEGORIES (INSPECTIONCATEGORIES - UUID)
export const getInspectionCategories = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.INSPECTIONCATEGORIES ORDER BY inspectioncat_name');
        res.json(rows.map(mapInspectionCategoryToDto));
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
};

export const createInspectionCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const id = uuidv4();
        await db.query(`INSERT INTO dbo.INSPECTIONCATEGORIES (inspectioncat_id, inspectioncat_name, inspectioncat_desc, active_flag, last_update, updateby)
                        VALUES (?, ?, ?, 1, GETDATE(), 'SYSTEM')`, [id, name, description || '']);
        const [rows] = await db.query('SELECT * FROM dbo.INSPECTIONCATEGORIES WHERE inspectioncat_id = ?', [id]);
        res.status(201).json(mapInspectionCategoryToDto(rows[0]));
    } catch(e) { res.status(500).json({ error: e.message }); }
};

export const updateInspectionCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isActive } = req.body;
        await db.query(`UPDATE dbo.INSPECTIONCATEGORIES SET inspectioncat_name = ?, inspectioncat_desc = ?, active_flag = ?, last_update = GETDATE() WHERE inspectioncat_id = ?`, 
            [name, description, isActive ? 1 : 0, id]);
        const [rows] = await db.query('SELECT * FROM dbo.INSPECTIONCATEGORIES WHERE inspectioncat_id = ?', [id]);
        res.json(mapInspectionCategoryToDto(rows[0]));
    } catch(e) { res.status(500).json({ error: e.message }); }
};

export const deleteInspectionCategory = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.INSPECTIONCATEGORIES WHERE inspectioncat_id = ?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch(e) { res.status(500).json({ error: e.message }); }
};


// 13. INSPECTION METHODS (INSPECTIONMETHODS - UUID)
export const getInspectionMethods = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.INSPECTIONMETHODS ORDER BY inspectionmethod_name');
        res.json(rows.map(mapInspectionMethodToDto)); // Ensure mapInspectionMethodToDto maps temp/hum/default
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
};

export const createInspectionMethod = async (req, res) => {
    try {
        const { name, description, defaultTemp, defaultHum, defaultValue } = req.body;
        const id = uuidv4();
        await db.query(`INSERT INTO dbo.INSPECTIONMETHODS (inspectionmethod_id, inspectionmethod_name, inspectionmethod_desc, default_temp, default_hum, default_value, active_flag, last_update, updateby)
                        VALUES (?, ?, ?, ?, ?, ?, 1, GETDATE(), 'SYSTEM')`, 
                        [id, name, description || '', defaultTemp || 0, defaultHum || 0, defaultValue ? 1 : 0]);
        const [rows] = await db.query('SELECT * FROM dbo.INSPECTIONMETHODS WHERE inspectionmethod_id = ?', [id]);
        res.status(201).json(mapInspectionMethodToDto(rows[0]));
    } catch(e) { res.status(500).json({ error: e.message }); }
};

export const updateInspectionMethod = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, defaultTemp, defaultHum, defaultValue, isActive } = req.body;
        await db.query(`UPDATE dbo.INSPECTIONMETHODS SET inspectionmethod_name = ?, inspectionmethod_desc = ?, default_temp = ?, default_hum = ?, default_value = ?, active_flag = ?, last_update = GETDATE() WHERE inspectionmethod_id = ?`, 
            [name, description, defaultTemp, defaultHum, defaultValue ? 1 : 0, isActive ? 1 : 0, id]);
        const [rows] = await db.query('SELECT * FROM dbo.INSPECTIONMETHODS WHERE inspectionmethod_id = ?', [id]);
        res.json(mapInspectionMethodToDto(rows[0]));
    } catch(e) { res.status(500).json({ error: e.message }); }
};

export const deleteInspectionMethod = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.INSPECTIONMETHODS WHERE inspectionmethod_id = ?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch(e) { res.status(500).json({ error: e.message }); }
};


// 14. INSPECTORS (INSPECTORS - UUID)
export const getInspectors = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.INSPECTORS ORDER BY inspector_name');
        res.json(rows.map(mapInspectorToDto));
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
};

export const createInspector = async (req, res) => {
    try {
        const { name, description } = req.body;
        const id = uuidv4();
        await db.query(`INSERT INTO dbo.INSPECTORS (inspector_id, inspector_name, inspector_desc, active_flag, last_update, updateby)
                        VALUES (?, ?, ?, 1, GETDATE(), 'SYSTEM')`, [id, name, description || '']);
        const [rows] = await db.query('SELECT * FROM dbo.INSPECTORS WHERE inspector_id = ?', [id]);
        res.status(201).json(mapInspectorToDto(rows[0]));
    } catch(e) { res.status(500).json({ error: e.message }); }
};

export const updateInspector = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isActive } = req.body;
        await db.query(`UPDATE dbo.INSPECTORS SET inspector_name = ?, inspector_desc = ?, active_flag = ?, last_update = GETDATE() WHERE inspector_id = ?`, 
            [name, description, isActive ? 1 : 0, id]);
        const [rows] = await db.query('SELECT * FROM dbo.INSPECTORS WHERE inspector_id = ?', [id]);
        res.json(mapInspectorToDto(rows[0]));
    } catch(e) { res.status(500).json({ error: e.message }); }
};

export const deleteInspector = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.INSPECTORS WHERE inspector_id = ?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch(e) { res.status(500).json({ error: e.message }); }
};

// 15. MNR TYPES (MNRTYPE - UUID)
export const getMnrTypes = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.MNRTYPE ORDER BY mnrtype_name');
        res.json(rows.map(mapMnrTypeToDto));
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
};

export const createGeneralMaster = async (req, res) => {
    try {
        const { mnrtype_name, mnrtype_desc } = req.body;
        const id = uuidv4();
        
        const pool = await db.getPool();
        const request = pool.request();
        request.input('id', sql.NVarChar, id);
        request.input('name', sql.NVarChar, mnrtype_name);
        request.input('desc', sql.NVarChar, mnrtype_desc || '');

        await request.query(`INSERT INTO dbo.MNRTYPE (mnrtype_id, mnrtype_name, mnrtype_desc, active_flag, last_update, updateby)
                        VALUES (@id, @name, @desc, 1, GETDATE(), 'SYSTEM')`);
        
        const [rows] = await db.query('SELECT * FROM dbo.MNRTYPE WHERE mnrtype_id = ?', [id]);
        res.status(201).json(mapMnrTypeToDto(rows[0]));
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
};

// PLACEHOLDERS / TODOs for Update/Delete for brevity (or implement if needed now)
// UPDATES
export const updatePart = async (req, res) => {
    try {
        const { id } = req.params;
        const { part_name, part_desc, site_id, active_flag } = req.body;
        await db.query('UPDATE dbo.PARTCLASS SET partclass_name = ?, partclass_desc = ?, site_id = ?, active_flag = ?, last_update = GETDATE() WHERE partclass_id = ?', 
            [part_name, part_desc, site_id, active_flag ? 1 : 0, id]);
        const [rows] = await db.query('SELECT * FROM dbo.PARTCLASS WHERE partclass_id = ?', [id]);
        res.json(mapPartToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const deletePart = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.PARTCLASS WHERE partclass_id = ?', [req.params.id]);
        res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const updateDefectCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { defectcategory_name, defectcategory_acronym, defectcategory_desc, active_flag } = req.body;
        await db.query('UPDATE dbo.DEFECTCATEGORIES SET defectcategory_name = ?, defectcategory_acronym = ?, defectcategory_desc = ?, active_flag = ?, last_update = GETDATE() WHERE defectcategory_id = ?', 
            [defectcategory_name, defectcategory_acronym, defectcategory_desc, active_flag ? 1 : 0, id]);
        const [rows] = await db.query('SELECT * FROM dbo.DEFECTCATEGORIES WHERE defectcategory_id = ?', [id]);
        res.json(mapDefectCategoryToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const deleteDefectCategory = async (req, res) => {
    try {
         await db.query('DELETE FROM dbo.DEFECTCATEGORIES WHERE defectcategory_id = ?', [req.params.id]);
         res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};

// 9.5 DEFECT CLASSES (DEFECTCLASSES - UUID)
const mapDefectClassToDto = (row) => ({
    id: row.defectclass_id,
    name: row.defectclass_name,
    description: row.defectclass_desc || '',
    isActive: row.active_flag ? true : false,
    lastUpdate: row.last_update,
    updatedBy: row.updateby
});

export const getDefectClasses = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.DEFECTCLASS ORDER BY defectclass_name');
        res.json(rows.map(mapDefectClassToDto));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createDefectClass = async (req, res) => {
    try {
        const { name, description } = req.body;
        const id = uuidv4();
        
        await db.query(`INSERT INTO dbo.DEFECTCLASS (defectclass_id, defectclass_name, defectclass_desc, active_flag, last_update, updateby)
                        VALUES (?, ?, ?, 1, GETDATE(), 'SYSTEM')`, 
                        [id, name, description || '']);
        
        const [rows] = await db.query('SELECT * FROM dbo.DEFECTCLASS WHERE defectclass_id = ?', [id]);
        res.status(201).json(mapDefectClassToDto(rows[0]));
    } catch(error) {
        res.status(500).json({ error: error.message });
    }
};

export const updateDefectClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isActive } = req.body;
        await db.query(`UPDATE dbo.DEFECTCLASS SET defectclass_name = ?, defectclass_desc = ?, active_flag = ?, last_update = GETDATE() WHERE defectclass_id = ?`, 
            [name, description, isActive ? 1 : 0, id]);
        const [rows] = await db.query('SELECT * FROM dbo.DEFECTCLASS WHERE defectclass_id = ?', [id]);
        res.json(mapDefectClassToDto(rows[0]));
    } catch(e) { res.status(500).json({ error: e.message }); }
};

export const deleteDefectClass = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.DEFECTCLASS WHERE defectclass_id = ?', [req.params.id]);
        res.json({ message: 'Deleted' });
    } catch(e) { res.status(500).json({ error: e.message }); }
};

export const updateDefect = async (req, res) => {
    try {
         const { id } = req.params;
         const { defect_name, defect_desc, active_flag } = req.body;
         await db.query('UPDATE dbo.DEFECTS SET defect_name = ?, defect_desc = ?, active_flag = ?, last_update = GETDATE() WHERE defect_id = ?', 
             [defect_name, defect_desc, active_flag ? 1 : 0, id]);
         const [rows] = await db.query('SELECT * FROM dbo.DEFECTS WHERE defect_id = ?', [id]);
         res.json(mapDefectToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const deleteDefect = async (req, res) => {
    try {
         await db.query('DELETE FROM dbo.DEFECTS WHERE defect_id = ?', [req.params.id]);
         res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const updateDisposition = async (req, res) => {
    try {
         const { id } = req.params;
         const { disposition_name, disposition_desc, active_flag } = req.body;
         await db.query('UPDATE dbo.DISPOSITIONS SET disposition_name = ?, disposition_desc = ?, active_flag = ?, last_update = GETDATE() WHERE disposition_id = ?', 
             [disposition_name, disposition_desc, active_flag ? 1 : 0, id]);
         const [rows] = await db.query('SELECT * FROM dbo.DISPOSITIONS WHERE disposition_id = ?', [id]);
         res.json(mapDispositionToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const deleteDisposition = async (req, res) => {
    try {
         await db.query('DELETE FROM dbo.DISPOSITIONS WHERE disposition_id = ?', [req.params.id]);
         res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const updateGeneralMaster = async (req, res) => {
    try {
         const { id } = req.params;
         const { mnrtype_name, mnrtype_desc, active_flag } = req.body;
         await db.query('UPDATE dbo.MNRTYPE SET mnrtype_name = ?, mnrtype_desc = ?, active_flag = ?, last_update = GETDATE() WHERE mnrtype_id = ?', 
             [mnrtype_name, mnrtype_desc, active_flag ? 1 : 0, id]);
         const [rows] = await db.query('SELECT * FROM dbo.MNRTYPE WHERE mnrtype_id = ?', [id]);
         res.json(mapMnrTypeToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const deleteGeneralMaster = async (req, res) => {
    try {
         await db.query('DELETE FROM dbo.MNRTYPE WHERE mnrtype_id = ?', [req.params.id]);
         res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};

// ============================================================================
// PARTS CATALOG EXPANSION
// ============================================================================

// 15. PART TYPES (PARTTYPES)
export const getPartTypes = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.PARTTYPES ORDER BY parttype_name');
        res.json(rows.map(mapPartTypeToDto));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const createPartType = async (req, res) => {
    try {
        const { parttype_name, parttype_code, parttype_desc } = req.body;
        const id = uuidv4();
        await db.query(`INSERT INTO dbo.PARTTYPES (parttype_id, parttype_name, parttype_code, parttype_desc, active_flag, last_update, updateby)
                        VALUES (?, ?, ?, ?, 1, GETDATE(), 'SYSTEM')`, [id, parttype_name, parttype_code || '', parttype_desc || '']);
        const [rows] = await db.query('SELECT * FROM dbo.PARTTYPES WHERE parttype_id = ?', [id]);
        res.status(201).json(mapPartTypeToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const updatePartType = async (req, res) => {
    try {
        const { id } = req.params;
        const { parttype_name, parttype_code, parttype_desc, active_flag } = req.body;
        await db.query('UPDATE dbo.PARTTYPES SET parttype_name = ?, parttype_code = ?, parttype_desc = ?, active_flag = ?, last_update = GETDATE() WHERE parttype_id = ?',
            [parttype_name, parttype_code, parttype_desc, active_flag ? 1 : 0, id]);
        const [rows] = await db.query('SELECT * FROM dbo.PARTTYPES WHERE parttype_id = ?', [id]);
        res.json(mapPartTypeToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const deletePartType = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.PARTTYPES WHERE parttype_id = ?', [req.params.id]);
        res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};

// 16. PART DATA CATEGORIES
export const getPartDataCategories = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.PARTDATACATEGORIES ORDER BY partdatacategory_name');
        res.json(rows.map(mapPartDataCategoryToDto));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const createPartDataCategory = async (req, res) => {
    try {
        const { name, parentId, min, max, description } = req.body; // Expecting mapped body from API
        const id = uuidv4();
        const request = (await db.getPool()).request();
        request.input('id', sql.NVarChar, id);
        request.input('name', sql.NVarChar, name);
        request.input('pid', sql.NVarChar, parentId);
        request.input('min', sql.Decimal, min);
        request.input('max', sql.Decimal, max);
        request.input('desc', sql.NVarChar, description || '');
        
        await request.query(`INSERT INTO dbo.PARTDATACATEGORIES (partdatacategory_id, partdatacategory_name, part_id, minimum, maximum, partdatacategory_desc, active_flag, last_update, updateby)
                             VALUES (@id, @name, @pid, @min, @max, @desc, 1, GETDATE(), 'SYSTEM')`);
        
        const [rows] = await db.query('SELECT * FROM dbo.PARTDATACATEGORIES WHERE partdatacategory_id = ?', [id]);
        res.status(201).json(mapPartDataCategoryToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const updatePartDataCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, min, max, description, active_flag } = req.body;
        await db.query(`UPDATE dbo.PARTDATACATEGORIES SET partdatacategory_name = ?, minimum = ?, maximum = ?, partdatacategory_desc = ?, active_flag = ?, last_update = GETDATE() WHERE partdatacategory_id = ?`,
            [name, min, max, description, active_flag ? 1 : 0, id]);
        const [rows] = await db.query('SELECT * FROM dbo.PARTDATACATEGORIES WHERE partdatacategory_id = ?', [id]);
        res.json(mapPartDataCategoryToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const deletePartDataCategory = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.PARTDATACATEGORIES WHERE partdatacategory_id = ?', [req.params.id]);
        res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};

// ... (Dimension/Noise Categories omitted for brevity but should follow same pattern if not already there)

// 17. FORMS (FORMS - UUID)
export const getForms = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.FORMS ORDER BY form_name');
        res.json(rows.map(mapFormToDto));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const createForm = async (req, res) => {
    try {
        const { name, url, menuGroup, icon, description } = req.body;
        const id = uuidv4();
        await db.query(`INSERT INTO dbo.FORMS (form_id, form_name, form_url, menu_group, icon, form_desc, active_flag, last_update, updateby)
                        VALUES (?, ?, ?, ?, ?, ?, 1, GETDATE(), 'SYSTEM')`, 
                        [id, name, url, menuGroup, icon || '', description || '']);
        const [rows] = await db.query('SELECT * FROM dbo.FORMS WHERE form_id = ?', [id]);
        res.status(201).json(mapFormToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const updateForm = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, url, menuGroup, icon, description, isActive } = req.body;
        await db.query(`UPDATE dbo.FORMS SET form_name = ?, form_url = ?, menu_group = ?, icon = ?, form_desc = ?, active_flag = ?, last_update = GETDATE() WHERE form_id = ?`,
            [name, url, menuGroup, icon, description, isActive ? 1 : 0, id]);
        const [rows] = await db.query('SELECT * FROM dbo.FORMS WHERE form_id = ?', [id]);
        res.json(mapFormToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const deleteForm = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.FORMS WHERE form_id = ?', [req.params.id]);
        res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};

// 18. ROLE ACCESS (ROLE_ACCESS - UUID)
export const getRoleAccess = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.ROLE_ACCESS');
        res.json(rows.map(mapRoleAccessToDto));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const createRoleAccess = async (req, res) => {
    try {
        const { roleId, formId, description, permissions } = req.body;
        const id = uuidv4();
        // Default perms to 0 if not provided
        const p = { 
            view: 0, viewList: 0, add: 0, edit: 0, delete: 0, 
            approve: 0, check: 0, print: 0, export: 0, 
            perSite: 0, canAttach: 0, pic: 0,
            ...permissions 
        };
        
        // Helper to safe cast
        const b = (val) => val ? 1 : 0;
        
        await db.query(`
            INSERT INTO dbo.ROLE_ACCESS (
                roleaccess_id, role_id, form_id, roleaccess_desc, 
                can_view, can_add, can_edit, can_delete, 
                can_approve, can_check, can_print, can_export,
                active_flag, last_update, updateby, 
                can_viewlist, per_site, can_attach, pic
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, GETDATE(), 'SYSTEM', ?, ?, ?, ?)
        `, [id, roleId, formId, description || '', 
            b(p.view), b(p.add), b(p.edit), b(p.delete), 
            b(p.approve), b(p.check), b(p.print), b(p.export),
            b(p.viewList), b(p.perSite), b(p.canAttach), b(p.pic)]);
            
        const [rows] = await db.query('SELECT * FROM dbo.ROLE_ACCESS WHERE roleaccess_id = ?', [id]);
        res.status(201).json(mapRoleAccessToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const updateRoleAccess = async (req, res) => {
    try {
        const { id } = req.params;
        const { roleId, formId, description, permissions, isActive } = req.body;
        // Fix: Ensure viewList is in defaults, and cast all to 0/1 integers for safety
        const p = { 
            view: 0, viewList: 0, add: 0, edit: 0, delete: 0, 
            approve: 0, check: 0, print: 0, export: 0, 
            perSite: 0, canAttach: 0, pic: 0,
            ...permissions 
        };

        // Helper to safe cast
        const b = (val) => val ? 1 : 0;

        await db.query(`
            UPDATE dbo.ROLE_ACCESS 
            SET role_id = ?, form_id = ?, roleaccess_desc = ?, 
                can_view = ?, can_viewlist = ?, can_add = ?, can_edit = ?, can_delete = ?, 
                can_approve = ?, can_check = ?, can_print = ?, can_export = ?,
                per_site = ?, can_attach = ?, pic = ?,
                active_flag = ?, last_update = GETDATE()
            WHERE roleaccess_id = ?
        `, [roleId, formId, description, 
            b(p.view), b(p.viewList || p.view_list), b(p.add), b(p.edit), b(p.delete), 
            b(p.approve), b(p.check), b(p.print), b(p.export), 
            b(p.perSite), b(p.canAttach), b(p.pic),
            isActive ? 1 : 0, id]);
            
        const [rows] = await db.query('SELECT * FROM dbo.ROLE_ACCESS WHERE roleaccess_id = ?', [id]);
        res.json(mapRoleAccessToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const deleteRoleAccess = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.ROLE_ACCESS WHERE roleaccess_id = ?', [req.params.id]);
        res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};

// 17. PART DIMENSION CATEGORIES
export const getPartDimensionCategories = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.PARTDIMENSIONCATEGORIES ORDER BY partdimensioncategory_name');
        res.json(rows.map(mapPartDimensionCategoryToDto));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const createPartDimensionCategory = async (req, res) => {
    try {
        const { name, parentId, min, max, description } = req.body;
        const id = uuidv4();
        const request = (await db.getPool()).request();
        request.input('id', sql.NVarChar, id);
        request.input('name', sql.NVarChar, name);
        request.input('pid', sql.NVarChar, parentId);
        request.input('min', sql.Decimal, min);
        request.input('max', sql.Decimal, max);
        request.input('desc', sql.NVarChar, description || '');
        
        await request.query(`INSERT INTO dbo.PARTDIMENSIONCATEGORIES (partdimensioncategory_id, partdimensioncategory_name, part_id, minimum, maximum, partdimensioncategory_desc, active_flag, last_update, updateby)
                             VALUES (@id, @name, @pid, @min, @max, @desc, 1, GETDATE(), 'SYSTEM')`);
        const [rows] = await db.query('SELECT * FROM dbo.PARTDIMENSIONCATEGORIES WHERE partdimensioncategory_id = ?', [id]);
        res.status(201).json(mapPartDimensionCategoryToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const updatePartDimensionCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, min, max, description, active_flag } = req.body;
        await db.query(`UPDATE dbo.PARTDIMENSIONCATEGORIES SET partdimensioncategory_name = ?, minimum = ?, maximum = ?, partdimensioncategory_desc = ?, active_flag = ?, last_update = GETDATE() WHERE partdimensioncategory_id = ?`,
            [name, min, max, description, active_flag ? 1 : 0, id]);
        const [rows] = await db.query('SELECT * FROM dbo.PARTDIMENSIONCATEGORIES WHERE partdimensioncategory_id = ?', [id]);
        res.json(mapPartDimensionCategoryToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const deletePartDimensionCategory = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.PARTDIMENSIONCATEGORIES WHERE partdimensioncategory_id = ?', [req.params.id]);
        res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};

// 18. PART NOISE CATEGORIES
export const getPartNoiseCategories = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.PARTNOISECATEGORIES ORDER BY partnoisecategory_name');
        res.json(rows.map(mapPartNoiseCategoryToDto));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const createPartNoiseCategory = async (req, res) => {
    try {
        const { name, parentId, min, max, description } = req.body;
        const id = uuidv4();
        const request = (await db.getPool()).request();
        request.input('id', sql.NVarChar, id);
        request.input('name', sql.NVarChar, name);
        request.input('pid', sql.NVarChar, parentId);
        request.input('min', sql.Decimal, min);
        request.input('max', sql.Decimal, max);
        request.input('desc', sql.NVarChar, description || '');
        
        await request.query(`INSERT INTO dbo.PARTNOISECATEGORIES (partnoisecategory_id, partnoisecategory_name, part_id, minimum, maximum, partnoisecategory_desc, active_flag, last_update, updateby)
                             VALUES (@id, @name, @pid, @min, @max, @desc, 1, GETDATE(), 'SYSTEM')`);
        const [rows] = await db.query('SELECT * FROM dbo.PARTNOISECATEGORIES WHERE partnoisecategory_id = ?', [id]);
        res.status(201).json(mapPartNoiseCategoryToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const updatePartNoiseCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, min, max, description, active_flag } = req.body;
        await db.query(`UPDATE dbo.PARTNOISECATEGORIES SET partnoisecategory_name = ?, minimum = ?, maximum = ?, partnoisecategory_desc = ?, active_flag = ?, last_update = GETDATE() WHERE partnoisecategory_id = ?`,
            [name, min, max, description, active_flag ? 1 : 0, id]);
        const [rows] = await db.query('SELECT * FROM dbo.PARTNOISECATEGORIES WHERE partnoisecategory_id = ?', [id]);
        res.json(mapPartNoiseCategoryToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const deletePartNoiseCategory = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.PARTNOISECATEGORIES WHERE partnoisecategory_id = ?', [req.params.id]);
        res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};

// 19. PART MASTER (PARTS - GUID)
export const getPartsCatalog = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.PARTS ORDER BY part_name');
        res.json(rows.map(mapPartMasterToDto));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const createPartMaster = async (req, res) => {
    try {
        const { code, name, siteId, description, classId, typeId, aqlId } = req.body;
        const id = uuidv4();
        const request = (await db.getPool()).request();
        request.input('id', sql.NVarChar, id);
        request.input('code', sql.NVarChar, code);
        request.input('name', sql.NVarChar, name);
        request.input('site', sql.NVarChar, siteId);
        request.input('desc', sql.NVarChar, description || '');
        request.input('class', sql.NVarChar, classId);
        request.input('type', sql.NVarChar, typeId);
        request.input('aql', sql.NVarChar, aqlId || '0');
        
        await request.query(`INSERT INTO dbo.PARTS (part_id, part_code, part_name, site_id, part_desc, partclass_id, parttype_id, aql_id, active_flag, last_update, updateby)
                             VALUES (@id, @code, @name, @site, @desc, @class, @type, @aql, 1, GETDATE(), 'SYSTEM')`);
        const [rows] = await db.query('SELECT * FROM dbo.PARTS WHERE part_id = ?', [id]);
        res.status(201).json(mapPartMasterToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const updatePartMaster = async (req, res) => {
    try {
        const { id } = req.params;
        // In update, we use keys mapped from frontend (code, name, etc.)
        const { code, name, siteId, description, classId, typeId, aqlId, active_flag } = req.body;
        
        // Simple update query
        await db.query(`UPDATE dbo.PARTS SET part_code = ?, part_name = ?, site_id = ?, part_desc = ?, partclass_id = ?, parttype_id = ?, aql_id = ?, active_flag = ?, last_update = GETDATE() WHERE part_id = ?`,
            [code, name, siteId, description, classId, typeId, aqlId, active_flag ? 1 : 0, id]);
        
        const [rows] = await db.query('SELECT * FROM dbo.PARTS WHERE part_id = ?', [id]);
        res.json(mapPartMasterToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};
export const deletePartMaster = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.PARTS WHERE part_id = ?', [req.params.id]);
        res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};

// ============================================================================
// 20. SUPPLIER INCHARGES (SUPPLIERSUSER - UUID)
// ============================================================================
const mapSupplierInchargeToDto = (row) => ({
    id: row.Id,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    siteId: row.site_id,
    siteName: row.site_name,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    isActive: row.active_flag ? true : false,
    lastUpdate: row.last_update,
    updatedBy: row.updatedby
});

export const getSupplierIncharges = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.vSupplierIncharges ORDER BY supplier_name, full_name');
        res.json(rows.map(mapSupplierInchargeToDto));
    } catch (error) {
        console.error('getSupplierIncharges error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const createSupplierIncharge = async (req, res) => {
    try {
        const { supplierId, userId } = req.body;
        const id = uuidv4();

        const pool = await db.getPool();
        const request = pool.request();
        request.input('id', sql.NVarChar, id);
        request.input('supplierId', sql.NVarChar, supplierId);
        request.input('userId', sql.NVarChar, userId);

        await request.query(`
            INSERT INTO dbo.SUPPLIERSUSER (Id, supplier_id, user_id, active_flag, last_update, updatedby)
            VALUES (@id, @supplierId, @userId, 1, GETDATE(), 'SYSTEM')
        `);
            
        // Fetch from view for complete data
        const [rows] = await db.query('SELECT * FROM dbo.vSupplierIncharges WHERE Id = ?', [id]);
        res.status(201).json(mapSupplierInchargeToDto(rows[0]));
    } catch (error) {
        console.error('createSupplierIncharge error', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateSupplierIncharge = async (req, res) => {
    try {
        const { id } = req.params;
        const { supplierId, userId, isActive } = req.body;
        
        await db.query(`
            UPDATE dbo.SUPPLIERSUSER 
            SET supplier_id = ?, user_id = ?, active_flag = ?, last_update = GETDATE(), updatedby = 'SYSTEM'
            WHERE Id = ?
        `, [supplierId, userId, isActive ? 1 : 0, id]);
            
        const [rows] = await db.query('SELECT * FROM dbo.vSupplierIncharges WHERE Id = ?', [id]);
        res.json(mapSupplierInchargeToDto(rows[0]));
    } catch (error) {
        console.error('updateSupplierIncharge error', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteSupplierIncharge = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM dbo.SUPPLIERSUSER WHERE Id = ?', [id]);
        res.json({ message: 'Deleted' });
    } catch (error) {
        console.error('deleteSupplierIncharge error', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================================================
// SUPPLIER INFORMATION (Contact Persons) - dbo.SUPPLIER_INFORMATION
// ============================================================================

const mapSupplierInfoToDto = (row) => ({
    id: row.supplier_information_id,
    supplierId: row.supplier_id,
    firstName: row.first_name,
    middleName: row.middle_name || '',
    lastName: row.last_name,
    description: row.supplier_information_desc || '',
    attachmentId: row.attachment_id || '',
    attachmentName: row.attachment_name || '',
    attachmentExtension: row.attachment_extension || '',
    isActive: row.active_flag ? true : false
});

export const getSupplierInformation = async (req, res) => {
    try {
        const { supplierId } = req.params;
        const [rows] = await db.query(
            'SELECT * FROM dbo.SUPPLIER_INFORMATION WHERE supplier_id = ? ORDER BY last_name, first_name',
            [supplierId]
        );
        res.json(rows.map(mapSupplierInfoToDto));
    } catch (error) {
        console.error('getSupplierInformation error', error);
        res.status(500).json({ error: error.message });
    }
};

export const getAllSupplierInformation = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.SUPPLIER_INFORMATION ORDER BY last_name, first_name');
        res.json(rows.map(mapSupplierInfoToDto));
    } catch (error) {
        console.error('getAllSupplierInformation error', error);
        res.status(500).json({ error: error.message });
    }
};

export const createSupplierInformation = async (req, res) => {
    try {
        const { supplierId, firstName, middleName, lastName, description, attachmentId, attachmentName, attachmentExtension } = req.body;
        
        if (!supplierId || !firstName || !lastName) {
            return res.status(400).json({ error: 'Missing required fields: supplierId, firstName, lastName' });
        }

        const id = uuidv4();

        const pool = await db.getPool();
        const request = pool.request();
        request.input('id', sql.NVarChar, id);
        request.input('supplierId', sql.NVarChar, supplierId);
        request.input('firstName', sql.NVarChar, firstName);
        request.input('middleName', sql.NVarChar, middleName || '');
        request.input('lastName', sql.NVarChar, lastName);
        request.input('desc', sql.NVarChar, description || '');
        request.input('attachId', sql.NVarChar, attachmentId || '');
        request.input('attachName', sql.NVarChar, attachmentName || '');
        request.input('attachExt', sql.NVarChar, attachmentExtension || '');

        await request.query(`
            INSERT INTO dbo.SUPPLIER_INFORMATION 
            (supplier_information_id, supplier_id, first_name, middle_name, last_name, supplier_information_desc, attachment_id, attachment_name, attachment_extension, active_flag, last_update, updateby)
            VALUES (@id, @supplierId, @firstName, @middleName, @lastName, @desc, @attachId, @attachName, @attachExt, 1, GETDATE(), 'SYSTEM')
        `);

        const [rows] = await db.query('SELECT * FROM dbo.SUPPLIER_INFORMATION WHERE supplier_information_id = ?', [id]);
        res.status(201).json(mapSupplierInfoToDto(rows[0]));
    } catch (error) {
        console.error('createSupplierInformation error', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateSupplierInformation = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, middleName, lastName, description, isActive } = req.body;

        await db.query(`
            UPDATE dbo.SUPPLIER_INFORMATION 
            SET first_name = ?, middle_name = ?, last_name = ?, supplier_information_desc = ?, active_flag = ?, last_update = GETDATE(), updateby = 'SYSTEM'
            WHERE supplier_information_id = ?
        `, [firstName, middleName || '', lastName, description || '', isActive ? 1 : 0, id]);

        const [rows] = await db.query('SELECT * FROM dbo.SUPPLIER_INFORMATION WHERE supplier_information_id = ?', [id]);
        res.json(mapSupplierInfoToDto(rows[0]));
    } catch (error) {
        console.error('updateSupplierInformation error', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteSupplierInformation = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM dbo.SUPPLIER_INFORMATION WHERE supplier_information_id = ?', [id]);
        res.json({ message: 'Deleted' });
    } catch (error) {
        console.error('deleteSupplierInformation error', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================================================
// 21. AUDIT CATEGORY
// ============================================================================
const mapAuditCategoryToDto = (row) => ({
    id: row.audit_category_id,
    name: row.audit_category_name,
    code: row.audit_category_code,
    description: row.audit_category_desc || '',
    withRating: row.with_rating,
    withAuditees: row.with_auditees,
    withAuditors: row.with_auditors,
    withAttendees: row.with_attendees,
    withAuditPlan: row.with_audit_plan,
    isActive: row.active_flag ? true : false
});

export const getAuditCategories = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.AUDITCATEGORY ORDER BY audit_category_name');
        res.json(rows.map(mapAuditCategoryToDto));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const createAuditCategory = async (req, res) => {
    try {
        const { name, code, description, withRating, withAuditees, withAuditors, withAttendees, withAuditPlan } = req.body;
        const id = uuidv4();
        await db.query(`INSERT INTO dbo.AUDITCATEGORY 
            (audit_category_id, audit_category_name, audit_category_code, audit_category_desc, 
             with_rating, with_auditees, with_auditors, with_attendees, with_audit_plan, 
             active_flag, last_update, updateby)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, GETDATE(), 'SYSTEM')`, 
            [id, name, code, description || '', 
             withRating ? 1 : 0, withAuditees ? 1 : 0, withAuditors ? 1 : 0, withAttendees ? 1 : 0, withAuditPlan ? 1 : 0]);
        const [rows] = await db.query('SELECT * FROM dbo.AUDITCATEGORY WHERE audit_category_id = ?', [id]);
        res.status(201).json(mapAuditCategoryToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const updateAuditCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, description, withRating, withAuditees, withAuditors, withAttendees, withAuditPlan, isActive } = req.body;
        await db.query(`UPDATE dbo.AUDITCATEGORY SET 
            audit_category_name = ?, audit_category_code = ?, audit_category_desc = ?, 
            with_rating = ?, with_auditees = ?, with_auditors = ?, with_attendees = ?, with_audit_plan = ?, 
            active_flag = ?, last_update = GETDATE() 
            WHERE audit_category_id = ?`,
            [name, code, description, 
             withRating ? 1 : 0, withAuditees ? 1 : 0, withAuditors ? 1 : 0, withAttendees ? 1 : 0, withAuditPlan ? 1 : 0, 
             isActive ? 1 : 0, id]);
        const [rows] = await db.query('SELECT * FROM dbo.AUDITCATEGORY WHERE audit_category_id = ?', [id]);
        res.json(mapAuditCategoryToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const deleteAuditCategory = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.AUDITCATEGORY WHERE audit_category_id = ?', [req.params.id]);
        res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};

// ============================================================================
// 22. AUDIT TYPE
// ============================================================================
const mapAuditTypeToDto = (row) => ({
    id: row.audit_type_id,
    name: row.audit_type_name,
    description: row.audit_type_desc || '',
    categoryId: row.audit_category_id,
    categoryName: row.audit_category_name || '',
    isActive: row.active_flag ? true : false
});

export const getAuditTypes = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT t.*, c.audit_category_name 
            FROM dbo.AUDITTYPE t
            LEFT JOIN dbo.AUDITCATEGORY c ON t.audit_category_id = c.audit_category_id
            ORDER BY t.audit_type_name
        `);
        res.json(rows.map(mapAuditTypeToDto));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const createAuditType = async (req, res) => {
    try {
        const { name, description, categoryId } = req.body;
        const id = uuidv4();
        await db.query(`INSERT INTO dbo.AUDITTYPE (audit_type_id, audit_type_name, audit_type_desc, audit_category_id, active_flag, last_update, updateby)
                        VALUES (?, ?, ?, ?, 1, GETDATE(), 'SYSTEM')`, 
                        [id, name, description || '', categoryId]);
        const [rows] = await db.query(`SELECT t.*, c.audit_category_name FROM dbo.AUDITTYPE t LEFT JOIN dbo.AUDITCATEGORY c ON t.audit_category_id = c.audit_category_id WHERE audit_type_id = ?`, [id]);
        res.status(201).json(mapAuditTypeToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const updateAuditType = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, categoryId, isActive } = req.body;
        await db.query(`UPDATE dbo.AUDITTYPE SET audit_type_name = ?, audit_type_desc = ?, audit_category_id = ?, active_flag = ?, last_update = GETDATE() WHERE audit_type_id = ?`,
            [name, description, categoryId, isActive ? 1 : 0, id]);
        const [rows] = await db.query(`SELECT t.*, c.audit_category_name FROM dbo.AUDITTYPE t LEFT JOIN dbo.AUDITCATEGORY c ON t.audit_category_id = c.audit_category_id WHERE audit_type_id = ?`, [id]);
        res.json(mapAuditTypeToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const deleteAuditType = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.AUDITTYPE WHERE audit_type_id = ?', [req.params.id]);
        res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};

// ============================================================================
// 23. CRITERIA
// ============================================================================
const mapCriteriaToDto = (row) => ({
    id: row.criteria_id,
    name: row.criteria_name,
    description: row.criteria_desc || '',
    isActive: row.active_flag ? true : false
});

export const getCriterias = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM dbo.CRITERIAS ORDER BY criteria_name');
        res.json(rows.map(mapCriteriaToDto));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const createCriteria = async (req, res) => {
    try {
        const { name, description } = req.body;
        const id = uuidv4();
        await db.query(`INSERT INTO dbo.CRITERIAS (criteria_id, criteria_name, criteria_desc, active_flag, last_update, updateby)
                        VALUES (?, ?, ?, 1, GETDATE(), 'SYSTEM')`, 
                        [id, name, description || '']);
        const [rows] = await db.query('SELECT * FROM dbo.CRITERIAS WHERE criteria_id = ?', [id]);
        res.status(201).json(mapCriteriaToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const updateCriteria = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isActive } = req.body;
        await db.query(`UPDATE dbo.CRITERIAS SET criteria_name = ?, criteria_desc = ?, active_flag = ?, last_update = GETDATE() WHERE criteria_id = ?`,
            [name, description, isActive ? 1 : 0, id]);
        const [rows] = await db.query('SELECT * FROM dbo.CRITERIAS WHERE criteria_id = ?', [id]);
        res.json(mapCriteriaToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const deleteCriteria = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.CRITERIAS WHERE criteria_id = ?', [req.params.id]);
        res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};

// ============================================================================
// 24. 5M1E CATEGORY (PARTCLASSCATEGORIES)
// ============================================================================
const mapFiveM1ECategoryToDto = (row) => ({
    id: row.Category_ID,
    name: row.Category_name,
    description: row.Category_desc || '',
    partClassId: row.Partclass_id,
    partClassName: row.partclass_name || '',
    siteName: row.site_name || '',
    isActive: row.Active_flag ? true : false
});

export const getFiveM1ECategories = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT pcc.*, pc.partclass_name, s.site_name
            FROM dbo.PARTCLASSCATEGORIES pcc
            LEFT JOIN dbo.PARTCLASS pc ON pcc.Partclass_id = pc.partclass_id
            LEFT JOIN dbo.MFG_SITES s ON pc.site_id = s.site_id
            ORDER BY pcc.Category_name
        `);
        res.json(rows.map(mapFiveM1ECategoryToDto));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const createFiveM1ECategory = async (req, res) => {
    try {
        const { name, description, partClassId } = req.body;
        const id = uuidv4();
        await db.query(`INSERT INTO dbo.PARTCLASSCATEGORIES 
            (Category_ID, Category_name, Category_desc, Partclass_id, Active_flag, Last_update, updateby)
            VALUES (?, ?, ?, ?, 1, GETDATE(), 'SYSTEM')`, 
            [id, name, description || '', partClassId]);
            
        const [rows] = await db.query(`
            SELECT pcc.*, pc.partclass_name, s.site_name
            FROM dbo.PARTCLASSCATEGORIES pcc
            LEFT JOIN dbo.PARTCLASS pc ON pcc.Partclass_id = pc.partclass_id
            LEFT JOIN dbo.MFG_SITES s ON pc.site_id = s.site_id
            WHERE pcc.Category_ID = ?`, [id]);
        res.status(201).json(mapFiveM1ECategoryToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const updateFiveM1ECategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, partClassId, isActive } = req.body;
        await db.query(`UPDATE dbo.PARTCLASSCATEGORIES SET 
            Category_name = ?, Category_desc = ?, Partclass_id = ?, Active_flag = ?, Last_update = GETDATE()
            WHERE Category_ID = ?`,
            [name, description, partClassId, isActive ? 1 : 0, id]);
            
        const [rows] = await db.query(`
            SELECT pcc.*, pc.partclass_name, s.site_name
            FROM dbo.PARTCLASSCATEGORIES pcc
            LEFT JOIN dbo.PARTCLASS pc ON pcc.Partclass_id = pc.partclass_id
            LEFT JOIN dbo.MFG_SITES s ON pc.site_id = s.site_id
            WHERE pcc.Category_ID = ?`, [id]);
        res.json(mapFiveM1ECategoryToDto(rows[0]));
    } catch(e) { res.status(500).json({error: e.message}); }
};

export const deleteFiveM1ECategory = async (req, res) => {
    try {
        await db.query('DELETE FROM dbo.PARTCLASSCATEGORIES WHERE Category_ID = ?', [req.params.id]);
        res.json({message: 'Deleted'});
    } catch(e) { res.status(500).json({error: e.message}); }
};


// ============================================================================
// REGISTRATIONS (dbo.REGISTRATIONS)
// ============================================================================

const mapRegistrationToDto = (row) => ({
    id: row.registration_id,
    confirmationCode: row.confirmation_code,
    userId: row.user_id,
    fullName: row.full_name || '',
    email: row.email || '',
    roleName: row.role_name || '',
    siteName: row.site_name || '',
    confirmed: row.confirmed ? true : false,
    confirmationDate: row.confirmation_date,
    registrationType: row.registration_type,
    isActive: row.active_flag ? true : false,
    lastUpdate: row.last_update,
    updatedBy: row.updateby
});

export const getRegistrations = async (req, res) => {
    try {
        // JOIN with USERS, ROLES, and MFG_SITES tables to get all required details
        const [rows] = await db.query(`
            SELECT 
                r.registration_id,
                r.confirmation_code,
                r.user_id,
                r.registration_type,
                r.active_flag,
                r.confirmed,
                r.confirmation_date,
                r.last_update,
                r.updateby,
                u.full_name,
                u.email,
                ro.role_name,
                s.site_name
            FROM dbo.REGISTRATIONS r
            LEFT JOIN dbo.USERS u ON r.user_id = u.user_id
            LEFT JOIN dbo.ROLES ro ON u.role_id = ro.role_id
            LEFT JOIN dbo.MFG_SITES s ON u.site_id = s.site_id
            ORDER BY r.last_update DESC
        `);
        res.json(rows.map(mapRegistrationToDto));
    } catch (error) {
        console.error('getRegistrations error:', error);
        res.status(500).json({ error: error.message });
    }
};

export const createRegistration = async (req, res) => {
    try {
        const { confirmationCode, userId, registrationType } = req.body;
        
        if (!confirmationCode || !userId) {
            return res.status(400).json({ error: 'Missing required fields: confirmationCode, userId' });
        }

        const id = uuidv4();

        const pool = await db.getPool();
        const request = pool.request();
        request.input('id', sql.NVarChar, id);
        request.input('confirmationCode', sql.NVarChar, confirmationCode);
        request.input('userId', sql.NVarChar, userId);
        request.input('registrationType', sql.Int, registrationType || null);

        await request.query(`
            INSERT INTO dbo.REGISTRATIONS 
            (registration_id, confirmation_code, user_id, registration_type, confirmed, active_flag, last_update, updateby)
            VALUES (@id, @confirmationCode, @userId, @registrationType, 0, 1, GETDATE(), 'SYSTEM')
        `);

        // Fetch back with user details
        const [rows] = await db.query(`
            SELECT 
                r.registration_id,
                r.confirmation_code,
                r.user_id,
                r.registration_type,
                r.active_flag,
                r.confirmed,
                r.confirmation_date,
                r.last_update,
                r.updateby,
                u.full_name,
                u.email,
                ro.role_name,
                s.site_name
            FROM dbo.REGISTRATIONS r
            LEFT JOIN dbo.USERS u ON r.user_id = u.user_id
            LEFT JOIN dbo.ROLES ro ON u.role_id = ro.role_id
            LEFT JOIN dbo.MFG_SITES s ON u.site_id = s.site_id
            WHERE r.registration_id = ?
        `, [id]);
        
        res.status(201).json(mapRegistrationToDto(rows[0]));
    } catch (error) {
        console.error('createRegistration error', error);
        res.status(500).json({ error: error.message });
    }
};

export const updateRegistration = async (req, res) => {
    try {
        const { id } = req.params;
        const { confirmationCode, userId, registrationType, isActive } = req.body;

        await db.query(`
            UPDATE dbo.REGISTRATIONS 
            SET confirmation_code = ?, user_id = ?, registration_type = ?, active_flag = ?, last_update = GETDATE(), updateby = 'SYSTEM'
            WHERE registration_id = ?
        `, [confirmationCode, userId, registrationType || null, isActive ? 1 : 0, id]);

        // Fetch back with user details
        const [rows] = await db.query(`
            SELECT 
                r.registration_id,
                r.confirmation_code,
                r.user_id,
                r.registration_type,
                r.active_flag,
                r.confirmed,
                r.confirmation_date,
                r.last_update,
                r.updateby,
                u.full_name,
                u.email,
                ro.role_name,
                s.site_name
            FROM dbo.REGISTRATIONS r
            LEFT JOIN dbo.USERS u ON r.user_id = u.user_id
            LEFT JOIN dbo.ROLES ro ON u.role_id = ro.role_id
            LEFT JOIN dbo.MFG_SITES s ON u.site_id = s.site_id
            WHERE r.registration_id = ?
        `, [id]);
        
        res.json(mapRegistrationToDto(rows[0]));
    } catch (error) {
        console.error('updateRegistration error', error);
        res.status(500).json({ error: error.message });
    }
};

export const deleteRegistration = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM dbo.REGISTRATIONS WHERE registration_id = ?', [id]);
        res.json({ message: 'Deleted' });
    } catch (error) {
        console.error('deleteRegistration error', error);
        res.status(500).json({ error: error.message });
    }
};
