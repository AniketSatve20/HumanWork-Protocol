/**
 * Standardized API Response Helpers
 * ─────────────────────────────────────────────────────────────────────────────
 * Every response follows: { success, data?, error?, meta? }
 * HTTP status codes are set correctly (200, 201, 400, 401, 403, 404, 500).
 */

import { Response } from 'express';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: PaginationMeta | Record<string, unknown>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** 200 OK — standard success response */
export function sendSuccess<T>(res: Response, data: T, meta?: PaginationMeta | Record<string, unknown>): void {
  const payload: ApiResponse<T> = { success: true, data };
  if (meta) payload.meta = meta;
  res.status(200).json(payload);
}

/** 201 Created — resource was successfully created */
export function sendCreated<T>(res: Response, data: T): void {
  res.status(201).json({ success: true, data } as ApiResponse<T>);
}

/** 400 Bad Request — client-side validation error */
export function sendBadRequest(res: Response, error: string): void {
  res.status(400).json({ success: false, error } as ApiResponse);
}

/** 401 Unauthorized — missing or invalid credentials */
export function sendUnauthorized(res: Response, error = 'Authentication required'): void {
  res.status(401).json({ success: false, error } as ApiResponse);
}

/** 403 Forbidden — authenticated but insufficient permissions */
export function sendForbidden(res: Response, error = 'Permission denied'): void {
  res.status(403).json({ success: false, error } as ApiResponse);
}

/** 404 Not Found — resource doesn't exist */
export function sendNotFound(res: Response, error = 'Resource not found'): void {
  res.status(404).json({ success: false, error } as ApiResponse);
}

/** 409 Conflict — duplicate or conflicting resource */
export function sendConflict(res: Response, error: string): void {
  res.status(409).json({ success: false, error } as ApiResponse);
}

/** 500 Internal Server Error — unexpected failure */
export function sendServerError(res: Response, error = 'Internal server error'): void {
  res.status(500).json({ success: false, error } as ApiResponse);
}

/**
 * Build a PaginationMeta object from query params and total count.
 */
export function buildPagination(page: number, limit: number, total: number): PaginationMeta {
  const pages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
}

/**
 * Parse page/limit from Express query params with safe defaults.
 */
export function parsePaginationQuery(query: { page?: string; limit?: string }): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}
