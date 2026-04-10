import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors/AppError.js';
const DEFAULT_ACCESS_EXPIRES_IN = '15m';
const DEFAULT_REFRESH_EXPIRES_IN = '7d';
function getRequiredEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is required for authentication.`);
    }
    return value;
}
function getJwtSecret() {
    return getRequiredEnv('JWT_SECRET');
}
function getRefreshSecret() {
    return getRequiredEnv('JWT_REFRESH_SECRET');
}
function getAccessExpiresIn() {
    return process.env.JWT_EXPIRES_IN?.trim() || DEFAULT_ACCESS_EXPIRES_IN;
}
function getRefreshExpiresIn() {
    return process.env.REFRESH_EXPIRES_IN?.trim() || DEFAULT_REFRESH_EXPIRES_IN;
}
function parseDurationToMs(value) {
    const match = /^(\d+)(ms|s|m|h|d)$/i.exec(value.trim());
    if (!match) {
        throw new Error(`Invalid duration format "${value}". Use values like 15m, 8h, or 7d.`);
    }
    const amount = Number.parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const unitMultiplier = {
        ms: 1,
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };
    return amount * unitMultiplier[unit];
}
export function assertJwtConfig() {
    getJwtSecret();
    getRefreshSecret();
    getAccessExpiresIn();
    getRefreshExpiresIn();
    getRefreshTokenMaxAgeMs();
}
export function getRefreshTokenMaxAgeMs() {
    return parseDurationToMs(getRefreshExpiresIn());
}
/**
 * Generates an Access Token (Short Lived)
 */
export const generateAccessToken = (payload) => {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: getAccessExpiresIn() });
};
/**
 * Generates a Refresh Token (Long Lived)
 */
export const generateRefreshToken = (payload) => {
    return jwt.sign(payload, getRefreshSecret(), { expiresIn: getRefreshExpiresIn() });
};
/**
 * Verifies an Access Token
 */
export const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, getJwtSecret());
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
        return jwt.verify(token, getRefreshSecret());
    }
    catch (error) {
        throw new UnauthorizedError('Invalid or expired refresh token');
    }
};
