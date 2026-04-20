import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TARGET_DB = process.env.DB_NAME || 'sqm';
export const ROOT_DATABASE_DIR = path.join(__dirname, '../../../../database');
export const WAIT_RETRIES = 40;
export const WAIT_DELAY_MS = 3000;

const LOCAL_DB_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  'mssql',
  'sqm-mssql',
  'host.docker.internal',
]);

export function isYes(value: string | undefined | null) {
  return /^(yes|true|1)$/i.test(value ?? '');
}

export function isLocalDatabaseTarget(host = process.env.DB_HOST || 'localhost') {
  return LOCAL_DB_HOSTS.has(host.trim().toLowerCase());
}

export function logDb(message: string) {
  console.log(`[db] ${message}`);
}

export function getBootstrapAllowedForNonLocalTarget() {
  const modernFlag = process.env.DB_ALLOW_NONLOCAL_BOOTSTRAP;
  if (modernFlag !== undefined) {
    return isYes(modernFlag);
  }

  if (process.env.ALLOW_PROD_DB_INIT !== undefined) {
    logDb('ALLOW_PROD_DB_INIT is deprecated. Use DB_ALLOW_NONLOCAL_BOOTSTRAP=YES instead.');
    return isYes(process.env.ALLOW_PROD_DB_INIT);
  }

  return false;
}

export function getMigrationAllowedForNonLocalTarget() {
  const modernFlag = process.env.DB_ALLOW_NONLOCAL_MIGRATE;
  if (modernFlag !== undefined) {
    return isYes(modernFlag);
  }

  if (process.env.ALLOW_PROD_DB_MIGRATE !== undefined) {
    logDb('ALLOW_PROD_DB_MIGRATE is deprecated. Use DB_ALLOW_NONLOCAL_MIGRATE=YES instead.');
    return isYes(process.env.ALLOW_PROD_DB_MIGRATE);
  }

  return false;
}

