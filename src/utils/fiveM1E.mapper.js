// =============================================================================
// 5M1E Backend Mapper - Aligned with Database Schema (schema-5m1e.sql)
// =============================================================================

// Helper to prioritize Joined Name over Stored Name
const resolveName = (joined, stored) => joined || stored || '';

/**
 * Maps database row to DTO for API response
 * @param row - Row from TBL_5M1E_Application
 * @param parts - Rows from TBL_5M1E_PartsPerReport
 * @param approval - Row from TBL_5M1E_Approval
 * @param attachments - Rows from TBL_5M1E_Attachment
 * @param actionItems - Rows from TBL_5M1E_ActionItems
 * @param checkItems - Rows from TBL_5M1E_CheckItems
 */
export const mapToDTO = (row, parts = [], approval = {}, attachments = [], actionItems = [], checkItems = []) => {
    if (!row) return null;

    return {
        // TBL_5M1E_Application
        id: String(row.ID),
        control_no: row.ControlNo,
        title: row.Title,
        // FORCE HUMAN READABLE DATA AS REQUESTED -> REVERTED FOR EDIT FORM HYDRATION
        // IDs must be IDs. Display Names have their own fields.
        supplier_id: row.SupplierID,
        supplier_cn: row.SupplierCN,
        vendor_id: row.VendorID,    
        item_id: row.ItemID,
        site_id: row.SiteID,
        commodity_id: row.CommodityID, 
        model_id: row.ModelID,
        
        engineer_remarks: row.EngineerRemarks,
        report_no: row.ReportNo,
        date_register: row.DateRegister,
        class: row.Class,
        class_type: row.ClassType,
        
        // Created By
        created_by: resolveName(row.CreatedByName_Joined, row.CreatedBy), 
        create_date: row.CreateDate,
        modified_date: row.ModifiedDate,
        impact_date: row.ImpactDate,

        // =========================================================================
        // JOINED FIELDS (Redundant but kept for frontend compatibility)
        // =========================================================================
        // JOINED FIELDS (Display Only)
        // =========================================================================
        supplier_name: resolveName(row.SupplierName_Joined, row.SupplierCN),
        site_name: resolveName(row.SiteName_Joined, 'Unknown Site'),
        item_name: resolveName(row.PartName_Joined, 'Unknown Item'),
        // part_code -> partCode (Wait, standard says snake_case for DTO)
        part_code: row.PartCode_Joined || row.ItemID,
        model_name: resolveName(row.ModelName_Joined, 'Unknown Model'),
        commodity_name: resolveName(row.CommodityName_Joined, 'Unknown Commodity'),
        created_by_name: resolveName(row.CreatedByName_Joined, row.CreatedBy),
        class_name: row.ClassName_Joined,
        class_type_name: row.ClassType_Joined,
        
        // Attributes (mapped to semantic names for frontend convenience)
        attribute_01: row.Attribute01,  // first_lot_invoice
        attribute_02: row.Attribute02,  // evaluation_remarks
        attribute_03: row.Attribute03,  // form_factor
        attribute_04: row.Attribute04,  // cost_reduction
        attribute_05: row.Attribute05,  // rank
        attribute_06: row.Attribute06,  // category
        attribute_07: row.Attribute07,  // process_audit_result
        attribute_08: row.Attribute08,  // change_qc_chart
        attribute_09: row.Attribute09,  // change_supplier_spec
        attribute_10: row.Attribute10,  // environmental_approval

        // TBL_5M1E_Approval
        status: approval.Status || 'DRAFT',
        
        // MPD
        mpd_pic: resolveName(row.MPDPICName_Joined, approval.MPDPIC), // Mapped!
        mpd_checker: resolveName(row.MPDCheckerName_Joined, approval.MPDChecker), 
        mpd_checker_name: resolveName(row.MPDCheckerName_Joined, approval.MPDCheckerName),
        mpd_checker_status: approval.MPDCheckerStatus === 1,
        mpd_chkr_dt_aprd: approval.MPDChkrDtAprd,
        mpd_approver: resolveName(row.MPDApproverName_Joined, approval.MPDApprover), 
        mpd_approver_name: resolveName(row.MPDApproverName_Joined, approval.MPDApproverName),
        mpd_approver_status: approval.MPDApproverStatus === 1,
        mpd_apr_dt_aprd: approval.MPDAprDtAprd,
        
        // HDE
        hde_pic: resolveName(row.HDEPICName_Joined, approval.HDEPIC),

        // Reviewer
        reviewer: resolveName(row.ReviewerName_Joined, approval.Reviewer),
        reviewer_name: resolveName(row.ReviewerName_Joined, approval.ReviewerName), 
        reviewer_status: approval.ReviewerStatus === 1,
        issue_date: approval.IssueDate,

        // Checker
        checker: resolveName(row.CheckerName_Joined, approval.Checker),
        checker_name: resolveName(row.CheckerName_Joined, approval.CheckerName),
        chkr_dt_aprd: approval.ChkrDtAprd,
        chkr_status: approval.ChkrStatus,

        // Approver
        approver: resolveName(row.ApproverName_Joined, approval.Approver),
        approver_name: resolveName(row.ApproverName_Joined, approval.ApproverName),
        approver_dt_aprd: approval.ApproverDtAprd,
        apr_status: approval.AprStatus,

        // Final Approver
        final_approver: resolveName(row.FinalApproverName_Joined, approval.FinalApprover), 
        fa_name: resolveName(row.FinalApproverName_Joined, approval.FAName),
        fa_dt_aprd: approval.FADtAprd,
        fa_status: approval.FAStatus,

        // Sequence
        approval_seq: approval.ApprovalSeq,

        // Design Checker
        ds_checker_necessary: approval.DSCheckerNecessary,
        design_checker_id: resolveName(row.DesignCheckerName_Joined, approval.DesignCheckerID),
        design_checker_name: resolveName(row.DesignCheckerName_Joined, approval.DesignCheckerName),
        design_checker_status: approval.DesignCheckerStatus === 1,
        design_checker_dt_aprd: approval.DesignCheckerDtAprd,

        // Design Approver
        ds_approver_necessary: approval.DSApproverNecessary,
        design_approver_id: resolveName(row.DesignApproverName_Joined, approval.DesignApproverID), 
        design_approver_name: resolveName(row.DesignApproverName_Joined, approval.DesignApproverName),
        design_approver_status: approval.DesignApproverStatus === 1,
        design_approver_dt_aprd: approval.DesignApproverDtAprd,

        // Envi Checker
        envi_checker_necessary: approval.EnviCheckerNecessary,
        envi_checker_id: resolveName(row.EnviCheckerName_Joined, approval.EnviCheckerID),
        envi_checker_name: resolveName(row.EnviCheckerName_Joined, approval.EnviCheckerName),
        envi_checker_status: approval.EnviCheckerStatus === 1,
        envi_checker_dt_aprd: approval.EnviCheckerDtAprd,

        // Envi Approver
        envi_approver_necessary: approval.EnviAppproverNecessary,
        envi_approver_id: resolveName(row.EnviApproverName_Joined, approval.EnviApproverID), 
        envi_approve_name: resolveName(row.EnviApproverName_Joined, approval.EnviApproveName),
        envi_approve_status: approval.EnviApproveStatus === 1,
        envi_approve_dt_aprd: approval.EnviApproveDtAprd,

        // QA Checker
        qa_checker_id: resolveName(row.QACheckerName_Joined, approval.QACheckerID), 
        qa_checker_name: resolveName(row.QACheckerName_Joined, approval.QACheckerName),
        qa_checker_status: approval.QACheckerStatus === 1,
        qa_checker_dt_aprd: approval.QACheckerDtAprd,

        // Misc
        revised_sequence: approval.RevisedSequence,
        cr: approval.CR,

        // Evaluation IC
        evaluation_ic: resolveName(row.EvaluationICName_Joined, approval.EvaluationIC), 
        evaluation_ic_name: resolveName(row.EvaluationICName_Joined, approval.EvaluationICName),
        evaluation_ic_dt_aprd: approval.EvaluationICDtAprd,
        evaluation_ic_status: approval.EvaluationICStatus === 1,

        // Rejection
        rejected_by: approval.RejectedBy,
        rejected_date: approval.RejectedDate,

        // Child Tables
        parts: parts.map(p => ({
            tag_id: p.TagID,
            parts_tag: p.PartsTag,
            part_id: p.part_id,
            part_code: p.part_code, // Joined Field
            part_name: p.part_name, // Joined Field
            date_added: p.DateAdded
        })),
        
        attachments: attachments.map(a => ({
            id: String(a.ID),
            control_no: a.ControlNo,
            file_name: a.FileName,
            create_date: a.CreateDate,
            attribute_1: a.Attribute1,
            attribute_2: a.Attribute2
        })),
        
        // TBL_5M1E_ActionItems
        action_items: actionItems.map(ai => ({
            id: String(ai.ID),
            control_no: ai.ControlNo,
            action_item: ai.ActionItem,
            first_target_dt: ai.FirstTargetDt,
            second_target_dt: ai.SecondTargetDt,
            third_target_dt: ai.ThirdTargetDt,
            pic: ai.PIC,
            pic_name: ai.PICName,
            verification_result: ai.VerificationResult,
            remarks: ai.Remarks,
            create_date: ai.CreateDate
        })),
        
        // TBL_5M1E_CheckItems (Review Checklist, Cover Page, Evaluation)
        check_items: checkItems.map(ci => ({
            id: String(ci.ID),
            control_no: ci.ControlNo,
            check_item: ci.CheckItem,
            judgement: ci.Judgement,
            remarks: ci.Remarks,
            create_date: ci.CreateDate,
            attribute_1: ci.Attribute1 || 'REVIEW', // Standardized to attribute_1
            attribute_2: ci.Attribute2
        }))
    };
};

