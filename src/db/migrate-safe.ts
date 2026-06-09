import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { db } from '../shared/infrastructure/db.js';
import { getMigrationAllowedForNonLocalTarget, isLocalDatabaseTarget, logDb } from './lib/db-safety.js';
import {
  ensureMigrationsTable,
  getSafeMigrationFiles,
  isMigrationApplied,
  recordMigration,
  executeMigration,
} from './lib/migration-utils.js';

const __filename = fileURLToPath(import.meta.url);

const SAFE_MIGRATION_FILES = getSafeMigrationFiles();

export async function runSafeMigrations(invocation = 'db:migrate:safe') {
  if (!isLocalDatabaseTarget() && !getMigrationAllowedForNonLocalTarget()) {
    throw new Error(
      `Refusing to run migrations on non-local database target ${process.env.DB_HOST}. Set DB_ALLOW_NONLOCAL_MIGRATE=YES only if this is intentional.`,
    );
  }

  await ensureMigrationsTable();

  let applied = 0;
  let skipped = 0;
  const toApply: string[] = [];

  for (const filePath of SAFE_MIGRATION_FILES) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Safe migration file not found: ${filePath}`);
    }

    const name = path.basename(filePath);
    if (await isMigrationApplied(name)) {
      skipped += 1;
      continue;
    }

    toApply.push(filePath);
  }

  if (toApply.length === 0) {
    logDb(`${invocation}: all ${SAFE_MIGRATION_FILES.length} migrations already applied (${skipped} skipped).`);
    return;
  }

  logDb(`${invocation}: ${toApply.length} migration(s) to apply, ${skipped} already applied.`);
  logDb(`${invocation}: ensure a database backup exists before proceeding. To rollback, create .down.sql files and run db:rollback.`);

  for (const filePath of toApply) {
    const name = path.basename(filePath);
    logDb(`${invocation}: applying ${name}...`);
    await executeMigration(filePath);
    await recordMigration(name);
    applied += 1;
  }

  logDb(`${invocation}: complete (${applied} applied, ${skipped} skipped).`);
}

const isDirectInvocation = process.argv[1] === __filename;

if (isDirectInvocation) {
  runSafeMigrations()
    .then(async () => {
      await db.destroy();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error('[db] Safe migration runner failed:', error);
      await db.destroy();
      process.exit(1);
    });
}
