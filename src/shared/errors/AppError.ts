// ============================================================================
// Global Error Infrastructure
// ============================================================================

export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Capture stack trace, excluding constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Invalid request data') {
    super(message, 400);
  }
}

export class ValidationError extends AppError {
  public errors: Array<{ path: string; message: string }>;

  constructor(errors: Array<{ path: string; message: string }>, message = 'Validation failed') {
    super(message, 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'You are not authorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}
