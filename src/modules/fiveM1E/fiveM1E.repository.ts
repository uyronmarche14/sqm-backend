import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import { db } from '../../shared/infrastructure/db.js';
import { NewFiveM1EApp, FiveM1EAppUpdate } from './fiveM1E.db.types.js';

/** Check if value is a pure numeric string (matches int ID column) */
const isNumeric = (val: string) => /^\d+$/.test(val);

export class FiveM1ERepository extends BaseRepository<'TBL_5M1E_Application'> {
  constructor() {
    super('TBL_5M1E_Application');
  }

  // =========================================================================
  // Application + Approval Queries
  // =========================================================================

  async findWithApproval(idOrControlNo: string) {
    let query = db
      .selectFrom('TBL_5M1E_Application as app')
      .leftJoin('TBL_5M1E_Approval as approval', 'app.ControlNo', 'approval.ControlNo')
      .selectAll('app')
      .selectAll('approval')
      .select([
        'approval.Status as approval_status',
        'approval.MPDPIC as mpd_pic',
        'approval.MPDApprover as mpd_approver',
      ]);

    if (isNumeric(idOrControlNo)) {
      query = query.where((eb: any) => eb.or([
        eb('app.ControlNo', '=', idOrControlNo),
        eb('app.ID', '=', parseInt(idOrControlNo, 10)),
      ]));
    } else {
      query = query.where('app.ControlNo', '=', idOrControlNo);
    }

    return await query.executeTakeFirst();
  }

  async findAllWithApproval(statusFilter?: string) {
    let query = db
      .selectFrom('TBL_5M1E_Application as app')
      .leftJoin('TBL_5M1E_Approval as approval', 'app.ControlNo', 'approval.ControlNo')
      .selectAll('app')
      .select([
        'approval.Status as approval_status',
        'approval.MPDPIC as mpd_pic',
        'approval.MPDApprover as mpd_approver',
      ]);
      
    if (statusFilter && statusFilter !== 'all') {
      query = query.where('approval.Status', '=', statusFilter.toUpperCase());
    }
      
    return await query.orderBy('app.CreateDate', 'desc').execute();
  }

  async createWithApproval(
    appData: NewFiveM1EApp, 
    approvalStatus = 'DRAFT',
    approvalData: Record<string, unknown> = {}
  ) {
    return await db.transaction().execute(async (trx) => {
      const newApp = await trx
        .insertInto('TBL_5M1E_Application')
        .values(appData)
        .returningAll()
        .executeTakeFirstOrThrow();

      await trx
        .insertInto('TBL_5M1E_Approval')
        .values({
          ControlNo: newApp.ControlNo,
          Status: approvalStatus,
          CreateDate: new Date(),
          // NOT NULL defaults required by DB schema
          DSCheckerNecessary: 'NO',
          DSAppproverNecessary: 'NO',
          EnviCheckerNecessary: 'NO',
          EnviAppproverNecessary: 'NO',
          // Spread any extra approval fields from frontend
          ...approvalData,
        })
        .execute();

      return newApp;
    });
  }

  async updateByControlNo(idOrControlNo: string, updateData: FiveM1EAppUpdate) {
    let query = db
      .updateTable('TBL_5M1E_Application')
      .set({
        ...updateData,
        ModifiedDate: new Date(),
      });

    if (isNumeric(idOrControlNo)) {
      query = query.where((eb: any) => eb.or([
        eb('ControlNo', '=', idOrControlNo),
        eb('ID', '=', parseInt(idOrControlNo, 10)),
      ]));
    } else {
      query = query.where('ControlNo', '=', idOrControlNo);
    }

    return await query.returningAll().executeTakeFirst();
  }

  async updateApprovalStatus(controlNo: string, status: string, extraFields?: Record<string, unknown>) {
    const updateData: Record<string, unknown> = {
      Status: status,
      ModifiedDate: new Date(),
      ...extraFields,
    };

    return await db
      .updateTable('TBL_5M1E_Approval')
      .set(updateData)
      .where('ControlNo', '=', controlNo)
      .execute();
  }

  // =========================================================================
  // Delete Operations
  // =========================================================================

  async deleteApproval(controlNo: string) {
    return await db
      .deleteFrom('TBL_5M1E_Approval')
      .where('ControlNo', '=', controlNo)
      .execute();
  }

  async deleteByControlNo(controlNo: string) {
    return await db
      .deleteFrom('TBL_5M1E_Application')
      .where('ControlNo', '=', controlNo)
      .execute();
  }

  // =========================================================================
  // Child Table: Parts (TBL_5M1E_PartsPerReport)
  // =========================================================================

  async findParts(controlNo: string) {
    return await db
      .selectFrom('TBL_5M1E_PartsPerReport')
      .selectAll()
      .where('PartsTag', '=', controlNo)
      .execute();
  }

