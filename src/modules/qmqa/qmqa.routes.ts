import { Router } from 'express';
import { qmqaController } from './qmqa.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../middleware/upload.middleware.js';
import { requirePermission } from '../../shared/middleware/requirePermission.js';
import { requireAnyPermission } from '../../shared/middleware/requireAnyPermission.js';
import { requireModuleAccess } from '../../shared/middleware/requireModuleAccess.js';

type QmqaRouteVariant = 'QMQA' | 'QMQA_MEDIA';

function getQmqaFormCodes(variant: QmqaRouteVariant) {
  if (variant === 'QMQA_MEDIA') {
    return {
      schedule: 'QMQA-MEDIA-15',
      scheduleCancel: 'QMQA-MEDIA-16',
      new: 'QMQA-MEDIA-01',
      draft: 'QMQA-MEDIA-02',
      awaitingApproval: 'QMQA-MEDIA-03',
      rejected: 'QMQA-MEDIA-04',
      approved: 'QMQA-MEDIA-06',
      cancelled: 'QMQA-MEDIA-07',
      issued: 'QMQA-MEDIA-05',
      withFinalReport: 'QMQA-MEDIA-08',
      responseAwaitingApproval: 'QMQA-MEDIA-09',
      responseRejected: 'QMQA-MEDIA-10',
    } as const;
  }

  return {
    schedule: 'QMQA-05-15',
    scheduleCancel: 'QMQA-05-16',
    new: 'QMQA-05-01',
    draft: 'QMQA-05-02',
    awaitingApproval: 'QMQA-05-03',
    rejected: 'QMQA-05-04',
    approved: 'QMQA-05-06',
    cancelled: 'QMQA-05-07',
    issued: 'QMQA-05-05',
    withFinalReport: 'QMQA-05-08',
    responseAwaitingApproval: 'QMQA-05-09',
    responseRejected: 'QMQA-05-10',
  } as const;
}

