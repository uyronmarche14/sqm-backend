import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql } from 'kysely';

import { db } from '../shared/infrastructure/db.js';
import { getMigrationAllowedForNonLocalTarget, isLocalDatabaseTarget, logDb } from './lib/db-safety.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAFE_MIGRATION_FILES = [
  path.join(__dirname, 'migrations', 'migration_add_password_reset_tokens.sql'),
  path.join(__dirname, 'migrations', 'migration_add_5m1e_cc_table.sql'),
  path.join(__dirname, 'migrations', 'migration_add_eval_columns.sql'),
  path.join(__dirname, 'migrations', 'migration_add_npi_corrected_lot_verification.sql'),
  path.join(__dirname, 'legacy', 'migration_add_mnr_8d_fields.sql'),
];

async function ensureMigrationsTable() {
  await sql`
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TBL_SQM_Migrations')
    BEGIN
      CREATE TABLE TBL_SQM_Migrations (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        MigrationName NVARCHAR(255) NOT NULL UNIQUE,
        AppliedAt DATETIME2 DEFAULT GETDATE()
      )
    END
  `.execute(db);
}

async function isMigrationApplied(name: string) {
  const result = await sql<{ cnt: number }>`
    SELECT COUNT(*) as cnt FROM TBL_SQM_Migrations WHERE MigrationName = ${name}
  `.execute(db);

  return (result.rows[0]?.cnt ?? 0) > 0;
}

async function recordMigration(name: string) {
  await sql`
    INSERT INTO TBL_SQM_Migrations (MigrationName) VALUES (${name})
  `.execute(db);
}

function splitSqlBatches(contents: string) {
  return contents
    .split(/^\s*GO\s*$/gim)
    .map((batch) => batch.trim())
    .filter((batch) => {
      const withoutComments = batch.replace(/--.*$/gm, '').trim();
      return withoutComments.length > 0;
    });
}

async function executeMigration(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const batches = splitSqlBatches(content);

  for (const batch of batches) {
    await sql.raw(batch).execute(db);
  }
}

export async function runSafeMigrations(invocation = 'db:migrate:safe') {
  if (!isLocalDatabaseTarget() && !getMigrationAllowedForNonLocalTarget()) {
    throw new Error(
      `Refusing to run migrations on non-local database target ${process.env.DB_HOST}. Set DB_ALLOW_NONLOCAL_MIGRATE=YES only if this is intentional.`,
    );
  }

  await ensureMigrationsTable();

  let applied = 0;
  let skipped = 0;

  for (const filePath of SAFE_MIGRATION_FILES) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Safe migration file not found: ${filePath}`);
    }

    const name = path.basename(filePath);
    if (await isMigrationApplied(name)) {
      logDb(`${invocation}: skipping ${name} (already applied).`);
      skipped += 1;
      continue;
    }

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
