
import { sqprService } from '../src/services/sqpr.service.js';
import db from '../src/config/db.js';

console.log('📜 Reading SQPR Records...');

async function readTest() {
    try {
        await db.getPool();
        console.log('✅ DB Connected');

        const list = await sqprService.getAllRecords();
        console.log(`📋 Found ${list.length} records.`);

        if (list.length > 0) {
            const first = list[0];
            console.log('🔍 First Record:', {
                id: first.sqpr_id,
                supplier_name: first.supplier_name,
                attention_name: first.attention_name,
                incharge_name: first.incharge_name
            });

            if (first.supplier_name) console.log('✅ Supplier Name Detected');
            else console.log('⚠️ Supplier Name Missing (might be null in DB)');
            
            if (first.attention_name) console.log('✅ Attention Name Detected');
            else console.log('⚠️ Attention Name Missing');
        } else {
            console.log('⚠️ No records to verify.');
        }

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await db.close();
        console.log('👋 Done');
    }
}

readTest();
