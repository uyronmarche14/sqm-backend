import db, { sql } from '../config/db.js';
import { SQMP_QUERIES } from './queries/sqmp.queries.js';

export const sqmpRepository = {
    
    /**
     * Insert Main SQMP Record
     */
    async insertSQMP(transaction, data) {
        console.log('💾 [SQMP-REPO] Inserting Main Record:', data.control_no);
        console.log('   Stats - status:', data.request_status, 'len:', data.request_status?.length);
        console.log('   Stats - control_no:', data.control_no, 'len:', data.control_no?.length);
        console.log('   Stats - site_id:', data.site_id, 'len:', data.site_id?.length);
        
        const request = new sql.Request(transaction);
        
        request.input('id', data.sqmp_id);
        request.input('cn', data.control_no);
        request.input('reg', data.registration_date);
        request.input('site', data.site_id);
        request.input('upp', data.supplier_id);
        request.input('att', data.attention_id);
        request.input('fy', data.fiscal_year);
        request.input('sem', data.semester);
        request.input('issd', data.issued_date);
        request.input('due', data.due_date);
        request.input('mod', data.model_id);
        request.input('rev', data.revision);
        request.input('rem', data.remarks);
        request.input('mdr', data.main_document_remarks);
        request.input('apr', data.appendix_sheet_remarks);
        
        request.input('enc', data.encoder_id);
        request.input('encd', data.encoder_date);
        request.input('iss', data.issuer_id);
        request.input('issrem', data.issuer_remarks);
        request.input('issdt', data.issuer_date);
        
        request.input('stat', data.request_status);
        request.input('last', data.last_update);
        request.input('by', data.updateby);

        await request.query(`
            INSERT INTO SQMP (
                sqmp_id, control_no, registration_date, site_id, supplier_id, attention_id,
                fiscal_year, semester, issued_date, due_date, model_id, revision,
                remarks, main_document_remarks, appendix_sheet_remarks,
                encoder_id, encoder_date, issuer_id, issuer_remarks, issuer_date,
                request_status, last_update, updateby
            ) VALUES (
                @id, @cn, @reg, @site, @upp, @att,
                @fy, @sem, @issd, @due, @mod, @rev,
                @rem, @mdr, @apr,
                @enc, @encd, @iss, @issrem, @issdt,
                @stat, @last, @by
            )
        `);
    },

    /**
     * Insert Main Documents
     */
    async insertDocuments(transaction, docs) {
        console.log(`💾 [SQMP-REPO] Inserting ${docs.length} Main Documents`);
        for (const doc of docs) {
            console.log('  > Doc:', doc.file_name);
            const request = new sql.Request(transaction);
            request.input('id', doc.sqmp_document_id);
            request.input('pid', doc.sqmp_id);
            request.input('fn', doc.file_name);
            request.input('ext', doc.file_extension);
            request.input('rem', doc.remarks);
            request.input('last', doc.last_update);
            request.input('by', doc.updateby);

            await request.query(`
                INSERT INTO SQMP_DOCUMENT (
                    sqmp_document_id, sqmp_id, file_name, file_extension, 
                    remarks, last_update, updateby
                ) VALUES (
                    @id, @pid, @fn, @ext, 
                    @rem, @last, @by
                )
            `);
        }
    },

    /**
     * Insert Appendix Documents
     */
    async insertAppendices(transaction, apps) {
        console.log(`💾 [SQMP-REPO] Inserting ${apps.length} Appendices`);
        for (const app of apps) {
            console.log('  > App:', app.file_name);
            const request = new sql.Request(transaction);
            request.input('id', app.sqmp_appendix_id);
            request.input('pid', app.sqmp_id);
            request.input('fn', app.file_name);
            request.input('ext', app.file_extension);
            request.input('rem', app.remarks);
            request.input('last', app.last_update);
            request.input('by', app.updateby);

            await request.query(`
                INSERT INTO SQMP_APPENDIX (
                    sqmp_appendix_id, sqmp_id, file_name, file_extension, 
                    remarks, last_update, updateby
                ) VALUES (
                    @id, @pid, @fn, @ext, 
                    @rem, @last, @by
                )
            `);
        }
    },

    /**
     * Insert CC List
     */
    async insertCC(transaction, list) {
        console.log(`💾 [SQMP-REPO] Inserting ${list.length} CC Entries`);
        for (const cc of list) {
            const request = new sql.Request(transaction);
            request.input('id', cc.sqmp_cc_id);
            request.input('pid', cc.sqmp_id);
            request.input('uid', cc.user_id);
            request.input('last', cc.last_update);
            request.input('by', cc.updateby);

            await request.query(`
                INSERT INTO SQMP_CC (
                    sqmp_cc_id, sqmp_id, user_id, last_update, updateby
                ) VALUES (
                    @id, @pid, @uid, @last, @by
                )
            `);
        }
    },

    /**
     * Find Full Record
     */
    async findFullRecord(idOrControlNo) {
        console.log('🔍 [SQMP-REPO] Finding Record:', idOrControlNo);
        const pool = await db.getPool();
        const request = new sql.Request(pool);
        
        request.input('id1', idOrControlNo);
        request.input('id2', idOrControlNo);
        
        const result = await request.query(SQMP_QUERIES.FIND_FULL_RECORD);
        const row = result.recordset?.[0] || null;
        if (row) console.log('✅ [SQMP-REPO] Record found:', row.control_no);
        else console.warn('⚠️ [SQMP-REPO] Record NOT found');
        return row;
    },

    /**
     * Find All Records
     */
    async findAllRecords() {
        console.log('🔍 [SQMP-REPO] Finding All Records');
        const pool = await db.getPool();
        const request = new sql.Request(pool);
        
        const result = await request.query(SQMP_QUERIES.FIND_ALL_RECORDS);
        console.log(`✅ [SQMP-REPO] Found ${result.recordset?.length || 0} records`);
        return result.recordset || [];
    },

    /**
     * Find Subtables
     */
    async findSubTables(sqmpId) {
        console.log('🔍 [SQMP-REPO] Finding Subtables for:', sqmpId);
        const pool = await db.getPool();
        const request = new sql.Request(pool);
        request.input('sqmpId', sqmpId);

        // Docs
        const docsResult = await request.query('SELECT * FROM SQMP_DOCUMENT WHERE sqmp_id = @sqmpId');
        
        // Appendices
        const appsResult = await request.query('SELECT * FROM SQMP_APPENDIX WHERE sqmp_id = @sqmpId');
        
        // CC List with User Join
        const ccResult = await request.query(`
            SELECT cc.*, u.full_name as user_name, u.email as user_email
            FROM SQMP_CC cc
            LEFT JOIN dbo.USERS u ON cc.user_id = u.user_id
            WHERE cc.sqmp_id = @sqmpId
        `);

        return {
            documents: docsResult.recordset || [],
            appendices: appsResult.recordset || [],
            ccList: ccResult.recordset || []
        };
    },

    /**
     * Update Main Record
     */
    async updateSQMP(transaction, sqmpId, updates) {
        console.log('💾 [SQMP-REPO] Updating Main Record:', sqmpId);
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
            request.input('id', sqmpId);
            await request.query(`UPDATE SQMP SET ${sqlUpdates.join(', ')} WHERE sqmp_id = @id`);
        }
    },

    /**
     * Delete Child Table Records (Generic)
     */
    async deleteSubTable(transaction, sqmpId, tableName) {
        console.log(`🗑️ [SQMP-REPO] Deleting from ${tableName} for ${sqmpId}`);
        const request = new sql.Request(transaction);
        // Sanitize tableName (internal use only)
        const safeTable = tableName.replace(/[^a-zA-Z0-9_]/g, '');
        request.input('pid', sqmpId);
        await request.query(`DELETE FROM ${safeTable} WHERE sqmp_id = @pid`);
    }
};
