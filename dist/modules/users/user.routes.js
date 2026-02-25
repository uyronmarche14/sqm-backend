import { Router } from 'express';
import { userController } from './user.controller.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
const router = Router();
// All user routes require authentication
router.use(requireAuth);
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);
router.post('/:id/change-password', userController.changePassword);
export default router;
