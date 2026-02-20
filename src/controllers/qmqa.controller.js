/**
 * QMQA Controller
 * Handles HTTP requests for QMQA module
 */

import { qmqaService } from '../services/qmqa.service.js';
import * as qmqaWorkflowService from '../services/qmqa-workflow.service.js';
import { qmqaTokenService } from '../services/qmqa-token.service.js';
import { qmqaEmailService } from '../services/qmqa-email.service.js';

// ==================== SCHEDULE ENDPOINTS ====================

/**
 * POST /api/qmqa/schedules
 * Create new schedule
 */
export const createSchedule = async (req, res) => {
    console.log('🟢 [CONTROLLER] createSchedule called');
    console.log('🟢 [CONTROLLER] URL:', req.url);
    console.log('🟢 [CONTROLLER] Method:', req.method);
    console.log('🟢 [CONTROLLER] Body:', req.body);
    
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const schedule = await qmqaService.createSchedule(req.body, userId);
        
        res.status(201).json({
            success: true,
            data: schedule
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Create Schedule Error:', error);
        
        if (error.statusCode === 400) {
            return res.status(400).json({
                success: false,
                error: {
                    name: 'ValidationError',
                    message: error.message,
                    details: error.details
                }
            });
        }
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to create schedule'
            }
        });
    }
};

/**
 * GET /api/qmqa/schedules
 * Get all schedules
 */
export const getAllSchedules = async (req, res) => {
    try {
        const schedules = await qmqaService.getAllSchedules();
        
        res.status(200).json({
            success: true,
            data: schedules
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Get All Schedules Error:', error);
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to retrieve schedules'
            }
        });
    }
};

/**
 * GET /api/qmqa/schedules/:id
 * Get schedule by ID
 */
export const getScheduleById = async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await qmqaService.getSchedule(id);
        
        if (!schedule) {
            return res.status(404).json({
                success: false,
                error: {
                    name: 'NotFoundError',
                    message: 'Schedule not found'
                }
            });
        }
        
        res.status(200).json({
            success: true,
            data: schedule
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Get Schedule Error:', error);
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to retrieve schedule'
            }
        });
    }
};

/**
 * PUT /api/qmqa/schedules/:id
 * Update schedule
 */
export const updateSchedule = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const { id } = req.params;
        const schedule = await qmqaService.updateSchedule(id, req.body, userId);
        
        res.status(200).json({
            success: true,
            data: schedule
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Update Schedule Error:', error);
        
        if (error.statusCode === 400) {
            return res.status(400).json({
                success: false,
                error: {
                    name: 'ValidationError',
                    message: error.message,
                    details: error.details
                }
            });
        }
        
        if (error.message === 'Schedule not found') {
            return res.status(404).json({
                success: false,
                error: {
                    name: 'NotFoundError',
                    message: error.message
                }
            });
        }
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to update schedule'
            }
        });
    }
};

/**
 * DELETE /api/qmqa/schedules/:id
 * Delete schedule
 */
export const deleteSchedule = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const { id } = req.params;
        await qmqaService.deleteSchedule(id, userId);
        
        res.status(200).json({
            success: true,
            message: 'Schedule deleted successfully'
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Delete Schedule Error:', error);
        
        if (error.message === 'Schedule not found') {
            return res.status(404).json({
                success: false,
                error: {
                    name: 'NotFoundError',
                    message: error.message
                }
            });
        }
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to delete schedule'
            }
        });
    }
};

// ==================== AUDIT REPORT CRUD ENDPOINTS ====================

/**
 * POST /api/qmqa/records
 * Create new audit report
 */
export const createRecord = async (req, res) => {
    console.log('🔴 [CONTROLLER] createRecord called');
    console.log('🔴 [CONTROLLER] URL:', req.url);
    console.log('🔴 [CONTROLLER] Method:', req.method);
    console.log('🔴 [CONTROLLER] Body:', req.body);
    
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const record = await qmqaService.createRecord(req.body, userId);
        
        res.status(201).json({
            success: true,
            data: record
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Create Record Error:', error);
        
        if (error.statusCode === 400) {
            return res.status(400).json({
                success: false,
                error: {
                    name: 'ValidationError',
                    message: error.message,
                    details: error.details
                }
            });
        }
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to create audit report'
            }
        });
    }
};

