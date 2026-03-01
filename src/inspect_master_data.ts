
import { Kysely, MssqlDialect } from 'kysely';
import * as Tarn from 'tarn';
import * as Tedious from 'tedious';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const dialect = new MssqlDialect({
  tarn: { ...Tarn, options: { max: 10, min: 0 } },
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

async function inspectData() {
  console.log('--- Inspecting MFG_AREAS ---');
  try {
    const areas = await db.selectFrom('MFG_AREAS').selectAll().execute();
    console.log(JSON.stringify(areas, null, 2));
  } catch (err: any) {
    console.log('ERROR: ' + err.message);
  }

  console.log('--- Inspecting MFG_SITES ---');
  try {
    const sites = await db.selectFrom('MFG_SITES').selectAll().execute();
    console.log(JSON.stringify(sites, null, 2));
  } catch (err: any) {
    console.log('ERROR: ' + err.message);
  }

  await db.destroy();
  process.exit(0);
}

inspectData();
