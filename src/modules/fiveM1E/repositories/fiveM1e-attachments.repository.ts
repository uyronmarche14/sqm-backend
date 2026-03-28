import { db } from '../../../shared/infrastructure/db.js';

export class FiveM1eAttachmentsRepository {
  async findAttachments(controlNo: string) {
    return await db.selectFrom('TBL_5M1E_Attachment').selectAll().where('ControlNo', '=', controlNo).execute();
  }

  async reserveAttachmentIds(count: number, trxOrDb: any = db) {
    if (count <= 0) {
      return [];
    }

    const nextIdResult = await trxOrDb
      .selectFrom('TBL_5M1E_Attachment')
      .select(db.fn.max('ID').as('maxId'))
      .executeTakeFirst();

    const startId = (Number(nextIdResult?.maxId) || 0) + 1;
    return Array.from({ length: count }, (_, index) => startId + index);
  }

  async insertAttachments(controlNo: string, attachments: Array<{ id?: string; file_name?: string; attribute_1?: string; attribute_2?: string }>) {
    const now = new Date();
    for (const attachment of attachments) {
      if (!attachment.file_name) continue;
      const nextId = Number(attachment.id) || (await this.reserveAttachmentIds(1))[0];

      await db.insertInto('TBL_5M1E_Attachment').values({
        ID: nextId,
        ControlNo: controlNo,
        FileName: attachment.file_name,
        Attribute1: attachment.attribute_1 || null,
        Attribute2: attachment.attribute_2 || null,
        CreateDate: now,
      } as any).execute();
    }
  }

  async replaceAttachments(controlNo: string, attachments: Array<{ id?: string; file_name?: string; attribute_1?: string; attribute_2?: string }>) {
    await db.deleteFrom('TBL_5M1E_Attachment').where('ControlNo', '=', controlNo).execute();
    await this.insertAttachments(controlNo, attachments);
  }
}

export const fiveM1eAttachmentsRepository = new FiveM1eAttachmentsRepository();
