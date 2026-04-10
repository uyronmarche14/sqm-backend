import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate } from '../../shared/middleware/validate.js';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, resetPasswordSchema } from './auth.schema.js';
import { requireAuth } from '../../shared/middleware/requireAuth.js';
import { authLimiter, authRefreshLimiter } from '../../shared/middleware/rate-limiter.js';

const router = Router();

// Public Routes
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/logout', authController.logout);

// Protected Routes / Token Routes
router.post('/refresh', authRefreshLimiter, authController.refresh);
router.get('/me', requireAuth, authController.me);
router.post('/change-password', requireAuth, validate(changePasswordSchema), authController.changePassword);

export default router;
