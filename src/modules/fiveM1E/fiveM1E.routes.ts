import express from 'express';
import { fiveM1EController } from './fiveM1E.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { validate } from '../../shared/middleware/validate.js';
import { CreateFiveM1ESchema, UpdateFiveM1ESchema } from './fiveM1E.schema.js';

const router = express.Router();

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
