import db, { sql } from '../config/db.js';
import { SQPR_QUERIES } from './queries/sqpr.queries.js';

export const sqprRepository = {
    /**
     * Get next ID for a table
     */
    async getNextId(tableName, transaction, idColumn) {
        const request = new sql.Request(transaction);
        // Clean input to prevent SQL injection (though tableName usually trusted)
        const safeTable = tableName.replace(/[^a-zA-Z0-9_]/g, '');
        const safeCol = idColumn.replace(/[^a-zA-Z0-9_]/g, '');
        
        const query = `SELECT MAX(${safeCol}) as maxId FROM ${safeTable}`;
        const result = await request.query(query);
        // Handle alphanumeric IDs if necessary, but assuming integer-like string logic or UUIDs?
        // Schema says nvarchar(72). Usually UUID or generated.
        // If legacy logic uses Int->String, we follow that. 
        // IF UUID, this logic is invalid. 
        // 5M1E used this, let's assume legacy ID generation (Max + 1) logic applies to numeric string IDs
        // or we generate UUIDs in Service. 
        // Let's assume we pass explicit IDs from Service if UUID, or use this if Numeric.
        // SQPR Schema uses nvarchar(72), likely UUIDs. 
        // BUT 5M1E repository used getNextId with MAX. 
        // We'll expose it, but Service might generate UUIDs instead.
        return result.recordset[0].maxId; 
    },

    /**
     * Insert Main SQPR Record
     */
    async insertSQPR(transaction, data) {
        const request = new sql.Request(transaction);
        
        // Explicit inputs based on Schema
        request.input('id', data.sqpr_id);
        request.input('cn', data.control_no);
        request.input('site', data.site_id);
        request.input('sup', data.supplier_id);
        request.input('attnid', data.attention_id);
        request.input('attn', data.attention);
        request.input('fy', data.fiscal_year);
        request.input('rt', data.report_type); // 1=Month, 2=Quarter
        request.input('mo', data.month);
        request.input('fid', data.file_id || ''); // Cover page?
        request.input('fname', data.file_name || '');
        request.input('fext', data.file_extension || '');
        request.input('rem', data.remarks);
        request.input('dc', data.date_created);
        request.input('inc', data.incharge_id);
        request.input('increm', data.incharge_remarks);
        request.input('status', data.request_status);
        request.input('last', data.last_update);
        request.input('by', data.updateby);

        await request.query(`
            INSERT INTO SQPR (
                sqpr_id, control_no, site_id, supplier_id, attention_id, attention, fiscal_year, report_type, month,
                file_id, file_name, file_extension, remarks,
                date_created, incharge_id, incharge_remarks,
                request_status, last_update, updateby
            ) VALUES (
                @id, @cn, @site, @sup, @attnid, @attn, @fy, @rt, @mo,
                @fid, @fname, @fext, @rem,
                @dc, @inc, @increm,
                @status, @last, @by
            )
        `);
    },

    /**
     * Insert Attachments
     */
    async insertAttachments(transaction, attachments) {
        for (const att of attachments) {
            const request = new sql.Request(transaction);
            request.input('id', att.sqpr_attachment_id);
            request.input('pid', att.sqpr_id);
            request.input('fn', att.file_name);
            request.input('ext', att.file_extension);
            request.input('rem', att.remarks);
            request.input('last', att.last_update);
            request.input('by', att.updateby);
            request.input('type', att.attachment_type);

            await request.query(`
                INSERT INTO SQPR_ATTACHMENT (
                    sqpr_attachment_id, sqpr_id, file_name, file_extension, attachment_type,
                    remarks, last_update, updateby
                ) VALUES (
                    @id, @pid, @fn, @ext, @type,
                    @rem, @last, @by
                )
            `);
        }
    },

    /**
     * Insert CC List
     */
    async insertCC(transaction, list) {
        for (const cc of list) {
            const request = new sql.Request(transaction);
            request.input('id', cc.sqpr_cc_id);
            request.input('pid', cc.sqpr_id);
            request.input('uid', cc.user_id);
            request.input('last', cc.last_update);
            request.input('by', cc.updateby);

            await request.query(`
                INSERT INTO SQPR_CC (
                    sqpr_cc_id, sqpr_id, user_id, last_update, updateby
                ) VALUES (
                    @id, @pid, @uid, @last, @by
                )
            `);
        }
    },

    /**
     * Find Full Record (Raw) with all joins
     */
    async findFullRecord(idOrControlNo) {
        const pool = await db.getPool();
        const request = new sql.Request(pool);
        
        request.input('id1', idOrControlNo);
        request.input('id2', idOrControlNo);
        
        console.log('🔍 [SQPR-REPO] Finding full record:', idOrControlNo);
        
        const result = await request.query(SQPR_QUERIES.FIND_FULL_RECORD);
        const row = result.recordset?.[0] || null;
        
        if (row) {
            console.log('📋 [SQPR-REPO] Found record:', row.sqpr_id, row.control_no);
        } else {
            console.log('⚠️ [SQPR-REPO] No record found for:', idOrControlNo);
        }
        
        return row;
    },

    /**
     * Find All Records
     */
    async findAllRecords() {
        const pool = await db.getPool();
        const request = new sql.Request(pool);
        
        const result = await request.query(SQPR_QUERIES.FIND_ALL_RECORDS);
        console.log('📋 [SQPR-REPO] Found', result.recordset?.length || 0, 'records');
        
        return result.recordset || [];
    },

    /**
     * Find Subtables (Attachments and CC List)
     */
    async findSubTables(sqprId) {
        const pool = await db.getPool();
        
        // DEBUG: Log query
        console.log('🔍 [SQPR-REPO] Finding subtables for sqpr_id:', sqprId);
        
        // Fetch Attachments using MSSQL parameterized query
        const attRequest = new sql.Request(pool);
        attRequest.input('sqprId', sqprId);
        const attResult = await attRequest.query('SELECT * FROM SQPR_ATTACHMENT WHERE sqpr_id = @sqprId');
        const attachments = attResult.recordset || [];
        
        console.log('📎 [SQPR-REPO] Attachments found:', attachments.length);

        // Fetch CC List with User join
        const ccRequest = new sql.Request(pool);
        ccRequest.input('sqprId', sqprId);
        const ccResult = await ccRequest.query(`
            SELECT cc.*, u.full_name as user_name, u.email as user_email
            FROM SQPR_CC cc
            LEFT JOIN dbo.USERS u ON cc.user_id = u.user_id
            WHERE cc.sqpr_id = @sqprId
        `);
        const ccList = ccResult.recordset || [];
        
        console.log('👥 [SQPR-REPO] CC List found:', ccList.length);
        
        return { attachments, ccList };
    },

    /**
     * Update SQPR Record
     */
    async updateSQPR(transaction, sqprId, updates) {
        const sqlUpdates = [];
        const request = new sql.Request(transaction);
        let pIndex = 0;

        Object.keys(updates).forEach(col => {
            if (updates[col] !== undefined) {
                sqlUpdates.push(`${col} = @p${pIndex}`);
                request.input(`p${pIndex}`, updates[col]);
                pIndex++;
            }
        });

        if (sqlUpdates.length > 0) {
            request.input('id', sqprId);
            await request.query(`UPDATE SQPR SET ${sqlUpdates.join(', ')} WHERE sqpr_id = @id`);
        }
    },

    /**
     * Delete Attachments for SQPR
     */
    async deleteAttachments(transaction, sqprId) {
        const request = new sql.Request(transaction);
        request.input('pid', sqprId);
        await request.query('DELETE FROM SQPR_ATTACHMENT WHERE sqpr_id = @pid');
    },

    /**
     * Delete CC List for SQPR
     */
    async deleteCC(transaction, sqprId) {
        const request = new sql.Request(transaction);
        request.input('pid', sqprId);
        await request.query('DELETE FROM SQPR_CC WHERE sqpr_id = @pid');
    }
};
