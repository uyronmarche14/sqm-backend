import { sql } from 'kysely';

import { db } from '../../shared/infrastructure/db.js';

export type SeedPrimitive = string | number | boolean | Date | null;
export type SeedRow = Record<string, SeedPrimitive>;

export const SYSTEM_UPDATE_BY = 'SYSTEM';

export function isYes(value: string | undefined | null) {
  return /^(yes|true|1)$/i.test(value ?? '');
}

export async function ensureTables(tableNames: string[]) {
  for (const tableName of tableNames) {
    const result = await sql<{ cnt: number }>`
      SELECT COUNT(*) AS cnt
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = ${tableName}
    `.execute(db);

    if ((result.rows[0]?.cnt ?? 0) === 0) {
      throw new Error(`Required table ${tableName} does not exist. Run bootstrap before seeding.`);
    }
  }
}

export async function selectAllRows(table: string) {
  return (db as any).selectFrom(table).selectAll().execute() as Promise<SeedRow[]>;
}

export function withSeedMetadata(row: SeedRow, now: Date) {
  return {
    ...row,
    active_flag: row.active_flag ?? 1,
    last_update: row.last_update ?? now,
    updateby: row.updateby ?? SYSTEM_UPDATE_BY,
  };
}

export async function upsertByMatch(options: {
  table: string;
  matchOn: string[];
  preserveOnUpdate?: string[];
  row: SeedRow;
}) {
  let query = (db as any).selectFrom(options.table).selectAll();
  for (const column of options.matchOn) {
    query = query.where(column, '=', options.row[column]);
  }

  const existing = (await query.executeTakeFirst()) as SeedRow | undefined;
  const preserveOnUpdate = new Set(options.preserveOnUpdate ?? []);

  if (existing) {
    const updates = Object.fromEntries(
      Object.entries(options.row).filter(
        ([column, value]) =>
          value !== undefined &&
          !options.matchOn.includes(column) &&
          !preserveOnUpdate.has(column),
      ),
    );

    if (Object.keys(updates).length > 0) {
      let updateQuery = (db as any).updateTable(options.table).set(updates);
      for (const column of options.matchOn) {
        updateQuery = updateQuery.where(column, '=', options.row[column]);
      }
      await updateQuery.execute();
    }

    return {
      ...existing,
      ...updates,
    };
  }

  await (db as any).insertInto(options.table).values(options.row).execute();
  return options.row;
}

export async function upsertSeedRows(options: {
  table: string;
  matchOn: string[];
  preserveOnUpdate?: string[];
  rows: SeedRow[];
}) {
  const results: SeedRow[] = [];
  for (const row of options.rows) {
    results.push(
      await upsertByMatch({
        table: options.table,
        matchOn: options.matchOn,
        preserveOnUpdate: options.preserveOnUpdate,
        row,
      }),
    );
  }

  return results;
}

export function mapRowsBy<T extends Record<string, unknown>>(rows: T[], column: string) {
  return new Map(rows.map((row) => [String(row[column]), row]));
}

export function requireSeedRow<T extends Record<string, unknown>>(
  rows: Map<string, T>,
  key: string,
  label: string,
) {
  const row = rows.get(key);
  if (!row) {
    throw new Error(`Missing seeded ${label} for key "${key}".`);
  }

  return row;
}
