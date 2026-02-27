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
// ==========================================
// RECORDS (Execution)
// ==========================================
router.get('/records', qmqaController.getAllRecords);
router.post('/records', upload.any(), logUploads, handleUploadError, qmqaController.createRecord);
router.get('/records/:id', qmqaController.getRecordById);
router.put('/records/:id', upload.any(), logUploads, handleUploadError, qmqaController.updateRecord);
// ==========================================
// WORKFLOW ACTIONS
// ==========================================
router.post('/records/:id/submit', qmqaController.submit);
router.post('/records/:id/approve', qmqaController.approve);
router.post('/records/:id/reject', qmqaController.reject);
router.post('/records/:id/issue', qmqaController.issue);
router.post('/records/:id/cancel', qmqaController.cancel);
export default router;
