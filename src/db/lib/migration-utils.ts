import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql } from 'kysely';

import { db } from '../../shared/infrastructure/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SAFE_MIGRATION_FILES = [
  path.join(__dirname, '..', 'migrations', 'migration_add_password_reset_tokens.sql'),
  path.join(__dirname, '..', 'migrations', 'migration_add_5m1e_cc_table.sql'),
  path.join(__dirname, '..', 'migrations', 'migration_add_eval_columns.sql'),
  path.join(__dirname, '..', 'migrations', 'migration_add_npi_corrected_lot_verification.sql'),
  path.join(__dirname, '..', 'legacy', 'migration_add_mnr_8d_fields.sql'),
  path.join(__dirname, '..', 'migrations', 'migration_add_spc_workflow.sql'),
  path.join(__dirname, '..', 'migrations', 'migration_add_sqpr_supplier_attention.sql'),
  path.join(__dirname, '..', 'migrations', 'migration_add_ssi_module.sql'),
];

export function getSafeMigrationFiles() {
  return SAFE_MIGRATION_FILES;
}

export async function ensureMigrationsTable() {
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

export async function isMigrationApplied(name: string) {
  const result = await sql<{ cnt: number }>`
    SELECT COUNT(*) as cnt FROM TBL_SQM_Migrations WHERE MigrationName = ${name}
  `.execute(db);

  return (result.rows[0]?.cnt ?? 0) > 0;
}

export async function getLastAppliedMigration(): Promise<string | null> {
  const result = await sql<{ MigrationName: string }>`
    SELECT TOP 1 MigrationName FROM TBL_SQM_Migrations ORDER BY AppliedAt DESC, ID DESC
  `.execute(db);

  return result.rows[0]?.MigrationName ?? null;
}

export async function getAppliedMigrations(): Promise<string[]> {
  const result = await sql<{ MigrationName: string }>`
    SELECT MigrationName FROM TBL_SQM_Migrations ORDER BY AppliedAt ASC
  `.execute(db);

  return result.rows.map((r) => r.MigrationName);
}

export async function recordMigration(name: string) {
  await sql`
    INSERT INTO TBL_SQM_Migrations (MigrationName) VALUES (${name})
  `.execute(db);
}

export async function removeMigrationRecord(name: string) {
  await sql`
    DELETE FROM TBL_SQM_Migrations WHERE MigrationName = ${name}
  `.execute(db);
}

export function splitSqlBatches(contents: string) {
  return contents
    .split(/^\s*GO\s*$/gim)
    .map((batch) => batch.trim())
    .filter((batch) => {
      const withoutComments = batch.replace(/--.*$/gm, '').trim();
      return withoutComments.length > 0;
    });
}

export async function executeMigration(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const batches = splitSqlBatches(content);

  for (const batch of batches) {
    await sql.raw(batch).execute(db);
  }
}
