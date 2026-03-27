import { db } from '../../../shared/infrastructure/db.js';

export class FiveM1eRemarksRepository {
  async findStatusRemarks(controlNo: string) {
    return await db
      .selectFrom('TBL_5M1E_Status_Remarks')
      .selectAll()
      .where('ControlNo', '=', controlNo)
      .orderBy('CreateDate', 'desc')
      .execute();
  }

  async insertStatusRemark(controlNo: string, remark: { remarks?: string; remark_by: string; status: string }) {
    const nextIdResult = await db.selectFrom('TBL_5M1E_Status_Remarks').select(db.fn.max('ID').as('maxId')).executeTakeFirst();
    const nextId = (Number(nextIdResult?.maxId) || 0) + 1;

    await db.insertInto('TBL_5M1E_Status_Remarks').values({
      ID: nextId,
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

export const fiveM1eRemarksRepository = new FiveM1eRemarksRepository();
