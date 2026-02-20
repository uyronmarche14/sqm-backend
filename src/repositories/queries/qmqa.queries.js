/**
 * QMQA Module SQL Queries
 */

export const QMQA_QUERIES = {
    /**
     * Find Schedule by ID with related entity names
     */
    FIND_SCHEDULE_BY_ID: `
        SELECT 
            ap.qmqa_audit_plan_id,
            ap.control_no,
            ap.created_date,
            ap.audit_plan_date,
            ap.remarks,
            ap.request_status,
            ap.last_update,
            ap.updateby,
            
            -- Site
            ap.site_id,
            site.site_name,
            
            -- Supplier
            ap.supplier_id,
            supp.supplier_name,
            
            -- Category
            ap.audit_category_id,
            cat.audit_category_name as category_name,
            
            -- SQE PIC
            ap.sqe_pic_id,
            sqe.full_name as sqe_pic_name
            
        FROM QMQA_AUDIT_PLAN ap
        LEFT JOIN dbo.MFG_SITES site ON ap.site_id = site.site_id
        LEFT JOIN dbo.SUPPLIERS supp ON ap.supplier_id = supp.supplier_id
        LEFT JOIN dbo.AUDITCATEGORY cat ON ap.audit_category_id = cat.audit_category_id
        LEFT JOIN dbo.USERS sqe ON ap.sqe_pic_id = sqe.user_id
        
        WHERE ap.qmqa_audit_plan_id = @id
    `,

    /**
     * Find All Schedules (status = PLANNED)
     */
    FIND_ALL_SCHEDULES: `
        SELECT 
            ap.qmqa_audit_plan_id,
            ap.control_no,
            ap.created_date,
            ap.audit_plan_date,
            ap.remarks,
            ap.request_status,
            ap.last_update,
            ap.updateby,
            
            -- Site
            ap.site_id,
            site.site_name,
            
            -- Supplier
            ap.supplier_id,
            supp.supplier_name,
            
            -- Category
            ap.audit_category_id,
            cat.audit_category_name as category_name,
            
            -- SQE PIC
            ap.sqe_pic_id,
            sqe.full_name as sqe_pic_name
            
        FROM QMQA_AUDIT_PLAN ap
        LEFT JOIN dbo.MFG_SITES site ON ap.site_id = site.site_id
        LEFT JOIN dbo.SUPPLIERS supp ON ap.supplier_id = supp.supplier_id
        LEFT JOIN dbo.AUDITCATEGORY cat ON ap.audit_category_id = cat.audit_category_id
        LEFT JOIN dbo.USERS sqe ON ap.sqe_pic_id = sqe.user_id
        
        WHERE ap.request_status = 'PL'
        ORDER BY ap.audit_plan_date DESC, ap.created_date DESC
    `,

    /**
     * Find Full QMQA Record with all JOINs
     */
    FIND_FULL_RECORD: `
        SELECT 
            q.qmqa_id,
            q.created_date,
            q.audit_date,
            q.issued_date,
            q.due_date,
            q.audit_rating,
            q.auditees,
            q.auditors,
            q.attendees,
            q.remarks,
            q.request_status,
            q.encoder_id,
            q.encoder_date,
            q.issuer_id,
            q.issuer_remarks,
            q.issuer_date,
            q.checker_id,
            q.checker_remarks,
            q.checker_date,
            q.approver_id,
            q.approver_remarks,
            q.approver_date,
            q.last_update,
            q.updateby,
            
            -- Audit Plan
            ap.qmqa_audit_plan_id,
            ap.control_no,
            ap.created_date as plan_created_date,
            ap.audit_plan_date,
            ap.remarks as plan_remarks,
            
            -- Site
            ap.site_id,
            site.site_name,
            
            -- Supplier
            ap.supplier_id,
            supp.supplier_name,
            
            -- Category
            ap.audit_category_id,
            cat.audit_category_name as category_name,
            
            -- SQE PIC
            ap.sqe_pic_id,
            sqe.full_name as sqe_pic_name,
            
            -- Audit Type
            q.audit_type_id,
            at.audit_type_name,
            
            -- Attention ID (Supplier User/Incharge from SUPPLIERSUSER)
            q.attention_id,
            att_user.full_name as attention_name,
            
            -- PIC Auditor
            q.pic_auditor_id,
            pic.full_name as pic_auditor_name,
            
            -- Encoder
            enc.full_name as encoder_name,
            
            -- Issuer
            iss.full_name as issuer_name,
            
            -- Checker
            chk.full_name as checker_name,
            
            -- Approver
            app.full_name as approver_name
            
        FROM QMQA q
        INNER JOIN QMQA_AUDIT_PLAN ap ON q.qmqa_audit_plan_id = ap.qmqa_audit_plan_id
        LEFT JOIN dbo.MFG_SITES site ON ap.site_id = site.site_id
        LEFT JOIN dbo.SUPPLIERS supp ON ap.supplier_id = supp.supplier_id
        LEFT JOIN dbo.AUDITCATEGORY cat ON ap.audit_category_id = cat.audit_category_id
        LEFT JOIN dbo.USERS sqe ON ap.sqe_pic_id = sqe.user_id
        LEFT JOIN dbo.AUDITTYPE at ON q.audit_type_id = at.audit_type_id
        LEFT JOIN dbo.SUPPLIERSUSER att ON q.attention_id = att.Id
        LEFT JOIN dbo.USERS att_user ON att.user_id = att_user.user_id
        LEFT JOIN dbo.USERS pic ON q.pic_auditor_id = pic.user_id
        LEFT JOIN dbo.USERS enc ON q.encoder_id = enc.user_id
        LEFT JOIN dbo.USERS iss ON q.issuer_id = iss.user_id
        LEFT JOIN dbo.USERS chk ON q.checker_id = chk.user_id
        LEFT JOIN dbo.USERS app ON q.approver_id = app.user_id
        
        WHERE q.qmqa_id = @id1 OR ap.control_no = @id2
    `,

    /**
     * Find All QMQA Records with optional status filtering
     */
    FIND_ALL_RECORDS: `
        SELECT 
            q.qmqa_id,
            q.created_date,
            q.audit_date,
            q.issued_date,
            q.due_date,
            q.audit_rating,
            q.request_status,
            q.last_update,
            
            -- Audit Plan
            ap.qmqa_audit_plan_id,
            ap.control_no,
            ap.audit_plan_date,
            
            -- Site
            ap.site_id,
            site.site_name,
            
            -- Supplier
            ap.supplier_id,
            supp.supplier_name,
            
            -- Category
            ap.audit_category_id,
            cat.audit_category_name as category_name,
            
            -- SQE PIC
            ap.sqe_pic_id,
            sqe.full_name as sqe_pic_name,
            
            -- Audit Type
            q.audit_type_id,
            at.audit_type_name,
            
            -- Encoder
            q.encoder_id,
            enc.full_name as encoder_name,
            
            -- Issuer
            q.issuer_id,
            iss.full_name as issuer_name,
            
            -- Checker
            q.checker_id,
            chk.full_name as checker_name,
            
            -- Approver
            q.approver_id,
            app.full_name as approver_name
            
        FROM QMQA q
        INNER JOIN QMQA_AUDIT_PLAN ap ON q.qmqa_audit_plan_id = ap.qmqa_audit_plan_id
        LEFT JOIN dbo.MFG_SITES site ON ap.site_id = site.site_id
        LEFT JOIN dbo.SUPPLIERS supp ON ap.supplier_id = supp.supplier_id
        LEFT JOIN dbo.AUDITCATEGORY cat ON ap.audit_category_id = cat.audit_category_id
        LEFT JOIN dbo.USERS sqe ON ap.sqe_pic_id = sqe.user_id
        LEFT JOIN dbo.AUDITTYPE at ON q.audit_type_id = at.audit_type_id
        LEFT JOIN dbo.USERS enc ON q.encoder_id = enc.user_id
        LEFT JOIN dbo.USERS iss ON q.issuer_id = iss.user_id
        LEFT JOIN dbo.USERS chk ON q.checker_id = chk.user_id
        LEFT JOIN dbo.USERS app ON q.approver_id = app.user_id
        
        WHERE 1=1
        -- Status filter will be added dynamically if provided
        -- RLS filter will be added dynamically based on user role
        
        ORDER BY q.created_date DESC, ap.audit_plan_date DESC
    `,

    /**
     * Find Calendar Data (schedules and audits for a specific month)
     */
    FIND_CALENDAR_DATA: `
        SELECT 
            ap.control_no,
            ap.audit_plan_date as event_date,
            ap.request_status,
            supp.supplier_name,
            'SCHEDULE' as record_type
        FROM QMQA_AUDIT_PLAN ap
        LEFT JOIN dbo.SUPPLIERS supp ON ap.supplier_id = supp.supplier_id
        WHERE YEAR(ap.audit_plan_date) = @year 
          AND MONTH(ap.audit_plan_date) = @month
          AND ap.request_status = 'PL'
        
        UNION ALL
        
        SELECT 
            ap.control_no,
            q.audit_date as event_date,
            q.request_status,
            supp.supplier_name,
            'AUDIT' as record_type
        FROM QMQA q
        INNER JOIN QMQA_AUDIT_PLAN ap ON q.qmqa_audit_plan_id = ap.qmqa_audit_plan_id
        LEFT JOIN dbo.SUPPLIERS supp ON ap.supplier_id = supp.supplier_id
        WHERE YEAR(q.audit_date) = @year 
          AND MONTH(q.audit_date) = @month
        
        ORDER BY event_date ASC
    `,

    /**
     * Find Achievement Data (metrics for reporting)
     */
    FIND_ACHIEVEMENT_DATA: `
        SELECT 
            COUNT(*) as total_audits,
            SUM(CASE WHEN q.request_status = 'CL' THEN 1 ELSE 0 END) as completed_audits,
            SUM(CASE WHEN q.request_status NOT IN ('CL', 'CN') THEN 1 ELSE 0 END) as pending_audits,
            AVG(CASE WHEN q.audit_rating IS NOT NULL THEN q.audit_rating ELSE NULL END) as average_rating,
            SUM(CASE 
                WHEN q.request_status = 'CL' 
                     AND q.audit_date <= q.due_date 
                THEN 1 
                ELSE 0 
            END) as on_time_completions,
            SUM(CASE WHEN q.request_status = 'CL' THEN 1 ELSE 0 END) as total_completions
        FROM QMQA q
        INNER JOIN QMQA_AUDIT_PLAN ap ON q.qmqa_audit_plan_id = ap.qmqa_audit_plan_id
        WHERE 1=1
        -- Date range and supplier filters will be added dynamically
    `
};
