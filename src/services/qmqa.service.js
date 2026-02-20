/**
 * QMQA Service
 * Business logic for QMQA module
 */

import db, { sql } from '../config/db.js';
import { qmqaRepository } from '../repositories/qmqa.repository.js';
import { generateControlNo } from '../utils/qmqa/control-no-generator.js';
import { toDBStatus, fromDBStatus } from '../utils/qmqa/status-mapper.js';
import { formatSchedule, formatRecord } from '../utils/qmqa/response-formatter.js';
import { v4 as uuidv4 } from 'uuid';
import * as qmqaWorkflowService from './qmqa-workflow.service.js';
import { qmqaEmailService } from './qmqa-email.service.js';
import { qmqaTokenService } from './qmqa-token.service.js';

// ==================== VALIDATION HELPERS ====================

/**
 * Validate required fields
 */
const validateRequiredFields = (data, requiredFields) => {
    const errors = [];
    
    for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
            errors.push({
                field,
                message: `${field} is required`
            });
        }
    }
    
    if (errors.length > 0) {
        const error = new Error('Validation failed');
        error.statusCode = 400;
        error.details = errors;
        throw error;
    }
};

/**
 * Validate audit rating range (0-100)
 */
const validateAuditRating = (rating) => {
    if (rating !== undefined && rating !== null) {
        const numRating = Number(rating);
        if (isNaN(numRating) || numRating < 0 || numRating > 100) {
            const error = new Error('Validation failed');
            error.statusCode = 400;
            error.details = [{
                field: 'audit_rating',
                message: 'Audit rating must be between 0 and 100'
            }];
            throw error;
        }
    }
};

/**
 * Validate date format (ISO 8601)
 */
const validateDateFormat = (dateValue, fieldName) => {
    if (dateValue !== undefined && dateValue !== null && dateValue !== '') {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
            const error = new Error('Validation failed');
            error.statusCode = 400;
            error.details = [{
                field: fieldName,
                message: `${fieldName} must be a valid ISO 8601 date`
            }];
            throw error;
        }
    }
};

/**
 * Validate foreign key reference exists
 */
const validateForeignKey = async (pool, tableName, idField, idValue, displayName) => {
    if (idValue !== undefined && idValue !== null && idValue !== '') {
        const result = await pool.request()
            .input('id', sql.NVarChar, idValue)
            .query(`SELECT COUNT(*) as count FROM ${tableName} WHERE ${idField} = @id`);
        
        if (result.recordset[0].count === 0) {
            const error = new Error('Validation failed');
            error.statusCode = 400;
            error.details = [{
                field: idField,
                message: `${displayName} not found`
            }];
            throw error;
        }
    }
};

