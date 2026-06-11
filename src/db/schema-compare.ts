import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sql } from 'kysely';

import { db } from '../shared/infrastructure/db.js';
import { logDb } from './lib/db-safety.js';
import { getAppliedMigrations } from './lib/migration-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
  length?: number;
  precision?: number;
  scale?: number;
}

interface TableDef {
  name: string;
  columns: ColumnDef[];
  source: string;
}

type SchemaMap = Map<string, TableDef>;

interface SchemaDiff {
  missingTables: Array<{ name: string; source: string }>;
  orphanTables: Array<{ name: string }>;
  missingColumns: Array<{ table: string; column: string; expected: ColumnDef }>;
  extraColumns: Array<{ table: string; column: string }>;
  typeMismatches: Array<{ table: string; column: string; expected: string; actual: string }>;
  migrationStatus: Array<{ name: string; applied: boolean; expected: boolean; fileExists: boolean }>;
}

const ROOT = path.resolve(__dirname, '..', '..');
const GENERATED_DIR = path.resolve(ROOT, 'db-assets', 'generated');
const MIGRATIONS_DIR = path.resolve(__dirname, 'migrations');
const LEGACY_DIR = path.resolve(__dirname, 'legacy');

function normalizeType(sqlType: string): string {
  return sqlType.replace(/\s*\(\d+.*?\)/g, '').trim().toUpperCase();
}

function parseLength(sqlType: string): { baseType: string; length?: number; precision?: number; scale?: number } {
  const match = sqlType.match(/^(\w+)\s*(?:\((\d+)(?:\s*,\s*(\d+))?\))?/i);
  if (!match) return { baseType: sqlType.toUpperCase() };

  const baseType = match[1].toUpperCase();
  const length = match[2] ? Number(match[2]) : undefined;
  const scale = match[3] ? Number(match[3]) : undefined;

  return { baseType, length, precision: length, scale };
}