/**
 * Maps DTO from API request to SQL column values
 * @param dto - FiveM1EDTO from request body
 * @returns { app, approval } objects for INSERT/UPDATE
 */
export const mapToSQL = (dto) => {
    // TBL_5M1E_Application
    const app = {
        ControlNo: dto.control_no,
        Title: dto.title,
        SupplierID: dto.supplier_id,
        SupplierCN: dto.supplier_cn,
        VendorID: dto.vendor_id,
        ItemID: dto.item_id,
        SiteID: dto.site_id,
        CommodityID: dto.commodity_id,
        ModelID: dto.model_id,
        EngineerRemarks: dto.engineer_remarks,
        ReportNo: dto.report_no,
        DateRegister: dto.date_register ? new Date(dto.date_register) : new Date(),
        Class: dto.class,
        ClassType: dto.class_type,
        ImpactDate: dto.impact_date || '',
        
        // Attributes
        Attribute01: dto.attribute_01,
        Attribute02: dto.attribute_02,
        Attribute03: dto.attribute_03,
        Attribute04: dto.attribute_04,
        Attribute05: dto.attribute_05,
        Attribute06: dto.attribute_06,
        Attribute07: dto.attribute_07,
        Attribute08: dto.attribute_08,
        Attribute09: dto.attribute_09,
        Attribute10: dto.attribute_10
    };

    // TBL_5M1E_Approval
    const approval = {
        Status: dto.status,
        // MPD
        MPDPIC: dto.mpd_pic,
        MPDChecker: dto.mpd_checker,
        MPDCheckerName: dto.mpd_checker_name,
        MPDCheckerStatus: dto.mpd_checker_status ? 1 : null,
        MPDChkrDtAprd: dto.mpd_chkr_dt_aprd,
        MPDApprover: dto.mpd_approver,
        MPDApproverName: dto.mpd_approver_name,
        MPDApproverStatus: dto.mpd_approver_status ? 1 : null,
        MPDAprDtAprd: dto.mpd_apr_dt_aprd,

        // HDE
        HDEPIC: dto.hde_pic,

        // Reviewer
        Reviewer: dto.reviewer,
        ReviewerName: dto.reviewer_name,
        ReviewerStatus: dto.reviewer_status ? 1 : null,
        IssueDate: dto.issue_date,

        // Checker
        Checker: dto.checker,
        CheckerName: dto.checker_name,
        ChkrDtAprd: dto.chkr_dt_aprd,
        ChkrStatus: dto.chkr_status,

        // Approver
        Approver: dto.approver,
        ApproverName: dto.approver_name,
        ApproverDtAprd: dto.approver_dt_aprd,
        AprStatus: dto.apr_status,

        // Final Approver
        FinalApprover: dto.final_approver,
        FAName: dto.fa_name,
        FADtAprd: dto.fa_dt_aprd,
        FAStatus: dto.fa_status,

        // Sequence
        ApprovalSeq: dto.approval_seq,

        // Design Checker
        DSCheckerNecessary: dto.ds_checker_necessary || 'NO',
        DesignCheckerID: dto.design_checker_id,
        DesignCheckerName: dto.design_checker_name,
        DesignCheckerStatus: dto.design_checker_status ? 1 : null,
        DesignCheckerDtAprd: dto.design_checker_dt_aprd,

        // Design Approver
        DSAppproverNecessary: dto.ds_approver_necessary || 'NO', // Matches DB Column
        DesignApproverID: dto.design_approver_id,
        DesignApproverName: dto.design_approver_name,
        DesignApproverStatus: dto.design_approver_status ? 1 : null,
        DesignApproverDtAprd: dto.design_approver_dt_aprd,

        // Envi Checker
        EnviCheckerNecessary: dto.envi_checker_necessary || 'NO',
        EnviCheckerID: dto.envi_checker_id,
        EnviCheckerName: dto.envi_checker_name,
        EnviCheckerStatus: dto.envi_checker_status ? 1 : null,
        EnviCheckerDtAprd: dto.envi_checker_dt_aprd,

        // Envi Approver
        EnviAppproverNecessary: dto.envi_approver_necessary || 'NO', // Matches DB Column
        EnviApproverID: dto.envi_approver_id,
        EnviApproveName: dto.envi_approve_name,
        EnviApproveStatus: dto.envi_approve_status ? 1 : null,
        EnviApproveDtAprd: dto.envi_approve_dt_aprd,

        // QA Checker
        QACheckerID: dto.qa_checker_id,
        QACheckerName: dto.qa_checker_name,
        QACheckerStatus: dto.qa_checker_status ? 1 : null,
        QACheckerDtAprd: dto.qa_checker_dt_aprd,

        // Misc
        RevisedSequence: dto.revised_sequence,
        CR: dto.cr,

        // Evaluation IC
        EvaluationIC: dto.evaluation_ic,
        EvaluationICName: dto.evaluation_ic_name,
        EvaluationICDtAprd: dto.evaluation_ic_dt_aprd,
        EvaluationICStatus: dto.evaluation_ic_status ? 1 : null,

        // Rejection
        RejectedBy: dto.rejected_by,
        RejectedDate: dto.rejected_date
    };

    return { app, approval };
};
