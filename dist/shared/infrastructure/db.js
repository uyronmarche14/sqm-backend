import { Kysely, MssqlDialect, sql } from 'kysely';
import * as Tarn from 'tarn';
import * as Tedious from 'tedious';
import dotenv from 'dotenv';
dotenv.config({ quiet: process.env.NODE_ENV === 'test' });
const dialect = new MssqlDialect({
    tarn: {
        ...Tarn,
        options: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
        },
    },
    tedious: {
        ...Tedious,
        connectionFactory: () => new Tedious.Connection({
            server: process.env.DB_HOST || 'localhost',
            authentication: {
                type: 'default',
                options: {
                    userName: process.env.DB_USER || 'sa',
                    password: process.env.DB_PASSWORD || '',
                },
            },
            options: {
                database: process.env.DB_NAME || 'sqm',
                port: parseInt(process.env.DB_PORT || '1433', 10),
                encrypt: process.env.DB_ENCRYPT === 'true',
                trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
            },
        }),
    },
});
export const db = new Kysely({
    dialect,
    log(event) {
        if (event.level === 'query') {
            if (process.env.NODE_ENV !== 'production') {
                const sqlStr = event.query.sql.toLowerCase();
                if (sqlStr.startsWith('insert') ||
                    sqlStr.startsWith('update') ||
                    sqlStr.startsWith('delete')) {
                    console.info(`[Backend] Saving data to database:`, event.query.sql);
                }
            }
        }
        else if (event.level === 'error') {
            console.error('[Backend] Database error:', event.error);
        }
    },
});
export async function testConnection() {
    try {
        await sql `SELECT 1 as result`.execute(db);
        console.log(`✅ Kysely Connected to MSSQL Database (${process.env.DB_NAME})`);
        return true;
    }
    catch (err) {
        console.error('❌ Database connection failed:', err);
        return false;
    }
}
