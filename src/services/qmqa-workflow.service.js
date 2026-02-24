/**
 * QMQA Workflow Service
 * Handles workflow state transitions and validation
 */

import db, { sql } from '../config/db.js';
import { qmqaRepository } from '../repositories/qmqa.repository.js';
import { toDBStatus, fromDBStatus } from '../utils/qmqa/status-mapper.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/**
 * Valid workflow transitions map
 */
export const WORKFLOW_TRANSITIONS = {
    PLANNED: ['DRAFT'],
    DRAFT: ['AWAITING_APPROVAL'],
    AWAITING_APPROVAL: ['APPROVED', 'REJECTED'],
    REJECTED: ['DRAFT'],
    APPROVED: ['ISSUED'],
    ISSUED: ['CANCELLED', 'WITH_INITIAL_REPORT'],
    CANCELLED: [],
    WITH_INITIAL_REPORT: ['WITH_FINAL_REPORT'],
    WITH_FINAL_REPORT: ['RESPONSE_AWAITING_APPROVAL'],
    RESPONSE_AWAITING_APPROVAL: ['CLOSED', 'RESPONSE_REJECTED'],
    RESPONSE_REJECTED: ['WITH_FINAL_REPORT'],
    CLOSED: []
};

/**
 * Terminal states that cannot be changed
 */
const TERMINAL_STATES = ['CLOSED', 'CANCELLED'];

/**
 * Validate if a status transition is allowed
 * 
 * @param {string} currentStatus - Current status name
 * @param {string} newStatus - Desired new status name
 * @throws {Error} If transition is invalid
 */
export const validateTransition = (currentStatus, newStatus) => {
    console.log(`🔄 [QMQA-WORKFLOW] Validating transition: ${currentStatus} → ${newStatus}`);
    
    // Check if current status is terminal
    if (TERMINAL_STATES.includes(currentStatus)) {
        throw new Error(`Cannot transition from terminal state ${currentStatus}`);
    }
    
    // Get valid next states
    const validNextStates = WORKFLOW_TRANSITIONS[currentStatus] || [];
    
    // Check if transition is valid
    if (!validNextStates.includes(newStatus)) {
        throw new Error(
            `Invalid transition from ${currentStatus} to ${newStatus}. ` +
            `Valid transitions: ${validNextStates.join(', ') || 'none'}`
        );
    }
    
    console.log(`✅ [QMQA-WORKFLOW] Transition valid`);
};

/**
 * Submit audit for Cycle 1 approval (DRAFT → AWAITING_APPROVAL)
 * 
 * @param {string} id - QMQA record ID
 * @param {string} userId - User performing the action
 * @returns {Promise<Object>} Updated record
 */
export const submitForApproval = async (id, userId) => {
    console.log('📤 [QMQA-WORKFLOW] Submit for Approval:', id);
    
    const pool = await db.getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        
        // Get current record
        const record = await qmqaRepository.findRecordById(id);
        if (!record) {
            throw new Error('Record not found');
        }
        
        const currentStatus = fromDBStatus(record.request_status);
        
        // Validate transition
        validateTransition(currentStatus, 'AWAITING_APPROVAL');
        
        // Validate checker and approver are set
        if (!record.checker_id || !record.approver_id) {
            throw new Error('Checker and Approver must be assigned before submission');
        }
        
        // Update status and metadata
        const now = new Date();
        await qmqaRepository.updateQMQA(transaction, id, {
            request_status: toDBStatus('AWAITING_APPROVAL'),
            last_update: now,
            updateby: userId
        });
        
        await transaction.commit();
        
        // Log workflow transition with structured context
        logger.info('Workflow transition: Submit for approval', {
            operation: 'submitForApproval',
            controlNo: record.control_no,
            userId,
            fromStatus: currentStatus,
            toStatus: 'AWAITING_APPROVAL',
            timestamp: now.toISOString(),
            correlationId: record.correlationId || 'unknown'
        });
        
        console.log('✅ [QMQA-WORKFLOW] Submitted for Approval');
        
        await transaction.commit();
        console.log('✅ [QMQA-WORKFLOW] Submitted for approval');
        
        return await qmqaRepository.findRecordById(id);
    } catch (error) {
        if (transaction._aborted === false) await transaction.rollback();
        console.error('❌ [QMQA-WORKFLOW] Submit failed:', error.message);
        throw error;
    }
};

