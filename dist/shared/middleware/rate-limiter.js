import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';
// Ensure standard Redis url is present
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
// Export Redis client so other modules can use it if needed
export const redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false
});
redisClient.on('error', (err) => {
    // If Redis fails, log it but let the app run (Rate limiting will fail open/custom behavior depending on setup)
    console.warn('⚠️ Redis Rate Limiter Error (Cache Miss):', err.message);
});
// Create the global rate limiter
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Redis store configuration
    store: new RedisStore({
        // @ts-expect-error - Known typing mismatch with express-rate-limit 6+ and ioredis, runtime works perfectly
        sendCommand: (...args) => redisClient.call(...args),
    }),
    message: {
        status: 'error',
        message: 'Too many requests from this IP, please try again after 15 minutes',
    },
});
export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 login requests per `window`
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        // @ts-expect-error
        sendCommand: (...args) => redisClient.call(...args),
        prefix: 'rl:auth:', // Prefix for authentication limiting
    }),
    message: {
        status: 'error',
        message: 'Too many login attempts, please try again after an hour',
    }
});
