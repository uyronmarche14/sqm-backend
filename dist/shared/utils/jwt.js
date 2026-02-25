import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/AppError.js';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-development-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'super-secret-refresh-key';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';
/**
 * Generates an Access Token (Short Lived)
 */
export const generateAccessToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};
/**
 * Generates a Refresh Token (Long Lived)
 */
export const generateRefreshToken = (payload) => {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
};
/**
 * Verifies an Access Token
 */
export const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    }
    catch (error) {
        throw new UnauthorizedError('Invalid or expired access token');
    }
};
/**
 * Verifies a Refresh Token
 */
export const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, REFRESH_SECRET);
    }
    catch (error) {
        throw new UnauthorizedError('Invalid or expired refresh token');
    }
};