/**
 * GET /api/qmqa/records
 * Get all audit reports (with optional status filter)
 */
export const getAllRecords = async (req, res) => {
    try {
        const { status } = req.query;
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        
        const records = await qmqaService.getAllRecords(status, userId, userRole);
        
        res.status(200).json({
            success: true,
            data: records
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Get All Records Error:', error);
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to retrieve audit reports'
            }
        });
    }
};

/**
 * GET /api/qmqa/records/:id
 * Get audit report by ID
 */
export const getRecordById = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await qmqaService.getRecord(id);
        
        if (!record) {
            return res.status(404).json({
                success: false,
                error: {
                    name: 'NotFoundError',
                    message: 'Audit report not found'
                }
            });
        }
        
        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Get Record Error:', error);
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to retrieve audit report'
            }
        });
    }
};

/**
 * PUT /api/qmqa/records/:id
 * Update audit report
 */
export const updateRecord = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const { id } = req.params;
        const record = await qmqaService.updateRecord(id, req.body, userId);
        
        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Update Record Error:', error);
        
        if (error.statusCode === 400) {
            return res.status(400).json({
                success: false,
                error: {
                    name: 'ValidationError',
                    message: error.message,
                    details: error.details
                }
            });
        }
        
        if (error.message === 'Record not found') {
            return res.status(404).json({
                success: false,
                error: {
                    name: 'NotFoundError',
                    message: error.message
                }
            });
        }
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to update audit report'
            }
        });
    }
};

/**
 * DELETE /api/qmqa/records/:id
 * Delete audit report
 */
export const deleteRecord = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const { id } = req.params;
        await qmqaService.deleteRecord(id, userId);
        
        res.status(200).json({
            success: true,
            message: 'Audit report deleted successfully'
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Delete Record Error:', error);
        
        if (error.message === 'Record not found') {
            return res.status(404).json({
                success: false,
                error: {
                    name: 'NotFoundError',
                    message: error.message
                }
            });
        }
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to delete audit report'
            }
        });
    }
};

// ==================== WORKFLOW ACTION ENDPOINTS ====================

/**
 * POST /api/qmqa/records/:id/submit
 * Submit audit report for Cycle 1 approval
 */
export const submitForApproval = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const { id } = req.params;
        const record = await qmqaWorkflowService.submitForApproval(id, userId);
        
        // Send email notifications
        await qmqaEmailService.sendCycle1SubmitEmail(record);
        
        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Submit For Approval Error:', error);
        
        res.status(400).json({
            success: false,
            error: {
                name: 'WorkflowError',
                message: error.message
            }
        });
    }
};

/**
 * POST /api/qmqa/records/:id/approve
 * Approve audit report (Cycle 1 or Cycle 2)
 */
export const approve = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const { id } = req.params;
        const { remarks, cycle } = req.body;
        
        let record;
        if (cycle === 2) {
            record = await qmqaWorkflowService.approveCycle2(id, userId, remarks);
            // Send closure email if fully approved
            if (record.status === 'CLOSED') {
                await qmqaEmailService.sendClosedEmail(record);
            }
        } else {
            record = await qmqaWorkflowService.approveCycle1(id, userId, remarks);
            // Send approval email if fully approved
            if (record.status === 'APPROVED') {
                await qmqaEmailService.sendCycle1ApprovedEmail(record);
            }
        }
        
        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Approve Error:', error);
        
        res.status(400).json({
            success: false,
            error: {
                name: 'WorkflowError',
                message: error.message
            }
        });
    }
};

/**
 * POST /api/qmqa/records/:id/reject
 * Reject audit report (Cycle 1 or Cycle 2)
 */