  async insertParts(controlNo: string, parts: Array<{ part_id?: string }>) {
    for (const part of parts) {
      if (!part.part_id) continue;
      await db.insertInto('TBL_5M1E_PartsPerReport').values({
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

  // =========================================================================
  // Child Table: Attachments (TBL_5M1E_Attachment)
  // =========================================================================

  async findAttachments(controlNo: string) {
    return await db
      .selectFrom('TBL_5M1E_Attachment')
      .selectAll()
      .where('ControlNo', '=', controlNo)
      .execute();
  }

  async insertAttachments(controlNo: string, attachments: Array<{ id?: string; file_name?: string; attribute_1?: string; attribute_2?: string }>) {
    const now = new Date();
    for (const att of attachments) {
      if (!att.file_name) continue;
      await db.insertInto('TBL_5M1E_Attachment').values({
        ControlNo: controlNo,
        FileName: att.file_name,
        Attribute1: att.attribute_1 || null,
        Attribute2: att.attribute_2 || null,
        CreateDate: now,
      } as any).execute();
    }
  }

  async replaceAttachments(controlNo: string, attachments: Array<{ id?: string; file_name?: string; attribute_1?: string; attribute_2?: string }>) {
    await db.deleteFrom('TBL_5M1E_Attachment').where('ControlNo', '=', controlNo).execute();
    await this.insertAttachments(controlNo, attachments);
  }

  // =========================================================================
  // Child Table: Action Items (TBL_5M1E_ActionItems)
  // =========================================================================

  async findActionItems(controlNo: string) {
    return await db
      .selectFrom('TBL_5M1E_ActionItems')
      .selectAll()
      .where('ControlNo', '=', controlNo)
      .execute();
  }

  async insertActionItems(controlNo: string, items: Array<{ action_item?: string; pic?: string; first_target_dt?: string; verification_result?: string; remarks?: string }>) {
    const now = new Date();
    for (const item of items) {
      await db.insertInto('TBL_5M1E_ActionItems').values({
        ControlNo: controlNo,
        ActionItem: item.action_item || null,
        PIC: item.pic || null,
        FirstTargetDt: item.first_target_dt || null,
        VerificationResult: item.verification_result || null,
        Remarks: item.remarks || null,
        CreateDate: now,
      } as any).execute();
    }
  }

  async replaceActionItems(controlNo: string, items: Array<{ action_item?: string; pic?: string; first_target_dt?: string; verification_result?: string; remarks?: string }>) {
    await db.deleteFrom('TBL_5M1E_ActionItems').where('ControlNo', '=', controlNo).execute();
    await this.insertActionItems(controlNo, items);
  }

  // =========================================================================
  // Child Table: Check Items (TBL_5M1E_CheckItems)
  // =========================================================================

  async findCheckItems(controlNo: string) {
    return await db
      .selectFrom('TBL_5M1E_CheckItems')
      .selectAll()
      .where('ControlNo', '=', controlNo)
      .execute();
  }

  async insertCheckItems(controlNo: string, items: Array<{ check_item?: string; judgement?: string; remarks?: string; attribute_1?: string; attribute_2?: string }>) {
    const now = new Date();
    for (const item of items) {
      await db.insertInto('TBL_5M1E_CheckItems').values({
        ControlNo: controlNo,
        CheckItem: item.check_item || '',
        Judgement: item.judgement || '',
        Remarks: item.remarks || null,
        Attribute1: item.attribute_1 || null,
        Attribute2: item.attribute_2 || null,
        CreateDate: now,
      } as any).execute();
    }
  }

  async replaceCheckItems(controlNo: string, items: Array<{ check_item?: string; judgement?: string; remarks?: string; attribute_1?: string; attribute_2?: string }>) {
    await db.deleteFrom('TBL_5M1E_CheckItems').where('ControlNo', '=', controlNo).execute();
    await this.insertCheckItems(controlNo, items);
  }

  // =========================================================================
  // Child Table: Action Item Attachments (TBL_5M1E_AI_Attachment)
  // =========================================================================

  async insertActionItemAttachments(actionItemId: number, attachments: Array<{ file_name?: string; attribute1?: string; attribute2?: string }>) {
    const now = new Date();
    for (const att of attachments) {
      if (!att.file_name) continue;
      await db.insertInto('TBL_5M1E_AI_Attachment').values({
        ChkItemID: actionItemId,
        FileName: att.file_name,
        attribute1: att.attribute1 || null,
        attribute2: att.attribute2 || null,
        CreateDate: now,
      } as any).execute();
    }
  }

  // =========================================================================
  // Child Table: Check Item Attachments (TBL_5M1E_CI_Attachment)
  // =========================================================================

  async insertCheckItemAttachments(checkItemId: number, attachments: Array<{ file_name?: string; attribute1?: string; attribute2?: string }>) {
    const now = new Date();
    for (const att of attachments) {
      if (!att.file_name) continue;
      await db.insertInto('TBL_5M1E_CI_Attachment').values({
        ChkItemID: checkItemId,
        FileName: att.file_name,
        attribute1: att.attribute1 || null,
        attribute2: att.attribute2 || null,
        CreateDate: now,
      } as any).execute();
    }
  }

  // =========================================================================
  // Child Table: Status Remarks (TBL_5M1E_Status_Remarks)
  // =========================================================================

  async findStatusRemarks(controlNo: string) {
    return await db
      .selectFrom('TBL_5M1E_Status_Remarks')
      .selectAll()
      .where('ControlNo', '=', controlNo)
      .orderBy('CreateDate', 'desc')
      .execute();
  }

  async insertStatusRemark(controlNo: string, remark: { remarks?: string; remark_by: string; status: string }) {
    await db.insertInto('TBL_5M1E_Status_Remarks').values({
      ControlNo: controlNo,
      Remarks: remark.remarks || null,
      RemarkBy: remark.remark_by,
      Status: remark.status,
      CreateDate: new Date(),
    } as any).execute();
  }

  async replaceStatusRemarks(controlNo: string, remarks: Array<{ remarks?: string; remark_by: string; status: string; create_date?: string }>) {
    await db.deleteFrom('TBL_5M1E_Status_Remarks').where('ControlNo', '=', controlNo).execute();
    for (const remark of remarks) {
      await this.insertStatusRemark(controlNo, remark);
    }
  }
}

export const fiveM1ERepository = new FiveM1ERepository();
