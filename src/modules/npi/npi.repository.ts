import { db } from '../../shared/infrastructure/db.js';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import type { Transaction } from 'kysely';
import type { Database } from '../../shared/infrastructure/db.types.js';

export class NpiRepository extends BaseRepository<'NPI_LOTS'> {
  constructor() {
    super('NPI_LOTS');
  }

  async findAllDetailed() {
    return await db.selectFrom('NPI_LOTS as n')
      .leftJoin('MFG_SITES as s', 'n.site_id', 's.site_id')
      .leftJoin('SUPPLIERS as sup', 'n.supplier_id', 'sup.supplier_id')
      .leftJoin('PARTS as p', 'n.part_id', 'p.part_id')
      .leftJoin('MODELS as m', 'n.model_id', 'm.model_id')
      .leftJoin('PARTTYPES as pt', 'p.parttype_id', 'pt.parttype_id')
      .leftJoin('PARTCLASS as pc', 'p.partclass_id', 'pc.partclass_id')
      .leftJoin('INSPECTIONMETHODS as im', 'n.inspectionmethod_id', 'im.inspectionmethod_id')
      .leftJoin('INSPECTIONCATEGORIES as ic', 'n.inspectioncat_id', 'ic.inspectioncat_id')
      .leftJoin('SEVERITY as sev', 'n.severity_id', 'sev.severity_id')
      .leftJoin('DISPOSITIONS as disp', 'n.disposition_id', 'disp.disposition_id')
      .leftJoin('INSPECTORS as insp', 'n.inspected_by_id', 'insp.inspector_id')
      .leftJoin('INSPECTORS as verifier', 'n.data_verified_by_id', 'verifier.inspector_id')
      .leftJoin('INSPECTORS as checker', 'n.checker_id', 'checker.inspector_id')
      .leftJoin('INSPECTORS as approver', 'n.approver_id', 'approver.inspector_id')
      .selectAll('n')
      .select([
        's.site_name',
        'sup.supplier_name',
        'p.part_name',
        'p.part_code',
        'p.partclass_id',
        'p.parttype_id',
        'm.model_name',
        'pt.parttype_name',
        'pc.partclass_name',
        'im.inspectionmethod_name',
        'ic.inspectioncat_name',
        'sev.severity_name',
        'disp.disposition_name',
        'insp.inspector_name as inspected_by_name',
        'verifier.inspector_name as data_verified_by_name',
        'checker.inspector_name as checker_name',
        'approver.inspector_name as approver_name'
      ])
      .orderBy('n.datecreated', 'desc')
      .execute();
  }

  async findByIdDetailed(idOrControlNo: string) {
    const record = await db.selectFrom('NPI_LOTS as n')
      .leftJoin('MFG_SITES as s', 'n.site_id', 's.site_id')
      .leftJoin('SUPPLIERS as sup', 'n.supplier_id', 'sup.supplier_id')
      .leftJoin('PARTS as p', 'n.part_id', 'p.part_id')
      .leftJoin('MODELS as m', 'n.model_id', 'm.model_id')
      .leftJoin('PARTTYPES as pt', 'p.parttype_id', 'pt.parttype_id')
      .leftJoin('PARTCLASS as pc', 'p.partclass_id', 'pc.partclass_id')
      .leftJoin('INSPECTIONMETHODS as im', 'n.inspectionmethod_id', 'im.inspectionmethod_id')
      .leftJoin('INSPECTIONCATEGORIES as ic', 'n.inspectioncat_id', 'ic.inspectioncat_id')
      .leftJoin('SEVERITY as sev', 'n.severity_id', 'sev.severity_id')
      .leftJoin('DISPOSITIONS as disp', 'n.disposition_id', 'disp.disposition_id')
      .leftJoin('INSPECTORS as insp', 'n.inspected_by_id', 'insp.inspector_id')
      .leftJoin('INSPECTORS as verifier', 'n.data_verified_by_id', 'verifier.inspector_id')
      .leftJoin('INSPECTORS as checker', 'n.checker_id', 'checker.inspector_id')
      .leftJoin('INSPECTORS as approver', 'n.approver_id', 'approver.inspector_id')
      .selectAll('n')
      .select([
        's.site_name',
        'sup.supplier_name',
        'p.part_name',
        'p.part_code',
        'p.partclass_id',
        'p.parttype_id',
        'm.model_name',
        'pt.parttype_name',
        'pc.partclass_name',
        'im.inspectionmethod_name',
        'ic.inspectioncat_name',
        'sev.severity_name',
        'disp.disposition_name',
        'insp.inspector_name as inspected_by_name',
        'verifier.inspector_name as data_verified_by_name',
        'checker.inspector_name as checker_name',
        'approver.inspector_name as approver_name'
      ])
      .where((eb) => eb.or([
        eb('n.npi_lot_id', '=', idOrControlNo),
        eb('n.control_no', '=', idOrControlNo)
      ]))
      .executeTakeFirst();

    if (!record) return null;

    const attachments = await db.selectFrom('NPI_ATTACHMENT')
      .selectAll()
      .where('npi_lot_id', '=', record.npi_lot_id)
      .execute();

    const visual_categories = await db.selectFrom('NPI_VISUALCAT')
      .selectAll()
      .where('npi_lot_id', '=', record.npi_lot_id)
      .execute();

    const data_categories = await db.selectFrom('NPI_DATACAT')
      .selectAll()
      .where('npi_lot_id', '=', record.npi_lot_id)
      .execute();

    const dimension_categories = await db.selectFrom('NPI_DIMENSIONCAT')
      .selectAll()
      .where('npi_lot_id', '=', record.npi_lot_id)
      .execute();

    const cc_list = await db.selectFrom('NPI_CC as cc')
      .leftJoin('INSPECTORS as i', 'cc.user_id', 'i.inspector_id')
      .select([
        'cc.npi_cc_id',
        'cc.npi_lot_id',
        'cc.user_id',
        'cc.last_update',
        'cc.updateby',
        'i.inspector_name as user_name'
      ])
      .where('cc.npi_lot_id', '=', record.npi_lot_id)
      .execute();

    return { record, attachments, visual_categories, data_categories, dimension_categories, cc_list };
  }

  async getNextSequence(prefix: string) {
    const result = await db.selectFrom('NPI_LOTS')
      .select('control_no')
      .where('control_no', 'like', `${prefix}%`)
      .orderBy('control_no', 'desc')
      .executeTakeFirst();
    return result?.control_no || null;
  }

  async findDefaultInspector() {
    const result = await db.selectFrom('INSPECTORS')
      .select('inspector_id')
      .where('active_flag', '=', 1)
      .executeTakeFirst();
    return result?.inspector_id || null;
  }

  async executeTransaction<T>(
    callback: (trx: Transaction<Database>) => Promise<T>
  ): Promise<T> {
    return await db.transaction().execute(async (trx: Transaction<Database>) => {
      return await callback(trx);
    });
  }
}

export const npiRepository = new NpiRepository();
