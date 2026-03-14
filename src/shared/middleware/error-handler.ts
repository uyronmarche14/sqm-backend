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
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid input data',
      errors: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errors: err.errors,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Unhandled / Internal Server Error
  return res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
};
