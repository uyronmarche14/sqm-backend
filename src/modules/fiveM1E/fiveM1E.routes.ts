import express from 'express';
import { fiveM1EController } from './fiveM1E.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { validate } from '../../shared/middleware/validate.js';
import { CreateFiveM1ESchema, UpdateFiveM1ESchema } from './fiveM1E.schema.js';
// @ts-ignore
import { createModuleUpload, logUploads, handleUploadError } from '../../middleware/upload.middleware.js';

const router = express.Router();
const upload = createModuleUpload('5m1e');

/**
 * Middleware to parse JSON stringified arrays sent via FormData.
 * Multer parses text fields as strings, but our Zod schema (and DB) expects arrays.
 */
const parseFormDataArrays = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
  if (req.body) {
    const arrayFields = ['parts', 'attachments', 'action_items', 'check_items', 'status_remarks'];
    arrayFields.forEach(field => {
      if (typeof req.body[field] === 'string') {
        try {
          req.body[field] = JSON.parse(req.body[field]);
        } catch (e) {
          console.warn(`[5M1E Routes] Failed to parse ${field} as JSON JSON Array`);
        }
      }
    });
  }
  next();
};

/**
 * All 5M1E routes require authentication.
 */
router.use(requireAuth);

/**
 * @route   GET /api/5m1e
 * @desc    Retrieve all 5M1E Records
 */
router.get(
  '/', 
  fiveM1EController.getAllApplications
);

/**
 * @route   POST /api/5m1e
 * @desc    Create a new 5M1E Record
 */
router.post(
  '/', 
  upload.any(),
  logUploads,
  handleUploadError,
  parseFormDataArrays,
  validate(CreateFiveM1ESchema), 
  fiveM1EController.createApplication
);

/**
 * @route   GET /api/5m1e/:id
 * @desc    Retrieve 5M1E Record Details
 */
router.get(
  '/:id', 
  fiveM1EController.getApplication
);

/**
 * @route   PUT /api/5m1e/:id
 * @desc    Update 5M1E Record
 */
router.put(
  '/:id', 
  upload.any(),
  logUploads,
  handleUploadError,
  parseFormDataArrays,
  validate(UpdateFiveM1ESchema), 
  fiveM1EController.updateApplication
);

/**
 * @route   DELETE /api/5m1e/:id
 * @desc    Delete 5M1E Record and all child data
 */
router.delete(
  '/:id',
  fiveM1EController.deleteApplication
);

/**
 * Workflow Action Subroutes
 */
router.post('/:id/submit', fiveM1EController.submitApplication);
router.post('/:id/approve', fiveM1EController.approveApplication);
router.post('/:id/reject', fiveM1EController.rejectApplication);
router.post('/:id/release', fiveM1EController.releaseApplication);

export default router;
