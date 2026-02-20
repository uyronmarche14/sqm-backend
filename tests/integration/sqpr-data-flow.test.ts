
import { describe, it, expect, beforeAll } from 'vitest';
import { sqprService } from '../../src/services/sqpr.service';
import { getPool } from '../../src/config/db';

// Mock Data
let MOCK_USER_ID = 'test-user-id';
const MOCK_SITE_ID = 'test-site-id';
let MOCK_SUPPLIER_ID = 'test-supplier-id';
let MOCK_ATTENTION_ID = 'test-attention-id'; // Assume this is a User ID

describe('SQPR Data Flow Integration Test', () => {
    let createdSqprId: string;

    beforeAll(async () => {
        const pool = await getPool();
        
        // Fetch Real IDs for meaningful test
        const supplierRes = await pool.request().query('SELECT TOP 1 supplier_id FROM SUPPLIERS');
        if (supplierRes.recordset.length > 0) {
            MOCK_SUPPLIER_ID = supplierRes.recordset[0].supplier_id;
            console.log('🧪 Using Real Supplier ID:', MOCK_SUPPLIER_ID);
        }

        const userRes = await pool.request().query('SELECT TOP 1 user_id FROM USERS');
        if (userRes.recordset.length > 0) {
            MOCK_ATTENTION_ID = userRes.recordset[0].user_id;
            console.log('🧪 Using Real User ID (Attention):', MOCK_ATTENTION_ID);
        }
    });

    it('should create an SQPR record with Supplier and Attention data', async () => {
        const payload = {
            site_id: MOCK_SITE_ID,
            fiscal_year: 2025,
            report_type: 1, // Monthly
            month: 5,
            supplier_id: MOCK_SUPPLIER_ID,
            attention_id: MOCK_ATTENTION_ID,
            attention: 'Mr. Test Attention',
            remarks: 'Integration Test Record',
            incharge_remarks: 'Initial remarks'
        };

        const result = await sqprService.createRecord(payload, MOCK_USER_ID);
        
        expect(result).toBeDefined();
        expect(result.sqpr_id).toBeDefined();
        expect(result.supplier_id).toBe(MOCK_SUPPLIER_ID);
        expect(result.attention_id).toBe(MOCK_ATTENTION_ID);
        expect(result.attention).toBe('Mr. Test Attention');
        
        createdSqprId = result.sqpr_id;
        console.log('✅ Created SQPR ID:', createdSqprId);
    });

    it('should retrieve Human Readable data (JOINs)', async () => {
        const record = await sqprService.getRecord(createdSqprId);
        
        expect(record).toBeDefined();
        expect(record.sqpr_id).toBe(createdSqprId);
        
        // Data Integrity Check
        expect(record.supplier_id).toBe(MOCK_SUPPLIER_ID);
        expect(record.attention_id).toBe(MOCK_ATTENTION_ID);
        expect(record.attention).toBe('Mr. Test Attention');

        // Human Readable Check (Note: In a real DB with these IDs lacking valid foreign keys, names might be null, BUT the field should exist in the response object)
        // If these IDs don't exist in master tables, the JOIN returns NULL for name. 
        // We assert the PROPERTY exists to verify the QUERY structure.
        expect(record).toHaveProperty('supplier_name');
        expect(record).toHaveProperty('attention_name'); 
        
        console.log('✅ Retrieved Human Readable Fields:', {
            supplier_name: record.supplier_name,
            attention_name: record.attention_name
        });
    });

    it('should update the record and persist changes', async () => {
        const updatePayload = {
            attention: 'Updated Attention Name',
            remarks: 'Updated Remarks'
        };

        const updated = await sqprService.updateRecord(createdSqprId, updatePayload, MOCK_USER_ID);
        
        expect(updated).toBeDefined();
        expect(updated.attention).toBe('Updated Attention Name');
        expect(updated.remarks).toBe('Updated Remarks');
        
        // Verify Persistence
        const fetched = await sqprService.getRecord(createdSqprId);
        expect(fetched.attention).toBe('Updated Attention Name');
        expect(fetched.remarks).toBe('Updated Remarks');
        
        console.log('✅ Update Verified');
    });
});
