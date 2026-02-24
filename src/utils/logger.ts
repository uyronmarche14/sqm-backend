/**
 * Structured Logger Utility
 * 
 * Provides centralized logging with Winston for the QMQA module.
 * Supports multiple log levels, structured JSON format, and correlation IDs.
 */

import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Log metadata interface for structured logging
 */
export interface LogMeta {
  correlationId?: string;
  userId?: string;
  controlNo?: string;
  operation?: string;
  table?: string;
  recordId?: string;
  fromStatus?: string;
  toStatus?: string;
  duration?: number;
  error?: Error;
  statusCode?: number;
  method?: string;
  path?: string;
  [key: string]: any;
}

/**
 * Determine log level based on environment
 */
const getLogLevel = (): string => {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
};

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
          })
        )
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development'
        ? winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        : winston.format.json()
    }),
  ],
  // Don't exit on error
  exitOnError: false,
});

// Add file transports in non-test environments
if (process.env.NODE_ENV !== 'test') {
  const logsDir = join(__dirname, '../../logs');
  
  logger.add(
    new winston.transports.File({
      filename: join(logsDir, 'error.log'),
      level: 'error',
      format: winston.format.json(),
    })
  );
  
  logger.add(
    new winston.transports.File({
      filename: join(logsDir, 'combined.log'),
      format: winston.format.json(),
    })
  );
}

/**
 * Logger interface with typed methods
 */
export interface Logger {
  error(message: string, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;
  http(message: string, meta?: LogMeta): void;
}

/**
 * Typed logger wrapper
 */
const typedLogger: Logger = {
  error: (message: string, meta?: LogMeta) => logger.error(message, meta),
  warn: (message: string, meta?: LogMeta) => logger.warn(message, meta),
  info: (message: string, meta?: LogMeta) => logger.info(message, meta),
  debug: (message: string, meta?: LogMeta) => logger.debug(message, meta),
  http: (message: string, meta?: LogMeta) => logger.http(message, meta),
};

export default typedLogger;
