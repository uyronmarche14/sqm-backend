import express, { Application, Request, Response, NextFunction } from 'express';
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
import fiveM1ERoutes from './modules/fiveM1E/fiveM1E.routes.js';
import userRoutes from './modules/users/user.routes.js';
import masterDataRoutes from './modules/masterData/master-data.routes.js';

// Rate Limiting
import { globalLimiter } from './shared/middleware/rate-limiter.js';

dotenv.config();

const app: Application = express();

// ==========================================
// 1. Global Middleware (Security & Parsing)
// ==========================================
app.use(helmet());
app.use(globalLimiter); // Apply Rate Limiter globally
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:5173',
    'http://localhost:3000'
  ],
  credentials: true, // Allow cookies
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ==========================================
// 2. Health & DB Check
// ==========================================
app.get('/health', async (_req: Request, res: Response) => {
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
app.use('/api/5m1e', fiveM1ERoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/master', masterDataRoutes);

// ==========================================
// 4. Error Handling
// ==========================================

// Catch 404
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
});

// Global Error Handler (Must be last)
app.use(errorHandler);

export default app;
