import { db } from '../../../shared/infrastructure/db.js';

export class FiveM1eActionItemsRepository {
  async findActionItems(controlNo: string) {
    return await db.selectFrom('TBL_5M1E_ActionItems').selectAll().where('ControlNo', '=', controlNo).execute();
  }

  async insertActionItems(controlNo: string, items: Array<{ action_item?: string; pic?: string; first_target_dt?: string; verification_result?: string; remarks?: string }>) {
    const now = new Date();
    for (const item of items) {
      const nextIdResult = await db.selectFrom('TBL_5M1E_ActionItems').select(db.fn.max('ID').as('maxId')).executeTakeFirst();
      const nextId = (Number(nextIdResult?.maxId) || 0) + 1;

      await db.insertInto('TBL_5M1E_ActionItems').values({
        ID: nextId,
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

  async deleteActionItemAttachmentsByControlNo(controlNo: string) {
    const dbAny = db as any;
    return await dbAny
      .deleteFrom('TBL_5M1E_AI_Attachment')
      .where(
        'ChkItemID',
        'in',
        dbAny.selectFrom('TBL_5M1E_ActionItems').select('ID').where('ControlNo', '=', controlNo),
      )
      .execute();
  }

  async insertActionItemAttachments(actionItemId: number, attachments: Array<{ file_name?: string; attribute1?: string; attribute2?: string }>) {
    const now = new Date();
    for (const attachment of attachments) {
      if (!attachment.file_name) continue;
      const nextIdResult = await db.selectFrom('TBL_5M1E_AI_Attachment').select(db.fn.max('ID').as('maxId')).executeTakeFirst();
      const nextId = (Number(nextIdResult?.maxId) || 0) + 1;

      await db.insertInto('TBL_5M1E_AI_Attachment').values({
        ID: nextId,
        ChkItemID: actionItemId,
        FileName: attachment.file_name,
        attribute1: attachment.attribute1 || null,
        attribute2: attachment.attribute2 || null,
        CreateDate: now,
      } as any).execute();
    }
  }

  async replaceActionItems(controlNo: string, items: Array<{ action_item?: string; pic?: string; first_target_dt?: string; verification_result?: string; remarks?: string }>) {
    await this.deleteActionItemAttachmentsByControlNo(controlNo);
    await db.deleteFrom('TBL_5M1E_ActionItems').where('ControlNo', '=', controlNo).execute();
    await this.insertActionItems(controlNo, items);
  }
}

export const fiveM1eActionItemsRepository = new FiveM1eActionItemsRepository();
