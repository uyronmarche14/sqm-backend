import express, { Application, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { requestLogger } from './shared/middleware/request-logger.js';
import { assertJwtConfig } from './shared/utils/jwt.js';

dotenv.config({ quiet: process.env.NODE_ENV === 'test' });
assertJwtConfig();

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
import supplierInformationRoutes from './modules/supplierInformation/supplier-information.routes.js';
import supplierQualityRoutes from './modules/supplierQuality/supplier-quality.routes.js';
import spcTrendRoutes from './modules/spcTrend/spc-trend.routes.js';
import trainingRoutes from './modules/training/training.routes.js';
import ssiRoutes from './modules/ssi/ssi.routes.js';

// Rate Limiting
import { globalLimiter } from './shared/middleware/rate-limiter.js';

const app: Application = express();

function parseAllowedOrigins(): string[] {
  const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  const fallbackOrigins = [
    process.env.FRONTEND_BASE_URL,
    process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:5000',
  ]
    .filter((origin): origin is string => Boolean(origin?.trim()))
    .map((origin) => origin.replace(/\/+$/, ''));

  return Array.from(new Set([
    ...configuredOrigins,
    ...fallbackOrigins,
  ]));
}

const allowedOrigins = parseAllowedOrigins();
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = origin.replace(/\/+$/, '');

    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ==========================================
// 1. Global Middleware (Security & Parsing)
// ==========================================
app.use(helmet());
app.use(globalLimiter); // Apply Rate Limiter globally
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(requestLogger);

// ==========================================
// 2. Health & DB Check
// ==========================================
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'SQM Backend API is running' });
});

app.get('/health', async (_req: Request, res: Response) => {
  const dbConnected = await testConnection();
  res.status(dbConnected ? 200 : 500).json({
    status: dbConnected ? 'ok' : 'error',
    message: dbConnected ? 'System Operational' : 'Database Disconnected',
    timestamp: new Date().toISOString()
  });
});

import mnrRoutes from './modules/mnr/mnr.routes.js';
import sqprRoutes from './modules/sqpr/sqpr.routes.js';
import sqmpRoutes from './modules/sqmp/sqmp.routes.js';
import npiRoutes from './modules/npi/npi.routes.js';
import ogiRoutes from './modules/ogi/ogi.routes.js';
import qmqaRoutes from './modules/qmqa/qmqa.routes.js';

// ==========================================
// 3. Routes (To be modularized)
// ==========================================
app.use('/api/5m1e', fiveM1ERoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/master', masterDataRoutes);
app.use('/api/supplier-information', supplierInformationRoutes);
app.use('/api/supplier-quality', supplierQualityRoutes);
app.use('/api/spc-trend', spcTrendRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/ssi', ssiRoutes);
app.use('/api/mnr', mnrRoutes);
app.use('/api/sqpr', sqprRoutes);
app.use('/api/sqmp', sqmpRoutes);
app.use('/api/npi', npiRoutes);
app.use('/api/ogi', ogiRoutes);
app.use('/api/qmqa', qmqaRoutes);

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