/**
 * Approve in Cycle 1 (AWAITING_APPROVAL → APPROVED)
 * 
 * @param {string} id - QMQA record ID
 * @param {string} userId - User performing the action
 * @param {string} remarks - Approval remarks
 * @param {string} role - 'checker' or 'approver'
 * @returns {Promise<Object>} Updated record
 */
export const approveCycle1 = async (id, userId, remarks, role = 'approver') => {
    console.log(`✅ [QMQA-WORKFLOW] Cycle 1 Approve (${role}):`, id);
    
    const pool = await db.getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        
        // Get current record
        const record = await qmqaRepository.findRecordById(id);
        if (!record) {
            throw new Error('Record not found');
        }
        
        const currentStatus = fromDBStatus(record.request_status);
        
        // Must be in AWAITING_APPROVAL
        if (currentStatus !== 'AWAITING_APPROVAL') {
            throw new Error(`Cannot approve from status ${currentStatus}`);
        }
        
        // Validate user is assigned as checker or approver
        if (role === 'checker' && record.checker_id !== userId) {
            throw new Error('User is not assigned as checker');
        }
        if (role === 'approver' && record.approver_id !== userId) {
            throw new Error('User is not assigned as approver');
        }
        
        const now = new Date();
        const updates = {
            last_update: now,
            updateby: userId
        };
        
        // Record approval
        if (role === 'checker') {
            updates.checker_date = now;
            updates.checker_remarks = remarks;
        } else {
            updates.approver_date = now;
            updates.approver_remarks = remarks;
        }
        
        // Check if both have approved
        const checkerApproved = role === 'checker' ? true : !!record.checker_date;
        const approverApproved = role === 'approver' ? true : !!record.approver_date;
        
        if (checkerApproved && approverApproved) {
            // Both approved - transition to APPROVED
            validateTransition(currentStatus, 'APPROVED');
            updates.request_status = toDBStatus('APPROVED');
            console.log('🎉 [QMQA-WORKFLOW] Full approval - transitioning to APPROVED');
        }
        
        await qmqaRepository.updateQMQA(transaction, id, updates);
        
        await transaction.commit();
        
        // Log workflow transition with structured context
        const finalStatus = updates.request_status ? fromDBStatus(updates.request_status) : currentStatus;
        logger.info('Workflow transition: Cycle 1 approval', {
            operation: 'approveCycle1',
            controlNo: record.control_no,
            userId,
            role,
            fromStatus: currentStatus,
            toStatus: finalStatus,
            timestamp: now.toISOString(),
            remarks
        });
        
        console.log(`✅ [QMQA-WORKFLOW] ${role} approval recorded`);
        
        return await qmqaRepository.findRecordById(id);
    } catch (error) {
        if (transaction._aborted === false) await transaction.rollback();
        console.error('❌ [QMQA-WORKFLOW] Approve failed:', error.message);
        throw error;
    }
};

/**
 * Reject in Cycle 1 (AWAITING_APPROVAL → REJECTED)
 * 
 * @param {string} id - QMQA record ID
 * @param {string} userId - User performing the action
 * @param {string} remarks - Rejection remarks
 * @param {string} role - 'checker' or 'approver'
 * @returns {Promise<Object>} Updated record
 */
