import { db } from '../../shared/infrastructure/db.js';
import type {
  NewSqprLar,
  NewSqprLarCc,
  NewSqprLarDetail,
  SqprLarUpdate,
} from '../sqpr/sqpr.db.types.js';

export interface SupplierQualityHeaderRow {
  sqpr_lar_id: string;
  control_no: string;
  site_id: string;
  site_name: string | null;
  site_code: string | null;
  fiscal_year: number;
  report_type: number;
  month: number;
  file_id: string;
  file_name: string;
  file_extension: string;
  remarks: string | null;
  date_created: Date | string;
  worst_lar_remarks: string | null;
  worst_dppm_remarks: string | null;
  incharge_id: string;
  incharge_name: string | null;
  submit_date: Date | string | null;
  incharge_remarks: string | null;
  checker_id: string | null;
  checker_name: string | null;
  checker_remarks: string | null;
  checker_date: Date | string | null;
  approver_id: string | null;
  approver_name: string | null;
  approver_remarks: string | null;
  approver_date: Date | string | null;
  request_status: string;
  last_update: Date | string;
  updateby: string;
}

export interface SupplierQualityDetailRow {
  sqpr_lar_detail_id: string;
  sqpr_lar_id: string;
  detail_type: number;
  supplier_id: string;
  supplier_name: string | null;
  value: number;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export interface SupplierQualityCcRow {
  sqpr_lar_cc_id: string;
  sqpr_lar_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  last_update: Date | string;
  updateby: string;
}

export class SupplierQualityRepository {
  private baseHeaderQuery() {
    return db
      .selectFrom('SQPR_LAR as lar')
      .innerJoin('MFG_SITES as site', 'lar.site_id', 'site.site_id')
      .leftJoin('USERS as issuer', 'lar.incharge_id', 'issuer.user_id')
      .leftJoin('USERS as checker', 'lar.checker_id', 'checker.user_id')
      .leftJoin('USERS as approver', 'lar.approver_id', 'approver.user_id')
      .select([
        'lar.sqpr_lar_id',
        'lar.control_no',
        'lar.site_id',
        'site.site_name as site_name',
        'site.site_code as site_code',
        'lar.fiscal_year',
        'lar.report_type',
        'lar.month',
        'lar.file_id',
        'lar.file_name',
        'lar.file_extension',
        'lar.remarks',
        'lar.date_created',
        'lar.worst_lar_remarks',
        'lar.worst_dppm_remarks',
        'lar.incharge_id',
        'issuer.full_name as incharge_name',
        'lar.submit_date',
        'lar.incharge_remarks',
        'lar.checker_id',
        'checker.full_name as checker_name',
        'lar.checker_remarks',
        'lar.checker_date',
        'lar.approver_id',
        'approver.full_name as approver_name',
        'lar.approver_remarks',
        'lar.approver_date',
        'lar.request_status',
        'lar.last_update',
        'lar.updateby',
      ]);
  }

  async findAllHeaders() {
    return await this.baseHeaderQuery()
      .orderBy('lar.last_update', 'desc')
      .execute() as unknown as SupplierQualityHeaderRow[];
  }

  async findHeaderById(idOrControlNo: string) {
    return await this.baseHeaderQuery()
      .where((eb) =>
        eb.or([
          eb('lar.sqpr_lar_id', '=', idOrControlNo),
          eb('lar.control_no', '=', idOrControlNo),
        ]),
      )
      .executeTakeFirst() as unknown as SupplierQualityHeaderRow | undefined;
  }

  async findDetailsByRecordIds(recordIds: string[]) {
    if (recordIds.length === 0) {
      return [] as SupplierQualityDetailRow[];
    }

    return await db
      .selectFrom('SQPR_LAR_DETAIL as detail')
      .innerJoin('SUPPLIERS as supplier', 'detail.supplier_id', 'supplier.supplier_id')
      .select([
        'detail.sqpr_lar_detail_id',
        'detail.sqpr_lar_id',
        'detail.detail_type',
        'detail.supplier_id',
        'supplier.supplier_name as supplier_name',
        'detail.value',
        'detail.remarks',
        'detail.last_update',
        'detail.updateby',
      ])
      .where('detail.sqpr_lar_id', 'in', recordIds)
      .orderBy('detail.detail_type', 'asc')
      .orderBy('supplier.supplier_name', 'asc')
      .execute() as SupplierQualityDetailRow[];
  }

  async findCcByRecordIds(recordIds: string[]) {
    if (recordIds.length === 0) {
      return [] as SupplierQualityCcRow[];
    }

    return await db
      .selectFrom('SQPR_LAR_CC as cc')
      .innerJoin('USERS as user', 'cc.user_id', 'user.user_id')
      .select([
        'cc.sqpr_lar_cc_id',
        'cc.sqpr_lar_id',
        'cc.user_id',
        'user.full_name',
        'user.email',
        'cc.last_update',
        'cc.updateby',
      ])
      .where('cc.sqpr_lar_id', 'in', recordIds)
      .orderBy('user.full_name', 'asc')
      .execute() as SupplierQualityCcRow[];
  }

  async findSiteCode(siteId: string) {
    return await db
      .selectFrom('MFG_SITES')
      .select(['site_code', 'site_name'])
      .where('site_id', '=', siteId)
      .executeTakeFirst();
  }

  async findAttachmentOwner(fileId: string) {
    return await db
      .selectFrom('SQPR_LAR')
      .select(['sqpr_lar_id'])
      .where('file_id', '=', fileId)
      .executeTakeFirst();
  }

  async executeTransaction<T>(callback: (trx: typeof db) => Promise<T>) {
    return await db.transaction().execute(async (trx) => await callback(trx as typeof db));
  }

  async insertRecord(trx: typeof db, values: NewSqprLar) {
    await trx.insertInto('SQPR_LAR').values(values).execute();
  }

  async updateRecord(trx: typeof db, recordId: string, values: SqprLarUpdate) {
    await trx
      .updateTable('SQPR_LAR')
      .set(values)
      .where('sqpr_lar_id', '=', recordId)
      .execute();
  }

  async replaceDetails(trx: typeof db, recordId: string, rows: NewSqprLarDetail[]) {
    await trx.deleteFrom('SQPR_LAR_DETAIL').where('sqpr_lar_id', '=', recordId).execute();
    if (rows.length > 0) {
      await trx.insertInto('SQPR_LAR_DETAIL').values(rows).execute();
    }
  }

  async replaceCc(trx: typeof db, recordId: string, rows: NewSqprLarCc[]) {
    await trx.deleteFrom('SQPR_LAR_CC').where('sqpr_lar_id', '=', recordId).execute();
    if (rows.length > 0) {
      await trx.insertInto('SQPR_LAR_CC').values(rows).execute();
    }
  }

  async deleteRecordTree(trx: typeof db, recordId: string) {
    await trx.deleteFrom('SQPR_LAR_DETAIL').where('sqpr_lar_id', '=', recordId).execute();
    await trx.deleteFrom('SQPR_LAR_CC').where('sqpr_lar_id', '=', recordId).execute();
    await trx.deleteFrom('SQPR_LAR').where('sqpr_lar_id', '=', recordId).execute();
  }

  async controlNoExists(controlNo: string, excludeId?: string) {
    let query = db
      .selectFrom('SQPR_LAR')
      .select('sqpr_lar_id')
      .where('control_no', '=', controlNo);

    if (excludeId) {
      query = query.where('sqpr_lar_id', '!=', excludeId);
    }

    return await query.executeTakeFirst();
  }
}

export const supplierQualityRepository = new SupplierQualityRepository();
