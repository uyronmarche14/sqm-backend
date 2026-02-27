
import { npiRepository } from '../src/modules/npi/npi.repository.js';

async function run() {
  try {
    const records = await npiRepository.findAllDetailed();
    console.log('Repository findAllDetailed() count:', records.length);
    if (records.length > 0) {
      console.log('First record:', JSON.stringify(records[0], null, 2));
    }
  } catch (err) {
    console.error('Error in findAllDetailed():', err);
  }
  process.exit(0);
}
run();