export const rejectCycle1 = async (id, userId, remarks, role = 'approver') => {
    console.log(`❌ [QMQA-WORKFLOW] Cycle 1 Reject (${role}):`, id);
    
    const pool = await db.getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        
        // Get current record
        const record = await qmqaRepository.findRecordById(id);
        if (!record) {
            throw new Error('Record not found');
        }
        
        const currentStatus = fromDBStatus(record.request_status);
        
        // Validate transition
        validateTransition(currentStatus, 'REJECTED');
        
        // Validate user is assigned as checker or approver
        if (role === 'checker' && record.checker_id !== userId) {
            throw new Error('User is not assigned as checker');
        }
        if (role === 'approver' && record.approver_id !== userId) {
            throw new Error('User is not assigned as approver');
        }
        
        if (!remarks) {
            throw new Error('Rejection remarks are required');
        }
        
        const now = new Date();
        const updates = {
            request_status: toDBStatus('REJECTED'),
            last_update: now,
            updateby: userId
        };
        
        // Record rejection
        if (role === 'checker') {
            updates.checker_date = now;
            updates.checker_remarks = remarks;
        } else {
            updates.approver_date = now;
            updates.approver_remarks = remarks;
        }
        
        await qmqaRepository.updateQMQA(transaction, id, updates);
        
        await transaction.commit();
        
        // Log workflow transition with structured context
        logger.info('Workflow transition: Cycle 1 rejection', {
            operation: 'rejectCycle1',
            controlNo: record.control_no,
            userId,
            role,
            fromStatus: currentStatus,
            toStatus: 'REJECTED',
            timestamp: now.toISOString(),
            remarks
        });
        
        console.log('✅ [QMQA-WORKFLOW] Rejected');
        
        return await qmqaRepository.findRecordById(id);
    } catch (error) {
        if (transaction._aborted === false) await transaction.rollback();
        console.error('❌ [QMQA-WORKFLOW] Reject failed:', error.message);
        throw error;
    }
};

/**
 * Issue audit to supplier (APPROVED → ISSUED)
 * 
 * @param {string} id - QMQA record ID
 * @param {string} userId - User performing the action
 * @returns {Promise<Object>} Updated record
 */
export const issueToSupplier = async (id, userId) => {
    console.log('📨 [QMQA-WORKFLOW] Issue to Supplier:', id);
    
    const pool = await db.getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        
        // Get current record
        const record = await qmqaRepository.findRecordById(id);
        if (!record) {
            throw new Error('Record not found');
        }
        
        const currentStatus = fromDBStatus(record.request_status);
        
        // Validate transition
        validateTransition(currentStatus, 'ISSUED');
        
        // Update status and set issued_date
        const now = new Date();
        await qmqaRepository.updateQMQA(transaction, id, {
            request_status: toDBStatus('ISSUED'),
            issued_date: now,
            last_update: now,
            updateby: userId
        });
        
        await transaction.commit();
        
        // Log workflow transition with structured context
        logger.info('Workflow transition: Issue to supplier', {
            operation: 'issueToSupplier',
            controlNo: record.control_no,
            userId,
            fromStatus: currentStatus,
            toStatus: 'ISSUED',
            timestamp: now.toISOString()
        });
        
        console.log('✅ [QMQA-WORKFLOW] Issued to supplier');
        
        return await qmqaRepository.findRecordById(id);
    } catch (error) {
        if (transaction._aborted === false) await transaction.rollback();
        console.error('❌ [QMQA-WORKFLOW] Issue failed:', error.message);
        throw error;
    }
};

/**
 * Cancel issued audit (ISSUED → CANCELLED)
 * 
 * @param {string} id - QMQA record ID
 * @param {string} userId - User performing the action
 * @param {string} remarks - Cancellation remarks
 * @returns {Promise<Object>} Updated record
 */
export const cancelAudit = async (id, userId, remarks) => {
    console.log('🚫 [QMQA-WORKFLOW] Cancel Audit:', id);
    
    const pool = await db.getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        
        // Get current record
        const record = await qmqaRepository.findRecordById(id);
        if (!record) {
            throw new Error('Record not found');
        }
        
        const currentStatus = fromDBStatus(record.request_status);
        
        // Validate transition
        validateTransition(currentStatus, 'CANCELLED');
        
        if (!remarks) {
            throw new Error('Cancellation remarks are required');
        }
        
        // Update status
        const now = new Date();
        await qmqaRepository.updateQMQA(transaction, id, {
            request_status: toDBStatus('CANCELLED'),
            remarks: remarks,
            last_update: now,
            updateby: userId
        });
        
        await transaction.commit();
        
        // Log workflow transition with structured context
        logger.info('Workflow transition: Cancel audit', {
            operation: 'cancelAudit',
            controlNo: record.control_no,
            userId,
            fromStatus: currentStatus,
            toStatus: 'CANCELLED',
            timestamp: now.toISOString(),
            remarks
        });
        
        console.log('✅ [QMQA-WORKFLOW] Audit cancelled');
        
        return await qmqaRepository.findRecordById(id);
    } catch (error) {
        if (transaction._aborted === false) await transaction.rollback();
        console.error('❌ [QMQA-WORKFLOW] Cancel failed:', error.message);
        throw error;
    }
};

