import { db } from '../../../shared/infrastructure/db.js';

export class FiveM1ePartsRepository {
  async findParts(controlNo: string) {
    return await db.selectFrom('TBL_5M1E_PartsPerReport').selectAll().where('PartsTag', '=', controlNo).execute();
  }

  async insertParts(controlNo: string, parts: Array<{ part_id?: string }>) {
    for (const part of parts) {
      if (!part.part_id) continue;
      const nextIdResult = await db.selectFrom('TBL_5M1E_PartsPerReport').select(db.fn.max('TagID').as('maxId')).executeTakeFirst();
      const nextId = (Number(nextIdResult?.maxId) || 0) + 1;

      await db.insertInto('TBL_5M1E_PartsPerReport').values({
        TagID: nextId,
        PartsTag: controlNo,
        part_id: part.part_id,
        DateAdded: new Date(),
      } as any).execute();
    }
  }

  async replaceParts(controlNo: string, parts: Array<{ part_id?: string }>) {
    await db.deleteFrom('TBL_5M1E_PartsPerReport').where('PartsTag', '=', controlNo).execute();
    await this.insertParts(controlNo, parts);
  }
}

export const fiveM1ePartsRepository = new FiveM1ePartsRepository();
