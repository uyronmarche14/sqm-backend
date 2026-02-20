/**
 * 5M1E Module SQL Queries
 * Separated for cleaner repository code.
 */

export const FIVE_M1E_QUERIES = {
    // Fetch a single full record with all dynamic named joins
    FIND_FULL_RECORD: `
        SELECT 
            app.*, 
            app.ID as AppID,
            apr.*,
            -- Child Table Joins
            sup.supplier_name as SupplierName_Joined,
            site.site_name as SiteName_Joined,
            part.part_name as PartName_Joined,
            part.part_code as PartCode_Joined,
            model.model_name as ModelName_Joined,
            class.Class as ClassName_Joined,
            ctype.Category as ClassType_Joined,
            comm.Commodity as CommodityName_Joined,
            
            -- User Joins (Simplified: USERS only)
            creator.full_name as CreatedByName_Joined,
            mpd_chk.full_name as MPDCheckerName_Joined,
            mpd_apr.full_name as MPDApproverName_Joined,
            eval_ic.full_name as EvaluationICName_Joined,
            ds_apr.full_name as DesignApproverName_Joined,
            en_apr.full_name as EnviApproverName_Joined,
            qa_chk.full_name as QACheckerName_Joined,
            fin_apr.full_name as FinalApproverName_Joined,
            mpd_pic.full_name as MPDPICName_Joined,
            hde_pic.full_name as HDEPICName_Joined,
            rev.full_name as ReviewerName_Joined,
            chk.full_name as CheckerName_Joined,
            apr_gen.full_name as ApproverName_Joined,
            ds_chk.full_name as DesignCheckerName_Joined,
            en_chk.full_name as EnviCheckerName_Joined

        FROM TBL_5M1E_Application app
        LEFT JOIN TBL_5M1E_Approval apr ON app.ControlNo = apr.ControlNo
        
        -- Master Data Joins
        LEFT JOIN dbo.SUPPLIERS sup ON app.SupplierID = sup.supplier_id
        LEFT JOIN dbo.MFG_SITES site ON app.SiteID = site.site_id
        LEFT JOIN dbo.PARTS part ON app.ItemID = part.part_id
        LEFT JOIN dbo.MODELS model ON app.ModelID = model.model_id
        LEFT JOIN dbo.TBL_Class class ON app.Class = class.ID
        LEFT JOIN dbo.TBL_Class_Category ctype ON app.ClassType = ctype.ID
        LEFT JOIN dbo.TBL_Commodity comm ON CAST(app.CommodityID AS INT) = comm.ID
        
        -- Approver Joins (Primary: dbo.USERS)
        LEFT JOIN dbo.USERS creator ON app.CreatedBy = creator.user_id
        LEFT JOIN dbo.USERS mpd_chk ON apr.MPDChecker = mpd_chk.user_id
        LEFT JOIN dbo.USERS mpd_apr ON apr.MPDApprover = mpd_apr.user_id
        LEFT JOIN dbo.USERS eval_ic ON apr.EvaluationIC = eval_ic.user_id
        LEFT JOIN dbo.USERS ds_apr ON apr.DesignApproverID = ds_apr.user_id
        LEFT JOIN dbo.USERS en_apr ON apr.EnviApproverID = en_apr.user_id
        LEFT JOIN dbo.USERS qa_chk ON apr.QACheckerID = qa_chk.user_id
        LEFT JOIN dbo.USERS fin_apr ON apr.FinalApprover = fin_apr.user_id
        LEFT JOIN dbo.USERS mpd_pic ON apr.MPDPIC = mpd_pic.user_id
        LEFT JOIN dbo.USERS hde_pic ON apr.HDEPIC = hde_pic.user_id
        LEFT JOIN dbo.USERS rev ON apr.Reviewer = rev.user_id
        LEFT JOIN dbo.USERS chk ON apr.Checker = chk.user_id
        LEFT JOIN dbo.USERS apr_gen ON apr.Approver = apr_gen.user_id
        LEFT JOIN dbo.USERS ds_chk ON apr.DesignCheckerID = ds_chk.user_id
        LEFT JOIN dbo.USERS en_chk ON apr.EnviCheckerID = en_chk.user_id

        WHERE app.ControlNo = ? OR CAST(app.ID AS VARCHAR(50)) = ?
    `,

    // Fetch basic list for Dashboard table
    FIND_ALL_RECORDS: `
        SELECT 
            app.*, app.ID as AppID, apr.Status, 
            
            -- Key Approver Info for Table Display
            apr.MPDPIC, apr.MPDChecker, apr.MPDCheckerName, 
            apr.MPDApprover, apr.MPDChkrDtAprd, apr.MPDAprDtAprd, 
            apr.EvaluationIC, apr.EvaluationICName, apr.EvaluationICDtAprd,
            apr.FinalApprover, apr.FAName, apr.FADtAprd,
            apr.DesignApproverID, apr.DesignApproverDtAprd,
            apr.QACheckerID, apr.QACheckerDtAprd, 
            apr.Approver, apr.ApproverName, apr.ApproverDtAprd,

            -- Joins for Human Readable Table Columns
            sup.supplier_name as SupplierName_Joined, 
            site.site_name as SiteName_Joined,
            part.part_name as PartName_Joined, 
            part.part_code as PartCode_Joined,
            model.model_name as ModelName_Joined, 
            class.Class as ClassName_Joined, 
            ctype.Category as ClassType_Joined, 
            comm.Commodity as CommodityName_Joined,

            -- User Joins (Simplified)
            creator.full_name as CreatedByName_Joined,
            mpd_chk.full_name as MPDCheckerName_Joined,
            mpd_apr.full_name as MPDApproverName_Joined,
            eval_ic.full_name as EvaluationICName_Joined,
            ds_apr.full_name as DesignApproverName_Joined,
            en_apr.full_name as EnviApproverName_Joined,
            qa_chk.full_name as QACheckerName_Joined,
            fin_apr.full_name as FinalApproverName_Joined

        FROM TBL_5M1E_Application app
        LEFT JOIN TBL_5M1E_Approval apr ON app.ControlNo = apr.ControlNo
        LEFT JOIN dbo.SUPPLIERS sup ON app.SupplierID = sup.supplier_id
        LEFT JOIN dbo.MFG_SITES site ON app.SiteID = site.site_id
        LEFT JOIN dbo.PARTS part ON app.ItemID = part.part_id
        LEFT JOIN dbo.MODELS model ON app.ModelID = model.model_id
        LEFT JOIN dbo.TBL_Class class ON app.Class = class.ID
        LEFT JOIN dbo.TBL_Class_Category ctype ON app.ClassType = ctype.ID
        LEFT JOIN dbo.TBL_Commodity comm ON CAST(app.CommodityID AS INT) = comm.ID
        
        -- Primary User Joins
        LEFT JOIN dbo.USERS creator ON app.CreatedBy = creator.user_id
        LEFT JOIN dbo.USERS mpd_chk ON apr.MPDChecker = mpd_chk.user_id
        LEFT JOIN dbo.USERS mpd_apr ON apr.MPDApprover = mpd_apr.user_id
        LEFT JOIN dbo.USERS eval_ic ON apr.EvaluationIC = eval_ic.user_id
        LEFT JOIN dbo.USERS ds_apr ON apr.DesignApproverID = ds_apr.user_id
        LEFT JOIN dbo.USERS en_apr ON apr.EnviApproverID = en_apr.user_id
        LEFT JOIN dbo.USERS qa_chk ON apr.QACheckerID = qa_chk.user_id
        LEFT JOIN dbo.USERS fin_apr ON apr.FinalApprover = fin_apr.user_id

        ORDER BY app.CreateDate DESC
    `
};
