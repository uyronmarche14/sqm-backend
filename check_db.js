
import { db } from './src/shared/infrastructure/db.js';

async function checkRecords() {
  const counts = await db.selectFrom('QMQA')
    .select(['request_status', db.fn.count('qmqa_id').as('count')])
    .groupBy('request_status')
    .execute();
  
  console.log('QMQA Status Counts:');
  console.log(JSON.stringify(counts, null, 2));

  const acceptRecords = await db.selectFrom('QMQA')
    .where('request_status', '=', '1')
    .select(['qmqa_id', 'request_status', 'created_date'])
    .limit(5)
    .execute();
  
  console.log('\nSample records with status 1:');
  console.log(JSON.stringify(acceptRecords, null, 2));
}

checkRecords().catch(console.error).finally(() => process.exit());