export const qmqaService = {
    
    // ==================== SCHEDULE OPERATIONS ====================
    
    /**
     * Create Schedule (QMQA_AUDIT_PLAN with PLANNED status)
     */
    async createSchedule(data, userId) {
        console.log('---------------------------------------------------');
        console.log('📥 [QMQA-SERVICE] Create Schedule Request');
        console.log('---------------------------------------------------');
        
        // Validate required fields
        validateRequiredFields(data, [
            'site_id',
            'supplier_id',
            'audit_category_id',
            'audit_plan_date',
            'sqe_pic_id'
        ]);
        
        // Validate date format
        validateDateFormat(data.audit_plan_date, 'audit_plan_date');
        
        const pool = await db.getPool();
        
        // Validate foreign key references
        await validateForeignKey(pool, 'MFG_SITES', 'site_id', data.site_id, 'Manufacturing site');
        await validateForeignKey(pool, 'SUPPLIERS', 'supplier_id', data.supplier_id, 'Supplier');
        await validateForeignKey(pool, 'AUDITCATEGORY', 'audit_category_id', data.audit_category_id, 'Audit category');
        await validateForeignKey(pool, 'USERS', 'user_id', data.sqe_pic_id, 'SQE PIC');
        
        const transaction = new sql.Transaction(pool);
        
        try {
            await transaction.begin();
            
            const scheduleId = uuidv4();
            const now = new Date();
            const year = new Date(data.audit_plan_date).getFullYear();
            const controlNo = await generateControlNo(year, true); // true = from schedule (P- prefix)
            
            console.log('⚙️ [QMQA-SERVICE] Generated ID:', scheduleId);
            console.log('⚙️ [QMQA-SERVICE] Generated Control No:', controlNo);
            
            const scheduleData = {
                qmqa_audit_plan_id: scheduleId,
                control_no: controlNo,
                created_date: now,
                site_id: data.site_id,
                supplier_id: data.supplier_id,
                audit_category_id: data.audit_category_id,
                audit_plan_date: data.audit_plan_date,
                sqe_pic_id: data.sqe_pic_id,
                remarks: data.remarks,
                request_status: toDBStatus('PLANNED'),
                last_update: now,
                updateby: userId
            };
            
            await qmqaRepository.insertSchedule(transaction, scheduleData);
            
            await transaction.commit();
            console.log('✅ [QMQA-SERVICE] Schedule Created');
            
            return await this.getSchedule(scheduleId);
        } catch (error) {
            console.error('❌ [QMQA-SERVICE] Create Schedule Failed:', error);
            if (transaction._aborted === false) await transaction.rollback();
            throw error;
        }
    },

    /**
     * Get Single Schedule
     */
    async getSchedule(id) {
        console.log('🔍 [QMQA-SERVICE] Getting Schedule:', id);
        const row = await qmqaRepository.findScheduleById(id);
        if (!row) return null;
        
        return formatSchedule(row);
    },

    /**
     * Get All Schedules
     */
    async getAllSchedules() {
        console.log('🔍 [QMQA-SERVICE] Getting All Schedules');
        const rows = await qmqaRepository.findAllSchedules();
        
        return rows.map(row => formatSchedule(row));
    },

    /**
     * Update Schedule
     */
    async updateSchedule(id, data, userId) {
        console.log('📝 [QMQA-SERVICE] Updating Schedule:', id);
        
        // Validate date format if provided
        if (data.audit_plan_date) {
            validateDateFormat(data.audit_plan_date, 'audit_plan_date');
        }
        
        const pool = await db.getPool();
        
        // Validate foreign key references if provided
        if (data.site_id) {
            await validateForeignKey(pool, 'MFG_SITES', 'site_id', data.site_id, 'Manufacturing site');
        }
        if (data.supplier_id) {
            await validateForeignKey(pool, 'SUPPLIERS', 'supplier_id', data.supplier_id, 'Supplier');
        }
        if (data.audit_category_id) {
            await validateForeignKey(pool, 'AUDITCATEGORY', 'audit_category_id', data.audit_category_id, 'Audit category');
        }
        if (data.sqe_pic_id) {
            await validateForeignKey(pool, 'USERS', 'user_id', data.sqe_pic_id, 'SQE PIC');
        }
        
        const transaction = new sql.Transaction(pool);
        
        try {
            await transaction.begin();
            
            // Get current schedule
            const current = await qmqaRepository.findScheduleById(id);
            if (!current) {
                throw new Error('Schedule not found');
            }
            
            // Validate status is PLANNED
            if (fromDBStatus(current.request_status) !== 'PLANNED') {
                throw new Error('Can only update schedules in PLANNED status');
            }
            
            const now = new Date();
            const updates = {
                last_update: now,
                updateby: userId
            };
            
            // Update allowed fields
            if (data.site_id !== undefined) updates.site_id = data.site_id;
            if (data.supplier_id !== undefined) updates.supplier_id = data.supplier_id;
            if (data.audit_category_id !== undefined) updates.audit_category_id = data.audit_category_id;
            if (data.audit_plan_date !== undefined) updates.audit_plan_date = data.audit_plan_date;
            if (data.sqe_pic_id !== undefined) updates.sqe_pic_id = data.sqe_pic_id;
            if (data.remarks !== undefined) updates.remarks = data.remarks;
            
            await qmqaRepository.updateSchedule(transaction, id, updates);
            
            await transaction.commit();
            console.log('✅ [QMQA-SERVICE] Schedule Updated');
            
            return await this.getSchedule(id);
        } catch (error) {
            console.error('❌ [QMQA-SERVICE] Update Schedule Failed:', error);
            if (transaction._aborted === false) await transaction.rollback();
            throw error;
        }
    },

    /**
     * Delete Schedule
     */
    async deleteSchedule(id, userId) {
        console.log('🗑️ [QMQA-SERVICE] Deleting Schedule:', id);
        
        const pool = await db.getPool();
        const transaction = new sql.Transaction(pool);
        
        try {
            await transaction.begin();
            
            // Get current schedule
            const current = await qmqaRepository.findScheduleById(id);
            if (!current) {
                throw new Error('Schedule not found');
            }
            
            // Validate status is PLANNED
            if (fromDBStatus(current.request_status) !== 'PLANNED') {
                throw new Error('Can only delete schedules in PLANNED status');
            }
            
            // Check if schedule has associated audit report
            // (This would require a query to check if QMQA record exists with this audit_plan_id)
            
            await qmqaRepository.deleteSchedule(transaction, id);
            
            await transaction.commit();
            console.log('✅ [QMQA-SERVICE] Schedule Deleted');
            
            return { success: true };
        } catch (error) {
            console.error('❌ [QMQA-SERVICE] Delete Schedule Failed:', error);
            if (transaction._aborted === false) await transaction.rollback();
            throw error;
        }
    },

    // ==================== AUDIT REPORT OPERATIONS ====================
    
    /**
     * Create Audit Report (from schedule or direct)
     */
    async createRecord(data, userId) {
        console.log('---------------------------------------------------');
        console.log('📥 [QMQA-SERVICE] Create Audit Report Request');
        console.log('---------------------------------------------------');
        console.log('📦 From Schedule:', !!data.from_schedule);
        
        // Validate required fields based on creation path
        if (data.from_schedule && data.schedule_id) {
            // From schedule - only need schedule_id and audit details
            validateRequiredFields(data, [
                'schedule_id',
                'audit_type_id',
                'audit_date',
                'checker_id',
                'approver_id'
            ]);
        } else {
            // Direct creation - need full audit plan fields
            validateRequiredFields(data, [
                'site_id',
                'supplier_id',
                'audit_category_id',
                'audit_plan_date',
                'sqe_pic_id',
                'audit_type_id',
                'audit_date',
                'checker_id',
                'approver_id'
            ]);
        }
        
        // Validate audit rating if provided
        validateAuditRating(data.audit_rating);
        
        // Validate date formats
        validateDateFormat(data.audit_date, 'audit_date');
        if (data.due_date) {
            validateDateFormat(data.due_date, 'due_date');
        }
        if (!data.from_schedule) {
            validateDateFormat(data.audit_plan_date, 'audit_plan_date');
        }
        
        const pool = await db.getPool();
        
        // Validate foreign key references
        await validateForeignKey(pool, 'AUDITTYPE', 'audit_type_id', data.audit_type_id, 'Audit type');
        await validateForeignKey(pool, 'USERS', 'user_id', data.checker_id, 'Checker');
        await validateForeignKey(pool, 'USERS', 'user_id', data.approver_id, 'Approver');
        
        if (data.attention_id) {
            await validateForeignKey(pool, 'SUPPLIERSUSER', 'Id', data.attention_id, 'Attention contact');
        }
        if (data.pic_auditor_id) {
            await validateForeignKey(pool, 'USERS', 'user_id', data.pic_auditor_id, 'PIC Auditor');
        }
        
        // If direct creation, validate audit plan foreign keys
        if (!data.from_schedule) {
            await validateForeignKey(pool, 'MFG_SITES', 'site_id', data.site_id, 'Manufacturing site');
            await validateForeignKey(pool, 'SUPPLIERS', 'supplier_id', data.supplier_id, 'Supplier');
            await validateForeignKey(pool, 'AUDITCATEGORY', 'audit_category_id', data.audit_category_id, 'Audit category');
            await validateForeignKey(pool, 'USERS', 'user_id', data.sqe_pic_id, 'SQE PIC');
        }
        
        // Validate CC list user IDs if provided
        if (data.cc_list?.length) {
            for (const cc of data.cc_list) {
                await validateForeignKey(pool, 'USERS', 'user_id', cc.user_id, 'CC user');
            }
        }
        
        const transaction = new sql.Transaction(pool);
        
        try {
            await transaction.begin();
            
            const qmqaId = uuidv4();
            const now = new Date();
            let auditPlanId;
            let controlNo;
            
            // Determine if creating from schedule or direct
            if (data.from_schedule && data.schedule_id) {
                // From existing schedule
                auditPlanId = data.schedule_id;
                const schedule = await qmqaRepository.findScheduleById(auditPlanId);
                if (!schedule) {
                    throw new Error('Schedule not found');
                }
                controlNo = schedule.control_no; // Retain P- prefix
                console.log('⚙️ [QMQA-SERVICE] Using Schedule Control No:', controlNo);
            } else {
                // Direct creation - create audit plan first
                auditPlanId = uuidv4();
                const year = new Date(data.audit_plan_date).getFullYear();
                controlNo = await generateControlNo(year, false); // false = direct (no prefix)
                
                console.log('⚙️ [QMQA-SERVICE] Generated Audit Plan ID:', auditPlanId);
                console.log('⚙️ [QMQA-SERVICE] Generated Control No:', controlNo);
                
                const auditPlanData = {
                    qmqa_audit_plan_id: auditPlanId,
                    control_no: controlNo,
                    created_date: now,
                    site_id: data.site_id,
                    supplier_id: data.supplier_id,
                    audit_category_id: data.audit_category_id,
                    audit_plan_date: data.audit_plan_date,
                    sqe_pic_id: data.sqe_pic_id,
                    remarks: data.plan_remarks,
                    request_status: toDBStatus('DRAFT'),
                    last_update: now,
                    updateby: userId
                };
                
                await qmqaRepository.insertAuditPlan(transaction, auditPlanData);
            }
            
            console.log('⚙️ [QMQA-SERVICE] Creating QMQA Record:', qmqaId);
            
            // Create main QMQA record
            const qmqaData = {
                qmqa_id: qmqaId,
                qmqa_audit_plan_id: auditPlanId,
                created_date: now,
                audit_type_id: data.audit_type_id,
                attention_id: data.attention_id,
                pic_auditor_id: data.pic_auditor_id,
                due_date: data.due_date,
                audit_date: data.audit_date,
                issued_date: null,
                audit_rating: data.audit_rating,
                auditees: data.auditees,
                auditors: data.auditors,
                attendees: data.attendees,
                remarks: data.remarks,
                encoder_id: userId,
                encoder_date: now,
                issuer_id: userId,
                issuer_remarks: null,
                issuer_date: null,
                checker_id: data.checker_id,
                checker_remarks: null,
                checker_date: null,
                approver_id: data.approver_id,
                approver_remarks: null,
                approver_date: null,
                request_status: toDBStatus('DRAFT'),
                last_update: now,
                updateby: userId
            };
            
            await qmqaRepository.insertQMQA(transaction, qmqaData);
            
            // Insert sub-tables
            if (data.audit_plan_attachments?.length) {
                console.log('🔄 [QMQA-SERVICE] Processing Plan Attachments...');
                const attachments = data.audit_plan_attachments.map(att => ({
                    qmqa_plan_attachment_id: uuidv4(),
                    file_name: att.file_name,
                    file_extension: att.file_extension,
                    remarks: att.remarks,
                    last_update: now,
                    updateby: userId
                }));
                await qmqaRepository.insertPlanAttachments(transaction, qmqaId, attachments);
            }
            
            if (data.attachments?.length) {
                console.log('🔄 [QMQA-SERVICE] Processing Attachments...');
                const attachments = data.attachments.map(att => ({
                    qmqa_attachment_id: uuidv4(),
                    file_name: att.file_name,
                    file_extension: att.file_extension,
                    remarks: att.remarks,
                    last_update: now,
                    updateby: userId
                }));
                await qmqaRepository.insertAttachments(transaction, qmqaId, attachments);
            }
            
            if (data.cc_list?.length) {
                console.log('🔄 [QMQA-SERVICE] Processing CC List...');
                const ccList = data.cc_list.map(cc => ({
                    qmqa_cc_id: uuidv4(),
                    user_id: cc.user_id,
                    last_update: now,
                    updateby: userId
                }));
                await qmqaRepository.insertCC(transaction, qmqaId, ccList);
            }
            
            await transaction.commit();
            console.log('✅ [QMQA-SERVICE] Audit Report Created');
            
            return await this.getRecord(qmqaId);
        } catch (error) {
            console.error('❌ [QMQA-SERVICE] Create Record Failed:', error);
            if (transaction._aborted === false) await transaction.rollback();
            throw error;
        }
    },

    /**
     * Get Single Audit Report with full details
     */
    async getRecord(id) {
        console.log('🔍 [QMQA-SERVICE] Getting Record:', id);
        const row = await qmqaRepository.findRecordById(id);
        if (!row) return null;
        
        const subs = await qmqaRepository.findSubTables(row.qmqa_id);
        
        const formatted = formatRecord(row);
        formatted.auditPlanAttachments = subs.auditPlanAttachments;
        formatted.attachments = subs.attachments;
        formatted.ccList = subs.ccList;
        formatted.response = subs.response;
        
        return formatted;
    },

    /**
     * Get All Audit Reports with optional filtering
     */
    async getAllRecords(status = null, userId = null, userRole = null) {
        console.log('🔍 [QMQA-SERVICE] Getting All Records', { status, userId, userRole });
        
        const statusCode = status ? toDBStatus(status) : null;
        const rows = await qmqaRepository.findAllRecords(statusCode, userId, userRole);
        
        return rows.map(row => formatRecord(row));
    },

    /**
     * Update Audit Report
     */
    async updateRecord(id, data, userId) {
        console.log('📝 [QMQA-SERVICE] Updating Record:', id);
        
        // Validate audit rating if provided
        if (data.audit_rating !== undefined) {
            validateAuditRating(data.audit_rating);
        }
        
        // Validate date formats if provided
        if (data.audit_date) {
            validateDateFormat(data.audit_date, 'audit_date');
        }
        if (data.due_date) {
            validateDateFormat(data.due_date, 'due_date');
        }
        
        const pool = await db.getPool();
        
        // Validate foreign key references if provided
        if (data.audit_type_id) {
            await validateForeignKey(pool, 'AUDITTYPE', 'audit_type_id', data.audit_type_id, 'Audit type');
        }
        if (data.attention_id) {
            await validateForeignKey(pool, 'SUPPLIERSUSER', 'Id', data.attention_id, 'Attention contact');
        }
        if (data.pic_auditor_id) {
            await validateForeignKey(pool, 'USERS', 'user_id', data.pic_auditor_id, 'PIC Auditor');
        }
        if (data.checker_id) {
            await validateForeignKey(pool, 'USERS', 'user_id', data.checker_id, 'Checker');
        }
        if (data.approver_id) {
            await validateForeignKey(pool, 'USERS', 'user_id', data.approver_id, 'Approver');
        }
        
        // Validate CC list user IDs if provided
        if (data.cc_list?.length) {
            for (const cc of data.cc_list) {
                await validateForeignKey(pool, 'USERS', 'user_id', cc.user_id, 'CC user');
            }
        }
        
        const transaction = new sql.Transaction(pool);
        
        try {
            await transaction.begin();
            
            // Get current record
            const current = await qmqaRepository.findRecordById(id);
            if (!current) {
                throw new Error('Record not found');
            }
            
            const currentStatus = fromDBStatus(current.request_status);
            
            // Validate update permissions based on status
            if (currentStatus === 'DRAFT') {
                // Allow full updates in DRAFT
            } else if (currentStatus === 'REJECTED') {
                // Allow updates in REJECTED (for resubmission)
            } else {
                // Restrict updates in other statuses
                throw new Error(`Cannot update record in ${currentStatus} status`);
            }
            
            const now = new Date();
            const updates = {
                last_update: now,
                updateby: userId
            };
            
            // Update allowed fields
            if (data.audit_type_id !== undefined) updates.audit_type_id = data.audit_type_id;
            if (data.attention_id !== undefined) updates.attention_id = data.attention_id;
            if (data.pic_auditor_id !== undefined) updates.pic_auditor_id = data.pic_auditor_id;
            if (data.due_date !== undefined) updates.due_date = data.due_date;
            if (data.audit_date !== undefined) updates.audit_date = data.audit_date;
            if (data.audit_rating !== undefined) updates.audit_rating = data.audit_rating;
            if (data.auditees !== undefined) updates.auditees = data.auditees;
            if (data.auditors !== undefined) updates.auditors = data.auditors;
            if (data.attendees !== undefined) updates.attendees = data.attendees;
            if (data.remarks !== undefined) updates.remarks = data.remarks;
            if (data.checker_id !== undefined) updates.checker_id = data.checker_id;
            if (data.approver_id !== undefined) updates.approver_id = data.approver_id;
            
            await qmqaRepository.updateQMQA(transaction, id, updates);
            
            // Update sub-tables if provided
            if (data.attachments !== undefined) {
                // Delete existing and insert new
                await qmqaRepository.deleteSubTable(transaction, id, 'QMQA_ATTACHMENT');
                if (data.attachments.length > 0) {
                    const attachments = data.attachments.map(att => ({
                        qmqa_attachment_id: uuidv4(),
                        file_name: att.file_name,
                        file_extension: att.file_extension,
                        remarks: att.remarks,
                        last_update: now,
                        updateby: userId
                    }));
                    await qmqaRepository.insertAttachments(transaction, id, attachments);
                }
            }
            
            if (data.cc_list !== undefined) {
                // Delete existing and insert new
                await qmqaRepository.deleteSubTable(transaction, id, 'QMQA_CC');
                if (data.cc_list.length > 0) {
                    const ccList = data.cc_list.map(cc => ({
                        qmqa_cc_id: uuidv4(),
                        user_id: cc.user_id,
                        last_update: now,
                        updateby: userId
                    }));
                    await qmqaRepository.insertCC(transaction, id, ccList);
                }
            }
            
            await transaction.commit();
            console.log('✅ [QMQA-SERVICE] Record Updated');
            
            return await this.getRecord(id);
        } catch (error) {
            console.error('❌ [QMQA-SERVICE] Update Record Failed:', error);
            if (transaction._aborted === false) await transaction.rollback();
            throw error;
        }
    },

    /**
     * Delete Audit Report
     */
    async deleteRecord(id, userId) {
        console.log('🗑️ [QMQA-SERVICE] Deleting Record:', id);
        
        const pool = await db.getPool();
        const transaction = new sql.Transaction(pool);
        
        try {
            await transaction.begin();
            
            // Get current record
            const current = await qmqaRepository.findRecordById(id);
            if (!current) {
                throw new Error('Record not found');
            }
            
            const currentStatus = fromDBStatus(current.request_status);
            
            // Only allow deletion in DRAFT status
            if (currentStatus !== 'DRAFT') {
                throw new Error(`Cannot delete record in ${currentStatus} status`);
            }
            
            // Get all attachments before deletion to delete physical files
            const subTables = await qmqaRepository.findSubTables(id);
            const allAttachments = [
                ...(subTables.auditPlanAttachments || []),
                ...(subTables.attachments || []),
                ...(subTables.response?.initialAttachments || []),
                ...(subTables.response?.finalAttachments || []),
                ...(subTables.response?.verificationAttachments || [])
            ];
            
            // Delete sub-tables first (cascade)
            await qmqaRepository.deleteSubTable(transaction, id, 'QMQA_PLAN_ATTACHMENT');
            await qmqaRepository.deleteSubTable(transaction, id, 'QMQA_ATTACHMENT');
            await qmqaRepository.deleteSubTable(transaction, id, 'QMQA_CC');
            
            // Delete response and its attachments if exists
            if (subTables.response) {
                const responseId = subTables.response.qmqa_response_id;
                await qmqaRepository.deleteSubTable(transaction, responseId, 'QMQA_RESPONSE_INITIAL');
                await qmqaRepository.deleteSubTable(transaction, responseId, 'QMQA_RESPONSE_FINAL');
                await qmqaRepository.deleteSubTable(transaction, responseId, 'QMQA_RESPONSE_VERIFICATION');
                await qmqaRepository.deleteSubTable(transaction, id, 'QMQA_RESPONSE');
            }
            
            // Delete main record
            await qmqaRepository.deleteQMQA(transaction, id);
            
            await transaction.commit();
            console.log('✅ [QMQA-SERVICE] Record Deleted from Database');
            
            // Delete physical files after successful database deletion
            await this.deletePhysicalFiles(allAttachments);
            
            return { success: true };
        } catch (error) {
            console.error('❌ [QMQA-SERVICE] Delete Record Failed:', error);
            if (transaction._aborted === false) await transaction.rollback();
            throw error;
        }
    },
    
    /**
     * Delete physical files from storage
     */
    async deletePhysicalFiles(attachments) {
        if (!attachments || attachments.length === 0) {
            return;
        }
        
        console.log(`🗑️ [QMQA-SERVICE] Deleting ${attachments.length} physical files`);
        
        const fs = await import('fs/promises');
        const path = await import('path');
        
        for (const attachment of attachments) {
            try {
                const filePath = path.join('uploads', 'qmqa', attachment.file_name);
                await fs.unlink(filePath);
                console.log(`✅ [QMQA-SERVICE] Deleted file: ${attachment.file_name}`);
            } catch (error) {
                // Log error but don't fail the operation
                console.warn(`⚠️ [QMQA-SERVICE] Failed to delete file ${attachment.file_name}:`, error.message);
            }
        }
    },

    // ==================== FILE MANAGEMENT OPERATIONS ====================
    
    /**
     * Add attachment to audit record
     */
    async addAttachment(qmqaId, attachmentData) {
        console.log('📎 [QMQA-SERVICE] Adding Attachment to Record:', qmqaId);
        
        const pool = await db.getPool();
        const transaction = new sql.Transaction(pool);
        
        try {
            await transaction.begin();
            
            // Verify record exists
            const record = await qmqaRepository.findRecordById(qmqaId);
            if (!record) {
                const error = new Error('Audit record not found');
                error.statusCode = 404;
                throw error;
            }
            
            const now = new Date();
            const attachmentId = uuidv4();
            
            const attachment = {
                qmqa_attachment_id: attachmentId,
                file_name: attachmentData.fileName,
                file_extension: attachmentData.fileExtension,
                remarks: attachmentData.remarks,
                last_update: now,
                updateby: attachmentData.uploadedBy
            };
            
            // Insert based on attachment type
            if (attachmentData.attachmentType === 'plan') {
                attachment.qmqa_plan_attachment_id = attachmentId;
                await qmqaRepository.insertPlanAttachments(transaction, qmqaId, [attachment]);
            } else {
                await qmqaRepository.insertAttachments(transaction, qmqaId, [attachment]);
            }
            
            await transaction.commit();
            console.log('✅ [QMQA-SERVICE] Attachment Added');
            
            return {
                id: attachmentId,
                fileName: attachmentData.fileName,
                originalName: attachmentData.originalName,
                fileExtension: attachmentData.fileExtension,
                fileSize: attachmentData.fileSize,
                filePath: attachmentData.filePath,
                fileUrl: `/api/qmqa/attachments/${attachmentId}`,
                remarks: attachmentData.remarks,
                uploadedBy: attachmentData.uploadedBy,
                uploadedAt: now
            };
        } catch (error) {
            console.error('❌ [QMQA-SERVICE] Add Attachment Failed:', error);
            if (transaction._aborted === false) await transaction.rollback();
            throw error;
        }
    },
    
    /**
     * Get attachment metadata
     */
    async getAttachment(attachmentId) {
        console.log('🔍 [QMQA-SERVICE] Getting Attachment:', attachmentId);
        
        const attachment = await qmqaRepository.findAttachmentById(attachmentId);
        
        if (!attachment) {
            return null;
        }
        
        return {
            id: attachment.attachment_id,
            qmqaId: attachment.qmqa_id,
            fileName: attachment.file_name,
            originalName: attachment.file_name,
            fileExtension: attachment.file_extension,
            filePath: `uploads/qmqa/${attachment.file_name}`,
            mimeType: getMimeType(attachment.file_extension),
            remarks: attachment.remarks
        };
    },
    
    // ==================== SEARCH AND REPORTING OPERATIONS ====================
    
    /**
     * Search audit records with filters and pagination
     */
    async searchRecords(filters, userId, userRole, pagination) {
        console.log('🔍 [QMQA-SERVICE] Searching Records:', filters);
        
        const { page = 1, pageSize = 50 } = pagination;
        const offset = (page - 1) * pageSize;
        
        const result = await qmqaRepository.searchRecords(filters, userId, userRole, {
            limit: pageSize,
            offset
        });
        
        return {
            records: result.records.map(row => formatRecord(row)),
            total: result.total,
            page,
            pageSize
        };
    },
    
    /**
     * Get calendar data for a specific month
     */
    async getCalendarData(year, month) {
        console.log('📅 [QMQA-SERVICE] Getting Calendar Data:', { year, month });
        
        const records = await qmqaRepository.findCalendarData(year, month);
        
        return records.map(row => ({
            id: row.qmqa_id || row.qmqa_audit_plan_id,
            controlNo: row.control_no,
            status: fromDBStatus(row.request_status),
            statusColor: getStatusColor(fromDBStatus(row.request_status)),
            supplierName: row.supplier_name,
            auditPlanDate: row.audit_plan_date,
            auditDate: row.audit_date,
            date: row.audit_date || row.audit_plan_date,
            type: row.qmqa_id ? 'audit' : 'schedule'
        }));
    },
    
    /**
     * Get achievement metrics and statistics
     */
    async getAchievementData(filters) {
        console.log('📊 [QMQA-SERVICE] Getting Achievement Data:', filters);
        
        const metrics = await qmqaRepository.findAchievementData(filters);
        
        return {
            totalAudits: metrics.total_audits || 0,
            completedAudits: metrics.completed_audits || 0,
            pendingAudits: metrics.pending_audits || 0,
            cancelledAudits: metrics.cancelled_audits || 0,
            averageRating: metrics.average_rating ? parseFloat(metrics.average_rating).toFixed(2) : 0,
            onTimeRate: metrics.on_time_count && metrics.total_audits 
                ? ((metrics.on_time_count / metrics.total_audits) * 100).toFixed(2) 
                : 0,
            byStatus: {
                draft: metrics.draft_count || 0,
                awaitingApproval: metrics.awaiting_count || 0,
                approved: metrics.approved_count || 0,
                rejected: metrics.rejected_count || 0,
                issued: metrics.issued_count || 0,
                withInitialReport: metrics.initial_count || 0,
                withFinalReport: metrics.final_count || 0,
                responseAwaitingApproval: metrics.response_awaiting_count || 0,
                responseRejected: metrics.response_rejected_count || 0,
                closed: metrics.closed_count || 0
            }
        };
    },

    // ==================== BATCH OPERATIONS ====================
    
    /**
     * Batch submit multiple records for approval
     */
    async batchSubmit(recordIds, userId) {
        console.log(`📦 [QMQA-SERVICE] Batch Submit: ${recordIds.length} records`);
        
        const results = [];
        let successCount = 0;
        let failureCount = 0;
        
        for (const recordId of recordIds) {
            try {
                const record = await qmqaWorkflowService.submitForApproval(recordId, userId);
                
                // Send email notifications
                await qmqaEmailService.sendCycle1SubmitEmail(record);
                
                results.push({
                    recordId,
                    success: true,
                    data: record
                });
                successCount++;
            } catch (error) {
                console.error(`❌ [QMQA-SERVICE] Batch Submit Failed for ${recordId}:`, error.message);
                results.push({
                    recordId,
                    success: false,
                    error: error.message
                });
                failureCount++;
            }
        }
        
        console.log(`✅ [QMQA-SERVICE] Batch Submit Complete: ${successCount} success, ${failureCount} failed`);
        
        return {
            successCount,
            failureCount,
            results
        };
    },
    
    /**
     * Batch approve multiple records
     */
    async batchApprove(recordIds, userId, remarks, cycle = 1) {
        console.log(`📦 [QMQA-SERVICE] Batch Approve (Cycle ${cycle}): ${recordIds.length} records`);
        
        const results = [];
        let successCount = 0;
        let failureCount = 0;
        
        for (const recordId of recordIds) {
            try {
                let record;
                if (cycle === 2) {
                    record = await qmqaWorkflowService.approveCycle2(recordId, userId, remarks);
                    // Send closure email if fully approved
                    if (record.status === 'CLOSED') {
                        await qmqaEmailService.sendClosedEmail(record);
                    }
                } else {
                    record = await qmqaWorkflowService.approveCycle1(recordId, userId, remarks);
                    // Send approval email if fully approved
                    if (record.status === 'APPROVED') {
                        await qmqaEmailService.sendCycle1ApprovedEmail(record);
                    }
                }
                
                results.push({
                    recordId,
                    success: true,
                    data: record
                });
                successCount++;
            } catch (error) {
                console.error(`❌ [QMQA-SERVICE] Batch Approve Failed for ${recordId}:`, error.message);
                results.push({
                    recordId,
                    success: false,
                    error: error.message
                });
                failureCount++;
            }
        }
        
        console.log(`✅ [QMQA-SERVICE] Batch Approve Complete: ${successCount} success, ${failureCount} failed`);
        
        return {
            successCount,
            failureCount,
            results
        };
    },
    
    /**
     * Batch reject multiple records
     */
    async batchReject(recordIds, userId, remarks, cycle = 1) {
        console.log(`📦 [QMQA-SERVICE] Batch Reject (Cycle ${cycle}): ${recordIds.length} records`);
        
        const results = [];
        let successCount = 0;
        let failureCount = 0;
        
        for (const recordId of recordIds) {
            try {
                let record;
                if (cycle === 2) {
                    record = await qmqaWorkflowService.rejectCycle2(recordId, userId, remarks);
                } else {
                    record = await qmqaWorkflowService.rejectCycle1(recordId, userId, remarks);
                }
                
                results.push({
                    recordId,
                    success: true,
                    data: record
                });
                successCount++;
            } catch (error) {
                console.error(`❌ [QMQA-SERVICE] Batch Reject Failed for ${recordId}:`, error.message);
                results.push({
                    recordId,
                    success: false,
                    error: error.message
                });
                failureCount++;
            }
        }
        
        console.log(`✅ [QMQA-SERVICE] Batch Reject Complete: ${successCount} success, ${failureCount} failed`);
        
        return {
            successCount,
            failureCount,
            results
        };
    },
    
    /**
     * Batch issue multiple records to suppliers
     */
    async batchIssue(recordIds, userId) {
        console.log(`📦 [QMQA-SERVICE] Batch Issue: ${recordIds.length} records`);
        
        const results = [];
        let successCount = 0;
        let failureCount = 0;
        
        for (const recordId of recordIds) {
            try {
                const record = await qmqaWorkflowService.issueToSupplier(recordId, userId);
                
                // Generate token for supplier access
                const token = qmqaTokenService.generateToken(
                    record.id,
                    record.auditPlan?.supplierId,
                    record.auditDetails?.dueDate
                );
                
                // Send issuance email with token
                await qmqaEmailService.sendIssuedEmail(record, token);
                
                results.push({
                    recordId,
                    success: true,
                    data: {
                        ...record,
                        supplierToken: token
                    }
                });
                successCount++;
            } catch (error) {
                console.error(`❌ [QMQA-SERVICE] Batch Issue Failed for ${recordId}:`, error.message);
                results.push({
                    recordId,
                    success: false,
                    error: error.message
                });
                failureCount++;
            }
        }
        
        console.log(`✅ [QMQA-SERVICE] Batch Issue Complete: ${successCount} success, ${failureCount} failed`);
        
        return {
            successCount,
            failureCount,
            results
        };
    }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get MIME type from file extension
 */
function getMimeType(extension) {
    const mimeTypes = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword'
    };
    
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Get status color for calendar display
 */
function getStatusColor(status) {
    const colors = {
        'PLANNED': '#9CA3AF',
        'DRAFT': '#6B7280',
        'AWAITING_APPROVAL': '#F59E0B',
        'APPROVED': '#10B981',
        'REJECTED': '#EF4444',
        'ISSUED': '#3B82F6',
        'CANCELLED': '#6B7280',
        'WITH_INITIAL_REPORT': '#8B5CF6',
        'WITH_FINAL_REPORT': '#8B5CF6',
        'RESPONSE_AWAITING_APPROVAL': '#F59E0B',
        'RESPONSE_REJECTED': '#EF4444',
        'CLOSED': '#059669'
    };
    
    return colors[status] || '#6B7280';
}

