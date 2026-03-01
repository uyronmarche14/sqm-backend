
import { Kysely, MssqlDialect } from 'kysely';
import * as Tarn from 'tarn';
import * as Tedious from 'tedious';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'sqm-backend/.env') });

const dialect = new MssqlDialect({
  tarn: {
    ...Tarn,
    options: { max: 10, min: 0, idleTimeoutMillis: 30000 }
  },
  tedious: {
    ...Tedious,
    connectionFactory: () => new Tedious.Connection({
      server: process.env.DB_HOST || '127.0.0.1',
      authentication: {
        type: 'default',
        options: {
          userName: process.env.DB_USER || 'sa',
          password: process.env.DB_PASSWORD || 'YourStrong!Pass123',
        },
      },
      options: {
        database: process.env.DB_NAME || 'master',
        port: parseInt(process.env.DB_PORT || '1433', 10),
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
      },
    }),
  },
});

const db = new Kysely<any>({ dialect });

async function checkTables() {
  const tables = [
    'MFG_SITES', 'MFG_AREAS', 'SUPPLIERS', 'MODELS', 'PRODUCTS', 
    'DEFECTCATEGORIES', 'DEFECTS', 'DISPOSITIONS', 'MNRTYPE', 'PARTS', 'USERS'
  ];

  console.log('--- Database Table Check (DB_NAME=' + process.env.DB_NAME + ') ---');
  for (const table of tables) {
    try {
      const result = await db.selectFrom(table)
        .select(({ fn }) => [fn.countAll().as('count')])
        .executeTakeFirst();
      console.log(`${table}: ${result?.count || 0} rows`);
    } catch (err: any) {
      console.log(`${table}: ERROR - ${err.message}`);
    }
  }
  await db.destroy();
  process.exit(0);
}

checkTables();
