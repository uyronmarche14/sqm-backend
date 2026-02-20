import db from './src/config/db.js';

async function listAuditCategories() {
  try {
    const [rows] = await db.query('SELECT * FROM dbo.AUDITCATEGORY');
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error fetching audit categories:', error.message);
    process.exit(1);
  }
}

listAuditCategories();
