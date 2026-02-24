/**
 * Correlation ID Middleware
 * 
 * Generates or extracts correlation ID from request headers and attaches it to the request object.
 * This enables request tracing across the application and in logs.
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/**
 * Correlation ID header name
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Middleware to generate/extract correlation ID
 * 
 * - Checks if correlation ID exists in request headers
 * - If not, generates a new UUID v4
 * - Attaches correlation ID to request object
 * - Sets correlation ID in response headers
 * - Logs the correlation ID for the request
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const correlationIdMiddleware = (req, res, next) => {
  // Extract correlation ID from headers or generate new one
  const correlationId = req.headers[CORRELATION_ID_HEADER] || uuidv4();
  
  // Attach to request object for use in controllers/services
  req.correlationId = correlationId;
  
  // Set in response headers for client tracking
  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  
  // Log request with correlation ID
  logger.info('Incoming request', {
    correlationId,
    method: req.method,
    path: req.path,
    query: req.query,
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });
  
  next();
};

/**
 * Helper function to get correlation ID from request
 * 
 * @param {Request} req - Express request object
 * @returns {string} Correlation ID
 */
export const getCorrelationId = (req) => {
  return req.correlationId || 'unknown';
};
