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
router.post('/schedules', requirePermission('QMQA-05-15', 'add'), qmqaController.createSchedule);
router.get('/schedules/:id', qmqaController.getScheduleById);
router.put('/schedules/:id', requirePermission('QMQA-05-15', 'edit'), qmqaController.updateSchedule);
router.delete('/schedules/:id', requirePermission('QMQA-05-16', 'delete'), qmqaController.deleteSchedule);
// ==========================================
// RECORDS (Execution)
// ==========================================
router.get('/records', qmqaController.getAllRecords);
router.post('/records', requirePermission('QMQA-05-01', 'add'), uploadRecord.any(), logUploads, handleUploadError, qmqaController.createRecord);
router.get('/records/:id', qmqaController.getRecordById);
router.put('/records/:id', requirePermission('QMQA-05-02', 'edit'), uploadRecord.any(), logUploads, handleUploadError, qmqaController.updateRecord);
router.delete('/records/:id', requirePermission('QMQA-05-02', 'delete'), qmqaController.deleteRecord);
// ==========================================
// WORKFLOW ACTIONS
// ==========================================
router.post('/records/:id/submit', requirePermission('QMQA-05-01', 'submit'), qmqaController.submit);
router.post('/records/:id/check', requirePermission('QMQA-05-03', 'check'), qmqaController.check);
router.post('/records/:id/approve', requirePermission('QMQA-05-03', 'approve'), qmqaController.approve);
router.post('/records/:id/reject', requirePermission('QMQA-05-03', 'reject'), qmqaController.reject);
router.post('/records/:id/issue', requirePermission('QMQA-05-06', 'issue'), qmqaController.issue);
router.post('/records/:id/cancel', requirePermission('QMQA-05-07', 'delete'), qmqaController.cancel);
router.post('/records/:id/verify', requirePermission('QMQA-05-08', 'submit'), qmqaController.verify);
router.post('/records/:id/save-response', requirePermission('QMQA-05-08', 'edit'), uploadFinal.any(), logUploads, handleUploadError, qmqaController.saveResponse);
router.post('/records/:id/submit-initial-response', requirePermission('QMQA-05-05', 'submit'), uploadInitial.any(), logUploads, handleUploadError, qmqaController.submitInitialResponse);
router.post('/records/:id/submit-final-response', requirePermission('QMQA-05-08', 'submit'), uploadFinal.any(), logUploads, handleUploadError, qmqaController.submitFinalResponse);
router.post('/records/:id/save-response-review', requirePermission('QMQA-05-08', 'edit'), qmqaController.saveResponseReview);
router.post('/records/:id/submit-response-review', requirePermission('QMQA-05-08', 'submit'), qmqaController.submitResponseReview);
router.post('/records/:id/check-response', requirePermission('QMQA-05-09', 'check'), qmqaController.checkResponse);
router.post('/records/:id/approve-response', requirePermission('QMQA-05-09', 'approve'), qmqaController.approveResponse);
router.post('/records/:id/reject-response', requirePermission('QMQA-05-09', 'reject'), qmqaController.rejectResponse);
router.post('/records/:id/accept-response', requirePermission('QMQA-05-09', 'approve'), qmqaController.acceptResponse);
router.post('/records/:id/not-accept-response', requirePermission('QMQA-05-09', 'reject'), qmqaController.notAcceptResponse);
// ==========================================
// BATCH OPERATIONS
// ==========================================
router.post('/batch/submit', requirePermission('QMQA-05-02', 'submit'), qmqaController.batchSubmit);
router.post('/batch/check', requirePermission('QMQA-05-03', 'check'), qmqaController.batchCheck);
router.post('/batch/approve', requirePermission('QMQA-05-03', 'approve'), qmqaController.batchApprove);
router.post('/batch/reject', requirePermission('QMQA-05-03', 'reject'), qmqaController.batchReject);
router.post('/batch/issue', requirePermission('QMQA-05-06', 'issue'), qmqaController.batchIssue);
// ==========================================
// SUPPLIER RESPONSE (Initial & Final Reports)
// ==========================================
router.post('/records/:id/initial-report', requirePermission('QMQA-05-05', 'edit'), uploadInitial.any(), logUploads, handleUploadError, qmqaController.saveInitialReport);
router.post('/records/:id/final-report', requirePermission('QMQA-05-08', 'submit'), uploadFinal.any(), logUploads, handleUploadError, qmqaController.submitFinalReport);
export default router;
