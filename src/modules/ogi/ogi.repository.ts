// @ts-ignore
import { db } from '../../shared/infrastructure/db.js';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';

export class OgiRepository extends BaseRepository<'OGI'> {
  constructor() {
    super('OGI');
  }

  async findAllDetailed() {
    return await db.selectFrom('OGI as o')
      .leftJoin('MFG_SITES as s', 'o.site_id', 's.site_id')
      .leftJoin('SUPPLIERS as sup', 'o.supplier_id', 'sup.supplier_id')
      .leftJoin('PARTS as p', 'o.part_id', 'p.part_id')
      .selectAll('o')
      .select([
        's.site_name',
        'sup.supplier_name',
        'p.part_code',
        'p.part_name'
      ])
      .orderBy('o.upload_date', 'desc')
      .execute();
  }

  async findByIdDetailed(idOrControlNo: string) {
    const record = await db.selectFrom('OGI as o')
      .leftJoin('MFG_SITES as s', 'o.site_id', 's.site_id')
      .leftJoin('SUPPLIERS as sup', 'o.supplier_id', 'sup.supplier_id')
      .leftJoin('PARTS as p', 'o.part_id', 'p.part_id')
      .selectAll('o')
      .select([
        's.site_name',
        'sup.supplier_name',
        'p.part_code',
        'p.part_name'
      ])
      .where((eb: any) => eb.or([
        eb('o.ogi_id', '=', idOrControlNo),
        eb('o.control_no', '=', idOrControlNo)
      ]))
      .executeTakeFirst();

    if (!record) return null;

    const lots = await db.selectFrom('OGI_LOTS')
      .selectAll()
      .where('ogi_id', '=', record.ogi_id)
      .execute();

    const attachments = await db.selectFrom('OGI_ATTACHMENT')
      .selectAll()
      .where('ogi_id', '=', record.ogi_id)
      .execute();

    return { record, lots, attachments };
  }

  async fetchLotsByOgiIds(ogiIds: string[]) {
    if (ogiIds.length === 0) return [];
    return await db.selectFrom('OGI_LOTS')
      .selectAll()
      .where('ogi_id', 'in', ogiIds)
      .execute();
  }

  async fetchAttachmentsByOgiIds(ogiIds: string[]) {
    if (ogiIds.length === 0) return [];
    return await db.selectFrom('OGI_ATTACHMENT')
      .selectAll()
      .where('ogi_id', 'in', ogiIds)
      .execute();
  }

  async getNextSequence(prefix: string) {
    const result = await db.selectFrom('OGI')
      .select('control_no')
      .where('control_no', 'like', `${prefix}%`)
      .orderBy('control_no', 'desc')
      .executeTakeFirst();
    return result?.control_no || null;
  }

  async executeTransaction<T>(
    callback: (trx: typeof db) => Promise<T>
  ): Promise<T> {
    return await db.transaction().execute(async (trx: any) => {
      return await callback(trx);
    });
  }
}

export const ogiRepository = new OgiRepository();
