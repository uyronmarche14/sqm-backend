import { fromDBStatus } from './status-mapper.js';

/**
 * QMQA Response Formatter Utility
 * Formats API responses with consistent structure and camelCase field names
 */

/**
 * Convert snake_case to camelCase
 * 
 * @param {string} str - Snake case string
 * @returns {string} Camel case string
 */
const toCamelCase = (str) => {
    if (!str) return str;
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Convert object keys from snake_case to camelCase
 * 
 * @param {Object} obj - Object with snake_case keys
 * @returns {Object} Object with camelCase keys
 */
const convertKeysToCamelCase = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
        return obj.map(item => convertKeysToCamelCase(item));
    }
    
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = toCamelCase(key);
        result[camelKey] = typeof value === 'object' && value !== null
            ? convertKeysToCamelCase(value)
            : value;
    }
    
    return result;
};

/**
 * Format approval entry (issuer, checker, approver)
 * 
 * @param {Object} dbRecord - Database record
 * @param {string} role - Role name (issuer, checker, approver)
 * @returns {Object} Formatted approval entry
 */
const formatApprovalEntry = (dbRecord, role) => {
    const userId = dbRecord[`${role}_id`];
    const date = dbRecord[`${role}_date`];
    
    return {
        userId,
        name: dbRecord[`${role}_name`],
        date,
        remarks: dbRecord[`${role}_remarks`],
        status: date ? 'APPROVED' : (userId ? 'PENDING' : null)
    };
};

/**
 * Format a single QMQA schedule record
 * 
 * @param {Object} dbRecord - Database record from QMQA_AUDIT_PLAN
 * @returns {Object} Formatted schedule record
 */
export const formatSchedule = (dbRecord) => {
    if (!dbRecord) return null;
    
    return {
        id: dbRecord.qmqa_audit_plan_id,
        controlNo: dbRecord.control_no,
        status: fromDBStatus(dbRecord.request_status),
        createdDate: dbRecord.created_date,
        auditPlanDate: dbRecord.audit_plan_date,
        
        // Site information
        mfgSiteId: dbRecord.site_id,
        mfgSiteName: dbRecord.site_name,
        
        // Supplier information
        supplierId: dbRecord.supplier_id,
        supplierName: dbRecord.supplier_name,
        
        // Category information
        categoryId: dbRecord.audit_category_id,
        categoryName: dbRecord.category_name,
        
        // SQE PIC information
        sqePicId: dbRecord.sqe_pic_id,
        sqePicName: dbRecord.sqe_pic_name,
        
        // Additional fields
        remarks: dbRecord.remarks,
        
        // Metadata
        lastUpdate: dbRecord.last_update,
        updatedBy: dbRecord.updateby
    };
};

/**
 * Format a full QMQA audit record
 * 
 * @param {Object} dbRecord - Database record with all JOINs
 * @returns {Object} Formatted audit record
 */
export const formatRecord = (dbRecord) => {
    if (!dbRecord) return null;
    
    return {
        // Identity
        id: dbRecord.qmqa_id,
        controlNo: dbRecord.control_no,
        status: fromDBStatus(dbRecord.request_status),
        
        // Dates
        createdDate: dbRecord.created_date,
        auditDate: dbRecord.audit_date,
        issuedDate: dbRecord.issued_date,
        dueDate: dbRecord.due_date,
        
        // Audit Plan
        auditPlan: {
            id: dbRecord.qmqa_audit_plan_id,
            mfgSiteId: dbRecord.site_id,
            mfgSiteName: dbRecord.site_name,
            supplierId: dbRecord.supplier_id,
            supplierName: dbRecord.supplier_name,
            categoryId: dbRecord.audit_category_id,
            categoryName: dbRecord.category_name,
            auditPlanDate: dbRecord.audit_plan_date,
            sqePicId: dbRecord.sqe_pic_id,
            sqePicName: dbRecord.sqe_pic_name,
            planRemarks: dbRecord.plan_remarks
        },
        
        // Audit Details
        auditDetails: {
            auditTypeId: dbRecord.audit_type_id,
            auditTypeName: dbRecord.audit_type_name,
            attentionId: dbRecord.attention_id,
            attentionName: dbRecord.attention_name,
            picAuditorId: dbRecord.pic_auditor_id,
            picAuditorName: dbRecord.pic_auditor_name,
            auditRating: dbRecord.audit_rating,
            auditees: dbRecord.auditees,
            auditors: dbRecord.auditors,
            attendees: dbRecord.attendees,
            remarks: dbRecord.remarks
        },
        
        // Approval (Cycle 1)
        issuer: formatApprovalEntry(dbRecord, 'issuer'),
        checker: formatApprovalEntry(dbRecord, 'checker'),
        approver: formatApprovalEntry(dbRecord, 'approver'),
        
        // Encoder
        encoder: {
            userId: dbRecord.encoder_id,
            name: dbRecord.encoder_name,
            date: dbRecord.encoder_date
        },
        
        // Sub-tables (populated separately)
        auditPlanAttachments: dbRecord.auditPlanAttachments || [],
        attachments: dbRecord.attachments || [],
        ccList: dbRecord.ccList || [],
        response: dbRecord.response || null,
        
        // Metadata
        lastUpdate: dbRecord.last_update,
        updatedBy: dbRecord.updateby
    };
};

