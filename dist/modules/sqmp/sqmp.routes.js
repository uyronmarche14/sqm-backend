import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import mainRoutes from './main/main.routes.js';
import responseRoutes from './response/response.routes.js';
import { mainSqmpController } from './main/main.controller.js';
const router = Router();
// Protect all routes
router.use(requireAuth);
// Document Downloader (Shared utility)
router.get('/download/:attachmentId', mainSqmpController.downloadAttachment);
// Sub-domain Routing
router.use('/response', responseRoutes);
router.use('/', mainRoutes);
export default router;
