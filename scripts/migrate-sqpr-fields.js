
import { getPool, sql } from '../src/config/db.js';

async function migrate() {
    console.log('🚀 Starting SQPR Schema Migration...');
    
    try {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        
        await transaction.begin();
        console.log('✅ Transaction started');

        const request = new sql.Request(transaction);

        // 1. Check and Add supplier_id
        console.log('Checking supplier_id...');
        const checkSupplier = await request.query(`
            SELECT COL_LENGTH('SQPR', 'supplier_id') as col_len;
        `);
        
        if (checkSupplier.recordset[0].col_len === null) {
            console.log('➕ Adding supplier_id column...');
            await request.query(`ALTER TABLE SQPR ADD supplier_id nvarchar(72) NULL;`);
        } else {
            console.log('ℹ️ supplier_id already exists.');
        }

        // 2. Check and Add attention_id
        console.log('Checking attention_id...');
        const checkAttentionId = await request.query(`
            SELECT COL_LENGTH('SQPR', 'attention_id') as col_len;
        `);
        
        if (checkAttentionId.recordset[0].col_len === null) {
            console.log('➕ Adding attention_id column...');
            await request.query(`ALTER TABLE SQPR ADD attention_id nvarchar(72) NULL;`);
        } else {
            console.log('ℹ️ attention_id already exists.');
        }

        // 3. Check and Add attention (text)
        console.log('Checking attention...');
        const checkAttention = await request.query(`
            SELECT COL_LENGTH('SQPR', 'attention') as col_len;
        `);
        
        if (checkAttention.recordset[0].col_len === null) {
            console.log('➕ Adding attention column...');
            await request.query(`ALTER TABLE SQPR ADD attention nvarchar(255) NULL;`);
        } else {
            console.log('ℹ️ attention already exists.');
        }

        await transaction.commit();
        console.log('✅ Migration completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
