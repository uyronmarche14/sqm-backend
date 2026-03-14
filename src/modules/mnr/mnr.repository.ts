import { db } from '../../shared/infrastructure/db.js';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';

export class MnrRepository extends BaseRepository<'MNR_LOTS'> {
  constructor() {
    super('MNR_LOTS');
  }

  /**
   * Fetch all records with full human-readable joins
   */
  async findAllDetailed(statusFilter?: string | string[]) {
    let query = db.selectFrom('MNR_LOTS as l')
      .leftJoin('MFG_SITES as st', 'l.site_id', 'st.site_id')
      .leftJoin('SUPPLIERS as s', 'l.supplier_id', 's.supplier_id')
      .leftJoin('MODELS as m', 'l.model_id', 'm.model_id')
      .leftJoin('PRODUCTS as p', 'l.product_id', 'p.product_id')
      .leftJoin('MFG_AREAS as ma', 'l.mfg_area_id', 'ma.mfg_area_id')
      .leftJoin('DEFECTCATEGORIES as dc', 'l.defectcategory_id', 'dc.defectcategory_id')
      .leftJoin('MNRTYPE as mt', 'l.mnrtype_id', 'mt.mnrtype_id')
      .leftJoin('USERS as u', 'l.encoder_id', 'u.user_id')
      .leftJoin('USERS as attn', 'l.attention_id', 'attn.user_id')
      .leftJoin('USERS as iss', 'l.issuer_id', 'iss.user_id')
      .leftJoin('USERS as chk', 'l.checker_id', 'chk.user_id')
      .leftJoin('USERS as app', 'l.approver_id', 'app.user_id')
      .leftJoin('MNR_DETAILS as d', 'l.mnr_id', 'd.mnr_id')
      .leftJoin('PARTS as pc', 'd.part_id', 'pc.part_id')
      .select([
        'l.mnr_id as id',
        'l.control_no',
        'l.request_status as status',
        'l.date_created',
        'l.site_id', 'st.site_name',
        'l.supplier_id', 's.supplier_name',
        'l.model_id', 'm.model_name', 'm.model_no',
        'l.product_id', 'p.product_name',
        'l.mfg_area_id', 'ma.mfg_area_name',
        'l.defectcategory_id', 'dc.defectcategory_name as category_name',
        'l.mnrtype_id', 'mt.mnrtype_name as mnr_type_name',
        'l.attention_id', 'attn.full_name as attention_name',
        'l.encoder_id',
        'l.issuer_id',
        'l.checker_id',
        'l.approver_id',
        'd.part_id', 'pc.part_name', 'pc.part_code',
        'l.reference_no',
        'l.report_issuance_8d',
        'l.recurrence_ref',
        'l.issued_date',
        'l.initial_report_date',
        'l.due_date',
        'l.last_update',
        'l.updateby',
        'u.full_name as encoder_name',
        'attn.full_name as attention_name',
        'iss.full_name as issuer_name',
        'chk.full_name as checker_name',
        'app.full_name as approver_name'
      ]);

    if (statusFilter) {
      if (Array.isArray(statusFilter)) {
        // Expand the filter to include supplementary statuses
        const expandedFilter = new Set<string>();
        for (const status of statusFilter) {
          expandedFilter.add(status);
          if (status === 'SU') expandedFilter.add('CK');
          if (status === 'RC' || status === 'RA' || status === 'RV') {
            expandedFilter.add('RC');
            expandedFilter.add('RA');
            expandedFilter.add('RV');
          }
          if (status === 'RS' || status === 'AC' || status === 'AA' || status === 'RJ') {
            expandedFilter.add('RS');
            expandedFilter.add('AC');
            expandedFilter.add('AA');
            expandedFilter.add('RJ');
          }
          if (status === 'RP') { expandedFilter.add('IS'); expandedFilter.add('CL'); }
        }
        query = query.where('l.request_status', 'in', Array.from(expandedFilter));
      } else {
        // Include CHECKED (CK) records alongside SUBMITTED (SU) for Awaiting Approval
        // so checked records remain visible on the page until approved
        if (statusFilter === 'SU') {
          query = query.where('l.request_status', 'in', ['SU', 'CK']);
        } else if (statusFilter === 'RC' || statusFilter === 'RA' || statusFilter === 'RV') {
          query = query.where('l.request_status', 'in', ['RC', 'RA', 'RV']);
        } else if (statusFilter === 'RS' || statusFilter === 'AC' || statusFilter === 'AA' || statusFilter === 'RJ') {
          query = query.where('l.request_status', 'in', ['RS', 'AC', 'AA', 'RJ']);
        } else if (statusFilter === 'RP') {
          query = query.where('l.request_status', 'in', ['IS', 'CL']);
        } else {
          query = query.where('l.request_status', '=', statusFilter);
        }
      }
    }

    return await query.orderBy('l.date_created', 'desc').execute();
  }

