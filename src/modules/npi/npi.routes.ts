import { Router } from 'express';
import { npiController } from './npi.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../middleware/upload.middleware.js';
import { requirePermission } from '../../shared/middleware/requirePermission.js';

const router = Router();
const upload = createModuleUpload('npi', { attachmentType: 'npi-main' });

// Health check (no auth required for monitoring)
router.get('/health', async (_req, res) => {
  try {
    const { db } = await import('../../shared/infrastructure/db.js');
    const result = await db
      .selectFrom('NPI_LOTS')
      .select(db.fn.countAll().as('count'))
      .executeTakeFirst();
    res.json({
      success: true,
      status: 'healthy',
      module: 'NPI',
      npiRecordCount: Number(result?.count ?? 0),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      module: 'NPI',
      error: String(error),
      timestamp: new Date().toISOString(),
    });
  }
});

// Protect all routes
router.use(requireAuth);

router.get('/stats', npiController.getStats);
router.get('/sequence', npiController.generateSequence);

router.get('/', npiController.getAll);
router.get('/:id', npiController.getById);

// Document Downloader
router.get('/download/:attachmentId', npiController.downloadAttachment);

// Create / Update with Multer File handling
router.post('/', requirePermission('NPILOT-09-01', 'add'), upload.any(), logUploads, handleUploadError, npiController.create);
router.put('/:id', requirePermission('NPILOT-09-01', 'edit'), upload.any(), logUploads, handleUploadError, npiController.update);
router.delete('/:id', requirePermission('NPILOT-09-01', 'delete'), npiController.delete);

// Workflow Action Subroutes
router.post('/:id/submit', requirePermission('NPILOT-09-01', 'submit'), npiController.submit);
router.post('/:id/check', requirePermission('NPILOT-09-03', 'check'), npiController.check);
router.post('/:id/approve', requirePermission('NPILOT-09-03', 'approve'), npiController.approve);
router.post('/:id/reject', requirePermission('NPILOT-09-03', 'reject'), npiController.reject);

export default router;
