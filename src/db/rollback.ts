import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql } from 'kysely';

import { db } from '../shared/infrastructure/db.js';
import { getMigrationAllowedForNonLocalTarget, isLocalDatabaseTarget, logDb } from './lib/db-safety.js';
import {
  ensureMigrationsTable,
  getLastAppliedMigration,
  removeMigrationRecord,
  splitSqlBatches,
} from './lib/migration-utils.js';

const __filename = fileURLToPath(import.meta.url);

async function findDownMigrationFilePath(upFileName: string): Promise<string | null> {
  const downFileName = upFileName.replace(/\.sql$/, '.down.sql');

  // Check in migrations/ directory
  const migrationDir = path.join(path.dirname(__filename), 'migrations');
  const migrationPath = path.join(migrationDir, downFileName);
  if (fs.existsSync(migrationPath)) {
    return migrationPath;
  }

  // Check in legacy/ directory
  const legacyDir = path.join(path.dirname(__filename), 'legacy');
  const legacyPath = path.join(legacyDir, downFileName);
  if (fs.existsSync(legacyPath)) {
    return legacyPath;
  }

  // Check in db-assets/manual-migrations/ directory
  const manualMigDir = path.join(path.dirname(__filename), '..', '..', 'db-assets', 'manual-migrations');
  const manualPath = path.join(manualMigDir, downFileName);
  if (fs.existsSync(manualPath)) {
    return manualPath;
  }

  return null;
}

async function executeDownMigration(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const batches = splitSqlBatches(content);

  for (const batch of batches) {
    await sql.raw(batch).execute(db);
  }
}

export async function runRollback(invocation = 'db:rollback') {
  if (!isLocalDatabaseTarget() && !getMigrationAllowedForNonLocalTarget()) {
    throw new Error(
      `Refusing to rollback on non-local database target ${process.env.DB_HOST}. Set DB_ALLOW_NONLOCAL_MIGRATE=YES only if this is intentional.`,
    );
  }

  logDb(`${invocation}: ensuring migrations table...`);
  await ensureMigrationsTable();

  const lastMigration = await getLastAppliedMigration();
  if (!lastMigration) {
    logDb(`${invocation}: no applied migrations found to roll back.`);
    return;
  }

  logDb(`${invocation}: last applied migration is "${lastMigration}".`);

  const downPath = await findDownMigrationFilePath(lastMigration);
  if (!downPath) {
    throw new Error(
      `${invocation}: no down migration file found for "${lastMigration}". ` +
        `Create a "${lastMigration.replace(/\.sql$/, '.down.sql')}" file to enable rollback.`,
    );
  }

  logDb(`${invocation}: found down migration at ${path.basename(downPath)}.`);
  logDb(`${invocation}: applying down migration "${path.basename(downPath)}"...`);

  try {
    await executeDownMigration(downPath);
    await removeMigrationRecord(lastMigration);
    logDb(`${invocation}: rollback complete. Removed migration record for "${lastMigration}".`);
  } catch (error) {
    logDb(`${invocation}: ROLLBACK FAILED. Database may be in an inconsistent state.`);
    throw error;
  }
}

const isDirectInvocation = process.argv[1] === __filename;

if (isDirectInvocation) {
  runRollback()
    .then(async () => {
      await db.destroy();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('[db] Rollback failed:', error);
      await db.destroy();
      process.exit(1);
    });
}
