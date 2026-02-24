/**
 * Validation Middleware
 * Request validation using Zod schemas
 * 
 * Validates: Requirements 5.6, 5.7
 */

import { ZodError } from 'zod';
import { AppError } from './error-handler.middleware.js';
import logger from '../utils/logger.js';

/**
 * Validate request middleware
 * Validates request body, query, and params against Zod schemas
 * 
 * @param {Object} options - Validation options with schemas for body, query, params
 * @param {import('zod').ZodSchema} [options.body] - Schema for request body
 * @param {import('zod').ZodSchema} [options.query] - Schema for request query
 * @param {import('zod').ZodSchema} [options.params] - Schema for request params
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.post('/schedules',
 *   validateRequest({ body: qmqaScheduleSchema }),
 *   controller.createSchedule
 * );
 */
export const validateRequest = (options) => {
  return async (req, res, next) => {
    try {
      // Validate body if schema provided
      if (options.body) {
        req.body = await options.body.parseAsync(req.body);
      }
      
      // Validate query if schema provided
      if (options.query) {
        req.query = await options.query.parseAsync(req.query);
      }
      
      // Validate params if schema provided
      if (options.params) {
        req.params = await options.params.parseAsync(req.params);
      }
      
      // Log successful validation
      logger.debug('Request validation passed', {
        correlationId: req.headers['x-correlation-id'],
        method: req.method,
        path: req.path,
        hasBody: !!options.body,
        hasQuery: !!options.query,
        hasParams: !!options.params
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Extract field-level validation errors
        const details = error.errors?.map(err => ({
          field: err.path.join('.'),
          message: err.message
        })) || [];
        
        // Log validation failure
        logger.warn('Request validation failed', {
          correlationId: req.headers['x-correlation-id'],
          userId: req.user?.id,
          method: req.method,
          path: req.path,
          validationErrors: details
        });
        
        // Create validation error with details
        const validationError = new AppError(
          'Validation failed',
          400,
          true
        );
        
        // Set error name to ValidationError
        validationError.name = 'ValidationError';
        
        // Attach details to error for response
        validationError.details = details;
        
        next(validationError);
      } else {
        // Forward unexpected errors
        next(error);
      }
    }
  };
};
