import { db } from '../../../shared/infrastructure/db.js';

export const isNumeric = (value: string) => /^\d+$/.test(value);

export async function getNextTableId(trx: any, tableName: string, columnName = 'ID'): Promise<number> {
  const result = await trx
    .selectFrom(tableName)
    .select(db.fn.max(columnName as any).as('maxId'))
    .executeTakeFirst();
  return (Number(result?.maxId) || 0) + 1;
}
