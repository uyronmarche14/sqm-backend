/**
 * Error Handler Middleware
 * Centralized error handling for QMQA module
 * 
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import logger from '../utils/logger.js';

/**
 * Custom error class for operational errors
 * 
 * @property statusCode - HTTP status code for the error
 * @property message - Error message
 * @property isOperational - Flag to distinguish operational errors from programmer errors
 */
export class AppError extends Error {
  constructor(
    message,
    statusCode = 500,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 * Catches all errors and returns standardized error responses
 * 
 * @param {Error | AppError} err - Error object
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next function
 */
export const errorHandler = (err, req, res, next) => {
  // Extract error properties
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational ?? false;
  
  // Log error with structured context
  logger.error('Request error', {
    correlationId: req.headers['x-correlation-id'],
    userId: req.user?.id,
    method: req.method,
    path: req.path,
    statusCode,
    errorName: err.name,
    errorMessage: err.message,
    isOperational,
    stack: err.stack
  });
  
  // Determine error message based on environment and error type
  let errorMessage = err.message;
  if (process.env.NODE_ENV === 'production' && !isOperational) {
    errorMessage = 'An unexpected error occurred';
  }
  
  // Build error response
  const response = {
    success: false,
    error: {
      name: err.name,
      message: errorMessage
    }
  };
  
  // Include validation details if present
  if (err.details) {
    response.error.details = err.details;
  }
  
  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }
  
  // Send error response
  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors and forward to error middleware
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express request handler
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
