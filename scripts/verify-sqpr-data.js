
import { sqprService } from '../src/services/sqpr.service.js';
import db from '../src/config/db.js';

// Standardize Logging
const log = (msg) => console.log(`[VERIFY] ${msg}`);
const err = (msg) => console.error(`[ERROR] ${msg}`);

async function runTest() {
    log('🚀 Starting Full Data Flow Verification...');
    
    try {
        const pool = await db.getPool();
        log('✅ DB Connected');
        
        // 1. Fetch Real IDs to use
        let mockSupplierId = 'INVALID';
        let mockUserId = 'INVALID';
        let mockSiteId = 'INVALID';

        const suppRes = await pool.request().query('SELECT TOP 1 supplier_id FROM SUPPLIERS');
        if (suppRes.recordset.length) mockSupplierId = suppRes.recordset[0].supplier_id;

        const userRes = await pool.request().query('SELECT TOP 1 user_id FROM USERS');
        if (userRes.recordset.length) mockUserId = userRes.recordset[0].user_id;

        const siteRes = await pool.request().query('SELECT TOP 1 site_id FROM MFG_SITES');
        if (siteRes.recordset.length) mockSiteId = siteRes.recordset[0].site_id;

        log(`ℹ️ Test Data: Supplier=${mockSupplierId}, User=${mockUserId}, Site=${mockSiteId}`);

        // 2. Create Record
        log('👉 Step 1: Creating Record...');
        const payload = {
            site_id: mockSiteId,
            fiscal_year: 2025,
            report_type: 1,
            month: 12,
            supplier_id: mockSupplierId,
            attention_id: mockUserId,
            attention: 'Human Readable Check',
            remarks: 'Verification Robot',
            incharge_remarks: 'Init',
            attachments: [
                { file_name: 'Test_Cover.pdf', file_extension: 'pdf', attachment_type: 'COVER', remarks: 'Test Cover' },
                { file_name: 'Test_Appx.xlsx', file_extension: 'xlsx', attachment_type: 'APPENDIX', remarks: 'Test Appendix' }
            ]
        };

        const created = await sqprService.createRecord(payload, mockUserId);
        log(`✅ Created ID: ${created.sqpr_id}`);

        // 3. Verify Detail View (JOINs)
        log('👉 Step 2: Verifying Detail View (Human Readable)...');
        const detail = await sqprService.getRecord(created.sqpr_id);
        
        if (detail.attention !== 'Human Readable Check') throw new Error('Attention Text mismatch');
        if (!detail.supplier_name) log('⚠️ Warning: supplier_name is missing (Check JOIN)');
        else log(`✅ supplier_name: ${detail.supplier_name}`);
        
        if (!detail.attention_name) log('⚠️ Warning: attention_name is missing (Check JOIN)');
        else log(`✅ attention_name: ${detail.attention_name}`);

        // 4. Verify List View (getAllRecords) - USER REQUEST
        log('👉 Step 3: Verifying List View (Human Readable)...');
        const list = await sqprService.getAllRecords();
        const found = list.find(r => r.sqpr_id === created.sqpr_id);
        
        if (!found) throw new Error('Created record not found in List');
        
        if (!found.supplier_name) log('⚠️ List View: supplier_name missing');
        else log(`✅ List View: supplier_name verified (${found.supplier_name})`);

        if (!found.attention_name) log('⚠️ List View: attention_name missing');
        else log(`✅ List View: attention_name verified (${found.attention_name})`);

        // 5. Cleanup (Optional, but good practice)
        // await pool.request().query(`DELETE FROM SQPR WHERE sqpr_id = '${created.sqpr_id}'`);
        // log('🧹 Cleaned up test record');

        log('🎉 ALL CHECKS PASSED');
        
    } catch (e) {
        err(e.message);
        console.error(e);
        process.exitCode = 1;
    } finally {
        await db.close();
        log('👋 DB Closed');
    }
}

runTest();
