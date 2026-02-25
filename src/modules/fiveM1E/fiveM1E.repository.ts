import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import { db } from '../../shared/infrastructure/db.js';
import { NewFiveM1EApp, FiveM1EAppUpdate } from '../../shared/infrastructure/db.types.js';

export class FiveM1ERepository extends BaseRepository<'TBL_5M1E_Application'> {
  constructor() {
    super('TBL_5M1E_Application');
  }

  /**
   * Complex find joining the Approval table
   */
  async findWithApproval(controlNo: string) {
    return await db
      .selectFrom('TBL_5M1E_Application as app')
      .leftJoin('TBL_5M1E_Approval as approval', 'app.ControlNo', 'approval.ControlNo')
      .selectAll('app')
      .select([
        'approval.Status as approval_status',
        'approval.MPDPIC as mpd_pic',
        'approval.MPDApprover as mpd_approver',
      ])
      .where('app.ControlNo', '=', controlNo)
      .executeTakeFirst();
  }

  /**
   * Create both Application and initial Approval record in a transaction
   */
  async createWithApproval(appData: NewFiveM1EApp, approvalStatus = 'DRAFT') {
    return await db.transaction().execute(async (trx) => {
      // 1. Insert Application
      const newApp = await trx
        .insertInto('TBL_5M1E_Application')
        .values(appData)
        // Note: MSSQL returning clause equivalent
        .returningAll()
        .executeTakeFirstOrThrow();

      // 2. Insert Initial Approval State
      await trx
        .insertInto('TBL_5M1E_Approval')
        .values({
          ControlNo: newApp.ControlNo,
          Status: approvalStatus,
          CreateDate: new Date(),
        })
        .execute();

      return newApp;
    });
  }

  /**
   * Updates application by ControlNo instead of ID
   */
  async updateByControlNo(controlNo: string, updateData: FiveM1EAppUpdate) {
    return await db
      .updateTable('TBL_5M1E_Application')
      .set({
        ...updateData,
        ModifiedDate: new Date(),
      })
      .where('ControlNo', '=', controlNo)
      .returningAll()
      .executeTakeFirst();
  }
}

export const fiveM1ERepository = new FiveM1ERepository();
