import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ROOT_DATABASE_DIR,
  TARGET_DB,
  countBaseTables,
  ensureDatabaseExists,
  executeBatches,
  getBootstrapAllowedForNonLocalTarget,
  isLocalDatabaseTarget,
  isYes,
  logDb,
  readLegacySchemaBatchesForSingleTarget,
  waitForSqlServer,
  withPool,
} from './lib/db-safety.js';

const __filename = fileURLToPath(import.meta.url);

const BOOTSTRAP_SOURCES = [
  {
    expectedDb: 'SQM',
    filePath: path.join(ROOT_DATABASE_DIR, 'script 1.sql'),
  },
  {
    expectedDb: '5M1EApprovalDB',
    filePath: path.join(ROOT_DATABASE_DIR, 'script.sql'),
  },
];

export async function runEmptyBootstrap(invocation = 'db:bootstrap:empty') {
  if (!isYes(process.env.DB_BOOTSTRAP)) {
    logDb(`${invocation}: skipped because DB_BOOTSTRAP is not YES.`);
    return;
  }

  if (!isLocalDatabaseTarget() && !getBootstrapAllowedForNonLocalTarget()) {
    throw new Error(
      `Refusing to bootstrap non-local database target ${process.env.DB_HOST}. Set DB_ALLOW_NONLOCAL_BOOTSTRAP=YES only if you intentionally want to run this command.`,
    );
  }

  logDb(`${invocation}: waiting for SQL Server...`);
  await waitForSqlServer();

  const created = await ensureDatabaseExists(TARGET_DB);
  logDb(created ? `Created database ${TARGET_DB}.` : `Database ${TARGET_DB} already exists.`);

  const tableCount = await countBaseTables(TARGET_DB);
  if (tableCount > 0) {
    throw new Error(
      `${invocation}: target database ${TARGET_DB} is not empty (${tableCount} base table(s) found). Empty-db bootstrap only runs on a clean database.`,
    );
  }

  await withPool(TARGET_DB, async (pool) => {
    for (const source of BOOTSTRAP_SOURCES) {
      const batches = await readLegacySchemaBatchesForSingleTarget({
        filePath: source.filePath,
        expectedDb: source.expectedDb,
        targetDb: TARGET_DB,
      });

      logDb(`${invocation}: applying ${batches.length} sanitized batch(es) from ${path.basename(source.filePath)}.`);
      await executeBatches(pool, batches, path.basename(source.filePath));
    }
  });

  logDb(`${invocation}: legacy baseline schema applied successfully to ${TARGET_DB}.`);
}

const isDirectInvocation = process.argv[1] === __filename;

if (isDirectInvocation) {
  runEmptyBootstrap()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('[db] Bootstrap failed:', error);
      process.exit(1);
    });
}
