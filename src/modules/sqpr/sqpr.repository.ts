import { db } from '../../shared/infrastructure/db.js';
import { sql } from 'kysely';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';

export class SqprRepository extends BaseRepository<'SQPR'> {
  constructor() {
    super('SQPR');
  }

  async findSiteCode(siteId: string) {
    const row = await db
      .selectFrom('MFG_SITES as site')
      .select([
        'site.site_id',
        'site.site_name',
        sql<string>`COALESCE(site.site_code, site.site_name)`.as('site_code'),
      ])
      .where('site.site_id', '=', siteId)
      .executeTakeFirst();

    return row || null;
  }

  /**
   * Fetches all SQPR records with human-readable joined names.
   */
  async findAllDetailed() {
    return await db.selectFrom('SQPR as s')
      .leftJoin('MFG_SITES as site', 's.site_id', 'site.site_id')
      .leftJoin('SUPPLIERS as sup', 's.supplier_id', 'sup.supplier_id')
      .leftJoin('USERS as inch', 's.incharge_id', 'inch.user_id')
      .leftJoin('USERS as attn', 's.attention_id', 'attn.user_id')
      .leftJoin('USERS as chk', 's.checker_id', 'chk.user_id')
      .leftJoin('USERS as apr', 's.approver_id', 'apr.user_id')
      .selectAll('s')
      .select([
        'site.site_name as site_name',
        sql<string>`COALESCE(site.site_code, site.site_name)`.as('site_code'),
        'sup.supplier_name as supplier_name',
        sql<string>`COALESCE(inch.full_name, s.incharge_id)`.as('incharge_name'),
        'attn.full_name as attention_name',
        'chk.full_name as checker_name',
        'apr.full_name as approver_name'
      ])
      .orderBy('s.date_created', 'desc')
      .execute();
  }

  /**
   * Fetches a single SQPR record and all its nested sub-tables.
   */
  async findByIdDetailed(idOrControlNo: string) {
    const record = await db.selectFrom('SQPR as s')
      .leftJoin('MFG_SITES as site', 's.site_id', 'site.site_id')
      .leftJoin('SUPPLIERS as sup', 's.supplier_id', 'sup.supplier_id')
      .leftJoin('USERS as inch', 's.incharge_id', 'inch.user_id')
      .leftJoin('USERS as attn', 's.attention_id', 'attn.user_id')
      .leftJoin('USERS as chk', 's.checker_id', 'chk.user_id')
      .leftJoin('USERS as apr', 's.approver_id', 'apr.user_id')
      .selectAll('s')
      .select([
        'site.site_name as site_name',
        sql<string>`COALESCE(site.site_code, site.site_name)`.as('site_code'),
        'sup.supplier_name as supplier_name',
        sql<string>`COALESCE(inch.full_name, s.incharge_id)`.as('incharge_name'),
        'attn.full_name as attention_name',
        'chk.full_name as checker_name',
        'apr.full_name as approver_name'
      ])
      .where((eb: any) => eb.or([
        eb('s.sqpr_id', '=', idOrControlNo),
        eb('s.control_no', '=', idOrControlNo)
      ]))
      .executeTakeFirst();

    if (!record) return null;

    // Fetch Subtables
    const attachments = await db.selectFrom('SQPR_ATTACHMENT')
      .selectAll()
      .where('sqpr_id', '=', record.sqpr_id)
      .execute();

    const ccList = await db.selectFrom('SQPR_CC as cc')
      .leftJoin('USERS as u', 'cc.user_id', 'u.user_id')
      .select([
        'cc.sqpr_cc_id',
        'cc.sqpr_id',
        'cc.user_id',
        'cc.last_update',
        'cc.updateby',
        'u.full_name as user_name',
        'u.email as user_email'
      ])
      .where('cc.sqpr_id', '=', record.sqpr_id)
      .execute();

    return { record, attachments, ccList };
  }

  /**
   * Wraps operations in an atomic transaction
   */
  async executeTransaction<T>(
    callback: (trx: typeof db) => Promise<T>
  ): Promise<T> {
    return await db.transaction().execute(async (trx: any) => {
      // @ts-ignore: We need to pass the strongly typed Transactor
      return await callback(trx);
    });
  }
}

export const sqprRepository = new SqprRepository();