export const reject = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const { id } = req.params;
        const { remarks, cycle } = req.body;
        
        let record;
        if (cycle === 2) {
            record = await qmqaWorkflowService.rejectCycle2(id, userId, remarks);
        } else {
            record = await qmqaWorkflowService.rejectCycle1(id, userId, remarks);
        }
        
        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Reject Error:', error);
        
        res.status(400).json({
            success: false,
            error: {
                name: 'WorkflowError',
                message: error.message
            }
        });
    }
};

/**
 * POST /api/qmqa/records/:id/issue
 * Issue audit report to supplier
 */
export const issue = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const { id } = req.params;
        const record = await qmqaWorkflowService.issueToSupplier(id, userId);
        
        // Generate token for supplier access
        const token = qmqaTokenService.generateToken(
            record.id,
            record.auditPlan?.supplierId,
            record.auditDetails?.dueDate
        );
        
        // Send issuance email with token
        await qmqaEmailService.sendIssuedEmail(record, token);
        
        res.status(200).json({
            success: true,
            data: {
                ...record,
                supplierToken: token
            }
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Issue Error:', error);
        
        res.status(400).json({
            success: false,
            error: {
                name: 'WorkflowError',
                message: error.message
            }
        });
    }
};

/**
 * POST /api/qmqa/records/:id/cancel
 * Cancel issued audit report
 */
export const cancel = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const { id } = req.params;
        const { remarks } = req.body;
        
        const record = await qmqaWorkflowService.cancelAudit(id, userId, remarks);
        
        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Cancel Error:', error);
        
        res.status(400).json({
            success: false,
            error: {
                name: 'WorkflowError',
                message: error.message
            }
        });
    }
};

// ==================== SUPPLIER RESPONSE ENDPOINTS ====================

/**
 * GET /api/qmqa/response/:token
 * Get audit report by token (supplier access)
 */
export const getByToken = async (req, res) => {
    try {
        const { token } = req.params;
        
        // Validate token
        const decoded = qmqaTokenService.validateToken(token);
        
        // Get record
        const record = await qmqaService.getRecord(decoded.qmqaId);
        
        if (!record) {
            return res.status(404).json({
                success: false,
                error: {
                    name: 'NotFoundError',
                    message: 'Audit report not found'
                }
            });
        }
        
        // Verify supplier matches
        qmqaTokenService.verifySupplier(token, record.auditPlan?.supplierId);
        
        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Get By Token Error:', error);
        
        if (error.statusCode === 401 || error.statusCode === 403) {
            return res.status(error.statusCode).json({
                success: false,
                error: {
                    name: error.code || 'UnauthorizedError',
                    message: error.message
                }
            });
        }
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to retrieve audit report'
            }
        });
    }
};

/**
 * POST /api/qmqa/response/:token/initial
 * Save initial report (supplier)
 */
export const saveInitialReport = async (req, res) => {
    try {
        const { token } = req.params;
        
        // Validate token
        const decoded = qmqaTokenService.validateToken(token);
        
        const record = await qmqaWorkflowService.saveInitialReport(decoded.qmqaId, req.body);
        
        // Send notification email
        await qmqaEmailService.sendInitialReportEmail(record, req.body.skip_initial);
        
        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Save Initial Report Error:', error);
        
        if (error.statusCode === 401 || error.statusCode === 403) {
            return res.status(error.statusCode).json({
                success: false,
                error: {
                    name: error.code || 'UnauthorizedError',
                    message: error.message
                }
            });
        }
        
        res.status(400).json({
            success: false,
            error: {
                name: 'WorkflowError',
                message: error.message
            }
        });
    }
};

/**
 * POST /api/qmqa/response/:token/final
 * Submit final report (supplier)
 */
export const submitFinalReport = async (req, res) => {
    try {
        const { token } = req.params;
        
        // Validate token
        const decoded = qmqaTokenService.validateToken(token);
        
        const record = await qmqaWorkflowService.submitFinalReport(decoded.qmqaId, req.body);
        
        // Send notification email
        await qmqaEmailService.sendFinalReportEmail(record);
        
        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Submit Final Report Error:', error);
        
        if (error.statusCode === 401 || error.statusCode === 403) {
            return res.status(error.statusCode).json({
                success: false,
                error: {
                    name: error.code || 'UnauthorizedError',
                    message: error.message
                }
            });
        }
        
        res.status(400).json({
            success: false,
            error: {
                name: 'WorkflowError',
                message: error.message
            }
        });
    }
};

