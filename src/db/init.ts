import { runEmptyBootstrap } from './bootstrap-empty.js';

console.warn('[db] init:db is deprecated. Use DB_BOOTSTRAP=YES npm run db:bootstrap:empty instead.');

runEmptyBootstrap('init:db')
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[db] Deprecated init:db failed:', error);
    process.exit(1);
  });
