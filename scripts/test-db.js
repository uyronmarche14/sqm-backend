
import { getPool, close } from '../src/config/db.js';

async function testConnection() {
    console.log('🔌 Testing DB Connection...');
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT 1 as val');
        console.log('✅ Connection Successful. Value:', result.recordset[0].val);
        await close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection Failed:', error);
        await close();
        process.exit(1);
    }
}

testConnection();
