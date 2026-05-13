import { randomUUID } from 'crypto';
import { db } from '../../shared/infrastructure/db.js';
import type {
  NewSpc,
  NewSpcAttachment,
  NewSpcWorkflow,
  SpcUpdate,
  SpcWorkflowUpdate,
} from './spc-trend.db.types.js';

export interface SpcTrendHeaderRow {
  spc_id: string;
  control_no: string;
  upload_date: Date | string;
  incharge_id: string;
  incharge_name: string | null;
  site_id: string;
  site_name: string | null;
  site_code: string | null;
  supplier_id: string;
  supplier_name: string | null;
  part_id: string;
  part_code: string | null;
  part_name: string | null;
  remarks: string | null;
  submit_date: Date | string | null;
  request_status: string;
  last_update: Date | string;
  updateby: string;
  supplier_incharge_id: string | null;
  supplier_incharge_name: string | null;
  issuer_id: string | null;
  issuer_name: string | null;
  checker_id: string | null;
  checker_name: string | null;
  approver_id: string | null;
  approver_name: string | null;
  issuer_remarks: string | null;
  checker_remarks: string | null;
  approver_remarks: string | null;
  checked_at: Date | string | null;
  approved_at: Date | string | null;
  rejected_at: Date | string | null;
  issued_at: Date | string | null;
  last_action_by: string | null;
}

export interface SpcTrendAttachmentRow {
  spc_attachment_id: string;
  spc_id: string;
  file_name: string;
  file_extension: string | null;
  remarks: string | null;
  last_update: Date | string;
  updateby: string;
}

export class SpcTrendRepository {
  private baseHeaderQuery() {
    return db
      .selectFrom('SPC as spc')
      .innerJoin('MFG_SITES as site', 'spc.site_id', 'site.site_id')
      .innerJoin('SUPPLIERS as supplier', 'spc.supplier_id', 'supplier.supplier_id')
      .innerJoin('PARTS as part', 'spc.part_id', 'part.part_id')
      .leftJoin('SPC_WORKFLOW as workflow', 'spc.spc_id', 'workflow.spc_id')
      .leftJoin('USERS as owner', 'spc.incharge_id', 'owner.user_id')
      .leftJoin('USERS as supplierIncharge', 'workflow.supplier_incharge_id', 'supplierIncharge.user_id')
      .leftJoin('USERS as issuer', 'workflow.issuer_id', 'issuer.user_id')
      .leftJoin('USERS as checker', 'workflow.checker_id', 'checker.user_id')
      .leftJoin('USERS as approver', 'workflow.approver_id', 'approver.user_id')
      .select([
        'spc.spc_id',
        'spc.control_no',
        'spc.upload_date',
        'spc.incharge_id',
        'owner.full_name as incharge_name',
        'spc.site_id',
        'site.site_name as site_name',
        'site.site_code as site_code',
        'spc.supplier_id',
        'supplier.supplier_name as supplier_name',
        'spc.part_id',
        'part.part_code as part_code',
        'part.part_name as part_name',
        'spc.remarks',
        'spc.submit_date',
        'spc.request_status',
        'spc.last_update',
        'spc.updateby',
        'workflow.supplier_incharge_id',
        'supplierIncharge.full_name as supplier_incharge_name',
        'workflow.issuer_id',
        'issuer.full_name as issuer_name',
        'workflow.checker_id',
        'checker.full_name as checker_name',
        'workflow.approver_id',
        'approver.full_name as approver_name',
        'workflow.issuer_remarks',
        'workflow.checker_remarks',
        'workflow.approver_remarks',
        'workflow.checked_at',
        'workflow.approved_at',
        'workflow.rejected_at',
        'workflow.issued_at',
        'workflow.last_action_by',
      ]);
  }

  async findAllHeaders() {
    return await this.baseHeaderQuery()
      .orderBy('spc.last_update', 'desc')
      .execute() as unknown as SpcTrendHeaderRow[];
  }

