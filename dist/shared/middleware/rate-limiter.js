import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
// Handle ESM import structures for ioredis
const RedisConstructor = Redis.default || Redis;
// Use Redis only if explicitly provided in environment, otherwise default to MemoryStore
const redisUrl = process.env.REDIS_URL;
// Export Redis client so other modules can use it if needed
export const redisClient = redisUrl ? new RedisConstructor(redisUrl, {
    maxRetriesPerRequest: null, // Allow fallback or silent failure without hard crash
    enableOfflineQueue: false, // Prevents hanging requests when Redis is down
    retryStrategy(times) {
        // Reconnect after 3 seconds if disconnected, avoiding brute-force crashes
        return Math.min(times * 50, 3000);
    },
    enableReadyCheck: false
}) : null;
if (redisClient) {
    redisClient.on('error', (err) => {
        // If Redis fails, log it but let the app run 
        console.warn('⚠️ Redis Rate Limiter Error (Cache Miss):', err.message);
    });
}
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    passOnStoreError: true, // If Redis is down, allow the request
    // Conditional Redis store configuration
    ...(redisClient && {
        store: new RedisStore({
            sendCommand: async (...args) => {
                if (redisClient.status !== 'ready')
                    throw new Error('Redis not ready');
                return redisClient.call(...args);
            },
        })
    }),
    message: 'Too many requests from this IP, please try again after 15 minutes',
});
export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    passOnStoreError: true, // If Redis is down, allow the request
    ...(redisClient && {
        store: new RedisStore({
            sendCommand: async (...args) => {
                if (redisClient.status !== 'ready')
                    throw new Error('Redis not ready');
                return redisClient.call(...args);
            },
            prefix: 'rl:auth:',
        })
    }),
    message: 'Too many login attempts, please try again after an hour',
});
