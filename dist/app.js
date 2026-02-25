import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
// Middlewares
import { errorHandler } from './shared/middleware/error-handler.js';
import { NotFoundError } from './shared/errors/AppError.js';
// Database Initializer Check
import { testConnection } from './shared/infrastructure/db.js';
// Route Modules
import authRoutes from './modules/auth/auth.routes.js';
// Rate Limiting
import { globalLimiter } from './shared/middleware/rate-limiter.js';
dotenv.config();
const app = express();
// ==========================================
// 1. Global Middleware (Security & Parsing)
// ==========================================
app.use(helmet());
app.use(globalLimiter); // Apply Rate Limiter globally
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true, // Allow cookies
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
// ==========================================
// 2. Health & DB Check
// ==========================================
app.get('/health', async (_req, res) => {
    const dbConnected = await testConnection();
    res.status(dbConnected ? 200 : 500).json({
        status: dbConnected ? 'ok' : 'error',
        message: dbConnected ? 'System Operational' : 'Database Disconnected',
        timestamp: new Date().toISOString()
    });
});
// ==========================================
// 3. Routes (To be modularized)
// ==========================================
// app.use('/api/5m1e', fiveM1ERoutes);
app.use('/api/auth', authRoutes);
// ==========================================
// 4. Error Handling
// ==========================================
// Catch 404
app.use('*', (req, _res, next) => {
    next(new NotFoundError(`Route ${req.originalUrl} not found`));
});
// Global Error Handler (Must be last)
app.use(errorHandler);
export default app;
