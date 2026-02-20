import { sql, getPool, close } from '../src/config/db.js';

async function checkTypes() {
    console.log('🔍 Checking Attachment Types...');
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT TOP 5 sqpr_attachment_id, file_name, attachment_type, last_update 
            FROM SQPR_ATTACHMENT 
            ORDER BY last_update DESC
        `);
        console.log('📊 Recent Attachments:');
        console.table(result.recordset);
    } catch (error) {
        console.error('❌ Check Failed:', error);
    } finally {
        await close();
    }
}

checkTypes();