// ==================== VERIFICATION AND CYCLE 2 ENDPOINTS ====================

/**
 * POST /api/qmqa/records/:id/verification
 * Submit verification for Cycle 2 approval
 */
export const submitVerification = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const { id } = req.params;
        const record = await qmqaWorkflowService.submitVerification(id, req.body, userId);
        
        // Send Cycle 2 approval emails
        await qmqaEmailService.sendCycle2SubmitEmail(record);
        
        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Submit Verification Error:', error);
        
        res.status(400).json({
            success: false,
            error: {
                name: 'WorkflowError',
                message: error.message
            }
        });
    }
};

// ==================== FILE MANAGEMENT ENDPOINTS ====================

/**
 * POST /api/qmqa/records/:id/attachments
 * Upload attachment to audit record
 */
export const uploadAttachment = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const { id } = req.params;
        const { attachmentType, remarks } = req.body;
        
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: {
                    name: 'ValidationError',
                    message: 'No file uploaded'
                }
            });
        }
        
        // Store file metadata
        const attachment = await qmqaService.addAttachment(id, {
            attachmentType: attachmentType || 'general',
            fileName: req.file.filename,
            originalName: req.file.originalname,
            fileExtension: req.file.originalname.split('.').pop(),
            fileSize: req.file.size,
            filePath: req.file.path,
            remarks,
            uploadedBy: userId
        });
        
        res.status(201).json({
            success: true,
            data: attachment
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Upload Attachment Error:', error);
        
        if (error.statusCode === 404) {
            return res.status(404).json({
                success: false,
                error: {
                    name: 'NotFoundError',
                    message: error.message
                }
            });
        }
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to upload attachment'
            }
        });
    }
};

/**
 * GET /api/qmqa/attachments/:attachmentId
 * Download attachment file
 */
export const downloadAttachment = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const { attachmentId } = req.params;
        
        // Get attachment metadata
        const attachment = await qmqaService.getAttachment(attachmentId);
        
        if (!attachment) {
            return res.status(404).json({
                success: false,
                error: {
                    name: 'NotFoundError',
                    message: 'Attachment not found'
                }
            });
        }
        
        // Check if user has permission to access the audit record
        const record = await qmqaService.getRecord(attachment.qmqaId);
        if (!record) {
            return res.status(404).json({
                success: false,
                error: {
                    name: 'NotFoundError',
                    message: 'Associated audit record not found'
                }
            });
        }
        
        // Set appropriate headers
        res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
        
        // Stream file to response
        const fs = await import('fs');
        const fileStream = fs.createReadStream(attachment.filePath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('❌ [CONTROLLER] Download Attachment Error:', error);
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to download attachment'
            }
        });
    }
};

// ==================== SEARCH AND REPORTING ENDPOINTS ====================

/**
 * GET /api/qmqa/search
 * Search audit records with filters
 */
export const searchRecords = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userRole = req.user?.role;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const {
            controlNo,
            status,
            supplierId,
            dateFrom,
            dateTo,
            page = 1,
            pageSize = 50
        } = req.query;
        
        const filters = {
            controlNo,
            status,
            supplierId,
            dateFrom,
            dateTo
        };
        
        const result = await qmqaService.searchRecords(filters, userId, userRole, {
            page: parseInt(page),
            pageSize: Math.min(parseInt(pageSize), 100) // Max 100 per page
        });
        
        res.status(200).json({
            success: true,
            data: result.records,
            pagination: {
                total: result.total,
                page: result.page,
                pageSize: result.pageSize,
                totalPages: Math.ceil(result.total / result.pageSize)
            }
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Search Records Error:', error);
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to search records'
            }
        });
    }
};

