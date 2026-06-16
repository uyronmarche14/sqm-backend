
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sqprService } from '../../src/modules/sqpr/sqpr.service.js';
import { getPool } from '../../src/config/db';

let MOCK_USER_ID = 'test-user-id';
let MOCK_SITE_ID = 'test-site-id';
let MOCK_SUPPLIER_ID = 'test-supplier-id';
let MOCK_ATTENTION_ID = 'test-attention-id';

describe('SQPR Data Flow Integration Test', () => {
    let createdSqprId: string;

    beforeAll(async () => {
        const pool = await getPool();

        const supplierRes = await pool.request().query('SELECT TOP 1 supplier_id FROM SUPPLIERS');
        if (supplierRes.recordset.length > 0) {
            MOCK_SUPPLIER_ID = supplierRes.recordset[0].supplier_id;
            console.log('Using Real Supplier ID:', MOCK_SUPPLIER_ID);
        }

        const userRes = await pool.request().query('SELECT TOP 1 user_id FROM USERS');
        if (userRes.recordset.length > 0) {
            MOCK_USER_ID = userRes.recordset[0].user_id;
            MOCK_ATTENTION_ID = userRes.recordset[0].user_id;
            console.log('Using Real User ID:', MOCK_USER_ID);
        }

        const siteRes = await pool.request().query('SELECT TOP 1 site_id FROM MFG_SITES');
        if (siteRes.recordset.length > 0) {
            MOCK_SITE_ID = siteRes.recordset[0].site_id;
            console.log('Using Real Site ID:', MOCK_SITE_ID);
        }
    });

    it('should create an SQPR record with Supplier and Attention data', async () => {
        const payload = {
            site_id: MOCK_SITE_ID,
            fiscal_year: 2025,
            report_type: 1,
            month: 5,
            supplier_id: MOCK_SUPPLIER_ID,
            attention_id: MOCK_ATTENTION_ID,
            attention: 'Mr. Test Attention',
            remarks: 'Integration Test Record',
            incharge_remarks: 'Initial remarks'
        };

        const result = await sqprService.createRecord(payload, MOCK_USER_ID, []);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        expect(result.data.sqpr_id).toBeDefined();
        expect(result.data.supplier_id).toBe(MOCK_SUPPLIER_ID);
        expect(result.data.attention_id).toBe(MOCK_ATTENTION_ID);
        expect(result.data.attention).toBe('Mr. Test Attention');

        createdSqprId = result.data.sqpr_id;
        console.log('Created SQPR ID:', createdSqprId);
    });

    it('should retrieve Human Readable data (JOINs)', async () => {
        const record = await sqprService.getRecordById(createdSqprId, { userId: MOCK_USER_ID });

        expect(record).toBeDefined();
        expect(record.sqpr_id).toBe(createdSqprId);

        expect(record.supplier_id).toBe(MOCK_SUPPLIER_ID);
        expect(record.attention_id).toBe(MOCK_ATTENTION_ID);
        expect(record.attention).toBe('Mr. Test Attention');

        expect(record).toHaveProperty('supplier_name');
        expect(record).toHaveProperty('attention_name');

        console.log('Retrieved Human Readable Fields:', {
            supplier_name: record.supplier_name,
            attention_name: record.attention_name
        });
    });

    it('should update the record and persist changes', async () => {
        const updatePayload = {
            attention: 'Updated Attention Name',
            remarks: 'Updated Remarks'
        };

        const updated = await sqprService.updateRecord(createdSqprId, updatePayload, { userId: MOCK_USER_ID }, []);

        expect(updated).toBeDefined();
        expect(updated.success).toBe(true);
        expect(updated.data.attention).toBe('Updated Attention Name');
        expect(updated.data.remarks).toBe('Updated Remarks');

        const fetched = await sqprService.getRecordById(createdSqprId, { userId: MOCK_USER_ID });
        expect(fetched.attention).toBe('Updated Attention Name');
        expect(fetched.remarks).toBe('Updated Remarks');

        console.log('Update Verified');
    });

    afterAll(async () => {
        if (createdSqprId) {
            try {
                await sqprService.deleteRecord(createdSqprId, { userId: MOCK_USER_ID });
                console.log('Cleaned up SQPR record:', createdSqprId);
            } catch (err) {
                console.warn('Cleanup skipped:', err instanceof Error ? err.message : err);
            }
        }
    });
});
