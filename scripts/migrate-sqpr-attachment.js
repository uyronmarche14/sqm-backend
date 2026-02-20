import { sql, getPool, close } from '../src/config/db.js';

async function migrate() {
    console.log('🔄 Starting SQPR Schema Migration...');
    try {
        const pool = await getPool();
        
        // 1. Helper to check if column exists
        const checkColumn = async (table, column) => {
            const result = await pool.request().query(`
                SELECT CASE WHEN EXISTS (
                    SELECT 1 FROM sys.columns 
                    WHERE Name = N'${column}' 
                    AND Object_ID = Object_ID(N'dbo.${table}')
                ) THEN 1 ELSE 0 END as ExistsVal
            `);
            return result.recordset[0].ExistsVal === 1;
        };

        // 2. Add 'attachment_type' to SQPR_ATTACHMENT
        const hasType = await checkColumn('SQPR_ATTACHMENT', 'attachment_type');
        if (!hasType) {
            console.log('🛠️ Adding column [attachment_type] to [SQPR_ATTACHMENT]...');
            await pool.request().query(`
                ALTER TABLE SQPR_ATTACHMENT 
                ADD attachment_type nvarchar(20) NULL
            `);
            console.log('✅ Column added successfully.');
        } else {
            console.log('ℹ️ Column [attachment_type] already exists in [SQPR_ATTACHMENT].');
        }

        console.log('✅ Migration Complete.');

    } catch (error) {
        console.error('❌ Migration Failed:', error);
    } finally {
        await close();
    }
}

migrate();
