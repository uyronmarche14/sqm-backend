
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'sqm-backend/.env') });

const { db } = await import('../src/shared/infrastructure/db.js');

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