/**
 * Save initial report (ISSUED → WITH_INITIAL_REPORT)
 * 
 * @param {string} id - QMQA record ID
 * @param {Object} data - Initial report data
 * @returns {Promise<Object>} Updated record
 */
export const saveInitialReport = async (id, data, files = []) => {
    console.log('📝 [QMQA-WORKFLOW] Save Initial Report:', id);
    
    const pool = await db.getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        
        // Get current record
        const record = await qmqaRepository.findRecordById(id);
        if (!record) {
            throw new Error('Record not found');
        }
        
        const currentStatus = fromDBStatus(record.request_status);
        
        // Validate transition
        validateTransition(currentStatus, 'WITH_INITIAL_REPORT');
        
        // Create or update response record
        const now = new Date();
        const responseData = {
            qmqa_response_id: data.qmqa_response_id || require('uuid').v4(),
            skip_initial: data.skip_initial || false,
            initial_report_date: now,
            initial_remarks: data.initial_remarks,
            last_update: now,
            updateby: 'supplier'
        };
        
        // Insert response if not exists
        await qmqaRepository.insertResponse(transaction, id, responseData);
        
        // Update main record status
        await qmqaRepository.updateQMQA(transaction, id, {
            request_status: toDBStatus('WITH_INITIAL_REPORT'),
            last_update: now,
            updateby: 'supplier'
        });

        // Insert initial attachments if provided
        if (data.initial_attachments?.length) {
            console.log('🔄 [QMQA-WORKFLOW] Processing Initial Attachments...');
            for (const att of data.initial_attachments) {
                const uploadedFile = (files || []).find(f => f.originalname === att.file_name);
                const diskFileName = uploadedFile ? uploadedFile.filename : att.file_name;
                const originalName = att.file_name;
                const ext = diskFileName.split('.').pop();
                
                const finalRemarks = att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`;

                await qmqaRepository.insertInitialAttachment(transaction, responseData.qmqa_response_id, {
                    qmqa_response_initial_attachment_id: uuidv4(),
                    file_name: diskFileName,
                    file_extension: ext,
                    remarks: finalRemarks,
                    last_update: now,
                    updateby: 'supplier'
                });
            }
        }
        
        await transaction.commit();
        
        // Log workflow transition with structured context
        logger.info('Workflow transition: Save initial report', {
            operation: 'saveInitialReport',
            controlNo: record.control_no,
            userId: 'supplier',
            fromStatus: currentStatus,
            toStatus: 'WITH_INITIAL_REPORT',
            timestamp: now.toISOString()
        });
        
        console.log('✅ [QMQA-WORKFLOW] Initial report saved');
        
        return await qmqaRepository.findRecordById(id);
    } catch (error) {
        if (transaction._aborted === false) await transaction.rollback();
        console.error('❌ [QMQA-WORKFLOW] Save initial failed:', error.message);
        throw error;
    }
};

/**
 * Submit final report (WITH_INITIAL_REPORT → WITH_FINAL_REPORT)
 * 
 * @param {string} id - QMQA record ID
 * @param {Object} data - Final report data
 * @returns {Promise<Object>} Updated record
 */
export const submitFinalReport = async (id, data, files = []) => {
    console.log('📋 [QMQA-WORKFLOW] Submit Final Report:', id);
    
    const pool = await db.getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        
        // Get current record
        const record = await qmqaRepository.findRecordById(id);
        if (!record) {
            throw new Error('Record not found');
        }
        
        const currentStatus = fromDBStatus(record.request_status);
        
        // Validate transition
        validateTransition(currentStatus, 'WITH_FINAL_REPORT');
        
        if (!data.final_attachments?.length) {
            throw new Error('Final report attachment is required');
        }
        
        // Update response record
        const now = new Date();
        // Note: Response update logic would go here
        
        // Update main record status
        await qmqaRepository.updateQMQA(transaction, id, {
            request_status: toDBStatus('WITH_FINAL_REPORT'),
            last_update: now,
            updateby: 'supplier'
        });

        // Get response ID
        const subs = await qmqaRepository.findSubTables(id);
        const responseId = subs.response?.qmqa_response_id;
        
        if (!responseId) {
            throw new Error('Response record not found');
        }

        // Insert final attachments
        if (data.final_attachments?.length) {
            console.log('🔄 [QMQA-WORKFLOW] Processing Final Attachments...');
            for (const att of data.final_attachments) {
                const uploadedFile = (files || []).find(f => f.originalname === att.file_name);
                const diskFileName = uploadedFile ? uploadedFile.filename : att.file_name;
                const originalName = att.file_name;
                const ext = diskFileName.split('.').pop();
                
                const finalRemarks = att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`;

                await qmqaRepository.insertFinalAttachment(transaction, responseId, {
                    qmqa_response_final_attachment_id: uuidv4(),
                    file_name: diskFileName,
                    file_extension: ext,
                    remarks: finalRemarks,
                    last_update: now,
                    updateby: 'supplier'
                });
            }
        }
        
        await transaction.commit();
        
        // Log workflow transition with structured context
        logger.info('Workflow transition: Submit final report', {
            operation: 'submitFinalReport',
            controlNo: record.control_no,
            userId: 'supplier',
            fromStatus: currentStatus,
            toStatus: 'WITH_FINAL_REPORT',
            timestamp: now.toISOString()
        });
        
        console.log('✅ [QMQA-WORKFLOW] Final report submitted');
        
        return await qmqaRepository.findRecordById(id);
    } catch (error) {
        if (transaction._aborted === false) await transaction.rollback();
        console.error('❌ [QMQA-WORKFLOW] Submit final failed:', error.message);
        throw error;
    }
};

