
import { db } from './src/shared/infrastructure/db.js';
import { sql } from 'kysely';

async function inspectSchema() {
  try {
    const result = await sql`
      SELECT 
          COLUMN_NAME, 
          DATA_TYPE, 
          IS_NULLABLE, 
          CHARACTER_MAXIMUM_LENGTH,
          COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') AS IsIdentity
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TBL_5M1E_Application'
    `.execute(db);

    console.log('--- TBL_5M1E_Application Schema ---');
    console.log(JSON.stringify(result.rows, null, 2));

    const approvalResult = await sql`
      SELECT 
          COLUMN_NAME, 
          DATA_TYPE, 
          IS_NULLABLE, 
          CHARACTER_MAXIMUM_LENGTH,
          COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') AS IsIdentity
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TBL_5M1E_Approval'
    `.execute(db);

    console.log('--- TBL_5M1E_Approval Schema ---');
    console.log(JSON.stringify(approvalResult.rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error inspecting schema:', err);
    process.exit(1);
  }
}

inspectSchema();
