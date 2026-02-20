/**
 * SQPR Module SQL Queries
 * NOTE: SQPR table only has site_id, NOT supplier_id or attention_id
 */

export const SQPR_QUERIES = {
    // Fetch a single full record with all dynamic named joins
    FIND_FULL_RECORD: `
        SELECT 
            s.*,
            -- Site Join
            site.site_name as site_name,
            
            -- Supplier Join
            sup.supplier_name as supplier_name,
            
            -- Workflow User Joins
            COALESCE(inch.full_name, s.incharge_id) as incharge_name,
            attn.full_name as attention_name,
            chk.full_name as checker_name,
             apr.full_name as approver_name

        FROM SQPR s
        LEFT JOIN dbo.MFG_SITES site ON s.site_id = site.site_id
        LEFT JOIN dbo.SUPPLIERS sup ON s.supplier_id = sup.supplier_id
        
        -- Workflow User Joins
        LEFT JOIN dbo.USERS inch ON s.incharge_id = inch.user_id
        LEFT JOIN dbo.USERS attn ON s.attention_id = attn.user_id
        LEFT JOIN dbo.USERS chk ON s.checker_id = chk.user_id
        LEFT JOIN dbo.USERS apr ON s.approver_id = apr.user_id

        WHERE s.control_no = @id1 OR s.sqpr_id = @id2
    `,

    // Fetch list for Dashboard
    FIND_ALL_RECORDS: `
        SELECT 
            s.*,
            site.site_name as site_name,
            sup.supplier_name as supplier_name,
            
            -- Workflow User Joins
            COALESCE(inch.full_name, s.incharge_id) as incharge_name,
            attn.full_name as attention_name,
            chk.full_name as checker_name,
            apr.full_name as approver_name

        FROM SQPR s
        LEFT JOIN dbo.MFG_SITES site ON s.site_id = site.site_id
        LEFT JOIN dbo.SUPPLIERS sup ON s.supplier_id = sup.supplier_id
        
        LEFT JOIN dbo.USERS inch ON s.incharge_id = inch.user_id
        LEFT JOIN dbo.USERS attn ON s.attention_id = attn.user_id
        LEFT JOIN dbo.USERS chk ON s.checker_id = chk.user_id
        LEFT JOIN dbo.USERS apr ON s.approver_id = apr.user_id

        ORDER BY s.date_created DESC
    `
};
