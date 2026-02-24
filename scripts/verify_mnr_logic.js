import { createRecord, getAllRecords, getRecordById, deleteRecords } from '../src/controllers/mnr.controller.js';
import { v4 as uuidv4 } from 'uuid';
import db from '../src/config/db.js';

// Mock Express Objects
const mockRes = () => {
    return {
        statusCode: 200,
        headers: {},
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(data) {
            this.data = data;
            return this;
        },
        send(data) {
            this.data = data;
            return this;
        }
    };
};

const runTest = async () => {
    console.log('--- STARTING MNR LOGIC VERIFICATION ---');

    // 0. DIAGNOSE SCHEMA
    try {
        const pool = await db.getPool();
        const result = await pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES");
        console.log('\n--- 0. DIAGNOSTIC: Table List ---');
        console.log(result.recordset.map(r => r.TABLE_NAME).join(', '));
        
        const result2 = await pool.request().query("SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MNR_LOTS' AND COLUMN_NAME = 'request_status'");
        if (result2.recordset.length > 0) {
            console.log('request_status MAX LENGTH:', result2.recordset[0].CHARACTER_MAXIMUM_LENGTH);
        }
    } catch(e) {
        console.log('Diagnostic failed:', e.message);
    }

    let createdId = null;
    let dummyData = {};

    // 0.5. FETCH VALID MASTER DATA (FKs)
    let masterData = {};
    const pool = await db.getPool();

    try {
        const getOne = async (table, col) => {
             try {
                const res = await pool.request().query(`SELECT TOP 1 ${col} FROM ${table}`);
                return res.recordset.length > 0 ? res.recordset[0][col] : null;
             } catch (err) {
                // console.log(`Failed to fetch from ${table}: ${err.message}`);
                return null;
             }
        };

        masterData.siteId = await getOne('MFG_SITES', 'site_id');
        masterData.areaId = await getOne('MFG_AREAS', 'mfg_area_id');
        
        // If Site/Area missing, we are in trouble. Assuming they exist as per log.
        if (!masterData.siteId) console.warn('CRITICAL: MFG_SITES empty.');

        // Helper to Insert Dummy
        const ensureData = async (table, col, insertQuery) => {
            let val = await getOne(table, col);
            if (!val) {
                console.log(`Inserting Dummy into ${table}...`);
                const id = uuidv4();
                dummyData[table] = id; // Track for cleanup
                // Replace ? with params manually or just template string for test script simplicity
                // Using simple template string for IDs as they are trusted here
                const q = insertQuery.replace('__ID__', id).replace('__SITE__', masterData.siteId || '00000000-0000-0000-0000-000000000000');
                await pool.request().query(q);
                val = id;
            }
            return val;
        };

        masterData.productId = await ensureData('PRODUCTS', 'product_id', 
            `INSERT INTO PRODUCTS (product_id, product_name, site_id, product_code, active_flag, last_update, updateby) VALUES ('__ID__', 'Test Product', '__SITE__', 'TP-001', 1, GETDATE(), 'TEST')`);
        
        masterData.supplierId = await ensureData('SUPPLIERS', 'supplier_id', 
            `INSERT INTO SUPPLIERS (supplier_id, supplier_name, site_id, supplier_desc, active_flag, last_update, updateby) VALUES ('__ID__', 'Test Supplier', '__SITE__', 'SUP-DESC', 1, GETDATE(), 'TEST')`);
            
        // Models needs product_id
        masterData.modelId = await ensureData('MODELS', 'model_id', 
            `INSERT INTO MODELS (model_id, model_name, site_id, product_id, model_no, active_flag, last_update, updateby) VALUES ('__ID__', 'Test Model', '__SITE__', '${masterData.productId}', 'MDL-001', 1, GETDATE(), 'TEST')`);

        masterData.catId = await ensureData('DEFECTCATEGORIES', 'defectcategory_id', 
            `INSERT INTO DEFECTCATEGORIES (defectcategory_id, defectcategory_name, defectcategory_acronym, defectcategory_desc, active_flag, last_update, updateby) VALUES ('__ID__', 'Test Category', 'TC', 'Desc', 1, GETDATE(), 'TEST')`);
            
        masterData.typeId = await ensureData('MNRTYPE', 'mnrtype_id', 
            `INSERT INTO MNRTYPE (mnrtype_id, mnrtype_name, mnrtype_desc, active_flag, last_update, updateby) VALUES ('__ID__', 'Test Type', 'Desc', 1, GETDATE(), 'TEST')`);

        // Attention: Try Random UUID -> No, likely FK to Users. Will update after User fetched.
        masterData.attId = null; 
        // Check ROLES (Dependency for Users)
        masterData.roleId = await pool.request().query("SELECT TOP 1 role_id FROM ROLES").then(r => r.recordset.length > 0 ? r.recordset[0].role_id : null);
        
        if (!masterData.roleId) {
             const inspectRoles = await pool.request().query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ROLES'");
             const cols = inspectRoles.recordset.map(r => r.COLUMN_NAME);
             console.log('Columns for ROLES:', cols.join(', '));
             
             // Try to insert based on columns
             let colList = ['role_id', 'role_name', 'active_flag', 'last_update', 'updateby'];
             let valList = [`'${uuidv4()}'`, "'TEST_ROLE'", '1', 'GETDATE()', "'TEST'"];
             
             if (cols.includes('description')) { colList.push('description'); valList.push("'Test Role'"); }
             if (cols.includes('role_desc')) { colList.push('role_desc'); valList.push("'Test Role'"); }
             
             const q = `INSERT INTO ROLES (${colList.join(',')}) VALUES (${valList.join(',')})`;
             masterData.roleId = valList[0].replace(/'/g, ''); // Extract ID
             await pool.request().query(q);
        }
            
        // Check Users
        masterData.userId = await getOne('USERS', 'user_id');
        if (!masterData.userId) {
             console.log('Inserting Dummy USER...');
             const userId = uuidv4();
             // Schema: user_id, full_name, email, password, role_id, site_id, creation_date, active_flag, ...
             // Adding likely required fields: updateby, last_update, local_user
             const q = `INSERT INTO USERS (user_id, full_name, email, password, role_id, site_id, creation_date, active_flag, login_flag, local_user, last_update, updateby) 
                        VALUES ('${userId}', 'Test Audit', 'test@audit.com', 'password123', '${masterData.roleId}', '${masterData.siteId}', GETDATE(), 1, 1, 1, GETDATE(), 'TEST')`;
             
             try {
                await pool.request().query(q);
                masterData.userId = userId;
                dummyData['USERS'] = userId;
             } catch (err) {
                 console.error('Failed to insert Dummy User:', err.message);
             }
        }
        
        masterData.attId = masterData.userId; // Use valid User for Attention
        
        console.log('Final Master Data for Test:', masterData);

    } catch (e) {
        console.error('Failed to setup master data:', e.message);
        process.exit(1);
    }

    // 1. TEST CREATE
    console.log('\n--- 1. Testing Create Record ---');
    const createReq = {
        user: { id: masterData.userId || 'TEST_USER_AUDIT' }, // Use valid ID
        body: {
            mfgSites: masterData.siteId || 'TestSite',
            supplier: masterData.supplierId || 'TestSupplier',
            model: masterData.modelId || 'TestModel',
            productId: masterData.productId || 'TEST-PRODUCT-ID', // Required by Schema
            mfgAreas: masterData.areaId || 'TestArea',
            category: masterData.catId || 'TestCategory',
            mnrType: masterData.typeId || 'TestType',
            attention: masterData.attId || null, // Allow null
            issueDate: '2025-01-01',
            initialReport: '2025-01-02',
            dueDate: '2025-01-10',
            disposition_data: {
                rtv: { selected: true, qty: 5, remarks: 'Return to Vendor' },
                sort: { selected: true, sorted: 100, rejected: 10, rate: 0.1 }
            },
            nonConformity: {
                partsCode: 'PN-AUDIT',
                partsName: 'Part Audit',
                defectName: 'Defect Audit',
                ngQty: 5,
                ca: true
            },
            remarks: 'Audit Record Created by Script'
        }
    };
    const createRes = mockRes();
    await createRecord(createReq, createRes);
    
    if (createRes.statusCode === 201) {
        console.log('✅ Create Success:', createRes.data);
        createdId = createRes.data.id;
    } else {
        console.error('❌ Create Failed:', createRes.data);
        process.exit(1);
    }

    // 2. TEST GET ALL
    console.log('\n--- 2. Testing Get All Records ---');
    const listReq = { query: {} };
    const listRes = mockRes();
    await getAllRecords(listReq, listRes);
    
    if (listRes.data && listRes.data.data && Array.isArray(listRes.data.data)) {
        const found = listRes.data.data.find(r => r.id === createdId);
        if (found) {
            console.log('✅ Get All Success: Record found in list.');
            console.log('Sample Data:', JSON.stringify(found, null, 2));
        } else {
            console.error('❌ Get All Failed: Created record not found in list.');
            console.log('List Length:', listRes.data.data.length);
        }
    } else {
        console.error('❌ Get All Failed: Invalid response format', listRes.data);
    }

    // 3. TEST GET BY ID
    console.log('\n--- 3. Testing Get By ID ---');
    const getReq = { params: { id: createdId } };
    const getRes = mockRes();
    await getRecordById(getReq, getRes);

    if (getRes.statusCode !== 200 || !getRes.data.data) {
        console.error('❌ Get By ID Failed:', getRes.data);
    } else {
        const record = getRes.data.data;
        console.log('✅ Get By ID Success.');
        
        // Verify Disposition Mapping
        const disp = record.disposition;
        if (disp.rtv.selected && disp.rtv.qty === 5 && disp.sort.selected) {
             console.log('✅ Disposition Mapping Verified (Flattening works).');
        } else {
             console.error('❌ Disposition Mapping Mismatch:', JSON.stringify(disp, null, 2));
        }
    }

    // 4. CLEANUP (DELETE)
  

    console.log('\n--- VERIFICATION COMPLETE ---');
    process.exit(0);
};

runTest().catch(err => {
    console.error('Unhandled Error:', err);
    process.exit(1);
});
