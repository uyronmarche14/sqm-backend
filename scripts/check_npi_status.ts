
import { db } from '../src/shared/infrastructure/db.js';
import { sql } from 'kysely';

async function run() {
  try {
    const statusStats = await db.selectFrom('NPI_LOTS')
      .select(['request_status', db.fn.count('npi_lot_id').as('count')])
      .groupBy('request_status')
      .execute();
    console.log('Status Distribution:', JSON.stringify(statusStats, null, 2));
  } catch (err) {
    console.error('Error querying status stats:', err);
  }
  process.exit(0);
}
run();
