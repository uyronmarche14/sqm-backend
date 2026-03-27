import { sql } from 'kysely';
import { db } from '../../../../shared/infrastructure/db.js';
import { resolveAssignedFiveM1EForms } from '../../fiveM1E-assignment-access.js';

export class FiveM1eAssignedAccessRepository {
  async findAssignedFiveM1EAccessibleForms(userId: string): Promise<string[]> {
    const accessibleForms = new Set<string>();

    const rows = await sql<Record<string, unknown>>`
      SELECT
        app.ControlNo AS control_no,
        app.CreatedBy AS created_by,
        app.SiteID AS site_id,
        app.Class AS class_id,
        approval.Status AS approval_status,
        approval.ApprovalSeq AS approval_seq,
        approval.MPDPIC AS mpd_pic,
        evalPicUser.full_name AS mpd_pic_name,
        approval.MPDChecker AS mpd_checker,
        approval.MPDCheckerName AS mpd_checker_name,
        approval.MPDApprover AS mpd_approver,
        approval.MPDApproverName AS mpd_approver_name,
        approval.Reviewer AS reviewer,
        reviewerUser.full_name AS reviewer_full_name,
        approval.ReviewerName AS reviewer_name,
        approval.EvaluationIC AS evaluation_ic,
        approval.EvaluationICName AS evaluation_ic_name,
        approval.Checker AS checker,
        checkerUser.full_name AS checker_full_name,
        approval.CheckerName AS checker_name,
        approval.Approver AS approver,
        approverUser.full_name AS approver_full_name,
        approval.ApproverName AS approver_name,
        approval.FinalApprover AS final_approver,
        sqeApproverUser.full_name AS fa_full_name,
        approval.FAName AS fa_name,
        approval.DesignApproverID AS design_approver_id,
        designApproverUser.full_name AS design_approver_id_name,
        approval.DesignApproverName AS design_approver_name,
        approval.EnviApproverID AS envi_approver_id,
        enviApproverUser.full_name AS envi_approver_full_name,
        approval.EnviApproveName AS envi_approve_name,
        approval.QACheckerID AS qa_checker_id,
        sqeCheckerUser.full_name AS qa_checker_full_name,
        approval.QACheckerName AS qa_checker_name,
        approval.DSCheckerNecessary AS ds_checker_necessary,
        approval.DSAppproverNecessary AS ds_approver_necessary,
        approval.EnviCheckerNecessary AS envi_checker_necessary,
        approval.EnviAppproverNecessary AS envi_approver_necessary
      FROM TBL_5M1E_Application app
      LEFT JOIN TBL_5M1E_Approval approval
        ON app.ControlNo = approval.ControlNo
      LEFT JOIN USERS reviewerUser
        ON approval.Reviewer = reviewerUser.user_id
      LEFT JOIN USERS checkerUser
        ON approval.Checker = checkerUser.user_id
      LEFT JOIN USERS approverUser
        ON approval.Approver = approverUser.user_id
      LEFT JOIN USERS evalPicUser
        ON approval.MPDPIC = evalPicUser.user_id
      LEFT JOIN USERS enviApproverUser
        ON approval.EnviApproverID = enviApproverUser.user_id
      LEFT JOIN USERS sqeCheckerUser
        ON approval.QACheckerID = sqeCheckerUser.user_id
      LEFT JOIN USERS sqeApproverUser
        ON approval.FinalApprover = sqeApproverUser.user_id
      LEFT JOIN USERS designApproverUser
        ON approval.DesignApproverID = designApproverUser.user_id
      WHERE
        app.CreatedBy = ${userId}
        OR approval.MPDPIC = ${userId}
        OR approval.MPDChecker = ${userId}
        OR approval.MPDApprover = ${userId}
        OR approval.Reviewer = ${userId}
        OR approval.EvaluationIC = ${userId}
        OR approval.Checker = ${userId}
        OR approval.Approver = ${userId}
        OR approval.FinalApprover = ${userId}
        OR approval.DesignApproverID = ${userId}
        OR approval.EnviApproverID = ${userId}
        OR approval.QACheckerID = ${userId}
    `.execute(db);

    for (const row of rows.rows) {
      const assignedForms = resolveAssignedFiveM1EForms(row, userId);
      for (const formId of assignedForms) {
        accessibleForms.add(formId);
      }
    }

    return Array.from(accessibleForms);
  }
}

export const fiveM1eAssignedAccessRepository = new FiveM1eAssignedAccessRepository();