/**
 * Submit verification (WITH_FINAL_REPORT → RESPONSE_AWAITING_APPROVAL)
 * 
 * @param {string} id - QMQA record ID
 * @param {Object} data - Verification data
 * @param {string} userId - User performing the action
 * @returns {Promise<Object>} Updated record
 */
export const submitVerification = async (id, data, userId, files = []) => {
    console.log('🔍 [QMQA-WORKFLOW] Submit Verification:', id);
    
    const pool = await db.getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        
        // Get current record
        const record = await qmqaRepository.findRecordById(id);
        if (!record) {
            throw new Error('Record not found');
        }
        
        const currentStatus = fromDBStatus(record.request_status);
        
        // Validate transition
        validateTransition(currentStatus, 'RESPONSE_AWAITING_APPROVAL');
        
        if (!data.verification_remarks) {
            throw new Error('Verification remarks are required');
        }
        
        if (!data.cycle2_checker_id || !data.cycle2_approver_id) {
            throw new Error('Cycle 2 checker and approver must be assigned');
        }
        
        // Update main record status
        const now = new Date();
        await qmqaRepository.updateQMQA(transaction, id, {
            request_status: toDBStatus('RESPONSE_AWAITING_APPROVAL'),
            last_update: now,
            updateby: userId
        });

        // Get response ID
        const subs = await qmqaRepository.findSubTables(id);
        const responseId = subs.response?.qmqa_response_id;

        if (!responseId) {
            throw new Error('Response record not found');
        }

        // Insert verification attachments if provided
        if (data.verification_attachments?.length) {
            console.log('🔄 [QMQA-WORKFLOW] Processing Verification Attachments...');
            for (const att of data.verification_attachments) {
                const uploadedFile = (files || []).find(f => f.originalname === att.file_name);
                const diskFileName = uploadedFile ? uploadedFile.filename : att.file_name;
                const originalName = att.file_name;
                const ext = diskFileName.split('.').pop();
                
                const finalRemarks = att.remarks ? `${att.remarks} (Original: ${originalName})` : `Original: ${originalName}`;

                await qmqaRepository.insertVerificationAttachment(transaction, responseId, {
                    qmqa_response_verification_attachment_id: uuidv4(),
                    file_name: diskFileName,
                    file_extension: ext,
                    remarks: finalRemarks,
                    last_update: now,
                    updateby: userId
                });
            }
        }
        
        await transaction.commit();
        
        // Log workflow transition with structured context
        logger.info('Workflow transition: Submit verification', {
            operation: 'submitVerification',
            controlNo: record.control_no,
            userId,
            fromStatus: currentStatus,
            toStatus: 'RESPONSE_AWAITING_APPROVAL',
            timestamp: now.toISOString()
        });
        
        console.log('✅ [QMQA-WORKFLOW] Verification submitted');
        
        return await qmqaRepository.findRecordById(id);
    } catch (error) {
        if (transaction._aborted === false) await transaction.rollback();
        console.error('❌ [QMQA-WORKFLOW] Submit verification failed:', error.message);
        throw error;
    }
};

