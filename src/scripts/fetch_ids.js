import db from '../config/db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function fetchIds() {
    try {
        const pool = await db.getPool();
        
        const sites = await pool.request().query('SELECT TOP 1 site_id FROM MFG_SITES');
        const suppliers = await pool.request().query('SELECT TOP 1 supplier_id FROM SUPPLIERS');
        const models = await pool.request().query('SELECT TOP 1 model_id FROM MODELS');
        // Attention ID is usually a user or contact. existing schema says nvarchar(72). 
        // Let's assume it might be a user_id or just a string. 
        // Let's check USERS for a valid user ID to Use as test user too.
        const users = await pool.request().query('SELECT TOP 1 user_id FROM USERS');

        console.log('VALID_IDS:', {
            site_id: sites.recordset[0]?.site_id,
            supplier_id: suppliers.recordset[0]?.supplier_id,
            model_id: models.recordset[0]?.model_id,
            user_id: users.recordset[0]?.user_id
        });
        
    } catch (err) {
        console.error('Failed to fetch IDs:', err);
    } finally {
        process.exit();
    }
}

fetchIds();