/**
 * GET /api/qmqa/calendar
 * Get calendar data for a specific month
 */
export const getCalendarData = async (req, res) => {
    try {
        const { year, month } = req.query;
        
        if (!year || !month) {
            return res.status(400).json({
                success: false,
                error: {
                    name: 'ValidationError',
                    message: 'Year and month are required'
                }
            });
        }
        
        const calendarData = await qmqaService.getCalendarData(
            parseInt(year),
            parseInt(month)
        );
        
        res.status(200).json({
            success: true,
            data: calendarData
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Get Calendar Data Error:', error);
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to retrieve calendar data'
            }
        });
    }
};

/**
 * GET /api/qmqa/achievement
 * Get achievement metrics and statistics
 */
export const getAchievementData = async (req, res) => {
    try {
        const { dateFrom, dateTo, supplierId } = req.query;
        
        const filters = {
            dateFrom,
            dateTo,
            supplierId
        };
        
        const achievementData = await qmqaService.getAchievementData(filters);
        
        res.status(200).json({
            success: true,
            data: achievementData
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Get Achievement Data Error:', error);
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to retrieve achievement data'
            }
        });
    }
};

// ==================== BATCH OPERATION ENDPOINTS ====================

/**
 * POST /api/qmqa/batch/submit
 * Submit multiple audit reports for approval
 */
export const batchSubmit = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const { recordIds } = req.body;
        
        if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    name: 'ValidationError',
                    message: 'recordIds array is required'
                }
            });
        }
        
        const results = await qmqaService.batchSubmit(recordIds, userId);
        
        res.status(200).json({
            success: true,
            data: {
                successCount: results.successCount,
                failureCount: results.failureCount,
                results: results.results
            }
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Batch Submit Error:', error);
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to process batch submit'
            }
        });
    }
};

/**
 * POST /api/qmqa/batch/approve
 * Approve multiple audit reports
 */
export const batchApprove = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const { recordIds, remarks, cycle } = req.body;
        
        if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    name: 'ValidationError',
                    message: 'recordIds array is required'
                }
            });
        }
        
        const results = await qmqaService.batchApprove(recordIds, userId, remarks, cycle);
        
        res.status(200).json({
            success: true,
            data: {
                successCount: results.successCount,
                failureCount: results.failureCount,
                results: results.results
            }
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Batch Approve Error:', error);
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to process batch approve'
            }
        });
    }
};

/**
 * POST /api/qmqa/batch/reject
 * Reject multiple audit reports
 */
export const batchReject = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const { recordIds, remarks, cycle } = req.body;
        
        if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    name: 'ValidationError',
                    message: 'recordIds array is required'
                }
            });
        }
        
        if (!remarks) {
            return res.status(400).json({
                success: false,
                error: {
                    name: 'ValidationError',
                    message: 'Remarks are required for rejection'
                }
            });
        }
        
        const results = await qmqaService.batchReject(recordIds, userId, remarks, cycle);
        
        res.status(200).json({
            success: true,
            data: {
                successCount: results.successCount,
                failureCount: results.failureCount,
                results: results.results
            }
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Batch Reject Error:', error);
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to process batch reject'
            }
        });
    }
};

/**
 * POST /api/qmqa/batch/issue
 * Issue multiple audit reports to suppliers
 */
export const batchIssue = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    name: 'UnauthorizedError',
                    message: 'User not authenticated'
                }
            });
        }

        const { recordIds } = req.body;
        
        if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    name: 'ValidationError',
                    message: 'recordIds array is required'
                }
            });
        }
        
        const results = await qmqaService.batchIssue(recordIds, userId);
        
        res.status(200).json({
            success: true,
            data: {
                successCount: results.successCount,
                failureCount: results.failureCount,
                results: results.results
            }
        });
    } catch (error) {
        console.error('❌ [CONTROLLER] Batch Issue Error:', error);
        
        res.status(500).json({
            success: false,
            error: {
                name: 'InternalServerError',
                message: 'Failed to process batch issue'
            }
        });
    }
};
