import { Router } from 'express';
import { qmqaController } from './qmqa.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../middleware/upload.middleware.js';
const router = Router();
const upload = createModuleUpload('qmqa');
// Protect all routes
router.use(requireAuth);
// ==========================================
// SCHEDULES (Audit Plan)
// ==========================================
router.get('/schedules', qmqaController.getAllSchedules);
router.post('/schedules', qmqaController.createSchedule);
router.get('/schedules/:id', qmqaController.getScheduleById);
router.put('/schedules/:id', qmqaController.updateSchedule);
router.delete('/schedules/:id', qmqaController.deleteSchedule);
// ==========================================
// RECORDS (Execution)
// ==========================================
router.get('/records', qmqaController.getAllRecords);
router.post('/records', upload.any(), logUploads, handleUploadError, qmqaController.createRecord);
router.get('/records/:id', qmqaController.getRecordById);
router.put('/records/:id', upload.any(), logUploads, handleUploadError, qmqaController.updateRecord);
router.delete('/records/:id', qmqaController.deleteRecord);
// ==========================================
// WORKFLOW ACTIONS
// ==========================================
router.post('/records/:id/submit', qmqaController.submit);
router.post('/records/:id/check', qmqaController.check);
router.post('/records/:id/approve', qmqaController.approve);
router.post('/records/:id/reject', qmqaController.reject);
router.post('/records/:id/issue', qmqaController.issue);
router.post('/records/:id/cancel', qmqaController.cancel);
router.post('/records/:id/verify', qmqaController.verify);
// ==========================================
// BATCH OPERATIONS
// ==========================================
router.post('/batch/submit', qmqaController.batchSubmit);
router.post('/batch/check', qmqaController.batchCheck);
router.post('/batch/approve', qmqaController.batchApprove);
router.post('/batch/reject', qmqaController.batchReject);
router.post('/batch/issue', qmqaController.batchIssue);
// ==========================================
// SUPPLIER RESPONSE (Initial & Final Reports)
// ==========================================
router.post('/records/:id/initial-report', upload.any(), logUploads, handleUploadError, qmqaController.saveInitialReport);
router.post('/records/:id/final-report', upload.any(), logUploads, handleUploadError, qmqaController.submitFinalReport);
export default router;
