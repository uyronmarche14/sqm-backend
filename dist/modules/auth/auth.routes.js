import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { loginSchema } from './auth.schema.js';
const router = Router();
// Public Routes
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
// Protected Routes / Token Routes
router.post('/refresh', authController.refresh);
export default router;
