// @ts-ignore
import { db } from '../../shared/infrastructure/db.js';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import { sql } from 'kysely';

export interface OgiNotificationRecipient {
  userId: string;
  email: string | null;
  name: string | null;
  activeFlag?: boolean | number | null;
}

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
        sql<string | null>`${sql.ref('s.site_code')}`.as('site_code'),
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
        sql<string | null>`${sql.ref('s.site_code')}`.as('site_code'),
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

  async findAttachmentOwner(attachmentId: string) {
    const attachment = await db
      .selectFrom('OGI_ATTACHMENT')
      .select(['ogi_id'])
      .where('ogi_attachment_id', '=', attachmentId)
      .executeTakeFirst();

    return attachment || null;
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

  async findUserContactById(userId: string): Promise<OgiNotificationRecipient | null> {
    if (!userId) return null;

    const user = await db
      .selectFrom('USERS as u')
      .select([
        'u.user_id as userId',
        'u.email as email',
        'u.full_name as name',
        'u.active_flag as activeFlag',
      ])
      .where('u.user_id', '=', userId)
      .executeTakeFirst();

    if (!user) {
      return null;
    }

    return {
      userId: user.userId,
      email: user.email,
      name: user.name,
      activeFlag: user.activeFlag,
    };
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
