import { Router } from 'express';
import { userController } from './user.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { requireAnyPermission } from '../../shared/middleware/requireAnyPermission.js';
const router = Router();
const USER_FORM_IDS = ['USERS-06-01', 'USERS-06-02', 'USERS-06-03'];
// All user routes require authentication
router.use(requireAuth);
// Workflow-safe helper endpoints
router.get('/lookup', userController.getLookupUsers);
router.post('/test-email', requireAnyPermission(USER_FORM_IDS, 'add'), userController.testEmail);
router.post('/:id/assignment-coverage-preview', requireAnyPermission(USER_FORM_IDS, 'viewlist'), userController.getAssignmentCoverage);
router.get('/', requireAnyPermission(USER_FORM_IDS, 'viewlist'), userController.getAllUsers);
router.get('/:id', requireAnyPermission(USER_FORM_IDS, 'viewlist'), userController.getUserById);
router.post('/:id/assignment-coverage', requireAnyPermission(USER_FORM_IDS, 'viewlist'), userController.getAssignmentCoverage);
router.post('/', requireAnyPermission(USER_FORM_IDS, 'add'), userController.createUser);
router.put('/:id', requireAnyPermission(USER_FORM_IDS, 'edit'), userController.updateUser);
router.delete('/:id', requireAnyPermission(USER_FORM_IDS, 'delete'), userController.deleteUser);
router.post('/:id/change-password', requireAnyPermission(USER_FORM_IDS, 'edit'), userController.changePassword);
export default router;
