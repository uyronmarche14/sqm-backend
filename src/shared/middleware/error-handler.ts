import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../errors/AppError.js';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error | AppError | ValidationError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('[ERROR]', err);

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({
      success: false,
      status: 'fail',
      message: 'Invalid input data',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details,
      },
      errors: details,
    });
  }

  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      error: {
        code: err.name || 'VALIDATION_ERROR',
        message: err.message,
        details: err.errors,
      },
      errors: err.errors,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      error: {
        code: err.name || 'APP_ERROR',
        message: err.message,
      },
    });
  }

  // Unhandled / Internal Server Error
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;
  return res.status(500).json({
    success: false,
    status: 'error',
    message,
    error: {
      code: err.name || 'INTERNAL_SERVER_ERROR',
      message,
    },
  });
};
