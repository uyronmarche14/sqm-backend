import { db } from './src/shared/infrastructure/db.js';

async function run() {
  const res = await db.selectFrom('PRODUCTS').selectAll().where('product_id', '=', '521ec615-1eab-4cca-ad98-b2dc2671b22d').execute();
  console.log('PRODUCTS matching UUID:', res);
  process.exit(0);
}
run();
