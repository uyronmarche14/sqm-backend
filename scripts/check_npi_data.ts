
import { db } from '../src/shared/infrastructure/db.js';
import { sql } from 'kysely';

async function run() {
  try {
    const countResult = await sql`SELECT COUNT(*) as count FROM NPI_LOTS`.execute(db);
    console.log('NPI_LOTS count:', countResult.rows[0]);
    
    const sampleResults = await sql`SELECT TOP 5 * FROM NPI_LOTS`.execute(db);
    console.log('Sample Records:', JSON.stringify(sampleResults.rows, null, 2));
  } catch (err) {
    console.error('Error querying NPI_LOTS:', err);
  }
  process.exit(0);
}
run();