/**
 * Format supplier response data
 * 
 * @param {Object} dbResponse - Database response record
 * @returns {Object} Formatted response data
 */
export const formatResponse = (dbResponse) => {
    if (!dbResponse) return null;
    
    return {
        id: dbResponse.qmqa_response_id,
        qmqaId: dbResponse.qmqa_id,
        skipInitial: dbResponse.skip_initial,
        initialReportDate: dbResponse.initial_report_date,
        finalReportDate: dbResponse.final_report_date,
        initialRemarks: dbResponse.initial_remarks,
        finalRemarks: dbResponse.final_remarks,
        verificationRemarks: dbResponse.verification_remarks,
        acceptDate: dbResponse.accept_date,
        remarks: dbResponse.remarks,
        
        // Cycle 2 Approval
        issuer: formatApprovalEntry(dbResponse, 'issuer'),
        checker: formatApprovalEntry(dbResponse, 'checker'),
        approver: formatApprovalEntry(dbResponse, 'approver'),
        
        // Attachments (populated separately)
        initialAttachments: dbResponse.initialAttachments || [],
        finalAttachments: dbResponse.finalAttachments || [],
        verificationAttachments: dbResponse.verificationAttachments || [],
        
        // Metadata
        lastUpdate: dbResponse.last_update,
        updatedBy: dbResponse.updateby
    };
};

/**
 * Format attachment data
 * 
 * @param {Object} dbAttachment - Database attachment record
 * @returns {Object} Formatted attachment
 */
export const formatAttachment = (dbAttachment) => {
    if (!dbAttachment) return null;
    
    return {
        id: dbAttachment.attachment_id || dbAttachment.qmqa_attachment_id || dbAttachment.qmqa_plan_attachment_id,
        fileName: dbAttachment.file_name,
        fileExtension: dbAttachment.file_extension,
        remarks: dbAttachment.remarks,
        lastUpdate: dbAttachment.last_update,
        updatedBy: dbAttachment.updateby
    };
};

/**
 * Format CC list entry
 * 
 * @param {Object} dbCC - Database CC record
 * @returns {Object} Formatted CC entry
 */
export const formatCCEntry = (dbCC) => {
    if (!dbCC) return null;
    
    return {
        id: dbCC.qmqa_cc_id,
        userId: dbCC.user_id,
        userName: dbCC.user_name,
        userEmail: dbCC.user_email,
        lastUpdate: dbCC.last_update,
        updatedBy: dbCC.updateby
    };
};

/**
 * Format success response
 * 
 * @param {Object|Array} data - Response data
 * @param {Object} meta - Optional metadata (pagination, etc.)
 * @returns {Object} Formatted success response
 */
export const formatSuccessResponse = (data, meta = null) => {
    const response = { data };
    
    if (meta) {
        response.meta = meta;
    }
    
    return response;
};

/**
 * Format error response
 * 
 * @param {string} message - Error message
 * @param {Object} details - Optional error details
 * @returns {Object} Formatted error response
 */
export const formatErrorResponse = (message, details = null) => {
    const response = { error: message };
    
    if (details) {
        response.details = details;
    }
    
    return response;
};

/**
 * Format pagination metadata
 * 
 * @param {number} total - Total number of records
 * @param {number} page - Current page number
 * @param {number} pageSize - Number of records per page
 * @returns {Object} Pagination metadata
 */
export const formatPaginationMeta = (total, page, pageSize) => {
    return {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrev: page > 1
    };
};
