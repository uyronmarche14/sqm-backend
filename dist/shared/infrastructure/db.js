import { Kysely } from 'kysely';
import { MssqlDialect } from 'kysely';
import dotenv from 'dotenv';
dotenv.config();
// Create Dialect ensuring connection to MSSQL
const dialect = new MssqlDialect({
    tarn: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
    tedious: {
        server: process.env.DB_HOST || 'localhost',
        authentication: {
            type: 'default',
            options: {
                userName: process.env.DB_USER || 'sa',
                password: process.env.DB_PASSWORD || '',
            },
        },
        options: {
            database: process.env.DB_NAME || 'sqm_db',
            port: parseInt(process.env.DB_PORT || '1433', 10),
            encrypt: process.env.DB_ENCRYPT === 'true',
            trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
        },
    },
});
// Main Database Client Instance (Fully Typed!)
export const db = new Kysely({
    dialect,
});
// Helper for connection testing
export async function testConnection() {
    try {
        // A simple query to test connection validity
        await db.selectFrom('USERS').select('user_id').limit(1).execute();
        console.log(`✅ Kysely Connected to MSSQL Database (${process.env.DB_NAME})`);
        return true;
    }
    catch (err) {
        console.error('❌ Database connection failed:', err);
        return false;
    }
}
