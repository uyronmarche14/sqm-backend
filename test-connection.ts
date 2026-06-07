import { testConnection } from './src/shared/infrastructure/db.js';

(async () => {
  const ok = await testConnection();
  console.log(ok ? 'CONNECTION_OK' : 'CONNECTION_FAILED');
  process.exit(ok ? 0 : 1);
})();
