// @ts-ignore
import { db } from '../../shared/infrastructure/db.js';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';

export class SqmpRepository extends BaseRepository<'SQMP'> {
  constructor() {
    super('SQMP');
  }

  async findAllDetailed() {
    return await db.selectFrom('SQMP as s')
      .leftJoin('MFG_SITES as site', 's.site_id', 'site.site_id')
      .leftJoin('SUPPLIERS as supp', 's.supplier_id', 'supp.supplier_id')
      .leftJoin('MODELS as model', 's.model_id', 'model.model_id')
      .leftJoin('USERS as enc', 's.encoder_id', 'enc.user_id')
      .leftJoin('USERS as iss', 's.issuer_id', 'iss.user_id')
      .leftJoin('USERS as chk', 's.checker_id', 'chk.user_id')
      .leftJoin('USERS as apr', 's.approver_id', 'apr.user_id')
      .selectAll('s')
      .select([
        'site.site_name as site_name',
        'supp.supplier_name as supplier_name',
        'model.model_name as model_name',
        'enc.full_name as encoder_name',
        'iss.full_name as issuer_name',
        'chk.full_name as checker_name',
        'apr.full_name as approver_name'
      ])
      .orderBy('s.registration_date', 'desc')
      .execute();
  }

  async findByIdDetailed(idOrControlNo: string) {
    const record = await db.selectFrom('SQMP as s')
      .leftJoin('MFG_SITES as site', 's.site_id', 'site.site_id')
      .leftJoin('SUPPLIERS as supp', 's.supplier_id', 'supp.supplier_id')
      .leftJoin('MODELS as model', 's.model_id', 'model.model_id')
      .leftJoin('USERS as enc', 's.encoder_id', 'enc.user_id')
      .leftJoin('USERS as iss', 's.issuer_id', 'iss.user_id')
      .leftJoin('USERS as chk', 's.checker_id', 'chk.user_id')
      .leftJoin('USERS as apr', 's.approver_id', 'apr.user_id')
      .selectAll('s')
      .select([
        'site.site_name as site_name',
        'supp.supplier_name as supplier_name',
        'model.model_name as model_name',
        'enc.full_name as encoder_name',
        'iss.full_name as issuer_name',
        'chk.full_name as checker_name',
        'apr.full_name as approver_name'
      ])
      .where((eb: any) => eb.or([
        eb('s.sqmp_id', '=', idOrControlNo),
        eb('s.control_no', '=', idOrControlNo)
      ]))
      .executeTakeFirst();

    if (!record) return null;

    // Subtables
    const mainDocuments = await db.selectFrom('SQMP_DOCUMENT')
      .selectAll()
      .where('sqmp_id', '=', record.sqmp_id)
      .execute();

    const appendixDocuments = await db.selectFrom('SQMP_APPENDIX')
      .selectAll()
      .where('sqmp_id', '=', record.sqmp_id)
      .execute();

    const ccList = await db.selectFrom('SQMP_CC as cc')
      .leftJoin('USERS as u', 'cc.user_id', 'u.user_id')
      .select([
        'cc.sqmp_cc_id',
        'cc.sqmp_id',
        'cc.user_id',
        'cc.last_update',
        'cc.updateby',
        'u.full_name as user_name',
        'u.email as user_email'
      ])
      .where('cc.sqmp_id', '=', record.sqmp_id)
      .execute();

    return { record, mainDocuments, appendixDocuments, ccList };
  }

  async executeTransaction<T>(
    callback: (trx: typeof db) => Promise<T>
  ): Promise<T> {
    return await db.transaction().execute(async (trx: any) => {
      // @ts-ignore
      return await callback(trx);
    });
  }
}

export const sqmpRepository = new SqmpRepository();
