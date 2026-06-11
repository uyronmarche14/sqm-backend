import { db } from '../shared/infrastructure/db.js';
import { runSafeMigrations } from './migrate-safe.js';

console.warn('[db] migrate is deprecated. Use npm run db:migrate:safe instead.');

runSafeMigrations('migrate')
  .then(async () => {
    await db.destroy();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('[db] Deprecated migrate failed:', error);
    await db.destroy();
    process.exit(1);
  });
