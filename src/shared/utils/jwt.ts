import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/AppError.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-development-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; 

const REFRESH_SECRET = process.env.REFRESH_SECRET || 'super-secret-refresh-key';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  roleId?: string;
}

/**
 * Generates an Access Token (Short Lived)
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET as jwt.Secret, { expiresIn: JWT_EXPIRES_IN as any });
};

/**
 * Generates a Refresh Token (Long Lived)
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, REFRESH_SECRET as jwt.Secret, { expiresIn: REFRESH_EXPIRES_IN as any });
};

/**
 * Verifies an Access Token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired access token');
  }
};

/**
 * Verifies a Refresh Token
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};
