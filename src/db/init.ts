import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GENERATED_DIR = path.join(__dirname, 'generated');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const SEEDS_DIR = path.join(__dirname, 'seeds');
const ROOT_DATABASE_DIR = path.join(__dirname, '../../../database');

const TARGET_DB = process.env.DB_NAME || 'sqm';
const WAIT_RETRIES = 40;
const WAIT_DELAY_MS = 3000;

const GENERATED_PRIORITY = [
  'schema-core.sql',
  'schema-maintenance.sql',
  'schema-5m1e.sql',
  'schema-mnr.sql',
  'schema-npi.sql',
  'schema-ogi.sql',
  'schema-qmqa.sql',
  'schema-sqe.sql',
  'schema-sfr.sql',
  'schema-sqmp.sql',
  'schema-sqpr.sql',
  'constraints-5m1e.sql',
];

const SEED_PRIORITY = [
  '5m1e_forms_seed.sql',
  'npi_forms_seed.sql',
  'ogi_forms_seed.sql',
  'mnr_forms_seed.sql',
  'sqpr_forms_seed.sql',
  'sqmp_forms_seed.sql',
  'master_data_seed.sql',
];

const LEGACY_DATABASE_PRIORITY = [
  'script 1.sql',
  'script.sql',
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getDbConfig(database: string): sql.config {
  return {
    server: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    database,
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
    },
  };
}

async function withPool<T>(
  database: string,
  work: (pool: sql.ConnectionPool) => Promise<T>,
): Promise<T> {
  const pool = await new sql.ConnectionPool(getDbConfig(database)).connect();

  try {
    return await work(pool);
  } finally {
    await pool.close();
  }
}

function escapeSqlLiteral(value: string) {
  return value.replace(/'/g, "''");
}

function escapeSqlIdentifier(value: string) {
  return value.replace(/]/g, ']]');
}

function sortByPriority(files: string[], priority: string[]) {
  return files.sort((left, right) => {
    const leftIndex = priority.indexOf(left);
    const rightIndex = priority.indexOf(right);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right);
    }

    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });
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

function decodeSqlFile(buffer: Buffer) {
  if (buffer.length >= 2) {
    const bom = buffer.readUInt16LE(0);
    if (bom === 0xfeff || buffer.includes(0x00)) {
      return buffer.toString('utf16le');
    }
  }

  return buffer.toString('utf8');
}

function buildLegacyContentForTargetDatabase(contents: string) {
  const normalized = contents.replace(/\r\n/g, '\n').replace(/\u0000/g, '');
  
  // Replace all database references with target database
  let processed = normalized
    // Replace USE [database] statements
    .replace(/USE\s*\[[^\]]+\]/gi, `USE [${TARGET_DB}]`)
    // Replace cross-database references like [SQM].dbo. or [5M1EApprovalDB].dbo.
    .replace(/\[(?:SQM|5M1EApprovalDB)\]\.dbo\./gi, `[${TARGET_DB}].dbo.`)
    // Replace database creation statements - skip them
    .replace(/CREATE\s+DATABASE\s+\[[^\]]+\][^G]*?(?=GO|$)/gis, '-- Database creation skipped')
    // Remove ALTER DATABASE statements
    .replace(/ALTER\s+DATABASE\s+\[[^\]]+\][^G]*?(?=GO|$)/gis, '-- Database alteration skipped');
  
  return processed;
}

async function executeSqlFile(pool: sql.ConnectionPool, filePath: string) {
  const fileBuffer = await fs.readFile(filePath);
  const contents = decodeSqlFile(fileBuffer);
  const batches = splitSqlBatches(contents);

  for (const batch of batches) {
    await pool.request().batch(batch);
  }
}

async function executeLegacySqlFile(pool: sql.ConnectionPool, filePath: string) {
  console.log(`Reading legacy SQL file: ${filePath}`);
  const fileBuffer = await fs.readFile(filePath);
  const contents = buildLegacyContentForTargetDatabase(decodeSqlFile(fileBuffer));
  const batches = splitSqlBatches(contents);

  console.log(`Executing ${batches.length} batches from ${path.basename(filePath)}`);
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      await pool.request().batch(batch);
      if (i % 10 === 0) {
        console.log(`  Executed batch ${i + 1}/${batches.length}`);
      }
    } catch (error) {
      console.error(`Error in batch ${i + 1} of ${path.basename(filePath)}:`);
      console.error(`Batch preview: ${batch.substring(0, 200)}...`);
      console.error(error);
      // Continue with next batch instead of failing completely
    }
  }
  
  console.log(`Completed ${path.basename(filePath)}`);
}

async function waitForSqlServer() {
  for (let attempt = 1; attempt <= WAIT_RETRIES; attempt++) {
    try {
      await withPool('master', async (pool) => {
        await pool.request().query('SELECT 1 AS ready');
      });
      console.log('SQL Server is ready for connections.');
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`Waiting for SQL Server (${attempt}/${WAIT_RETRIES}): ${message}`);
      await sleep(WAIT_DELAY_MS);
    }
  }

  throw new Error('SQL Server did not become ready in time.');
}

async function databaseExists() {
  return withPool('master', async (pool) => {
    const result = await pool.request()
      .input('dbName', sql.NVarChar, TARGET_DB)
      .query('SELECT DB_ID(@dbName) AS db_id');

    return Boolean(result.recordset[0]?.db_id);
  });
}

