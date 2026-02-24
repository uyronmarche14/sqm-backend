import db from '../src/config/db.js';

async function migrate() {
    try {
        const pool = await db.getPool();
        console.log('🔄 Adding original_name col to OGI_ATTACHMENT...');

        // Check if column exists
        const check = await pool.query(`
            SELECT 1 FROM sys.columns 
            WHERE Name = N'original_name' 
            AND Object_ID = Object_ID(N'dbo.OGI_ATTACHMENT')
        `);
        
        if (check.recordset.length === 0) {
            console.log('➕ Adding original_name to OGI_ATTACHMENT...');
            await pool.query('ALTER TABLE dbo.OGI_ATTACHMENT ADD original_name NVARCHAR(255) NULL');
        } else {
            console.log('✅ OGI_ATTACHMENT.original_name already exists.');
        }

        console.log('🎉 Migration complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
