import { sql } from 'kysely';
import { db } from '../../shared/infrastructure/db.js';
import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import type { NewSsiPlan, NewSsiRecord, NewSsiResponse, NewSsiWorkflowEvent, SsiPlanUpdate, SsiRecordUpdate, SsiResponseUpdate } from './ssi.db.types.js';

type RecordFilters = {
  statuses?: string[];
  category?: string | null;
  keyword?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  month?: string | null;
  reportView?: boolean;
};

function getMonthBounds(month: string) {
  const [yearText, monthText] = month.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export class SsiRepository extends BaseRepository<'SSI_RECORD'> {
  constructor() {
    super('SSI_RECORD');
  }

  executeTransaction<T>(callback: (trx: any) => Promise<T>) {
    return db.transaction().execute(callback);
  }

  async findSupplierIdsByUserId(userId: string) {
    const rows = await db
      .selectFrom('SUPPLIERSUSER')
      .select(['supplier_id'])
      .where('user_id', '=', userId)
      .execute();

    return rows.map((row) => String(row.supplier_id || '')).filter(Boolean);
  }

  async findActorRoleName(userId: string) {
    const row = await db
      .selectFrom('USERS as u')
      .leftJoin('ROLES as r', 'u.role_id', 'r.role_id')
      .select(['r.role_name'])
      .where('u.user_id', '=', userId)
      .executeTakeFirst();

    return String(row?.role_name || '') || null;
  }

  async findAllPlans(statuses?: string[]) {
    let query = db
      .selectFrom('SSI_PLAN as plan')
      .leftJoin('MFG_SITES as site', 'plan.mfg_site_id', 'site.site_id')
      .leftJoin('SUPPLIERS as supplier', 'plan.supplier_id', 'supplier.supplier_id')
      .leftJoin('USERS as sqe', 'plan.sqe_pic_id', 'sqe.user_id')
      .leftJoin('SSI_RECORD as record', 'plan.linked_record_id', 'record.ssi_record_id')
      .selectAll('plan')
      .select([
        'site.site_name',
        'supplier.supplier_name',
        'sqe.full_name as sqe_pic_name',
        'record.request_status as record_status',
      ]);

    if (statuses?.length) {
      query = query.where('plan.request_status', 'in', statuses);
    }

    return query.orderBy('plan.scheduled_date', 'desc').execute();
  }

  async findPlanById(id: string) {
    return db
      .selectFrom('SSI_PLAN as plan')
      .leftJoin('MFG_SITES as site', 'plan.mfg_site_id', 'site.site_id')
      .leftJoin('SUPPLIERS as supplier', 'plan.supplier_id', 'supplier.supplier_id')
      .leftJoin('USERS as sqe', 'plan.sqe_pic_id', 'sqe.user_id')
      .leftJoin('SSI_RECORD as record', 'plan.linked_record_id', 'record.ssi_record_id')
      .selectAll('plan')
      .select([
        'site.site_name',
        'supplier.supplier_name',
        'sqe.full_name as sqe_pic_name',
        'record.request_status as record_status',
      ])
      .where('plan.ssi_plan_id', '=', id)
      .executeTakeFirst();
  }

  async insertPlan(trx: any, payload: NewSsiPlan) {
    await trx.insertInto('SSI_PLAN').values(payload).execute();
  }

  async updatePlan(trx: any, id: string, payload: SsiPlanUpdate) {
    await trx.updateTable('SSI_PLAN').set(payload).where('ssi_plan_id', '=', id).execute();
  }

  async deletePlan(trx: any, id: string) {
    await trx.deleteFrom('SSI_PLAN').where('ssi_plan_id', '=', id).execute();
  }

  async findAllRecords(filters: RecordFilters = {}) {
    let query = db
      .selectFrom('SSI_RECORD as record')
      .leftJoin('MFG_SITES as site', 'record.mfg_site_id', 'site.site_id')
      .leftJoin('SUPPLIERS as supplier', 'record.supplier_id', 'supplier.supplier_id')
      .leftJoin('USERS as sqe', 'record.sqe_pic_id', 'sqe.user_id')
      .selectAll('record')
      .select([
        'site.site_name',
        'supplier.supplier_name',
        'sqe.full_name as sqe_pic_name',
      ]);

    if (filters.statuses?.length) {
      query = query.where('record.request_status', 'in', filters.statuses);
    }
    if (filters.category) {
      query = query.where('record.category_family', '=', filters.category);
    }
    if (filters.month) {
      const bounds = getMonthBounds(filters.month);
      query = query
        .where(sql`CONVERT(date, ${sql.ref('record.scheduled_date')})`, '>=', bounds.start)
        .where(sql`CONVERT(date, ${sql.ref('record.scheduled_date')})`, '<', bounds.end);
    }
    if (filters.dateFrom) {
      query = query.where(sql`CONVERT(date, ${sql.ref('record.scheduled_date')})`, '>=', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.where(sql`CONVERT(date, ${sql.ref('record.scheduled_date')})`, '<=', filters.dateTo);
    }
    if (filters.keyword) {
      const keyword = `%${filters.keyword.trim()}%`;
      query = query.where((eb) =>
        eb.or([
          eb('record.control_no', 'like', keyword),
          eb('supplier.supplier_name', 'like', keyword),
          eb('site.site_name', 'like', keyword),
          eb('record.remarks', 'like', keyword),
          eb('record.audit_type', 'like', keyword),
        ]),
      );
    }

    return query.orderBy('record.scheduled_date', 'desc').orderBy('record.created_date', 'desc').execute();
  }

  async findRecordById(id: string) {
    return db
      .selectFrom('SSI_RECORD as record')
      .leftJoin('MFG_SITES as site', 'record.mfg_site_id', 'site.site_id')
      .leftJoin('SUPPLIERS as supplier', 'record.supplier_id', 'supplier.supplier_id')
      .leftJoin('USERS as sqe', 'record.sqe_pic_id', 'sqe.user_id')
      .selectAll('record')
      .select([
        'site.site_name',
        'supplier.supplier_name',
        'sqe.full_name as sqe_pic_name',
      ])
      .where('record.ssi_record_id', '=', id)
      .executeTakeFirst();
  }

  async insertRecord(trx: any, payload: NewSsiRecord) {
    await trx.insertInto('SSI_RECORD').values(payload).execute();
  }

  async updateRecord(trx: any, id: string, payload: SsiRecordUpdate) {
    await trx.updateTable('SSI_RECORD').set(payload).where('ssi_record_id', '=', id).execute();
  }

  async deleteRecord(trx: any, id: string) {
    await trx.deleteFrom('SSI_RESPONSE').where('ssi_record_id', '=', id).execute();
    await trx.deleteFrom('SSI_WORKFLOW_EVENT').where('ssi_record_id', '=', id).execute();
    await trx.deleteFrom('SSI_RECORD').where('ssi_record_id', '=', id).execute();
  }

  async insertWorkflowEvent(trx: any, payload: NewSsiWorkflowEvent) {
    await trx.insertInto('SSI_WORKFLOW_EVENT').values(payload).execute();
  }

  async findResponseByRecordId(recordId: string) {
    return db.selectFrom('SSI_RESPONSE').selectAll().where('ssi_record_id', '=', recordId).executeTakeFirst();
  }

  async upsertResponse(trx: any, recordId: string, createPayload: NewSsiResponse, updatePayload: SsiResponseUpdate) {
    const existing = await trx
      .selectFrom('SSI_RESPONSE')
      .select(['ssi_response_id'])
      .where('ssi_record_id', '=', recordId)
      .executeTakeFirst();

    if (existing?.ssi_response_id) {
      await trx
        .updateTable('SSI_RESPONSE')
        .set(updatePayload)
        .where('ssi_response_id', '=', existing.ssi_response_id)
        .execute();
      return existing.ssi_response_id;
    }

    await trx.insertInto('SSI_RESPONSE').values(createPayload).execute();
    return createPayload.ssi_response_id as string;
  }

  async listSites() {
    return db
      .selectFrom('MFG_SITES')
      .select(['site_id as id', 'site_code as code', 'site_name as name'])
      .orderBy('site_name')
      .execute();
  }

  async listSuppliers() {
    return db
      .selectFrom('SUPPLIERS as supplier')
      .leftJoin('MFG_SITES as site', 'supplier.site_id', 'site.site_id')
      .select([
        'supplier.supplier_id as id',
        'supplier.supplier_name as name',
        'supplier.site_id as siteId',
        'site.site_name as siteName',
      ])
      .orderBy('supplier.supplier_name')
      .execute();
  }

  async listInspectors() {
    return db
      .selectFrom('INSPECTORS')
      .select(['inspector_id as id', 'inspector_name as name'])
      .orderBy('inspector_name')
      .execute();
  }

  async listSqeUsers() {
    return db
      .selectFrom('USERS as user')
      .leftJoin('ROLES as role', 'user.role_id', 'role.role_id')
      .select([
        'user.user_id as id',
        'user.full_name as full_name',
        'role.role_name as role_name',
      ])
      .where('role.role_name', 'like', '%SQE%')
      .orderBy('user.full_name')
      .execute();
  }
}

export const ssiRepository = new SsiRepository();
