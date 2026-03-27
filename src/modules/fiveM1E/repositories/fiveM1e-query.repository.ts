import { sql } from 'kysely';
import { db } from '../../../shared/infrastructure/db.js';
import { isNumeric } from './fiveM1e-repository.utils.js';

export class FiveM1eQueryRepository {
  async findWithApproval(idOrControlNo: string) {
    const dbAny = db as any;

    let query = dbAny
      .selectFrom('TBL_5M1E_Application as app')
      .leftJoin('TBL_5M1E_Approval as approval', 'app.ControlNo', 'approval.ControlNo')
      .leftJoin('SUPPLIERS as sup', 'app.SupplierID', 'sup.supplier_id')
      .leftJoin('SUPPLIERS as vendorSup', 'app.VendorID', 'vendorSup.supplier_id')
      .leftJoin('MFG_SITES as site', 'app.SiteID', 'site.site_id')
      .leftJoin('MODELS as mdl', 'app.ModelID', 'mdl.model_id')
      .leftJoin('PARTTYPES as pt', 'app.CommodityID', 'pt.parttype_id')
      .leftJoin('PARTS as part', 'app.ItemID', 'part.part_id')
      .leftJoin('PARTCLASS as partClass', 'app.Class', 'partClass.partclass_id')
      .leftJoin('PARTCLASSCATEGORIES as classCategory', 'app.ClassType', 'classCategory.Category_ID')
      .leftJoin('PARTCLASSCATEGORIES as rankCategory', 'app.RankID', 'rankCategory.Category_ID')
      .leftJoin('USERS as reviewerUser', 'approval.Reviewer', 'reviewerUser.user_id')
      .leftJoin('USERS as checkerUser', 'approval.Checker', 'checkerUser.user_id')
      .leftJoin('USERS as approverUser', 'approval.Approver', 'approverUser.user_id')
      .leftJoin('USERS as creatorUser', 'app.CreatedBy', 'creatorUser.user_id')
      .leftJoin('USERS as mpdApproverUser', 'approval.MPDApprover', 'mpdApproverUser.user_id')
      .leftJoin('USERS as evalPicUser', 'approval.MPDPIC', 'evalPicUser.user_id')
      .leftJoin('USERS as enviApproverUser', 'approval.EnviApproverID', 'enviApproverUser.user_id')
      .leftJoin('USERS as enviCheckerUser', 'approval.EnviCheckerID', 'enviCheckerUser.user_id')
      .leftJoin('USERS as sqeCheckerUser', 'approval.QACheckerID', 'sqeCheckerUser.user_id')
      .leftJoin('USERS as sqeApproverUser', 'approval.FinalApprover', 'sqeApproverUser.user_id')
      .leftJoin('USERS as designApproverUser', 'approval.DesignApproverID', 'designApproverUser.user_id')
      .leftJoin('USERS as designCheckerUser', 'approval.DesignCheckerID', 'designCheckerUser.user_id')
      .leftJoin('PRODUCTS as prod', 'app.Attribute03', 'prod.product_id')
      .selectAll('app')
      .select([
        'approval.Status as approval_status',
        'approval.ApprovalSeq as approval_seq',
        'approval.MPDPIC as mpd_pic',
        'approval.MPDChecker as mpd_checker',
        'approval.MPDCheckerName as mpd_checker_name',
        'approval.MPDCheckerStatus as mpd_checker_status',
        'approval.MPDApprover as mpd_approver',
        'approval.MPDApproverName as mpd_approver_name',
        'approval.MPDApproverStatus as mpd_approver_status',
        'approval.Reviewer as reviewer',
        'approval.ReviewerName as reviewer_name',
        'approval.ReviewerStatus as reviewer_status',
        'approval.Checker as checker',
        'approval.CheckerName as checker_name',
        'approval.ChkrStatus as chkr_status',
        'approval.Approver as approver',
        'approval.ApproverName as approver_name',
        'approval.AprStatus as apr_status',
        'approval.IssueDate as issue_date',
        'approval.ChkrDtAprd as chkr_dt_aprd',
        'approval.ApproverDtAprd as approver_dt_aprd',
        'approval.EvaluationIC as evaluation_ic',
        'approval.EvaluationICName as evaluation_ic_name',
        'approval.EvaluationICStatus as evaluation_ic_status',
        'approval.QACheckerID as qa_checker_id',
        'approval.QACheckerName as qa_checker_name',
        'approval.QACheckerStatus as qa_checker_status',
        'approval.QACheckerDtAprd as qa_checker_dt_aprd',
        'approval.FinalApprover as final_approver',
        'approval.FAName as fa_name',
        'approval.FAStatus as fa_status',
        'approval.FADtAprd as fa_dt_aprd',
        'approval.DSAppproverNecessary as ds_approver_necessary',
        'approval.DesignApproverID as design_approver_id',
        'approval.DesignApproverName as design_approver_name',
        'approval.DesignApproverStatus as design_approver_status',
        'approval.DesignApproverDtAprd as design_approver_dt_aprd',
        'approval.DSCheckerNecessary as ds_checker_necessary',
        'approval.DesignCheckerID as design_checker_id',
        'approval.DesignCheckerName as design_checker_name',
        'approval.DesignCheckerDtAprd as design_checker_dt_aprd',
        'approval.RevisedSequence as revised_sequence',
        'approval.EnviCheckerNecessary as envi_checker_necessary',
        'approval.EnviCheckerID as envi_checker_id',
        'approval.EnviCheckerName as envi_checker_name',
        'approval.EnviCheckerStatus as envi_checker_status',
        'approval.EnviCheckerDtAprd as envi_checker_dt_aprd',
        'approval.EnviAppproverNecessary as envi_approver_necessary',
        'approval.EnviApproverID as envi_approver_id',
        'approval.EnviApproveName as envi_approve_name',
        'approval.EnviApproveStatus as envi_approve_status',
        'approval.EnviApproveDtAprd as envi_approve_dt_aprd',
        'reviewerUser.full_name as reviewer_full_name',
        'checkerUser.full_name as checker_full_name',
        'approverUser.full_name as approver_full_name',
        'creatorUser.full_name as created_by_name',
        'mpdApproverUser.full_name as mpd_approver_name',
        'enviApproverUser.full_name as envi_approver_full_name',
        'enviCheckerUser.full_name as envi_checker_full_name',
        'sqeCheckerUser.full_name as qa_checker_full_name',
        'sqeApproverUser.full_name as fa_full_name',
        'designApproverUser.full_name as design_approver_id_name',
        'designCheckerUser.full_name as design_checker_id_name',
        'sup.supplier_name as supplier_name',
        'vendorSup.supplier_name as vendor_name',
        'site.site_name as site_name',
        'site.site_code as site_code',
        'part.part_code as part_code',
        'part.part_name as item_name',
        'mdl.model_name as model_name',
        'pt.parttype_name as part_type_name',
        'pt.parttype_code as part_type_code',
        'prod.product_name as attribute_03_name',
        'prod.product_code as product_code',
        sql<string>`COALESCE(partClass.partclass_desc, partClass.partclass_name)`.as('class_name'),
        'partClass.partclass_desc as class_desc',
        'classCategory.Category_name as class_type_name',
        'classCategory.Category_name as category_name',
        'classCategory.Category_name as attribute_06_name',
        'rankCategory.Category_name as rank_name',
        'rankCategory.Category_name as attribute_05_name',
        'evalPicUser.full_name as mpd_pic_name',
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
    const dbAny = db as any;

    let query = dbAny
      .selectFrom('TBL_5M1E_Application as app')
      .leftJoin('TBL_5M1E_Approval as approval', 'app.ControlNo', 'approval.ControlNo')
      .leftJoin('SUPPLIERS as sup', 'app.SupplierID', 'sup.supplier_id')
      .leftJoin('SUPPLIERS as vendorSup', 'app.VendorID', 'vendorSup.supplier_id')
      .leftJoin('MFG_SITES as site', 'app.SiteID', 'site.site_id')
      .leftJoin('MODELS as mdl', 'app.ModelID', 'mdl.model_id')
      .leftJoin('PARTTYPES as pt', 'app.CommodityID', 'pt.parttype_id')
      .leftJoin('PARTS as part', 'app.ItemID', 'part.part_id')
      .leftJoin('PARTCLASS as partClass', 'app.Class', 'partClass.partclass_id')
      .leftJoin('PARTCLASSCATEGORIES as classCategory', 'app.ClassType', 'classCategory.Category_ID')
      .leftJoin('PARTCLASSCATEGORIES as rankCategory', 'app.RankID', 'rankCategory.Category_ID')
      .leftJoin('USERS as reviewerUser', 'approval.Reviewer', 'reviewerUser.user_id')
      .leftJoin('USERS as checkerUser', 'approval.Checker', 'checkerUser.user_id')
      .leftJoin('USERS as approverUser', 'approval.Approver', 'approverUser.user_id')
      .leftJoin('USERS as evalPicUser', 'approval.MPDPIC', 'evalPicUser.user_id')
      .leftJoin('USERS as enviApproverUser', 'approval.EnviApproverID', 'enviApproverUser.user_id')
      .leftJoin('USERS as enviCheckerUser', 'approval.EnviCheckerID', 'enviCheckerUser.user_id')
      .leftJoin('USERS as sqeCheckerUser', 'approval.QACheckerID', 'sqeCheckerUser.user_id')
      .leftJoin('USERS as sqeApproverUser', 'approval.FinalApprover', 'sqeApproverUser.user_id')
      .leftJoin('USERS as designApproverUser', 'approval.DesignApproverID', 'designApproverUser.user_id')
      .leftJoin('USERS as designCheckerUser', 'approval.DesignCheckerID', 'designCheckerUser.user_id')
      .leftJoin('PRODUCTS as prod', 'app.Attribute03', 'prod.product_id')
      .selectAll('app')
      .select([
        'approval.Status as approval_status',
        'approval.ApprovalSeq as approval_seq',
        'approval.MPDPIC as mpd_pic',
        'approval.MPDChecker as mpd_checker',
        'approval.MPDCheckerName as mpd_checker_name',
        'approval.MPDCheckerStatus as mpd_checker_status',
        'approval.MPDApprover as mpd_approver',
        'approval.MPDApproverName as mpd_approver_name',
        'approval.MPDApproverStatus as mpd_approver_status',
        'approval.Reviewer as reviewer',
        'approval.ReviewerName as reviewer_name',
        'approval.ReviewerStatus as reviewer_status',
        'approval.Checker as checker',
        'approval.CheckerName as checker_name',
        'approval.ChkrStatus as chkr_status',
        'approval.Approver as approver',
        'approval.ApproverName as approver_name',
        'approval.AprStatus as apr_status',
        'approval.EvaluationIC as evaluation_ic',
        'approval.EvaluationICName as evaluation_ic_name',
        'approval.EvaluationICStatus as evaluation_ic_status',
        'approval.QACheckerID as qa_checker_id',
        'approval.QACheckerName as qa_checker_name',
        'approval.QACheckerStatus as qa_checker_status',
        'approval.QACheckerDtAprd as qa_checker_dt_aprd',
        'approval.FinalApprover as final_approver',
        'approval.FAName as fa_name',
        'approval.FAStatus as fa_status',
        'approval.FADtAprd as fa_dt_aprd',
        'approval.DSAppproverNecessary as ds_approver_necessary',
        'approval.DesignApproverID as design_approver_id',
        'approval.DesignApproverName as design_approver_name',
        'approval.DesignApproverStatus as design_approver_status',
        'approval.DesignApproverDtAprd as design_approver_dt_aprd',
        'approval.DSCheckerNecessary as ds_checker_necessary',
        'approval.DesignCheckerID as design_checker_id',
        'approval.DesignCheckerName as design_checker_name',
        'approval.DesignCheckerDtAprd as design_checker_dt_aprd',
        'approval.RevisedSequence as revised_sequence',
        'approval.EnviAppproverNecessary as envi_approver_necessary',
        'approval.EnviApproverID as envi_approver_id',
        'approval.EnviApproveStatus as envi_approve_status',
        'approval.EnviCheckerNecessary as envi_checker_necessary',
        'approval.EnviCheckerID as envi_checker_id',
        'approval.EnviCheckerStatus as envi_checker_status',
        'sup.supplier_name as supplier_name',
        'site.site_name as site_name',
        'site.site_code as site_code',
        'reviewerUser.full_name as reviewer_full_name',
        'checkerUser.full_name as checker_full_name',
        'approverUser.full_name as approver_full_name',
        'enviApproverUser.full_name as envi_approver_full_name',
        'enviCheckerUser.full_name as envi_checker_full_name',
        'sqeCheckerUser.full_name as qa_checker_full_name',
        'sqeApproverUser.full_name as fa_full_name',
        'designApproverUser.full_name as design_approver_id_name',
        'designCheckerUser.full_name as design_checker_id_name',
        'prod.product_name as attribute_03_name',
        'vendorSup.supplier_name as vendor_name',
        'part.part_code as part_code',
        'part.part_name as item_name',
        'mdl.model_name as model_name',
        'pt.parttype_name as part_type_name',
        'pt.parttype_code as part_type_code',
        'prod.product_code as product_code',
        sql<string>`COALESCE(partClass.partclass_desc, partClass.partclass_name)`.as('class_name'),
        'partClass.partclass_desc as class_desc',
        'classCategory.Category_name as class_type_name',
        'classCategory.Category_name as category_name',
        'classCategory.Category_name as attribute_06_name',
        'rankCategory.Category_name as rank_name',
        'rankCategory.Category_name as attribute_05_name',
        'evalPicUser.full_name as mpd_pic_name',
      ]);

    if (statusFilter && statusFilter !== 'all') {
      const statuses = statusFilter.split(',').map((status) => status.trim().toUpperCase());
      if (statuses.length === 1 && statuses[0] === 'SUBMITTED') {
        query = query.where('approval.Status', 'in', ['SUBMITTED', 'CHECKED']);
      } else if (statuses.length === 1 && statuses[0] === 'FAPPROVED') {
        query = query.where('approval.Status', 'in', ['FAPPROVED', 'FOR APPROVAL', 'CHECKED']);
      } else {
        query = query.where('approval.Status', 'in', statuses);
      }
    }

    return await query.orderBy('app.CreateDate', 'desc').execute();
  }
}

export const fiveM1eQueryRepository = new FiveM1eQueryRepository();
