import { db } from '../../../shared/infrastructure/db.js';

export class FiveM1eCheckItemsRepository {
  async findCheckItems(controlNo: string) {
    const items = await db
      .selectFrom('TBL_5M1E_CheckItems')
      .selectAll()
      .where('ControlNo', '=', controlNo)
      .execute();

    if (items.length === 0) {
      return [];
    }

    const attachments = await db
      .selectFrom('TBL_5M1E_CI_Attachment')
      .selectAll()
      .where('ChkItemID', 'in', items.map((item) => Number(item.ID || 0)).filter(Boolean))
      .execute();

    const attachmentsByItemId = new Map<number, any[]>();
    attachments.forEach((attachment: any) => {
      const itemId = Number(attachment.ChkItemID || 0);
      if (!attachmentsByItemId.has(itemId)) {
        attachmentsByItemId.set(itemId, []);
      }
      attachmentsByItemId.get(itemId)!.push(attachment);
    });

    return items.map((item: any) => ({
      ...item,
      attachments: attachmentsByItemId.get(Number(item.ID || 0)) || [],
    }));
  }

  async insertCheckItems(controlNo: string, items: Array<{
    check_item?: string;
    judgement?: string;
    remarks?: string;
    attribute_1?: string;
    attribute_2?: string;
    attachments?: Array<{ file_name?: string; attribute1?: string; attribute2?: string }>;
  }>) {
    const now = new Date();
    const insertedItems: Array<{ id: number }> = [];
    for (const item of items) {
      const nextIdResult = await db.selectFrom('TBL_5M1E_CheckItems').select(db.fn.max('ID').as('maxId')).executeTakeFirst();
      const nextId = (Number(nextIdResult?.maxId) || 0) + 1;

      await db.insertInto('TBL_5M1E_CheckItems').values({
        ID: nextId,
        ControlNo: controlNo,
        CheckItem: item.check_item || '',
        Judgement: item.judgement || '',
        Remarks: item.remarks || null,
        Attribute1: item.attribute_1 || null,
        Attribute2: item.attribute_2 || null,
        CreateDate: now,
      } as any).execute();
      insertedItems.push({ id: nextId });
    }

    return insertedItems;
  }

  async deleteCheckItemAttachmentsByControlNo(controlNo: string) {
    const dbAny = db as any;
    return await dbAny
      .deleteFrom('TBL_5M1E_CI_Attachment')
      .where(
        'ChkItemID',
        'in',
        dbAny.selectFrom('TBL_5M1E_CheckItems').select('ID').where('ControlNo', '=', controlNo),
      )
      .execute();
  }

  async insertCheckItemAttachments(checkItemId: number, attachments: Array<{ file_name?: string; attribute1?: string; attribute2?: string }>) {
    const now = new Date();
    for (const attachment of attachments) {
      if (!attachment.file_name) continue;
      const nextIdResult = await db.selectFrom('TBL_5M1E_CI_Attachment').select(db.fn.max('ID').as('maxId')).executeTakeFirst();
      const nextId = (Number(nextIdResult?.maxId) || 0) + 1;

      await db.insertInto('TBL_5M1E_CI_Attachment').values({
        ID: nextId,
        ChkItemID: checkItemId,
        FileName: attachment.file_name,
        attribute1: attachment.attribute1 || null,
        attribute2: attachment.attribute2 || null,
        CreateDate: now,
      } as any).execute();
    }
  }

  async replaceCheckItems(controlNo: string, items: Array<{
    check_item?: string;
    judgement?: string;
    remarks?: string;
    attribute_1?: string;
    attribute_2?: string;
    attachments?: Array<{ file_name?: string; attribute1?: string; attribute2?: string }>;
  }>) {
    await this.deleteCheckItemAttachmentsByControlNo(controlNo);
    await db.deleteFrom('TBL_5M1E_CheckItems').where('ControlNo', '=', controlNo).execute();
    const insertedItems = await this.insertCheckItems(controlNo, items);

    for (const [index, inserted] of insertedItems.entries()) {
      const attachments = items[index]?.attachments || [];
      if (attachments.length > 0) {
        await this.insertCheckItemAttachments(inserted.id, attachments);
      }
    }

    return insertedItems;
  }
}

export const fiveM1eCheckItemsRepository = new FiveM1eCheckItemsRepository();
