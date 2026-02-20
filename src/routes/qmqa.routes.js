/**
 * QMQA Routes
 * HTTP endpoint definitions for QMQA module
 */

import express from 'express';
import * as qmqaController from '../controllers/qmqa.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { canModifyRecord, canApprove } from '../middleware/qmqa-permission.middleware.js';
import { uploadSingleFile } from '../middleware/file-upload.middleware.js';

const router = express.Router();

// ==================== SCHEDULE ENDPOINTS ====================
// All schedule endpoints require authentication
router.post('/schedules', authenticateToken, qmqaController.createSchedule);
router.get('/schedules', authenticateToken, qmqaController.getAllSchedules);
router.get('/schedules/:id', authenticateToken, qmqaController.getScheduleById);
router.put('/schedules/:id', authenticateToken, canModifyRecord, qmqaController.updateSchedule);
router.delete('/schedules/:id', authenticateToken, canModifyRecord, qmqaController.deleteSchedule);

// ==================== AUDIT REPORT CRUD ENDPOINTS ====================
router.post('/records', authenticateToken, qmqaController.createRecord);
router.get('/records', authenticateToken, qmqaController.getAllRecords);
router.get('/records/:id', authenticateToken, qmqaController.getRecordById);
router.put('/records/:id', authenticateToken, canModifyRecord, qmqaController.updateRecord);
router.delete('/records/:id', authenticateToken, canModifyRecord, qmqaController.deleteRecord);

// ==================== WORKFLOW ACTION ENDPOINTS ====================
router.post('/records/:id/submit', authenticateToken, canModifyRecord, qmqaController.submitForApproval);
router.post('/records/:id/approve', authenticateToken, canApprove, qmqaController.approve);
router.post('/records/:id/reject', authenticateToken, canApprove, qmqaController.reject);
router.post('/records/:id/issue', authenticateToken, canModifyRecord, qmqaController.issue);
router.post('/records/:id/cancel', authenticateToken, canModifyRecord, qmqaController.cancel);

// ==================== SUPPLIER RESPONSE ENDPOINTS ====================
// Note: These use token-based authentication, not JWT
router.get('/response/:token', qmqaController.getByToken);
router.post('/response/:token/initial', qmqaController.saveInitialReport);
router.post('/response/:token/final', qmqaController.submitFinalReport);

// ==================== VERIFICATION AND CYCLE 2 ENDPOINTS ====================
router.post('/records/:id/verification', authenticateToken, canModifyRecord, qmqaController.submitVerification);

// ==================== FILE MANAGEMENT ENDPOINTS ====================
router.post('/records/:id/attachments', authenticateToken, uploadSingleFile, qmqaController.uploadAttachment);
router.get('/attachments/:attachmentId', authenticateToken, qmqaController.downloadAttachment);

// ==================== SEARCH AND REPORTING ENDPOINTS ====================
router.get('/search', authenticateToken, qmqaController.searchRecords);
router.get('/calendar', authenticateToken, qmqaController.getCalendarData);
router.get('/achievement', authenticateToken, qmqaController.getAchievementData);

// ==================== BATCH OPERATION ENDPOINTS ====================
router.post('/batch/submit', authenticateToken, qmqaController.batchSubmit);
router.post('/batch/approve', authenticateToken, qmqaController.batchApprove);
router.post('/batch/reject', authenticateToken, qmqaController.batchReject);
router.post('/batch/issue', authenticateToken, qmqaController.batchIssue);

export default router;
