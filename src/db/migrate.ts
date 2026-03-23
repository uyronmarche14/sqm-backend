// =============================================================================
// Database Migration Runner
// =============================================================================
// Usage: npm run migrate
// Reads all .sql files from src/db/migrations/ and executes them sequentially.
// Tracks which migrations have been run in a TBL_SQM_Migrations table.
// =============================================================================

import { db } from '../shared/infrastructure/db.js';
import { sql } from 'kysely';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Ensure the migrations tracking table exists.
 * This table records which migrations have already been applied.
 */
async function ensureMigrationsTable(): Promise<void> {
  await sql`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TBL_SQM_Migrations')
    BEGIN
      CREATE TABLE TBL_SQM_Migrations (
        ID INT IDENTITY(1,1) PRIMARY KEY,
        MigrationName NVARCHAR(255) NOT NULL UNIQUE,
        AppliedAt DATETIME2 DEFAULT GETDATE()
      )
    END
  `.execute(db);
}

/**
 * Check if a migration has already been applied.
 */
async function isMigrationApplied(name: string): Promise<boolean> {
  const result = await sql<{ cnt: number }>`
    SELECT COUNT(*) as cnt FROM TBL_SQM_Migrations WHERE MigrationName = ${name}
  `.execute(db);
  return (result.rows[0]?.cnt ?? 0) > 0;
}

/**
 * Record a migration as applied.
 */
async function recordMigration(name: string): Promise<void> {
  await sql`
    INSERT INTO TBL_SQM_Migrations (MigrationName) VALUES (${name})
  `.execute(db);
}

/**
 * Execute a single SQL migration file.
 * Splits on GO statements (MSSQL batch separator) for multi-statement scripts.
 */
async function executeMigration(filePath: string): Promise<void> {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Split by GO statements (MSSQL batch separator), filtering comments-only lines
  const batches = content
    .split(/^\s*GO\s*$/im)
    .map(batch => batch.trim())
    .filter(batch => {
      // Remove empty batches and comment-only batches
      const withoutComments = batch.replace(/--.*$/gm, '').trim();
      return withoutComments.length > 0;
    });

  for (const batch of batches) {
    await sql.raw(batch).execute(db);
  }
}

/**
 * Main migration runner.
 * Reads migration files in alphabetical order and applies any that haven't been run yet.
 */
async function runMigrations(): Promise<void> {
  const isLocalHost = ['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost');
  const allowProdMigrate = process.env.ALLOW_PROD_DB_MIGRATE === 'true';

  if (!isLocalHost && !allowProdMigrate) {
    console.error(`\n🚨 DANGER: You are trying to run migrations on a NON-LOCAL database (${process.env.DB_HOST}).`);
    console.error('This action is blocked to prevent accidental schema changes on production servers.');
    console.error('If this is intentional, set ALLOW_PROD_DB_MIGRATE=true in your .env file.\n');
    process.exit(1);
  }

  console.log('🔄 Starting database migrations...\n');

  // 1. Ensure tracking table exists
  await ensureMigrationsTable();

  // 2. Read all .sql files from migrations directory
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('📁 No migrations directory found. Nothing to do.');
    return;
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Alphabetical order ensures deterministic execution

  if (files.length === 0) {
    console.log('📁 No migration files found. Nothing to do.');
    return;
  }

  console.log(`📋 Found ${files.length} migration file(s):\n`);

  let applied = 0;
  let skipped = 0;

  for (const file of files) {
    const already = await isMigrationApplied(file);
    
    if (already) {
      console.log(`  ⏭️  ${file} — already applied`);
      skipped++;
      continue;
    }

    try {
      console.log(`  🔧 Applying: ${file}...`);
      await executeMigration(path.join(MIGRATIONS_DIR, file));
      await recordMigration(file);
      console.log(`  ✅ ${file} — applied successfully`);
      applied++;
    } catch (error) {
      console.error(`  ❌ ${file} — FAILED:`);
      console.error(error);
      console.error('\n⛔ Migration aborted. Fix the error above and re-run.');
      process.exit(1);
    }
  }

  console.log(`\n🏁 Migration complete: ${applied} applied, ${skipped} skipped.`);
}

// Execute
runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Migration runner failed:', err);
    process.exit(1);
  });