export function getDbConfig(database: string): sql.config {
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

export async function withPool<T>(
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForSqlServer() {
  for (let attempt = 1; attempt <= WAIT_RETRIES; attempt += 1) {
    try {
      await withPool('master', async (pool) => {
        await pool.request().query('SELECT 1 AS ready');
      });
      logDb('SQL Server is ready for connections.');
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logDb(`Waiting for SQL Server (${attempt}/${WAIT_RETRIES}): ${message}`);
      await sleep(WAIT_DELAY_MS);
    }
  }

  throw new Error('SQL Server did not become ready in time.');
}

function escapeSqlLiteral(value: string) {
  return value.replace(/'/g, "''");
}

function escapeSqlIdentifier(value: string) {
  return value.replace(/]/g, ']]');
}

export async function ensureDatabaseExists(database = TARGET_DB) {
  const dbNameLiteral = escapeSqlLiteral(database);
  const dbNameIdentifier = escapeSqlIdentifier(database);

  return withPool('master', async (pool) => {
    const existing = await pool.request()
      .input('dbName', sql.NVarChar, database)
      .query('SELECT DB_ID(@dbName) AS db_id');

    if (existing.recordset[0]?.db_id) {
      return false;
    }

    await pool.request().batch(`
IF DB_ID(N'${dbNameLiteral}') IS NULL
BEGIN
  EXEC('CREATE DATABASE [${dbNameIdentifier}]')
END
`);

    return true;
  });
}

export async function countBaseTables(database = TARGET_DB) {
  return withPool(database, async (pool) => {
    const result = await pool.request().query(`
SELECT COUNT(*) AS cnt
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
`);

    return Number(result.recordset[0]?.cnt || 0);
  });
}

export async function decodeSqlFile(filePath: string) {
  const fileBuffer = await fs.readFile(filePath);

  if (
    fileBuffer.length >= 2 &&
    ((fileBuffer[0] === 0xff && fileBuffer[1] === 0xfe) ||
      (fileBuffer[0] === 0xfe && fileBuffer[1] === 0xff))
  ) {
    return fileBuffer.slice(2).toString('utf16le');
  }

  let nullByteCount = 0;
  for (let index = 0; index < Math.min(fileBuffer.length, 4096); index += 1) {
    if (fileBuffer[index] === 0x00) {
      nullByteCount += 1;
    }
  }

  if (nullByteCount > 32) {
    return fileBuffer.toString('utf16le');
  }

  return fileBuffer.toString('utf8');
}

export function splitSqlBatches(sqlText: string) {
  const lines = sqlText.replace(/\r\n/g, '\n').replace(/\u0000/g, '').split('\n');
  const batches: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    const goMatch = line.match(/^\s*GO(?:\s+(\d+))?\s*$/i);
    if (goMatch) {
      const count = Number(goMatch[1] ?? '1');
      const batchText = current.join('\n').trim();
      if (batchText) {
        for (let index = 0; index < count; index += 1) {
          batches.push(batchText);
        }
      }
      current = [];
      continue;
    }
    current.push(line);
  }

  const finalBatch = current.join('\n').trim();
  if (finalBatch) {
    batches.push(finalBatch);
  }

  return batches;
}

function stripComments(batch: string) {
  return batch
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim();
}

function findCrossDatabaseRefs(batch: string) {
  const refs = new Set<string>();
  const detectionText = stripComments(batch);
  const regex = /\[([A-Za-z0-9_]+)\]\.\[dbo\]\.\[/g;
  let match: RegExpExecArray | null;

  match = regex.exec(detectionText);
  while (match !== null) {
    refs.add(match[1]);
    match = regex.exec(detectionText);
  }

  return Array.from(refs);
}

function applyAliases(batch: string, aliasMap: Map<string, string>) {
  let nextBatch = batch;
  for (const [from, to] of aliasMap.entries()) {
    const regex = new RegExp(`\\[${from}\\]`, 'g');
    nextBatch = nextBatch.replace(regex, `[${to}]`);
  }
  return nextBatch;
}

function shouldSkipLegacyBatch(batch: string, expectedDb: string, allowedDbs: Set<string>) {
  const normalized = stripComments(batch).toUpperCase();
  if (!normalized) {
    return { skip: true, reason: 'empty' };
  }

  const skipPrefixes = [
    'USE [MASTER]',
    'CREATE DATABASE [',
    'ALTER DATABASE [',
    'ALTER DATABASE SCOPED CONFIGURATION',
    'CREATE USER [',
    'CREATE LOGIN [',
    'ALTER ROLE [',
    'ALTER AUTHORIZATION',
  ];

  if (skipPrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return { skip: true, reason: 'instance-scoped' };
  }

  if (normalized.includes('FULLTEXTSERVICEPROPERTY(') || normalized.includes('SP_FULLTEXT_DATABASE')) {
    return { skip: true, reason: 'fulltext-config' };
  }

  if (normalized.includes('SP_ADDEXTENDEDPROPERTY')) {
    return { skip: true, reason: 'extended-property' };
  }

  const refs = findCrossDatabaseRefs(batch);
  const disallowedRefs = refs.filter((dbName) => !allowedDbs.has(dbName));
  if (disallowedRefs.length > 0) {
    return { skip: true, reason: `external-db:${disallowedRefs.join(',')}` };
  }

  if (normalized.startsWith('USE [')) {
    const useMatch = normalized.match(/^USE \[([^\]]+)\]$/i);
    if (useMatch && useMatch[1] !== expectedDb.toUpperCase()) {
      return { skip: true, reason: `unexpected-use:${useMatch[1]}` };
    }
  }

  return { skip: false, reason: 'kept' };
}

export function extractDatabaseName(sqlText: string) {
  const match = sqlText.match(/Object:\s+Database\s+\[([^\]]+)\]/i);
  if (!match) {
    throw new Error('Unable to detect database name from legacy dump header.');
  }
  return match[1];
}

export async function readLegacySchemaBatchesForSingleTarget(options: {
  filePath: string;
  expectedDb: string;
  targetDb: string;
}) {
  const decoded = await decodeSqlFile(options.filePath);
  const detectedDb = extractDatabaseName(decoded);

  if (detectedDb !== options.expectedDb) {
    throw new Error(
      `Legacy dump mismatch for ${path.basename(options.filePath)}: expected ${options.expectedDb}, detected ${detectedDb}.`,
    );
  }

  const aliasMap = new Map<string, string>([
    ['SQM', options.targetDb],
    ['5M1EApprovalDB', options.targetDb],
    ['VAVE', options.targetDb],
  ]);

  const allowedDbs = new Set<string>([options.expectedDb, 'SQM', '5M1EApprovalDB', 'VAVE', options.targetDb]);
  const keptBatches: string[] = [];

  for (const rawBatch of splitSqlBatches(decoded)) {
    const batch = applyAliases(rawBatch, aliasMap);
    const verdict = shouldSkipLegacyBatch(batch, options.targetDb, allowedDbs);
    if (!verdict.skip) {
      keptBatches.push(batch.trim());
    }
  }

  return keptBatches;
}

export async function executeBatches(
  pool: sql.ConnectionPool,
  batches: string[],
  label: string,
) {
  for (let index = 0; index < batches.length; index += 1) {
    await pool.request().batch(batches[index]);

    if ((index + 1) % 25 === 0 || index === batches.length - 1) {
      logDb(`${label}: executed ${index + 1}/${batches.length} batch(es).`);
    }
  }
}
