/**
 * QMQA Repository
 * Database operations for QMQA module
 */

import db, { sql } from '../config/db.js';
import { QMQA_QUERIES } from './queries/qmqa.queries.js';

export const qmqaRepository = {
    
    // ==================== SCHEDULE OPERATIONS ====================
    
    /**
     * Insert Schedule (QMQA_AUDIT_PLAN with PLANNED status)
     */
    async insertSchedule(transaction, data) {
        console.log('💾 [QMQA-REPO] Inserting Schedule:', data.control_no);
        
        const request = new sql.Request(transaction);
        
        request.input('id', sql.NVarChar(72), data.qmqa_audit_plan_id);
        request.input('cn', sql.NVarChar(60), data.control_no);
        request.input('cd', sql.DateTime, data.created_date);
        request.input('site', sql.NVarChar(72), data.site_id);
        request.input('supp', sql.NVarChar(72), data.supplier_id);
        request.input('cat', sql.NVarChar(72), data.audit_category_id);
        request.input('apd', sql.Date, data.audit_plan_date);
        request.input('sqe', sql.NVarChar(72), data.sqe_pic_id);
        request.input('rem', sql.NVarChar(2000), data.remarks);
        request.input('stat', sql.NVarChar(4), data.request_status);
        request.input('last', sql.DateTime, data.last_update);
        request.input('by', sql.NVarChar(100), data.updateby);

        await request.query(`
            INSERT INTO QMQA_AUDIT_PLAN (
                qmqa_audit_plan_id, control_no, created_date, site_id, supplier_id,
                audit_category_id, audit_plan_date, sqe_pic_id, remarks,
                request_status, last_update, updateby
            ) VALUES (
                @id, @cn, @cd, @site, @supp,
                @cat, @apd, @sqe, @rem,
                @stat, @last, @by
            )
        `);
        
        console.log('✅ [QMQA-REPO] Schedule inserted');
    },

    /**
     * Find Schedule by ID with related entity names
     */
    async findScheduleById(id) {
        console.log('🔍 [QMQA-REPO] Finding Schedule:', id);
        const pool = await db.getPool();
        const request = new sql.Request(pool);
        
        request.input('id', sql.NVarChar(72), id);
        
        const result = await request.query(QMQA_QUERIES.FIND_SCHEDULE_BY_ID);
        const row = result.recordset?.[0] || null;
        
        if (row) console.log('✅ [QMQA-REPO] Schedule found:', row.control_no);
        else console.warn('⚠️ [QMQA-REPO] Schedule NOT found');
        
        return row;
    },

    /**
     * Find All Schedules (status = PLANNED)
     */
    async findAllSchedules() {
        console.log('🔍 [QMQA-REPO] Finding All Schedules');
        const pool = await db.getPool();
        const request = new sql.Request(pool);
        
        const result = await request.query(QMQA_QUERIES.FIND_ALL_SCHEDULES);
        console.log(`✅ [QMQA-REPO] Found ${result.recordset?.length || 0} schedules`);
        
        return result.recordset || [];
    },

    /**
     * Update Schedule
     */
    async updateSchedule(transaction, id, updates) {
        console.log('💾 [QMQA-REPO] Updating Schedule:', id);
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
            request.input('id', sql.NVarChar(72), id);
            await request.query(`
                UPDATE QMQA_AUDIT_PLAN 
                SET ${sqlUpdates.join(', ')} 
                WHERE qmqa_audit_plan_id = @id
            `);
            console.log('✅ [QMQA-REPO] Schedule updated');
        }
    },

    /**
     * Delete Schedule
     */
    async deleteSchedule(transaction, id) {
        console.log('🗑️ [QMQA-REPO] Deleting Schedule:', id);
        const request = new sql.Request(transaction);
        
        request.input('id', sql.NVarChar(72), id);
        
        await request.query(`
            DELETE FROM QMQA_AUDIT_PLAN 
            WHERE qmqa_audit_plan_id = @id
        `);
        
        console.log('✅ [QMQA-REPO] Schedule deleted');
    },

    // ==================== AUDIT REPORT OPERATIONS ====================
    
    /**
     * Insert QMQA Audit Report (main record)
     */
    async insertQMQA(transaction, data) {
        console.log('💾 [QMQA-REPO] Inserting QMQA Record:', data.qmqa_id);
        
        const request = new sql.Request(transaction);
        
        request.input('id', sql.NVarChar(72), data.qmqa_id);
        request.input('apid', sql.NVarChar(72), data.qmqa_audit_plan_id);
        request.input('cd', sql.DateTime, data.created_date);
        request.input('atid', sql.NVarChar(72), data.audit_type_id);
        request.input('attid', sql.NVarChar(72), data.attention_id);
        request.input('picid', sql.NVarChar(72), data.pic_auditor_id);
        request.input('due', sql.DateTime, data.due_date);
        request.input('ad', sql.Date, data.audit_date);
        request.input('isd', sql.DateTime, data.issued_date);
        request.input('ar', sql.Decimal(18, 2), data.audit_rating);
        request.input('aes', sql.NVarChar(4000), data.auditees);
        request.input('ars', sql.NVarChar(4000), data.auditors);
        request.input('ats', sql.NVarChar(4000), data.attendees);
        request.input('rem', sql.NVarChar(2000), data.remarks);
        request.input('enc', sql.NVarChar(72), data.encoder_id);
        request.input('encd', sql.DateTime, data.encoder_date);
        request.input('iss', sql.NVarChar(72), data.issuer_id);
        request.input('issrem', sql.NVarChar(2000), data.issuer_remarks);
        request.input('issdt', sql.DateTime, data.issuer_date);
        request.input('chk', sql.NVarChar(72), data.checker_id);
        request.input('chkrem', sql.NVarChar(2000), data.checker_remarks);
        request.input('chkdt', sql.DateTime, data.checker_date);
        request.input('app', sql.NVarChar(72), data.approver_id);
        request.input('apprem', sql.NVarChar(2000), data.approver_remarks);
        request.input('appdt', sql.DateTime, data.approver_date);
        request.input('stat', sql.NVarChar(4), data.request_status);
        request.input('last', sql.DateTime, data.last_update);
        request.input('by', sql.NVarChar(100), data.updateby);

        await request.query(`
            INSERT INTO QMQA (
                qmqa_id, qmqa_audit_plan_id, created_date, audit_type_id, attention_id,
                pic_auditor_id, due_date, audit_date, issued_date, audit_rating,
                auditees, auditors, attendees, remarks,
                encoder_id, encoder_date, issuer_id, issuer_remarks, issuer_date,
                checker_id, checker_remarks, checker_date,
                approver_id, approver_remarks, approver_date,
                request_status, last_update, updateby
            ) VALUES (
                @id, @apid, @cd, @atid, @attid,
                @picid, @due, @ad, @isd, @ar,
                @aes, @ars, @ats, @rem,
                @enc, @encd, @iss, @issrem, @issdt,
                @chk, @chkrem, @chkdt,
                @app, @apprem, @appdt,
                @stat, @last, @by
            )
        `);
        
        console.log('✅ [QMQA-REPO] QMQA Record inserted');
    },

    /**
     * Insert Audit Plan (for direct creation without schedule)
     */
    async insertAuditPlan(transaction, data) {
        console.log('💾 [QMQA-REPO] Inserting Audit Plan:', data.control_no);
        
        // Reuse insertSchedule logic
        await this.insertSchedule(transaction, data);
    },

    /**
     * Find Full Record by ID or Control Number
     */
    async findRecordById(idOrControlNo) {
        console.log('🔍 [QMQA-REPO] Finding Record:', idOrControlNo);
        const pool = await db.getPool();
        const request = new sql.Request(pool);
        
        request.input('id1', sql.NVarChar(72), idOrControlNo);
        request.input('id2', sql.NVarChar(60), idOrControlNo);
        
        const result = await request.query(QMQA_QUERIES.FIND_FULL_RECORD);
        const row = result.recordset?.[0] || null;
        
        if (row) console.log('✅ [QMQA-REPO] Record found:', row.control_no);
        else console.warn('⚠️ [QMQA-REPO] Record NOT found');
        
        return row;
    },

    /**
     * Find All Records with optional status filtering and RLS
     */
    async findAllRecords(statusFilter = null, userId = null, userRole = null) {
        console.log('🔍 [QMQA-REPO] Finding All Records', { statusFilter, userId, userRole });
        const pool = await db.getPool();
        const request = new sql.Request(pool);
        
        if (statusFilter) {
            request.input('status', sql.NVarChar(4), statusFilter);
        }
        if (userId) {
            request.input('userId', sql.NVarChar(72), userId);
        }
        if (userRole) {
            request.input('userRole', sql.NVarChar(50), userRole);
        }
        
        const result = await request.query(QMQA_QUERIES.FIND_ALL_RECORDS);
        console.log(`✅ [QMQA-REPO] Found ${result.recordset?.length || 0} records`);
        
        return result.recordset || [];
    },

    /**
     * Update QMQA Record
     */
    async updateQMQA(transaction, id, updates) {
        console.log('💾 [QMQA-REPO] Updating QMQA Record:', id);
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
            request.input('id', sql.NVarChar(72), id);
            await request.query(`
                UPDATE QMQA 
                SET ${sqlUpdates.join(', ')} 
                WHERE qmqa_id = @id
            `);
            console.log('✅ [QMQA-REPO] QMQA Record updated');
        }
    },

    /**
     * Delete QMQA Record (cascade handled by sub-table deletes)
     */
    async deleteQMQA(transaction, id) {
        console.log('🗑️ [QMQA-REPO] Deleting QMQA Record:', id);
        const request = new sql.Request(transaction);
        
        request.input('id', sql.NVarChar(72), id);
        
        await request.query(`
            DELETE FROM QMQA 
            WHERE qmqa_id = @id
        `);
        
        console.log('✅ [QMQA-REPO] QMQA Record deleted');
    },

    // ==================== SUB-TABLE OPERATIONS ====================
    
    /**
     * Insert Plan Attachments
     */
    async insertPlanAttachments(transaction, qmqaId, attachments) {
        console.log(`💾 [QMQA-REPO] Inserting ${attachments.length} Plan Attachments`);
        
        for (const att of attachments) {
            const request = new sql.Request(transaction);
            request.input('id', sql.NVarChar(72), att.qmqa_plan_attachment_id);
            request.input('qid', sql.NVarChar(72), qmqaId);
            request.input('fn', sql.NVarChar(220), att.file_name);
            request.input('ext', sql.NVarChar(20), att.file_extension);
            request.input('rem', sql.NVarChar(2000), att.remarks);
            request.input('last', sql.DateTime, att.last_update);
            request.input('by', sql.NVarChar(100), att.updateby);

            await request.query(`
                INSERT INTO QMQA_PLAN_ATTACHMENT (
                    qmqa_plan_attachment_id, qmqa_id, file_name, file_extension,
                    remarks, last_update, updateby
                ) VALUES (
                    @id, @qid, @fn, @ext,
                    @rem, @last, @by
                )
            `);
        }
        
        console.log('✅ [QMQA-REPO] Plan Attachments inserted');
    },

    /**
     * Insert General Attachments
     */
    async insertAttachments(transaction, qmqaId, attachments) {
        console.log(`💾 [QMQA-REPO] Inserting ${attachments.length} Attachments`);
        
        for (const att of attachments) {
            const request = new sql.Request(transaction);
            request.input('id', sql.NVarChar(72), att.qmqa_attachment_id);
            request.input('qid', sql.NVarChar(72), qmqaId);
            request.input('fn', sql.NVarChar(220), att.file_name);
            request.input('ext', sql.NVarChar(20), att.file_extension);
            request.input('rem', sql.NVarChar(2000), att.remarks);
            request.input('last', sql.DateTime, att.last_update);
            request.input('by', sql.NVarChar(100), att.updateby);

            await request.query(`
                INSERT INTO QMQA_ATTACHMENT (
                    qmqa_attachment_id, qmqa_id, file_name, file_extension,
                    remarks, last_update, updateby
                ) VALUES (
                    @id, @qid, @fn, @ext,
                    @rem, @last, @by
                )
            `);
        }
        
        console.log('✅ [QMQA-REPO] Attachments inserted');
    },

    /**
     * Insert CC List
     */
    async insertCC(transaction, qmqaId, ccList) {
        console.log(`💾 [QMQA-REPO] Inserting ${ccList.length} CC Entries`);
        
        for (const cc of ccList) {
            const request = new sql.Request(transaction);
            request.input('id', sql.NVarChar(72), cc.qmqa_cc_id);
            request.input('qid', sql.NVarChar(72), qmqaId);
            request.input('uid', sql.NVarChar(72), cc.user_id);
            request.input('last', sql.DateTime, cc.last_update);
            request.input('by', sql.NVarChar(100), cc.updateby);

            await request.query(`
                INSERT INTO QMQA_CC (
                    qmqa_cc_id, qmqa_id, user_id, last_update, updateby
                ) VALUES (
                    @id, @qid, @uid, @last, @by
                )
            `);
        }
        
        console.log('✅ [QMQA-REPO] CC List inserted');
    },

    /**
     * Insert Response Record
     */
    async insertResponse(transaction, qmqaId, responseData) {
        console.log('💾 [QMQA-REPO] Inserting Response Record');
        
        const request = new sql.Request(transaction);
        request.input('id', sql.NVarChar(72), responseData.qmqa_response_id);
        request.input('qid', sql.NVarChar(72), qmqaId);
        request.input('skip', sql.Bit, responseData.skip_initial);
        request.input('ird', sql.DateTime, responseData.initial_report_date);
        request.input('frd', sql.DateTime, responseData.final_report_date);
        request.input('irem', sql.NVarChar(2000), responseData.initial_remarks);
        request.input('frem', sql.NVarChar(2000), responseData.final_remarks);
        request.input('issrem', sql.NVarChar(2000), responseData.issuer_remarks);
        request.input('issdt', sql.DateTime, responseData.issuer_date);
        request.input('chk', sql.NVarChar(72), responseData.checker_id);
        request.input('chkrem', sql.NVarChar(2000), responseData.checker_remarks);
        request.input('chkdt', sql.DateTime, responseData.checker_date);
        request.input('app', sql.NVarChar(72), responseData.approver_id);
        request.input('apprem', sql.NVarChar(2000), responseData.approver_remarks);
        request.input('appdt', sql.DateTime, responseData.approver_date);
        request.input('last', sql.DateTime, responseData.last_update);
        request.input('by', sql.NVarChar(100), responseData.updateby);
        request.input('acc', sql.DateTime, responseData.accept_date);
        request.input('rem', sql.NVarChar(2000), responseData.remarks);
        request.input('vrem', sql.NVarChar(2000), responseData.verification_remarks);

        await request.query(`
            INSERT INTO QMQA_RESPONSE (
                qmqa_response_id, qmqa_id, skip_initial, initial_report_date, final_report_date,
                initial_remarks, final_remarks, issuer_remarks, issuer_date,
                checker_id, checker_remarks, checker_date,
                approver_id, approver_remarks, approver_date,
                last_update, updateby, accept_date, remarks, verification_remarks
            ) VALUES (
                @id, @qid, @skip, @ird, @frd,
                @irem, @frem, @issrem, @issdt,
                @chk, @chkrem, @chkdt,
                @app, @apprem, @appdt,
                @last, @by, @acc, @rem, @vrem
            )
        `);
        
        console.log('✅ [QMQA-REPO] Response Record inserted');
    },

    /**
     * Insert Initial Report Attachment
     */
    async insertInitialAttachment(transaction, responseId, attachment) {
        console.log('💾 [QMQA-REPO] Inserting Initial Attachment');
        
        const request = new sql.Request(transaction);
        request.input('id', sql.NVarChar(72), attachment.qmqa_response_initial_attachment_id);
        request.input('rid', sql.NVarChar(72), responseId);
        request.input('fn', sql.NVarChar(220), attachment.file_name);
        request.input('ext', sql.NVarChar(20), attachment.file_extension);
        request.input('rem', sql.NVarChar(2000), attachment.remarks);
        request.input('last', sql.DateTime, attachment.last_update);
        request.input('by', sql.NVarChar(100), attachment.updateby);

        await request.query(`
            INSERT INTO QMQA_RESPONSE_INITIAL (
                qmqa_response_initial_attachment_id, qmqa_response_id, file_name, file_extension,
                remarks, last_update, updateby
            ) VALUES (
                @id, @rid, @fn, @ext,
                @rem, @last, @by
            )
        `);
        
        console.log('✅ [QMQA-REPO] Initial Attachment inserted');
    },

    /**
     * Insert Final Report Attachment
     */
    async insertFinalAttachment(transaction, responseId, attachment) {
        console.log('💾 [QMQA-REPO] Inserting Final Attachment');
        
        const request = new sql.Request(transaction);
        request.input('id', sql.NVarChar(72), attachment.qmqa_response_final_attachment_id);
        request.input('rid', sql.NVarChar(72), responseId);
        request.input('fn', sql.NVarChar(220), attachment.file_name);
        request.input('ext', sql.NVarChar(20), attachment.file_extension);
        request.input('rem', sql.NVarChar(2000), attachment.remarks);
        request.input('last', sql.DateTime, attachment.last_update);
        request.input('by', sql.NVarChar(100), attachment.updateby);

        await request.query(`
            INSERT INTO QMQA_RESPONSE_FINAL (
                qmqa_response_final_attachment_id, qmqa_response_id, file_name, file_extension,
                remarks, last_update, updateby
            ) VALUES (
                @id, @rid, @fn, @ext,
                @rem, @last, @by
            )
        `);
        
        console.log('✅ [QMQA-REPO] Final Attachment inserted');
    },

    /**
     * Insert Verification Attachment
     */
    async insertVerificationAttachment(transaction, responseId, attachment) {
        console.log('💾 [QMQA-REPO] Inserting Verification Attachment');
        
        const request = new sql.Request(transaction);
        request.input('id', sql.NVarChar(72), attachment.qmqa_response_verification_attachment_id);
        request.input('rid', sql.NVarChar(72), responseId);
        request.input('fn', sql.NVarChar(220), attachment.file_name);
        request.input('ext', sql.NVarChar(20), attachment.file_extension);
        request.input('rem', sql.NVarChar(2000), attachment.remarks);
        request.input('last', sql.DateTime, attachment.last_update);
        request.input('by', sql.NVarChar(100), attachment.updateby);

        await request.query(`
            INSERT INTO QMQA_RESPONSE_VERIFICATION (
                qmqa_response_verification_attachment_id, qmqa_response_id, file_name, file_extension,
                remarks, last_update, updateby
            ) VALUES (
                @id, @rid, @fn, @ext,
                @rem, @last, @by
            )
        `);
        
        console.log('✅ [QMQA-REPO] Verification Attachment inserted');
    },

    /**
     * Delete Sub-Table Records (Generic)
     */
    async deleteSubTable(transaction, qmqaId, tableName) {
        console.log(`🗑️ [QMQA-REPO] Deleting from ${tableName} for ${qmqaId}`);
        const request = new sql.Request(transaction);
        
        // Sanitize tableName (internal use only)
        const safeTable = tableName.replace(/[^a-zA-Z0-9_]/g, '');
        request.input('qid', sql.NVarChar(72), qmqaId);
        
        await request.query(`DELETE FROM ${safeTable} WHERE qmqa_id = @qid`);
        
        console.log(`✅ [QMQA-REPO] Deleted from ${safeTable}`);
    },

    /**
     * Find Sub-Tables for a QMQA Record
     */
    async findSubTables(qmqaId) {
        console.log('🔍 [QMQA-REPO] Finding Subtables for:', qmqaId);
        const pool = await db.getPool();
        const request = new sql.Request(pool);
        request.input('qid', sql.NVarChar(72), qmqaId);

        // Plan Attachments
        const planAttsResult = await request.query(`
            SELECT * FROM QMQA_PLAN_ATTACHMENT WHERE qmqa_id = @qid
        `);
        
        // General Attachments
        const attsResult = await request.query(`
            SELECT * FROM QMQA_ATTACHMENT WHERE qmqa_id = @qid
        `);
        
        // CC List with User Join
        const ccResult = await request.query(`
            SELECT cc.*, u.full_name as user_name, u.email as user_email
            FROM QMQA_CC cc
            LEFT JOIN dbo.USERS u ON cc.user_id = u.user_id
            WHERE cc.qmqa_id = @qid
        `);

        // Response with attachments
        const responseResult = await request.query(`
            SELECT * FROM QMQA_RESPONSE WHERE qmqa_id = @qid
        `);
        
        let response = null;
        if (responseResult.recordset && responseResult.recordset.length > 0) {
            response = responseResult.recordset[0];
            const responseId = response.qmqa_response_id;
            
            // Get response attachments
            const initialAttsResult = await request.query(`
                SELECT * FROM QMQA_RESPONSE_INITIAL WHERE qmqa_response_id = '${responseId}'
            `);
            const finalAttsResult = await request.query(`
                SELECT * FROM QMQA_RESPONSE_FINAL WHERE qmqa_response_id = '${responseId}'
            `);
            const verificationAttsResult = await request.query(`
                SELECT * FROM QMQA_RESPONSE_VERIFICATION WHERE qmqa_response_id = '${responseId}'
            `);
            
            response.initialAttachments = initialAttsResult.recordset || [];
            response.finalAttachments = finalAttsResult.recordset || [];
            response.verificationAttachments = verificationAttsResult.recordset || [];
        }

        return {
            auditPlanAttachments: planAttsResult.recordset || [],
            attachments: attsResult.recordset || [],
            ccList: ccResult.recordset || [],
            response
        };
    },
    
    // ==================== FILE MANAGEMENT OPERATIONS ====================
    
    /**
     * Find attachment by ID
     */
    async findAttachmentById(attachmentId) {
        console.log('🔍 [QMQA-REPO] Finding Attachment:', attachmentId);
        const pool = await db.getPool();
        const request = new sql.Request(pool);
        
        request.input('id', sql.NVarChar(72), attachmentId);
        
        // Try to find in general attachments
        let result = await request.query(`
            SELECT 
                qmqa_attachment_id as attachment_id,
                qmqa_id,
                file_name,
                file_extension,
                remarks
            FROM QMQA_ATTACHMENT
            WHERE qmqa_attachment_id = @id
        `);
        
        if (result.recordset && result.recordset.length > 0) {
            return result.recordset[0];
        }
        
        // Try to find in plan attachments
        result = await request.query(`
            SELECT 
                qmqa_plan_attachment_id as attachment_id,
                qmqa_id,
                file_name,
                file_extension,
                remarks
            FROM QMQA_PLAN_ATTACHMENT
            WHERE qmqa_plan_attachment_id = @id
        `);
        
        return result.recordset?.[0] || null;
    },
    
    // ==================== SEARCH AND REPORTING OPERATIONS ====================
    
    /**
     * Search records with filters and pagination
     */
    async searchRecords(filters, userId, userRole, pagination) {
        console.log('🔍 [QMQA-REPO] Searching Records:', filters);
        const pool = await db.getPool();
        const request = new sql.Request(pool);
        
        const whereClauses = [];
        const params = [];
        
        // Control number filter
        if (filters.controlNo) {
            whereClauses.push(`ap.control_no LIKE @controlNo`);
            request.input('controlNo', sql.NVarChar, `%${filters.controlNo}%`);
        }
        
        // Status filter
        if (filters.status) {
            whereClauses.push(`q.request_status = @status`);
            request.input('status', sql.NVarChar(4), filters.status);
        }
        
        // Supplier filter
        if (filters.supplierId) {
            whereClauses.push(`ap.supplier_id = @supplierId`);
            request.input('supplierId', sql.NVarChar(72), filters.supplierId);
        }
        
        // Date range filter
        if (filters.dateFrom) {
            whereClauses.push(`(ap.audit_plan_date >= @dateFrom OR q.audit_date >= @dateFrom)`);
            request.input('dateFrom', sql.Date, filters.dateFrom);
        }
        
        if (filters.dateTo) {
            whereClauses.push(`(ap.audit_plan_date <= @dateTo OR q.audit_date <= @dateTo)`);
            request.input('dateTo', sql.Date, filters.dateTo);
        }
        
        // Row-level security (unless admin)
        if (userRole !== 'ADMIN' && userId) {
            whereClauses.push(`(
                q.issuer_id = @userId OR
                q.encoder_id = @userId OR
                q.checker_id = @userId OR
                q.approver_id = @userId OR
                EXISTS (SELECT 1 FROM QMQA_CC WHERE qmqa_id = q.qmqa_id AND user_id = @userId)
            )`);
            request.input('userId', sql.NVarChar(72), userId);
        }
        
        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM QMQA q
            INNER JOIN QMQA_AUDIT_PLAN ap ON q.qmqa_audit_plan_id = ap.qmqa_audit_plan_id
            ${whereClause}
        `;
        
        const countResult = await request.query(countQuery);
        const total = countResult.recordset[0].total;
        
        // Get paginated records
        request.input('limit', sql.Int, pagination.limit);
        request.input('offset', sql.Int, pagination.offset);
        
        const dataQuery = `
            SELECT 
                q.*,
                ap.control_no,
                ap.audit_plan_date,
                s.site_name,
                sup.supplier_name,
                cat.category_name,
                sqe.full_name as sqe_pic_name
            FROM QMQA q
            INNER JOIN QMQA_AUDIT_PLAN ap ON q.qmqa_audit_plan_id = ap.qmqa_audit_plan_id
            LEFT JOIN SITE s ON ap.site_id = s.site_id
            LEFT JOIN SUPPLIER sup ON ap.supplier_id = sup.supplier_id
            LEFT JOIN DEFECT_CATEGORY cat ON ap.audit_category_id = cat.category_id
            LEFT JOIN USERS sqe ON ap.sqe_pic_id = sqe.user_id
            ${whereClause}
            ORDER BY q.created_date DESC
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `;
        
        const dataResult = await request.query(dataQuery);
        
        console.log(`✅ [QMQA-REPO] Found ${dataResult.recordset.length} records (total: ${total})`);
        
        return {
            records: dataResult.recordset || [],
            total
        };
    },
    
    /**
     * Find calendar data for a specific month
     */
    async findCalendarData(year, month) {
        console.log('📅 [QMQA-REPO] Finding Calendar Data:', { year, month });
        const pool = await db.getPool();
        const request = new sql.Request(pool);
        
        request.input('year', sql.Int, year);
        request.input('month', sql.Int, month);
        
        const query = `
            SELECT 
                ap.qmqa_audit_plan_id,
                ap.control_no,
                ap.audit_plan_date,
                ap.request_status,
                sup.supplier_name,
                NULL as qmqa_id,
                NULL as audit_date
            FROM QMQA_AUDIT_PLAN ap
            LEFT JOIN SUPPLIER sup ON ap.supplier_id = sup.supplier_id
            WHERE YEAR(ap.audit_plan_date) = @year 
                AND MONTH(ap.audit_plan_date) = @month
                AND ap.request_status = 'PL'
            
            UNION ALL
            
            SELECT 
                ap.qmqa_audit_plan_id,
                ap.control_no,
                ap.audit_plan_date,
                q.request_status,
                sup.supplier_name,
                q.qmqa_id,
                q.audit_date
            FROM QMQA q
            INNER JOIN QMQA_AUDIT_PLAN ap ON q.qmqa_audit_plan_id = ap.qmqa_audit_plan_id
            LEFT JOIN SUPPLIER sup ON ap.supplier_id = sup.supplier_id
            WHERE (
                (YEAR(ap.audit_plan_date) = @year AND MONTH(ap.audit_plan_date) = @month) OR
                (YEAR(q.audit_date) = @year AND MONTH(q.audit_date) = @month)
            )
            
            ORDER BY audit_plan_date, audit_date
        `;
        
        const result = await request.query(query);
        console.log(`✅ [QMQA-REPO] Found ${result.recordset.length} calendar entries`);
        
        return result.recordset || [];
    },
    
    /**
     * Find achievement data with metrics
     */
    async findAchievementData(filters) {
        console.log('📊 [QMQA-REPO] Finding Achievement Data:', filters);
        const pool = await db.getPool();
        const request = new sql.Request(pool);
        
        const whereClauses = [];
        
        // Date range filter
        if (filters.dateFrom) {
            whereClauses.push(`q.audit_date >= @dateFrom`);
            request.input('dateFrom', sql.Date, filters.dateFrom);
        }
        
        if (filters.dateTo) {
            whereClauses.push(`q.audit_date <= @dateTo`);
            request.input('dateTo', sql.Date, filters.dateTo);
        }
        
        // Supplier filter
        if (filters.supplierId) {
            whereClauses.push(`ap.supplier_id = @supplierId`);
            request.input('supplierId', sql.NVarChar(72), filters.supplierId);
        }
        
        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        
        const query = `
            SELECT 
                COUNT(*) as total_audits,
                SUM(CASE WHEN q.request_status = 'CL' THEN 1 ELSE 0 END) as completed_audits,
                SUM(CASE WHEN q.request_status NOT IN ('CL', 'CN') THEN 1 ELSE 0 END) as pending_audits,
                SUM(CASE WHEN q.request_status = 'CN' THEN 1 ELSE 0 END) as cancelled_audits,
                AVG(CASE WHEN q.audit_rating IS NOT NULL THEN q.audit_rating ELSE NULL END) as average_rating,
                SUM(CASE WHEN q.audit_date <= q.due_date THEN 1 ELSE 0 END) as on_time_count,
                SUM(CASE WHEN q.request_status = 'DR' THEN 1 ELSE 0 END) as draft_count,
                SUM(CASE WHEN q.request_status = 'AW' THEN 1 ELSE 0 END) as awaiting_count,
                SUM(CASE WHEN q.request_status = 'AP' THEN 1 ELSE 0 END) as approved_count,
                SUM(CASE WHEN q.request_status = 'RJ' THEN 1 ELSE 0 END) as rejected_count,
                SUM(CASE WHEN q.request_status = 'IS' THEN 1 ELSE 0 END) as issued_count,
                SUM(CASE WHEN q.request_status = 'IR' THEN 1 ELSE 0 END) as initial_count,
                SUM(CASE WHEN q.request_status = 'FR' THEN 1 ELSE 0 END) as final_count,
                SUM(CASE WHEN q.request_status = 'RA' THEN 1 ELSE 0 END) as response_awaiting_count,
                SUM(CASE WHEN q.request_status = 'RR' THEN 1 ELSE 0 END) as response_rejected_count,
                SUM(CASE WHEN q.request_status = 'CL' THEN 1 ELSE 0 END) as closed_count
            FROM QMQA q
            INNER JOIN QMQA_AUDIT_PLAN ap ON q.qmqa_audit_plan_id = ap.qmqa_audit_plan_id
            ${whereClause}
        `;
        
        const result = await request.query(query);
        console.log('✅ [QMQA-REPO] Achievement data retrieved');
        
        return result.recordset[0] || {};
    }
};
