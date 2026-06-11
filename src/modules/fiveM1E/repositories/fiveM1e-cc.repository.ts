import { v4 as uuidv4 } from 'uuid';
import { sql } from 'kysely';
import { db } from '../../../shared/infrastructure/db.js';

export class FiveM1eCcRepository {
  async findCCUsers(controlNo: string) {
    const result = await sql`
      SELECT cc.ID as id, cc.ControlNo as control_no, cc.UserID as user_id,
             u.full_name, u.email
      FROM TBL_5M1E_CC cc
      LEFT JOIN USERS u ON cc.UserID = u.user_id
      WHERE cc.ControlNo = ${controlNo}
    `.execute(db);

    return result.rows;
  }

  async replaceCCUsers(controlNo: string, ccList: any[], userId: string = 'SYSTEM') {
    await db.deleteFrom('TBL_5M1E_CC' as any).where('ControlNo', '=', controlNo).execute();

    if (ccList && ccList.length > 0) {
      for (const cc of ccList) {
        await db.insertInto('TBL_5M1E_CC' as any).values({
          ID: uuidv4(),
          ControlNo: controlNo,
          UserID: cc.user_id,
          UpdateBy: userId,
          LastUpdate: new Date(),
        }).execute();
      }
    }
  }
}

export const fiveM1eCcRepository = new FiveM1eCcRepository();
