import { Kysely, MssqlDialect, sql } from 'kysely';
import * as Tarn from 'tarn';
import * as Tedious from 'tedious';
import dotenv from 'dotenv';
import { Database } from './db.types.js';

dotenv.config();

// Create Dialect ensuring connection to MSSQL
const dialect = new MssqlDialect({
  tarn: {
    ...Tarn,
    options: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    }
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
        database: process.env.DB_NAME || 'sqm_db',
        port: parseInt(process.env.DB_PORT || '1433', 10),
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
      },
    }),
  },
});

// Main Database Client Instance (Fully Typed!)
export const db = new Kysely<Database>({
  dialect,
});

// Helper for connection testing
export async function testConnection() {
  try {
    // A simple query to test connection validity universally safely across MSSQL versions
    await sql`SELECT 1 as result`.execute(db);
    console.log(`✅ Kysely Connected to MSSQL Database (${process.env.DB_NAME})`);
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    return false;
  }
}
