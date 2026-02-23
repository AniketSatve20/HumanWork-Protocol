import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitRecord>();

/**
 * Simple in-memory rate limiter middleware.
 * @param windowMs  Time window in milliseconds (default: 60_000 = 1 min)
 * @param max       Maximum requests per window (default: 60)
 */
export function rateLimit(windowMs = 60_000, max = 60) {
  // Clean up expired records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt <= now) store.delete(key);
    }
  }, 5 * 60_000);

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const record = store.get(key);

    if (!record || record.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (record.count >= max) {
      res.setHeader('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
      res.status(429).json({ success: false, error: 'Too many requests, please try again later.' });
      return;
    }

    record.count++;
    next();
  };
}

export default rateLimit;
