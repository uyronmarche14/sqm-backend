import { sqmpService } from '../src/services/sqmp.service.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Environment Variables (for DB Connection)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TEST_USER_ID = '6a15b66a-079b-433b-b70f-dc15dce25631'; // Real User ID
const SITE_ID = '49356c06-ede4-404b-9930-3ca810dc3ef7';
const SUPP_ID = 'd403fba9-ce87-436a-b5f2-b0a41bf15da9';
const MODEL_ID = '4d3abac5-3e0e-49b9-852d-2ce83f537017';

async function runTest() {
    console.log('\n🔵 STARTING SQMP BACKEND TEST SIMULATION\n');

    try {
        // 1. Create Record with 1 File
        console.log('--- TEST STEP 1: CREATE RECORD ---');
        const newRecord = await sqmpService.createRecord({
            site_id: SITE_ID,
            supplier_id: SUPP_ID,
            attention_id: TEST_USER_ID, // Using User ID for attention
            fiscal_year: '2024',
            semester: '1ST',
            issued_date: new Date(),
            due_date: new Date(),
            model_id: MODEL_ID,
            remarks: 'Test Record from Script',
            main_documents: [
                {
                    file_name: 'test_spec.pdf',
                    file_extension: 'pdf',
                    remarks: 'Initial Specification'
                }
            ]
        }, TEST_USER_ID);

        const recordId = newRecord.sqmp_id;
        console.log(`\n✅ Created Record ID: ${recordId} (Control No: ${newRecord.control_no})\n`);

        // 2. Fetch to Verify
        console.log('--- TEST STEP 2: FETCH RECORD ---');
        const fetched = await sqmpService.getRecord(recordId);
        console.log(`✅ Fetched Record. Documents: ${fetched.main_documents.length}`);
        fetched.main_documents.forEach(d => console.log(`   - ${d.file_name}`));
        console.log('\n');

        // 3. Update Record (Add new file, remove old)
        console.log('--- TEST STEP 3: UPDATE RECORD (REPLACE FILES) ---');
        const updated = await sqmpService.updateRecord(recordId, {
            remarks: 'Updated Remarks',
            main_documents: [
                {
                    file_name: 'updated_spec_v2.pdf',
                    file_extension: 'pdf',
                    remarks: 'Version 2'
                },
                {
                    file_name: 'appendix_b.xlsx',
                    file_extension: 'xlsx',
                    remarks: 'Data Sheet'
                }
            ]
        }, TEST_USER_ID);
        
        console.log(`✅ Updated Record. Documents: ${updated.main_documents.length}`);
        updated.main_documents.forEach(d => console.log(`   - ${d.file_name}`));
        console.log('\n');

        // 4. Final Verification
        if (updated.main_documents.length === 2) {
            console.log('🟢 TEST PASSED: File handling logic verified.');
        } else {
            console.log('🔴 TEST FAILED: Document count mismatch.');
        }

    } catch (error) {
        console.error('🔴 TEST CRASHED:', error);
    } finally {
        console.log('\n🔵 END OF TEST SIMULATION');
        process.exit(0);
    }
}

runTest();
