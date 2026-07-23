import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../../queues/queue.init';

/**
 * Rate Limiter Middleware Factory
 * All limiters use a Redis-backed store (shared across horizontally-scaled API instances).
 *
 * Per TRD §7.4:
 * - Auth routes (/auth/login, /auth/forgot-password): 5 req / 15 min / account+IP
 * - General authenticated API: 300 req / min / user
 * - AI-heavy routes (/copilot/*, /documents/upload-url): 20 req / min / user
 */

/** Auth routes — strict limiting to prevent brute force */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // In development allow many more requests so devs can test without hitting 429
  max: process.env.NODE_ENV === 'production' ? 5 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many attempts. Please try again in 15 minutes.',
    },
  },
  store: new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    sendCommand: (...args: string[]) => (redisClient as any).call(...args),
  }),
  keyGenerator: (req) => {
    // Key on account email (from body) + IP for auth routes
    const email = (req.body as { email?: string })?.email ?? '';
    return `rl:auth:${email}:${req.ip ?? ''}`;
  },
});

/** General authenticated API */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down.',
    },
  },
  store: new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    sendCommand: (...args: string[]) => (redisClient as any).call(...args),
  }),
});

/** AI-heavy routes (copilot, document upload) */
export const aiHeavyRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'AI request limit reached. Please wait before making more requests.',
    },
  },
  store: new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    sendCommand: (...args: string[]) => (redisClient as any).call(...args),
  }),
});
