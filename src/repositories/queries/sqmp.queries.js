/**
 * SQMP Module SQL Queries
 */

export const SQMP_QUERIES = {
    // Fetch a single full record with all dynamic named joins
    FIND_FULL_RECORD: `
        SELECT 
            s.*,
            -- Site & Supplier Joins
            site.site_name as site_name,
            supp.supplier_name as supplier_name,
            model.model_name as model_name,
            
            -- Workflow User Joins
            enc.full_name as encoder_name,
            iss.full_name as issuer_name,
            chk.full_name as checker_name,
            apr.full_name as approver_name

        FROM SQMP s
        LEFT JOIN dbo.MFG_SITES site ON s.site_id = site.site_id
        LEFT JOIN dbo.SUPPLIERS supp ON s.supplier_id = supp.supplier_id
        LEFT JOIN dbo.MODELS model ON s.model_id = model.model_id
        
        -- Workflow User Joins
        LEFT JOIN dbo.USERS enc ON s.encoder_id = enc.user_id
        LEFT JOIN dbo.USERS iss ON s.issuer_id = iss.user_id
        LEFT JOIN dbo.USERS chk ON s.checker_id = chk.user_id
        LEFT JOIN dbo.USERS apr ON s.approver_id = apr.user_id

        WHERE s.control_no = @id1 OR s.sqmp_id = @id2
    `,

    // Fetch list for Dashboard
    FIND_ALL_RECORDS: `
        SELECT 
            s.*,
            site.site_name as site_name,
            supp.supplier_name as supplier_name,
            model.model_name as model_name,
            enc.full_name as encoder_name,
            iss.full_name as issuer_name,
            chk.full_name as checker_name,
            apr.full_name as approver_name

        FROM SQMP s
        LEFT JOIN dbo.MFG_SITES site ON s.site_id = site.site_id
        LEFT JOIN dbo.SUPPLIERS supp ON s.supplier_id = supp.supplier_id
        LEFT JOIN dbo.MODELS model ON s.model_id = model.model_id
        
        LEFT JOIN dbo.USERS enc ON s.encoder_id = enc.user_id
        LEFT JOIN dbo.USERS iss ON s.issuer_id = iss.user_id
        LEFT JOIN dbo.USERS chk ON s.checker_id = chk.user_id
        LEFT JOIN dbo.USERS apr ON s.approver_id = apr.user_id

        ORDER BY s.registration_date DESC
    `
};
