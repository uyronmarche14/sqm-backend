import { Router } from 'express';
import { userController } from './user.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { requirePermission } from '../../shared/middleware/requirePermission.js';
const router = Router();
// All user routes require authentication
router.use(requireAuth);
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.post('/', requirePermission('MAINTENANCE', 'add'), userController.createUser);
router.put('/:id', requirePermission('MAINTENANCE', 'edit'), userController.updateUser);
router.delete('/:id', requirePermission('MAINTENANCE', 'delete'), userController.deleteUser);
router.post('/:id/change-password', requirePermission('MAINTENANCE', 'edit'), userController.changePassword);
export default router;
