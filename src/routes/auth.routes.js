import express from 'express';
import { login, register, refresh, logout, me, changePassword } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/change-password', changePassword);
router.get('/me', me);

export default router;