  /**
   * Fetch a single record with nested relations
   */
  async findByIdDetailed(id: string) {
    const record = await db.selectFrom('MNR_LOTS as l')
      .leftJoin('MFG_SITES as st', 'l.site_id', 'st.site_id')
      .leftJoin('SUPPLIERS as s', 'l.supplier_id', 's.supplier_id')
      .leftJoin('MODELS as m', 'l.model_id', 'm.model_id')
      .leftJoin('PRODUCTS as p', 'l.product_id', 'p.product_id')
      .leftJoin('MFG_AREAS as ma', 'l.mfg_area_id', 'ma.mfg_area_id')
      .leftJoin('DEFECTCATEGORIES as dc', 'l.defectcategory_id', 'dc.defectcategory_id')
      .leftJoin('MNRTYPE as mt', 'l.mnrtype_id', 'mt.mnrtype_id')
      .leftJoin('USERS as attn', 'l.attention_id', 'attn.user_id')
      .leftJoin('USERS as enc', 'l.encoder_id', 'enc.user_id')
      .leftJoin('USERS as iss', 'l.issuer_id', 'iss.user_id')
      .leftJoin('USERS as chk', 'l.checker_id', 'chk.user_id')
      .leftJoin('USERS as app', 'l.approver_id', 'app.user_id')
      .selectAll('l')
      .select([
        'st.site_name', 's.supplier_name', 'm.model_name', 'm.model_no',
        'p.product_name', 'ma.mfg_area_name', 'dc.defectcategory_name as category_name',
        'mt.mnrtype_name as mnr_type_name', 'attn.full_name as attention_name',
        'enc.full_name as encoder_name', 'iss.full_name as issuer_name',
        'chk.full_name as checker_name', 'app.full_name as approver_name'
      ])
      .where((eb) => eb.or([
        eb('l.mnr_id', '=', id),
        eb('l.control_no', '=', id)
      ]))
      .executeTakeFirst();

    if (!record) return null;

    // Fetch Details (defects)
    const details = await db.selectFrom('MNR_DETAILS as d')
      .leftJoin('PARTS as pc', 'd.part_id', 'pc.part_id')
      .leftJoin('DEFECTS as df', 'd.defect_id', 'df.defect_id')
      .leftJoin('DEFECTCLASS as dfc', 'd.defectclass_id', 'dfc.defectclass_id')
      .selectAll('d')
      .select(['pc.part_name', 'pc.part_code', 'df.defect_name', 'dfc.defectclass_name as classification_name'])
      .where('d.mnr_id', '=', record.mnr_id)
      .execute();

    // Fetch Response
    const response = await db.selectFrom('MNR_RESPONSE as r')
      .leftJoin('USERS as u', 'r.updateby', 'u.user_id')
      .leftJoin('USERS as chk', 'r.checker_id', 'chk.user_id')
      .leftJoin('USERS as app', 'r.approver_id', 'app.user_id')
      .selectAll('r')
      .select([
        'u.full_name as responded_by_name',
        'chk.full_name as checker_name',
        'app.full_name as approver_name',
      ])
      .where('r.mnr_id', '=', record.mnr_id)
      .executeTakeFirst();

    // Fetch Verification (multi-row history)
    const verificationEntries = await db.selectFrom('MNR_VERIFICATION as v')
      .selectAll('v')
      .where('v.mnr_id', '=', record.mnr_id)
      .orderBy('v.received_date', 'asc')
      .execute();

    // Fetch CC List
    const ccList = await db.selectFrom('MNR_CC as c')
      .leftJoin('USERS as u', 'c.user_id', 'u.user_id')
      .selectAll('c')
      .select(['u.full_name', 'u.email'])
      .where('c.mnr_id', '=', record.mnr_id)
      .execute();

    // Fetch Attachments
    const attachments = await db.selectFrom('MNR_ATTACHMENT')
      .selectAll()
      .where('mnr_id', '=', record.mnr_id)
      .execute();

    const responseAttachments = await db.selectFrom('MNR_RESPONSE_ATTACHMENT')
      .selectAll()
      .where('mnr_response_id', '=', response?.mnr_response_id || '')
      .execute();

    return {
      record,
      details,
      response,
      verificationEntries,
      ccList,
      attachments,
      responseAttachments
    };
  }

  /**
   * Execute transactional operations (e.g. inserting into multiple tables at once)
   */
  async executeTransaction<T>(callback: (trx: typeof db) => Promise<T>): Promise<T> {
    return await db.transaction().execute(async (trx) => {
      // NOTE: Kysely transaction object acts exactly like `db`,
      // just scoped to the transaction. 
      // We pass `trx as any` so it's compatible with methods expecting `db`
      return await callback(trx as any);
    });
  }

  async findLatestResponsesByMnrIds(mnrIds: string[]) {
    if (!mnrIds.length) return [];

    return await db
      .selectFrom('MNR_RESPONSE as r')
      .leftJoin('USERS as chk', 'r.checker_id', 'chk.user_id')
      .leftJoin('USERS as app', 'r.approver_id', 'app.user_id')
      .select([
        'r.mnr_id',
        'r.mnr_response_id',
        'r.checker_id',
        'chk.full_name as checker_name',
        'r.approver_id',
        'app.full_name as approver_name',
        'r.issuer_remarks',
        'r.issuer_date',
        'r.attention_date',
        'r.accept_date',
        'r.last_update',
      ])
      .where('r.mnr_id', 'in', mnrIds)
      .where((eb) =>
        eb(
          'r.last_update',
          '=',
          eb
            .selectFrom('MNR_RESPONSE as r2')
            .select((qb) => qb.fn.max('r2.last_update').as('latest_update'))
            .whereRef('r2.mnr_id', '=', 'r.mnr_id'),
        ),
      )
      .orderBy('r.last_update', 'desc')
      .execute();
  }
}

export const mnrRepository = new MnrRepository();
