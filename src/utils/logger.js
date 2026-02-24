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
 * Determine log level based on environment
 */
const getLogLevel = () => {
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
 * Typed logger wrapper
 */
const typedLogger = {
  error: (message, meta) => logger.error(message, meta),
  warn: (message, meta) => logger.warn(message, meta),
  info: (message, meta) => logger.info(message, meta),
  debug: (message, meta) => logger.debug(message, meta),
  http: (message, meta) => logger.http(message, meta),
};

export default typedLogger;