/**
 * Approve in Cycle 2 (RESPONSE_AWAITING_APPROVAL → CLOSED)
 * 
 * @param {string} id - QMQA record ID
 * @param {string} userId - User performing the action
 * @param {string} remarks - Approval remarks
 * @param {string} role - 'checker' or 'approver'
 * @returns {Promise<Object>} Updated record
 */
export const approveCycle2 = async (id, userId, remarks, role = 'approver') => {
    console.log(`✅ [QMQA-WORKFLOW] Cycle 2 Approve (${role}):`, id);
    
    const pool = await db.getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        
        // Get current record
        const record = await qmqaRepository.findRecordById(id);
        if (!record) {
            throw new Error('Record not found');
        }
        
        const currentStatus = fromDBStatus(record.request_status);
        
        // Must be in RESPONSE_AWAITING_APPROVAL
        if (currentStatus !== 'RESPONSE_AWAITING_APPROVAL') {
            throw new Error(`Cannot approve from status ${currentStatus}`);
        }
        
        // Note: Cycle 2 approval logic would check response table
        // For now, simplified version
        
        const now = new Date();
        const updates = {
            last_update: now,
            updateby: userId
        };
        
        // If both approved, transition to CLOSED
        validateTransition(currentStatus, 'CLOSED');
        updates.request_status = toDBStatus('CLOSED');
        
        await qmqaRepository.updateQMQA(transaction, id, updates);
        
        await transaction.commit();
        
        // Log workflow transition with structured context
        logger.info('Workflow transition: Cycle 2 approval', {
            operation: 'approveCycle2',
            controlNo: record.control_no,
            userId,
            role,
            fromStatus: currentStatus,
            toStatus: 'CLOSED',
            timestamp: now.toISOString(),
            remarks
        });
        
        console.log('✅ [QMQA-WORKFLOW] Cycle 2 approved - CLOSED');
        
        return await qmqaRepository.findRecordById(id);
    } catch (error) {
        if (transaction._aborted === false) await transaction.rollback();
        console.error('❌ [QMQA-WORKFLOW] Cycle 2 approve failed:', error.message);
        throw error;
    }
};

/**
 * Reject in Cycle 2 (RESPONSE_AWAITING_APPROVAL → RESPONSE_REJECTED)
 * 
 * @param {string} id - QMQA record ID
 * @param {string} userId - User performing the action
 * @param {string} remarks - Rejection remarks
 * @param {string} role - 'checker' or 'approver'
 * @returns {Promise<Object>} Updated record
 */
export const rejectCycle2 = async (id, userId, remarks, role = 'approver') => {
    console.log(`❌ [QMQA-WORKFLOW] Cycle 2 Reject (${role}):`, id);
    
    const pool = await db.getPool();
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        
        // Get current record
        const record = await qmqaRepository.findRecordById(id);
        if (!record) {
            throw new Error('Record not found');
        }
        
        const currentStatus = fromDBStatus(record.request_status);
        
        // Validate transition
        validateTransition(currentStatus, 'RESPONSE_REJECTED');
        
        if (!remarks) {
            throw new Error('Rejection remarks are required');
        }
        
        const now = new Date();
        await qmqaRepository.updateQMQA(transaction, id, {
            request_status: toDBStatus('RESPONSE_REJECTED'),
            last_update: now,
            updateby: userId
        });
        
        await transaction.commit();
        
        // Log workflow transition with structured context
        logger.info('Workflow transition: Cycle 2 rejection', {
            operation: 'rejectCycle2',
            controlNo: record.control_no,
            userId,
            role,
            fromStatus: currentStatus,
            toStatus: 'RESPONSE_REJECTED',
            timestamp: now.toISOString(),
            remarks
        });
        
        console.log('✅ [QMQA-WORKFLOW] Cycle 2 rejected');
        
        return await qmqaRepository.findRecordById(id);
    } catch (error) {
        if (transaction._aborted === false) await transaction.rollback();
        console.error('❌ [QMQA-WORKFLOW] Cycle 2 reject failed:', error.message);
        throw error;
    }
};
