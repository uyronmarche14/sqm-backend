import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../errors/AppError.js';

// Extend Express Request object to include our decoded user payload
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        roleId?: string;
      };
    }
  }
}

/**
 * Middleware: Requires a valid Access Token to proceed
 * Checks both Authorization header (Bearer) and Cookies (for browser clients)
 */
export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    let token;
    
    // 1. Check Authorization Header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } 
    // 2. Fallback to Cookie (if frontend uses HttpOnly cookies)
    else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(new UnauthorizedError('You are not logged in. Please log in to get access.'));
    }

    // 3. Verify Token
    const decoded = verifyAccessToken(token);

    // 4. Attach user payload to request
    req.user = decoded;
    next();
  } catch (error) {
    next(new UnauthorizedError('Your session has expired or is invalid. Please log in again.'));
  }
};