  async findHeaderById(idOrControlNo: string) {
    return await this.baseHeaderQuery()
      .where((eb) =>
        eb.or([
          eb('spc.spc_id', '=', idOrControlNo),
          eb('spc.control_no', '=', idOrControlNo),
        ]),
      )
      .executeTakeFirst() as unknown as SpcTrendHeaderRow | undefined;
  }

  async findAttachmentsByRecordIds(recordIds: string[]) {
    if (recordIds.length === 0) {
      return [] as SpcTrendAttachmentRow[];
    }

    return await db
      .selectFrom('SPC_ATTACHMENT')
      .select([
        'spc_attachment_id',
        'spc_id',
        'file_name',
        'file_extension',
        'remarks',
        'last_update',
        'updateby',
      ])
      .where('spc_id', 'in', recordIds)
      .orderBy('last_update', 'desc')
      .execute() as SpcTrendAttachmentRow[];
  }

  async findSite(siteId: string) {
    return await db
      .selectFrom('MFG_SITES')
      .select(['site_id', 'site_name', 'site_code'])
      .where('site_id', '=', siteId)
      .executeTakeFirst();
  }

  async findAttachmentOwner(attachmentId: string) {
    return await db
      .selectFrom('SPC_ATTACHMENT')
      .select(['spc_id'])
      .where('spc_attachment_id', '=', attachmentId)
      .executeTakeFirst();
  }

  async controlNoExists(controlNo: string, excludeId?: string) {
    let query = db
      .selectFrom('SPC')
      .select('spc_id')
      .where('control_no', '=', controlNo);

    if (excludeId) {
      query = query.where('spc_id', '!=', excludeId);
    }

    return await query.executeTakeFirst();
  }

  async executeTransaction<T>(callback: (trx: typeof db) => Promise<T>) {
    return await db.transaction().execute(async (trx) => await callback(trx as typeof db));
  }

  async insertRecord(trx: typeof db, values: NewSpc) {
    await trx.insertInto('SPC').values(values).execute();
  }

  async updateRecord(trx: typeof db, recordId: string, values: SpcUpdate) {
    await trx
      .updateTable('SPC')
      .set(values)
      .where('spc_id', '=', recordId)
      .execute();
  }

  async replaceAttachment(trx: typeof db, recordId: string, attachment: NewSpcAttachment | null) {
    await trx.deleteFrom('SPC_ATTACHMENT').where('spc_id', '=', recordId).execute();
    if (attachment) {
      await trx.insertInto('SPC_ATTACHMENT').values(attachment).execute();
    }
  }

  async upsertWorkflow(trx: typeof db, recordId: string, values: Omit<NewSpcWorkflow, 'spc_workflow_id' | 'spc_id'> & { spc_workflow_id?: string }) {
    const existing = await trx
      .selectFrom('SPC_WORKFLOW')
      .select('spc_workflow_id')
      .where('spc_id', '=', recordId)
      .executeTakeFirst();

    if (existing?.spc_workflow_id) {
      await trx
        .updateTable('SPC_WORKFLOW')
        .set(values)
        .where('spc_id', '=', recordId)
        .execute();
      return;
    }

    await trx
        .insertInto('SPC_WORKFLOW')
        .values({
          ...values,
          spc_workflow_id: values.spc_workflow_id || randomUUID(),
          spc_id: recordId,
        })
      .execute();
  }

  async updateWorkflow(trx: typeof db, recordId: string, values: SpcWorkflowUpdate) {
    await trx
      .updateTable('SPC_WORKFLOW')
      .set(values)
      .where('spc_id', '=', recordId)
      .execute();
  }

  async deleteRecordTree(trx: typeof db, recordId: string) {
    await trx.deleteFrom('SPC_ATTACHMENT').where('spc_id', '=', recordId).execute();
    await trx.deleteFrom('SPC_WORKFLOW').where('spc_id', '=', recordId).execute();
    await trx.deleteFrom('SPC').where('spc_id', '=', recordId).execute();
  }
}

export const spcTrendRepository = new SpcTrendRepository();
