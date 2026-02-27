
import { db } from '../src/shared/infrastructure/db.js';
import { npiRepository } from '../src/modules/npi/npi.repository.js';
import { sql } from 'kysely';

async function run() {
  try {
    const allResult = await sql`SELECT npi_lot_id, control_no FROM NPI_LOTS`.execute(db);
    const allIds = allResult.rows.map((r: any) => r.npi_lot_id);
    console.log('Total IDs in DB:', allIds.length);

    const repoRecords = await npiRepository.findAllDetailed();
    const repoIds = repoRecords.map(r => r.npi_lot_id);
    console.log('Total IDs in Repo Result:', repoIds.length);

    const missing = allResult.rows.filter((r: any) => !repoIds.includes(r.npi_lot_id));
    console.log('Missing Records:', JSON.stringify(missing, null, 2));
    
    if (missing.length > 0) {
        // Inspect one missing record
        const sampleMissing = await sql`SELECT * FROM NPI_LOTS WHERE npi_lot_id = ${missing[0].npi_lot_id}`.execute(db);
        console.log('Sample Missing Record Data:', JSON.stringify(sampleMissing.rows[0], null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit(0);
}
run();