export function createQmqaRoutes(variant: QmqaRouteVariant = 'QMQA') {
  const router = Router();
  const uploadRecord = createModuleUpload('qmqa', { attachmentType: 'qmqa-record' });
  const uploadInitial = createModuleUpload('qmqa', { attachmentType: 'qmqa-response-initial' });
  const uploadFinal = createModuleUpload('qmqa', { attachmentType: 'qmqa-response-final' });
  const uploadVerification = createModuleUpload('qmqa', { attachmentType: 'qmqa-response-verification' });
  const formCodes = getQmqaFormCodes(variant);

  // Protect all routes
  router.use(requireAuth);
  router.use((req, _res, next) => {
    (req as any).qmqaVariant = variant;
    next();
  });

  // Document Downloader
  router.get(
    '/download/:attachmentId',
    requireModuleAccess(variant, 'view'),
    qmqaController.downloadAttachment,
  );
  router.get(
    '/download/:moduleType/:attachmentId',
    requireModuleAccess(variant, 'view'),
    qmqaController.downloadAttachment,
  );
  router.get(
    '/attachments/:attachmentId',
    requireModuleAccess(variant, 'view'),
    qmqaController.downloadAttachment,
  );
  router.get(
    '/attachments/:moduleType/:attachmentId',
    requireModuleAccess(variant, 'view'),
    qmqaController.downloadAttachment,
  );

  // ==========================================
  // SCHEDULES (Audit Plan)
  // ==========================================
  router.get('/schedules', requireModuleAccess(variant, 'viewlist'), qmqaController.getAllSchedules);
  router.post('/schedules', requirePermission(formCodes.schedule, 'add'), qmqaController.createSchedule);
  router.get('/schedules/:id', requireModuleAccess(variant, 'view'), qmqaController.getScheduleById);
  router.put('/schedules/:id', requirePermission(formCodes.schedule, 'edit'), qmqaController.updateSchedule);
  router.post('/schedules/:id/cancel', requirePermission(formCodes.scheduleCancel, 'delete'), qmqaController.cancelSchedule);
  router.delete('/schedules', requirePermission(formCodes.scheduleCancel, 'delete'), qmqaController.deleteSchedules);
  router.delete('/schedules/:id', requirePermission(formCodes.scheduleCancel, 'delete'), qmqaController.deleteSchedule);

  // ==========================================
  // RECORDS (Execution)
  // ==========================================
  router.get('/records', requireModuleAccess(variant, 'viewlist'), qmqaController.getAllRecords);
  router.post(
    '/records',
    requirePermission(formCodes.new, 'add'),
    uploadRecord.any(),
    logUploads,
    handleUploadError,
    qmqaController.createRecord,
  );
  router.get('/records/:id', requireModuleAccess(variant, 'view'), qmqaController.getRecordById);
  router.put(
    '/records/:id',
    requireAnyPermission([formCodes.draft, formCodes.rejected], 'edit'),
    uploadRecord.any(),
    logUploads,
    handleUploadError,
    qmqaController.updateRecord,
  );
  router.delete('/records/:id', requirePermission(formCodes.draft, 'delete'), qmqaController.deleteRecord);

  // ==========================================
  // WORKFLOW ACTIONS
  // ==========================================
  router.post(
    '/records/:id/submit',
    requireAnyPermission([formCodes.new, formCodes.draft, formCodes.rejected], 'submit'),
    qmqaController.submit,
  );
  router.post('/records/:id/check', requirePermission(formCodes.awaitingApproval, 'check'), qmqaController.check);
  router.post('/records/:id/approve', requirePermission(formCodes.awaitingApproval, 'approve'), qmqaController.approve);
  router.post('/records/:id/reject', requirePermission(formCodes.awaitingApproval, 'reject'), qmqaController.reject);
  router.post('/records/:id/issue', requirePermission(formCodes.approved, 'issue'), qmqaController.issue);
  router.post('/records/:id/cancel', requirePermission(formCodes.cancelled, 'delete'), qmqaController.cancel);
  router.post(
    '/records/:id/verify',
    requireAnyPermission([formCodes.withFinalReport, formCodes.responseRejected], 'submit'),
    uploadVerification.any(),
    logUploads,
    handleUploadError,
    qmqaController.verify,
  );

  router.post(
    '/records/:id/save-response',
    requireAnyPermission([formCodes.issued, formCodes.withFinalReport, formCodes.responseRejected], 'edit'),
    uploadFinal.any(),
    logUploads,
    handleUploadError,
    qmqaController.saveResponse,
  );
  router.post(
    '/records/:id/submit-initial-response',
    requirePermission(formCodes.issued, 'submit'),
    uploadInitial.any(),
    logUploads,
    handleUploadError,
    qmqaController.submitInitialResponse,
  );
  router.post(
    '/records/:id/submit-final-response',
    requireAnyPermission([formCodes.issued, formCodes.withFinalReport, formCodes.responseRejected], 'submit'),
    uploadFinal.any(),
    logUploads,
    handleUploadError,
    qmqaController.submitFinalResponse,
  );
  router.post(
    '/records/:id/save-response-review',
    requireAnyPermission([formCodes.withFinalReport, formCodes.responseRejected], 'edit'),
    uploadVerification.any(),
    logUploads,
    handleUploadError,
    qmqaController.saveResponseReview,
  );
  router.post(
    '/records/:id/submit-response-review',
    requireAnyPermission([formCodes.withFinalReport, formCodes.responseRejected], 'submit'),
    uploadVerification.any(),
    logUploads,
    handleUploadError,
    qmqaController.submitResponseReview,
  );
  router.post('/records/:id/check-response', requirePermission(formCodes.responseAwaitingApproval, 'check'), qmqaController.checkResponse);
  router.post('/records/:id/approve-response', requirePermission(formCodes.responseAwaitingApproval, 'approve'), qmqaController.approveResponse);
  router.post('/records/:id/reject-response', requirePermission(formCodes.responseAwaitingApproval, 'reject'), qmqaController.rejectResponse);
  router.post('/records/:id/accept-response', requirePermission(formCodes.responseAwaitingApproval, 'approve'), qmqaController.acceptResponse);
  router.post('/records/:id/not-accept-response', requirePermission(formCodes.responseAwaitingApproval, 'reject'), qmqaController.notAcceptResponse);

  // ==========================================
  // BATCH OPERATIONS
  // ==========================================
  router.post('/batch/submit', requirePermission(formCodes.draft, 'submit'), qmqaController.batchSubmit);
  router.post('/batch/check', requirePermission(formCodes.awaitingApproval, 'check'), qmqaController.batchCheck);
  router.post('/batch/approve', requirePermission(formCodes.awaitingApproval, 'approve'), qmqaController.batchApprove);
  router.post('/batch/reject', requirePermission(formCodes.awaitingApproval, 'reject'), qmqaController.batchReject);
  router.post('/batch/issue', requirePermission(formCodes.approved, 'issue'), qmqaController.batchIssue);

  // ==========================================
  // SUPPLIER RESPONSE (Initial & Final Reports)
  // ==========================================
  router.post(
    '/records/:id/initial-report',
    requirePermission(formCodes.issued, 'edit'),
    uploadInitial.any(),
    logUploads,
    handleUploadError,
    qmqaController.saveInitialReport,
  );
  router.post(
    '/records/:id/final-report',
    requirePermission(formCodes.withFinalReport, 'submit'),
    uploadFinal.any(),
    logUploads,
    handleUploadError,
    qmqaController.submitFinalReport,
  );

  return router;
}

export default createQmqaRoutes('QMQA');
