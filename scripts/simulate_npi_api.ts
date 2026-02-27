
import { npiService } from '../src/modules/npi/npi.service.js';
import { successResponse } from '../src/shared/utils/api-response.js';

async function run() {
  try {
    const records = await npiService.getAllRecords();
    const response = successResponse(records);
    console.log('Simulated API Response:', JSON.stringify(response, null, 2));
  } catch (err) {
    console.error('Error simulating API:', err);
  }
  process.exit(0);
}
run();
