
import { db } from '../src/shared/infrastructure/db.js';
import { mnrService } from '../src/modules/mnr/mnr.service.js';

async function testUpdateByControlNo() {
    try {
        // 1. Get a record to test with
        const record = await db.selectFrom('MNR_LOTS').select(['mnr_id', 'control_no', 'request_status']).executeTakeFirst();
        if (!record) {
            console.log('No records found to test.');
            return;
        }

        console.log(`Original Record: ID=${record.mnr_id}, ControlNo=${record.control_no}, Status=${record.request_status}`);

        // 2. Try to update via Control No
        const targetStatus = record.request_status === 'SU' ? 'AAPPROVAL' : 'SUBMITTED';
        console.log(`Attempting update via ControlNo: ${record.control_no} to status: ${targetStatus}`);
        const result = await mnrService.updateRecord(record.control_no, { status: targetStatus }, 'SYSTEM');
        console.log('Update Result:', JSON.stringify(result));

        // 3. Verify status
        const updated = await db.selectFrom('MNR_LOTS').select(['request_status']).where('mnr_id', '=', record.mnr_id).executeTakeFirst();
        console.log(`New Status: ${updated?.request_status}`);

        if (updated?.request_status === record.request_status) {
            console.log('FAILURE: Status did not change!');
        } else {
            console.log('SUCCESS: Status changed (Wait, what? Maybe it works?)');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

testUpdateByControlNo();
