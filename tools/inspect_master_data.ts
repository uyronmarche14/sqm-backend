
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'sqm-backend/.env') });

const { db } = await import('../src/shared/infrastructure/db.js');

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
