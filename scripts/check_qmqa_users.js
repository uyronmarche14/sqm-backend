/**
 * Diagnostic script: Check which QMQA user IDs exist in the USERS table
 * Run with: node scripts/check_qmqa_users.js
 */
import { db } from '../src/shared/infrastructure/db.js';

const userIds = [
  { field: 'userId (encoder/issuer)', id: '6a15b66a-079b-433b-b70f-dc15dce25631' },
  { field: 'checker_id / approver_id', id: 'a4490ff8-92b0-42f7-a654-8757a1c7d020' },
  { field: 'attention_id', id: 'a678a92e-ea46-4216-9dc0-652938f61476' },
  { field: 'pic_auditor_id', id: '09cf5b0c-e754-4b6a-ba73-ad9011f90495' },
];

async function check() {
  console.log('=== QMQA User ID Validation ===\n');
  
  for (const { field, id } of userIds) {
    try {
      const result = await db.selectFrom('USERS')
        .select(['user_id', 'full_name'])
        .where('user_id', '=', id)
        .executeTakeFirst();
      
      if (result) {
        console.log(`✅ ${field}: ${id} → Found: ${result.full_name}`);
      } else {
        console.log(`❌ ${field}: ${id} → NOT FOUND IN USERS TABLE!`);
      }
    } catch (e) {
      console.error(`⚠️ ${field}: ${id} → Error:`, e.message);
    }
  }

  // Also check which FK constraints exist on QMQA table
  console.log('\n=== FK Constraints on QMQA ===\n');
  try {
    const fks = await db.selectFrom('INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS as rc')
      .innerJoin('INFORMATION_SCHEMA.KEY_COLUMN_USAGE as kcu', 'rc.CONSTRAINT_NAME', 'kcu.CONSTRAINT_NAME')
      .select(['rc.CONSTRAINT_NAME', 'kcu.COLUMN_NAME', 'rc.UNIQUE_CONSTRAINT_NAME'])
      .where('kcu.TABLE_NAME', '=', 'QMQA')
      .execute();
    
    for (const fk of fks) {
      console.log(`  ${fk.CONSTRAINT_NAME} → column: ${fk.COLUMN_NAME}`);
    }
  } catch (e) {
    console.error('Could not query FK constraints:', e.message);
  }

  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