function parseDdlFiles(): SchemaMap {
  const tables = new Map<string, TableDef>();

  if (!fs.existsSync(GENERATED_DIR)) {
    logDb(`Generated schema directory not found: ${GENERATED_DIR}`);
    return tables;
  }

  const files = fs.readdirSync(GENERATED_DIR).filter((f) => f.startsWith('schema-') && f.endsWith('.sql'));

  for (const file of files.sort()) {
    const filePath = path.join(GENERATED_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const source = file;

    const tableRegex = /CREATE TABLE\s+\[?(?:dbo\.)?(\w+)\]?\s*\(([\s\S]*?)\);/gi;
    let tableMatch: RegExpExecArray | null;

    while ((tableMatch = tableRegex.exec(content)) !== null) {
      const tableName = tableMatch[1];
      const columnsBlock = tableMatch[2];

      const columns: ColumnDef[] = [];
      const columnRegex = /\[\w+\]\s+\[?(\w+(?:\(.*?\))?)\]?\s*(?:NULL|NOT NULL)?/gi;
      let colMatch: RegExpExecArray | null;

      while ((colMatch = columnRegex.exec(columnsBlock)) !== null) {
        const fullType = colMatch[1];
        const { baseType, length } = parseLength(fullType);

        const beforeColType = colMatch[0].substring(0, colMatch[0].indexOf(fullType));
        const colNameMatch = beforeColType.match(/\[(\w+)\]/);
        if (!colNameMatch) continue;

        const colName = colNameMatch[1];
        const isNullable = /\bNULL\b/i.test(colMatch[0]) && !/\bNOT\s+NULL\b/i.test(colMatch[0]);

        columns.push({
          name: colName,
          type: baseType,
          nullable: isNullable,
          length,
        });
      }

      if (columns.length > 0) {
        tables.set(tableName, { name: tableName, columns, source });
      }
    }
  }

  return tables;
}

async function queryLiveSchema(): Promise<SchemaMap> {
  const tables = new Map<string, TableDef>();

  const tableRows = await sql<{ TABLE_NAME: string }>`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `.execute(db);

  for (const row of tableRows.rows) {
    const tableName = row.TABLE_NAME;

    const columnRows = await sql<{
      COLUMN_NAME: string;
      DATA_TYPE: string;
      IS_NULLABLE: string;
      CHARACTER_MAXIMUM_LENGTH: number | null;
      NUMERIC_PRECISION: number | null;
      NUMERIC_SCALE: number | null;
    }>`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE,
             CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = ${tableName}
      ORDER BY ORDINAL_POSITION
    `.execute(db);

    const columns: ColumnDef[] = columnRows.rows.map((c) => ({
      name: c.COLUMN_NAME,
      type: c.DATA_TYPE.toUpperCase(),
      nullable: c.IS_NULLABLE === 'YES',
      length: c.CHARACTER_MAXIMUM_LENGTH ?? undefined,
      precision: c.NUMERIC_PRECISION ?? undefined,
      scale: c.NUMERIC_SCALE ?? undefined,
    }));

    tables.set(tableName, { name: tableName, columns, source: 'live' });
  }

  return tables;
}

function findMismatches(expected: SchemaMap, actual: SchemaMap): SchemaDiff {
  const diff: SchemaDiff = {
    missingTables: [],
    orphanTables: [],
    missingColumns: [],
    extraColumns: [],
    typeMismatches: [],
    migrationStatus: [],
  };

  for (const [tableName, tableDef] of expected) {
    const liveTable = actual.get(tableName);
    if (!liveTable) {
      diff.missingTables.push({ name: tableName, source: tableDef.source });
      continue;
    }

    const expectedColMap = new Map(tableDef.columns.map((c) => [c.name, c]));
    const liveColMap = new Map(liveTable.columns.map((c) => [c.name, c]));

    for (const [colName, expectedCol] of expectedColMap) {
      const liveCol = liveColMap.get(colName);
      if (!liveCol) {
        diff.missingColumns.push({ table: tableName, column: colName, expected: expectedCol });
        continue;
      }

      const expectedBase = normalizeType(expectedCol.type);
      const actualBase = normalizeType(liveCol.type);
      if (expectedBase !== actualBase) {
        diff.typeMismatches.push({
          table: tableName,
          column: colName,
          expected: `${expectedCol.type}`,
          actual: `${liveCol.type}`,
        });
      }
    }

    for (const [colName] of liveColMap) {
      if (!expectedColMap.has(colName)) {
        diff.extraColumns.push({ table: tableName, column: colName });
      }
    }
  }

  for (const [tableName] of actual) {
    if (!expected.has(tableName)) {
      diff.orphanTables.push({ name: tableName });
    }
  }

  return diff;
}

async function checkMigrations(): Promise<SchemaDiff['migrationStatus']> {
  const status: SchemaDiff['migrationStatus'] = [];

  const safeMigrations = [
    'migration_add_password_reset_tokens.sql',
    'migration_add_5m1e_cc_table.sql',
    'migration_add_eval_columns.sql',
    'migration_add_npi_corrected_lot_verification.sql',
    'migration_add_mnr_8d_fields.sql',
    'migration_add_spc_workflow.sql',
    'migration_add_sqpr_supplier_attention.sql',
    'migration_add_ssi_module.sql',
  ];

  let applied: string[] = [];
  try {
    applied = await getAppliedMigrations();
  } catch {
    logDb('Could not query migration tracking table (may not exist yet).');
  }

  const appliedSet = new Set(applied.map((name) => name.toLowerCase()));

  for (const name of safeMigrations) {
    const fileExists = fs.existsSync(path.join(MIGRATIONS_DIR, name)) ||
                       fs.existsSync(path.join(LEGACY_DIR, name));
    status.push({
      name,
      applied: appliedSet.has(name.toLowerCase()),
      expected: true,
      fileExists,
    });
  }

  return status;
}

function printReport(diff: SchemaDiff, ms: number) {
  console.log('\n========================================');
  console.log('  SQM Schema Comparison Report');
  console.log(`  Completed in ${(ms / 1000).toFixed(1)}s`);
  console.log('========================================\n');

  if (diff.missingTables.length > 0) {
    console.log(`❌ Missing Tables (${diff.missingTables.length}):`);
    for (const t of diff.missingTables) {
      console.log(`   - ${t.name} (expected in ${t.source})`);
    }
    console.log();
  }

  if (diff.orphanTables.length > 0) {
    console.log(`ℹ️  Orphan Tables (${diff.orphanTables.length} — live DB only):`);
    const ignored = new Set(['TBL_SQM_Migrations', 'TBL_5M1E_CC']);
    const filtered = diff.orphanTables.filter((t) => !ignored.has(t.name));
    if (filtered.length > 0) {
      for (const t of filtered.slice(0, 30)) {
        console.log(`   - ${t.name}`);
      }
      if (filtered.length > 30) {
        console.log(`   ... and ${filtered.length - 30} more`);
      }
    } else {
      console.log('   (none — all extra tables are expected infrastructure)');
    }
    console.log();
  }

  if (diff.missingColumns.length > 0) {
    console.log(`❌ Missing Columns (${diff.missingColumns.length}):`);
    for (const c of diff.missingColumns.slice(0, 20)) {
      console.log(`   - ${c.table}.${c.column} (${c.expected.type})`);
    }
    if (diff.missingColumns.length > 20) {
      console.log(`   ... and ${diff.missingColumns.length - 20} more`);
    }
    console.log();
  }

  if (diff.typeMismatches.length > 0) {
    console.log(`⚠️  Type Mismatches (${diff.typeMismatches.length}):`);
    for (const m of diff.typeMismatches.slice(0, 20)) {
      console.log(`   - ${m.table}.${m.column}: expected ${m.expected}, found ${m.actual}`);
    }
    if (diff.typeMismatches.length > 20) {
      console.log(`   ... and ${diff.typeMismatches.length - 20} more`);
    }
    console.log();
  }

  if (diff.migrationStatus.length > 0) {
    console.log(`Migration Tracking (${diff.migrationStatus.length}):`);
    for (const m of diff.migrationStatus) {
      if (m.applied && m.fileExists) {
        console.log(`   ✅ ${m.name}`);
      } else if (!m.applied && m.fileExists) {
        console.log(`   ⚠️  ${m.name} — NOT applied but file exists`);
      } else if (m.applied && !m.fileExists) {
        console.log(`   ❌ ${m.name} — applied but file MISSING`);
      }
    }
    console.log();
  }

  const total = diff.missingTables.length + diff.missingColumns.length + diff.typeMismatches.length;
  if (total === 0) {
    console.log('✅ No discrepancies found between generated schema and live DB.');
  } else {
    console.log(`📊 Summary: ${diff.missingTables.length} tables missing, ` +
                `${diff.missingColumns.length} columns missing, ` +
                `${diff.typeMismatches.length} type mismatches.`);
  }
  console.log();
}

async function runSchemaCompare() {
  const start = Date.now();
  logDb('schema-compare: reading generated DDL files...');
  const expected = parseDdlFiles();
  logDb(`schema-compare: parsed ${expected.size} tables from generated schemas.`);

  logDb('schema-compare: querying live database schema...');
  const actual = await queryLiveSchema();
  logDb(`schema-compare: found ${actual.size} tables in live database.`);

  logDb('schema-compare: comparing...');
  const diff = findMismatches(expected, actual);

  logDb('schema-compare: checking migration tracking...');
  diff.migrationStatus = await checkMigrations();

  printReport(diff, Date.now() - start);

  await db.destroy();
}

const isDirectInvocation = process.argv[1] === __filename;

if (isDirectInvocation) {
  runSchemaCompare()
    .then(() => process.exit(0))
    .catch(async (error) => {
      console.error('[db] Schema compare failed:', error);
      await db.destroy();
      process.exit(1);
    });
}
