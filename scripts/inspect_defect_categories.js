
import db from '../src/config/db.js';

async function checkDefectCategories() {
    try {
        const pool = await db.getPool();
        console.log('--- DEFECTCATEGORIES ---');
        const result = await pool.request().query('SELECT * FROM DEFECTCATEGORIES');
        console.log(JSON.stringify(result.recordset, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkDefectCategories();
