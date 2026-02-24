/**
 * QMQA Routes
 * HTTP endpoint definitions for QMQA module
 */

import express from 'express';
import * as qmqaController from '../controllers/qmqa.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { canModifyRecord, canApprove } from '../middleware/qmqa-permission.middleware.js';
import { uploadSingleFile } from '../middleware/file-upload.middleware.js';
import { asyncHandler } from '../middleware/error-handler.middleware.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import {
  qmqaScheduleSchema,
  qmqaAuditPlanSchema,
  qmqaAuditDetailsSchema,
  qmqaResponseSchema,
  qmqaVerificationSchema,
  qmqaFinalReportSchema
} from '../schemas/qmqa.schema.js';

const router = express.Router();

// ==================== SCHEDULE ENDPOINTS ====================
// All schedule endpoints require authentication
router.post(
  '/schedules',
  authenticateToken,
  validateRequest({ body: qmqaScheduleSchema }),
  asyncHandler(qmqaController.createSchedule)
);
router.get('/schedules', authenticateToken, asyncHandler(qmqaController.getAllSchedules));
router.get('/schedules/:id', authenticateToken, asyncHandler(qmqaController.getScheduleById));
router.put(
  '/schedules/:id',
  authenticateToken,
  canModifyRecord,
  validateRequest({ body: qmqaScheduleSchema }),
  asyncHandler(qmqaController.updateSchedule)
);
router.delete('/schedules/:id', authenticateToken, canModifyRecord, asyncHandler(qmqaController.deleteSchedule));

// ==================== AUDIT REPORT CRUD ENDPOINTS ====================
router.post(
  '/records',
  authenticateToken,
  validateRequest({ body: qmqaAuditPlanSchema }),
  asyncHandler(qmqaController.createRecord)
);
router.get('/records', authenticateToken, asyncHandler(qmqaController.getAllRecords));
router.get('/records/:id', authenticateToken, asyncHandler(qmqaController.getRecordById));
router.put(
  '/records/:id',
  authenticateToken,
  canModifyRecord,
  validateRequest({ body: qmqaAuditDetailsSchema }),
  asyncHandler(qmqaController.updateRecord)
);
router.delete('/records/:id', authenticateToken, canModifyRecord, asyncHandler(qmqaController.deleteRecord));

// ==================== WORKFLOW ACTION ENDPOINTS ====================
router.post('/records/:id/submit', authenticateToken, canModifyRecord, asyncHandler(qmqaController.submitForApproval));
router.post('/records/:id/approve', authenticateToken, canApprove, asyncHandler(qmqaController.approve));
router.post('/records/:id/reject', authenticateToken, canApprove, asyncHandler(qmqaController.reject));
router.post('/records/:id/issue', authenticateToken, canModifyRecord, asyncHandler(qmqaController.issue));
router.post('/records/:id/cancel', authenticateToken, canModifyRecord, asyncHandler(qmqaController.cancel));

// ==================== SUPPLIER RESPONSE ENDPOINTS ====================
// Note: These use token-based authentication, not JWT
router.get('/response/:token', asyncHandler(qmqaController.getByToken));
router.post(
  '/response/:token/initial',
  validateRequest({ body: qmqaResponseSchema }),
  asyncHandler(qmqaController.saveInitialReport)
);
router.post(
  '/response/:token/final',
  validateRequest({ body: qmqaFinalReportSchema }),
  asyncHandler(qmqaController.submitFinalReport)
);

// ==================== VERIFICATION AND CYCLE 2 ENDPOINTS ====================
router.post(
  '/records/:id/verification',
  authenticateToken,
  canModifyRecord,
  validateRequest({ body: qmqaVerificationSchema }),
  asyncHandler(qmqaController.submitVerification)
);

// ==================== FILE MANAGEMENT ENDPOINTS ====================
router.post('/records/:id/attachments', authenticateToken, uploadSingleFile, asyncHandler(qmqaController.uploadAttachment));
router.get('/attachments/:attachmentId', authenticateToken, asyncHandler(qmqaController.downloadAttachment));

// ==================== SEARCH AND REPORTING ENDPOINTS ====================
router.get('/search', authenticateToken, asyncHandler(qmqaController.searchRecords));
router.get('/calendar', authenticateToken, asyncHandler(qmqaController.getCalendarData));
router.get('/achievement', authenticateToken, asyncHandler(qmqaController.getAchievementData));

// ==================== BATCH OPERATION ENDPOINTS ====================
router.post('/batch/submit', authenticateToken, asyncHandler(qmqaController.batchSubmit));
router.post('/batch/approve', authenticateToken, asyncHandler(qmqaController.batchApprove));
router.post('/batch/reject', authenticateToken, asyncHandler(qmqaController.batchReject));
router.post('/batch/issue', authenticateToken, asyncHandler(qmqaController.batchIssue));

export default router;
