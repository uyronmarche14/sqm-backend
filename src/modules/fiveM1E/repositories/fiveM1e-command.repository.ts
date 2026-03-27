import { db } from '../../../shared/infrastructure/db.js';
import { NewFiveM1EApp, FiveM1EAppUpdate } from '../fiveM1E.db.types.js';
import { getNextTableId, isNumeric } from './fiveM1e-repository.utils.js';

export class FiveM1eCommandRepository {
  async createWithApproval(
    appData: NewFiveM1EApp,
    approvalStatus = 'DRAFT',
    approvalData: Record<string, unknown> = {},
  ) {
    return await db.transaction().execute(async (trx) => {
      const nextAppId = await getNextTableId(trx, 'TBL_5M1E_Application');
      const nextApprovalId = await getNextTableId(trx, 'TBL_5M1E_Approval');

      await trx
        .insertInto('TBL_5M1E_Application')
        .values({
          ID: nextAppId,
          ControlNo: appData.ControlNo,
          Title: appData.Title,
          SupplierID: appData.SupplierID,
          SupplierCN: appData.SupplierCN,
          VendorID: appData.VendorID,
          ItemID: appData.ItemID,
          SiteID: appData.SiteID,
          CommodityID: appData.CommodityID,
          ModelID: appData.ModelID,
          EngineerRemarks: appData.EngineerRemarks,
          ReportNo: appData.ReportNo,
          DateRegister: appData.DateRegister,
          Class: appData.Class,
          ClassType: appData.ClassType,
          ImpactDate: appData.ImpactDate,
          Attribute01: appData.Attribute01,
          Attribute02: appData.Attribute02,
          Attribute03: appData.Attribute03,
          Attribute04: appData.Attribute04,
          Attribute05: appData.Attribute05,
          Attribute06: appData.Attribute06,
          Attribute07: appData.Attribute07,
          Attribute08: appData.Attribute08,
          Attribute09: appData.Attribute09,
          Attribute10: appData.Attribute10,
          RankID: appData.RankID,
          ChangeQCProcess: appData.ChangeQCProcess,
          ChangeSupplierSpec: appData.ChangeSupplierSpec,
          ProcessAuditResult: appData.ProcessAuditResult,
          CreatedBy: appData.CreatedBy,
          CreateDate: appData.CreateDate,
          ModifiedDate: appData.ModifiedDate,
        } as any)
        .execute();

      const newApp = await trx
        .selectFrom('TBL_5M1E_Application')
        .selectAll()
        .where('ControlNo', '=', appData.ControlNo)
        .executeTakeFirstOrThrow();

      await trx
        .insertInto('TBL_5M1E_Approval')
        .values({
          ID: nextApprovalId,
          ControlNo: newApp.ControlNo,
          Status: approvalStatus,
          CreateDate: new Date(),
          DSCheckerNecessary: 'NO',
          DSAppproverNecessary: 'NO',
          EnviCheckerNecessary: 'NO',
          EnviAppproverNecessary: 'NO',
          ...approvalData,
        } as any)
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

    await query.execute();

    let selectQuery = db
      .selectFrom('TBL_5M1E_Application')
      .selectAll();

    if (isNumeric(idOrControlNo)) {
      selectQuery = selectQuery.where((eb: any) => eb.or([
        eb('ControlNo', '=', idOrControlNo),
        eb('ID', '=', parseInt(idOrControlNo, 10)),
      ]));
    } else {
      selectQuery = selectQuery.where('ControlNo', '=', idOrControlNo);
    }

    return await selectQuery.executeTakeFirst();
  }

  async updateApprovalStatus(controlNo: string, status: string, extraFields?: Record<string, unknown>) {
    return await db
      .updateTable('TBL_5M1E_Approval')
      .set({
        Status: status,
        ModifiedDate: new Date(),
        ...extraFields,
      } as any)
      .where('ControlNo', '=', controlNo)
      .execute();
  }

  async renameControlNo(oldControlNo: string, newControlNo: string) {
    if (!oldControlNo || !newControlNo || oldControlNo === newControlNo) {
      return;
    }

    await db.transaction().execute(async (trx) => {
      await trx.updateTable('TBL_5M1E_Application').set({ ControlNo: newControlNo }).where('ControlNo', '=', oldControlNo).execute();
      await trx.updateTable('TBL_5M1E_Approval').set({ ControlNo: newControlNo }).where('ControlNo', '=', oldControlNo).execute();
      await trx.updateTable('TBL_5M1E_PartsPerReport').set({ PartsTag: newControlNo }).where('PartsTag', '=', oldControlNo).execute();
      await trx.updateTable('TBL_5M1E_Attachment').set({ ControlNo: newControlNo }).where('ControlNo', '=', oldControlNo).execute();
      await trx.updateTable('TBL_5M1E_ActionItems').set({ ControlNo: newControlNo }).where('ControlNo', '=', oldControlNo).execute();
      await trx.updateTable('TBL_5M1E_CheckItems').set({ ControlNo: newControlNo }).where('ControlNo', '=', oldControlNo).execute();
      await trx.updateTable('TBL_5M1E_Status_Remarks').set({ ControlNo: newControlNo }).where('ControlNo', '=', oldControlNo).execute();
      await trx.updateTable('TBL_5M1E_CC' as any).set({ ControlNo: newControlNo }).where('ControlNo', '=', oldControlNo).execute();
    });
  }

  async deleteApproval(controlNo: string) {
    return await db.deleteFrom('TBL_5M1E_Approval').where('ControlNo', '=', controlNo).execute();
  }

  async deleteByControlNo(controlNo: string) {
    return await db.deleteFrom('TBL_5M1E_Application').where('ControlNo', '=', controlNo).execute();
  }
}

export const fiveM1eCommandRepository = new FiveM1eCommandRepository();