async function tableExists(pool: sql.ConnectionPool, tableName: string) {
  const result = await pool.request()
    .input('tableName', sql.NVarChar, tableName)
    .query(`
SELECT COUNT(*) AS cnt
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = @tableName
`);

  return Number(result.recordset[0]?.cnt || 0) > 0;
}

async function needsSchemaBootstrap() {
  return withPool(TARGET_DB, async (pool) => {
    const criticalTables = [
      'TBL_5M1E_Application',
      'SQPR',
      'SQMP',
      'MNR_LOTS',
      'USERS'
    ];
    
    for (const table of criticalTables) {
      const exists = await tableExists(pool, table);
      if (!exists) {
        console.log(`Critical table ${table} is missing. Schema bootstrap required.`);
        return true;
      }
    }
    
    return false;
  });
}

async function ensureDatabase() {
  const exists = await databaseExists();

  if (exists) {
    console.log(`Database ${TARGET_DB} already exists. Skipping schema bootstrap.`);
    return false;
  }

  const dbNameLiteral = escapeSqlLiteral(TARGET_DB);
  const dbNameIdentifier = escapeSqlIdentifier(TARGET_DB);

  await withPool('master', async (pool) => {
    await pool.request().batch(`
IF DB_ID(N'${dbNameLiteral}') IS NULL
BEGIN
  EXEC('CREATE DATABASE [${dbNameIdentifier}]')
END
`);
  });

  console.log(`Database ${TARGET_DB} created.`);
  return true;
}

async function applyDirectory(
  pool: sql.ConnectionPool,
  directory: string,
  priority: string[],
  label: string,
) {
  const files = sortByPriority(
    (await fs.readdir(directory)).filter((file) => file.endsWith('.sql')),
    priority,
  );

  if (files.length === 0) {
    console.log(`No ${label} files found.`);
    return;
  }

  for (const file of files) {
    console.log(`Applying ${label}: ${file}`);
    await executeSqlFile(pool, path.join(directory, file));
  }
}

async function bootstrapSchema() {
  await withPool(TARGET_DB, async (pool) => {
    await applyDirectory(pool, GENERATED_DIR, GENERATED_PRIORITY, 'schema');
    await applyDirectory(pool, SEEDS_DIR, SEED_PRIORITY, 'seed');
  });
}

async function bootstrapLegacyDatabaseScripts() {
  try {
    const files = sortByPriority(
      (await fs.readdir(ROOT_DATABASE_DIR)).filter((file) => file.endsWith('.sql')),
      LEGACY_DATABASE_PRIORITY,
    );

    if (files.length === 0) {
      return false;
    }

    await withPool(TARGET_DB, async (pool) => {
      for (const file of files) {
        console.log(`Applying legacy database script: ${file}`);
        await executeLegacySqlFile(pool, path.join(ROOT_DATABASE_DIR, file));
      }
    });

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`Legacy database scripts skipped: ${message}`);
    return false;
  }
}

async function ensureMigrationsTable(pool: sql.ConnectionPool) {
  await pool.request().batch(`
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'TBL_SQM_Migrations')
BEGIN
  CREATE TABLE TBL_SQM_Migrations (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    MigrationName NVARCHAR(255) NOT NULL UNIQUE,
    AppliedAt DATETIME2 DEFAULT GETDATE()
  )
END
`);
}

async function isMigrationApplied(pool: sql.ConnectionPool, migrationName: string) {
  const result = await pool.request()
    .input('migrationName', sql.NVarChar, migrationName)
    .query('SELECT COUNT(*) AS cnt FROM TBL_SQM_Migrations WHERE MigrationName = @migrationName');

  return Number(result.recordset[0]?.cnt || 0) > 0;
}

async function recordMigration(pool: sql.ConnectionPool, migrationName: string) {
  await pool.request()
    .input('migrationName', sql.NVarChar, migrationName)
    .query('INSERT INTO TBL_SQM_Migrations (MigrationName) VALUES (@migrationName)');
}

async function applyJsSeeds() {
  const seedFile = path.join(SEEDS_DIR, 'seed_data.js');
  try {
    const stats = await fs.stat(seedFile);
    if (stats.isFile()) {
      console.log('Applying JS seed data...');
      // Use dynamic import for the ESM seed file
      // We use a timestamp to avoid cache issues if this were long-running
      await import(`${seedFile}?t=${Date.now()}`);
      console.log('JS seed data applied successfully.');
    }
  } catch {
    console.log('No JS seed_data.js found or failed to apply.');
  }
}

async function applyMigrations() {
  const files = sortByPriority(
    (await fs.readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')),
    [],
  );

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  await withPool(TARGET_DB, async (pool) => {
    await ensureMigrationsTable(pool);

    for (const file of files) {
      if (await isMigrationApplied(pool, file)) {
        console.log(`Skipping migration: ${file}`);
        continue;
      }

      console.log(`Applying migration: ${file}`);
      await executeSqlFile(pool, path.join(MIGRATIONS_DIR, file));
      await recordMigration(pool, file);
    }
  });
}

async function initDatabase() {
  console.log(`Initializing database ${TARGET_DB}...`);
  await waitForSqlServer();

  const createdDatabase = await ensureDatabase();
  const shouldBootstrapSchema = createdDatabase || await needsSchemaBootstrap();

  if (shouldBootstrapSchema) {
    if (!createdDatabase) {
      console.log(`Database ${TARGET_DB} is missing core tables. Rebuilding generated schema.`);
    }
    await bootstrapSchema();
    await bootstrapLegacyDatabaseScripts();
    await applyJsSeeds();
  }

  await applyMigrations();
  console.log('Database initialization complete.');
}

initDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
