import { BaseRepository } from '../../shared/infrastructure/BaseRepository.js';
import { db } from '../../shared/infrastructure/db.js';
import { NewFiveM1EApp, FiveM1EAppUpdate } from '../../shared/infrastructure/db.types.js';

/** Check if value is a pure numeric string (matches int ID column) */
const isNumeric = (val: string) => /^\d+$/.test(val);

export class FiveM1ERepository extends BaseRepository<'TBL_5M1E_Application'> {
  constructor() {
    super('TBL_5M1E_Application');
  }

  /**
   * Complex find joining the Approval table
   */
  async findWithApproval(idOrControlNo: string) {
    let query = db
      .selectFrom('TBL_5M1E_Application as app')
      .leftJoin('TBL_5M1E_Approval as approval', 'app.ControlNo', 'approval.ControlNo')
      .selectAll('app')
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

  /**
   * Fetch all applications with their approval status
   */
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

  /**
   * Updates approval status in TBL_5M1E_Approval
   */
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
}

export const fiveM1ERepository = new FiveM1ERepository();
