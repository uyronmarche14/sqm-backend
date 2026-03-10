import { Router } from 'express';
import { qmqaController } from './qmqa.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../middleware/upload.middleware.js';
import { requirePermission } from '../../shared/middleware/requirePermission.js';

const router = Router();
const uploadRecord = createModuleUpload('qmqa', { attachmentType: 'qmqa-record' });
const uploadInitial = createModuleUpload('qmqa', { attachmentType: 'qmqa-response-initial' });
const uploadFinal = createModuleUpload('qmqa', { attachmentType: 'qmqa-response-final' });

// Protect all routes
router.use(requireAuth);

// Document Downloader
router.get('/download/:moduleType/:attachmentId', qmqaController.downloadAttachment);
router.get('/attachments/:moduleType/:attachmentId', qmqaController.downloadAttachment);

// ==========================================
// SCHEDULES (Audit Plan)
// ==========================================
router.get('/schedules', qmqaController.getAllSchedules);
router.post('/schedules', requirePermission('QMQA-01-01', 'add'), qmqaController.createSchedule);
router.get('/schedules/:id', qmqaController.getScheduleById);
router.put('/schedules/:id', requirePermission('QMQA-01-01', 'edit'), qmqaController.updateSchedule);
router.delete('/schedules/:id', requirePermission('QMQA-01-01', 'delete'), qmqaController.deleteSchedule);

// ==========================================
// RECORDS (Execution)
// ==========================================
router.get('/records', qmqaController.getAllRecords);
router.post('/records', requirePermission('QMQA-01-01', 'add'), uploadRecord.any(), logUploads, handleUploadError, qmqaController.createRecord);
router.get('/records/:id', qmqaController.getRecordById);
router.put('/records/:id', requirePermission('QMQA-01-01', 'edit'), uploadRecord.any(), logUploads, handleUploadError, qmqaController.updateRecord);
router.delete('/records/:id', requirePermission('QMQA-01-01', 'delete'), qmqaController.deleteRecord);

// ==========================================
// WORKFLOW ACTIONS
// ==========================================
router.post('/records/:id/submit', requirePermission('QMQA-01-01', 'submit'), qmqaController.submit);
router.post('/records/:id/check', requirePermission('QMQA-01-03', 'check'), qmqaController.check);
router.post('/records/:id/approve', requirePermission('QMQA-01-04', 'approve'), qmqaController.approve);
router.post('/records/:id/reject', requirePermission('QMQA-01-03', 'reject'), qmqaController.reject);
router.post('/records/:id/issue', requirePermission('QMQA-01-05', 'issue'), qmqaController.issue);
router.post('/records/:id/cancel', requirePermission('QMQA-01-01', 'delete'), qmqaController.cancel);
router.post('/records/:id/verify', requirePermission('QMQA-01-04', 'approve'), qmqaController.verify);

// ==========================================
// BATCH OPERATIONS
// ==========================================
router.post('/batch/submit', requirePermission('QMQA-01-01', 'submit'), qmqaController.batchSubmit);
router.post('/batch/check', requirePermission('QMQA-01-03', 'check'), qmqaController.batchCheck);
router.post('/batch/approve', requirePermission('QMQA-01-04', 'approve'), qmqaController.batchApprove);
router.post('/batch/reject', requirePermission('QMQA-01-03', 'reject'), qmqaController.batchReject);
router.post('/batch/issue', requirePermission('QMQA-01-05', 'issue'), qmqaController.batchIssue);

// ==========================================
// SUPPLIER RESPONSE (Initial & Final Reports)
// ==========================================
router.post('/records/:id/initial-report', requirePermission('QMQA-01-05', 'edit'), uploadInitial.any(), logUploads, handleUploadError, qmqaController.saveInitialReport);
router.post('/records/:id/final-report', requirePermission('QMQA-01-05', 'submit'), uploadFinal.any(), logUploads, handleUploadError, qmqaController.submitFinalReport);

export default router;
