import { sqmpService } from './src/modules/sqmp/sqmp.service.js';

async function check() {
  console.log("--- fetching status: issued ---");
  const records = await sqmpService.getAllRecords('issued');
  console.log('Result length:', records.length);
  if (records.length > 0) {
      console.log('Sample record status:', records[0].status);
  }
  
  console.log("\n--- fetching status: ALL (undefined) ---");
  const all = await sqmpService.getAllRecords();
  console.log('Result length:', all.length);
  
  console.log("\n--- fetching status: draft ---");
  const draft = await sqmpService.getAllRecords('draft');
  console.log('Result length:', draft.length);

  process.exit(0);
}

check().catch(console.error);
