/**
 * NoSQL Injection Prevention Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Recursively strips MongoDB operator keys ($gt, $ne, $regex, etc.) from
 * req.body, req.query, and req.params BEFORE they reach any route handler.
 * This is the first line of defense against query injection attacks.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

// MongoDB operators that should never appear in user input
const MONGO_OPERATORS = new Set([
  '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin',
  '$and', '$or', '$not', '$nor',
  '$exists', '$type', '$regex', '$options',
  '$where', '$expr', '$jsonSchema',
  '$mod', '$text', '$search',
  '$all', '$elemMatch', '$size',
  '$slice', '$comment',
  '$inc', '$set', '$unset', '$push', '$pull', '$pop',
  '$addToSet', '$rename', '$bit',
  '$currentDate', '$min', '$max', '$mul',
]);

/**
 * Recursively sanitize an object, stripping any keys that are MongoDB operators.
 * Returns a sanitized shallow copy — does NOT mutate the original.
 */
function sanitizeValue(value: unknown, depth = 0): unknown {
  // Prevent stack overflow on deeply nested payloads
  if (depth > 10) return undefined;

  if (value === null || value === undefined) return value;

  // Primitives: pass-through
  if (typeof value !== 'object') return value;

  // Arrays: sanitize each element
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  // Objects: strip operator keys
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (MONGO_OPERATORS.has(key)) {
      logger.warn(`🛡️ NoSQL injection blocked: stripped operator "${key}" from request`);
      continue; // Drop this key entirely
    }
    clean[key] = sanitizeValue(val, depth + 1);
  }
  return clean;
}

/**
 * Express middleware — sanitize body, query, and params.
 * Attach BEFORE any route handlers.
 */
export function mongoSanitize(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body) as Record<string, unknown>;
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query) as Record<string, string>;
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params) as Record<string, string>;
  }
  next();
}
