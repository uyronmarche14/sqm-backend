import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../errors/AppError.js';
/**
 * Middleware: Requires a valid Access Token to proceed
 * Checks Authorization header (Bearer) only.
 */
export const requireAuth = (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
        if (!token) {
            return next(new UnauthorizedError('You are not logged in. Please log in to get access.'));
        }
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        next(new UnauthorizedError('Your session has expired or is invalid. Please log in again.'));
    }
};
