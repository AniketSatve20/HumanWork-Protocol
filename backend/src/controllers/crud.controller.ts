/**
 * Generic CRUD Controller Factory
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates reusable, type-safe CRUD handlers for any Mongoose model.
 * Features:
 *   • Standardized JSON responses with proper HTTP status codes
 *   • Pagination with hasNext/hasPrev meta
 *   • Populate support for relational joins
 *   • Field selection (projection)
 *   • Search by regex across configurable fields
 *   • Sort by any field
 *   • All handlers wrapped in try/catch
 *
 * Usage:
 *   const jobController = createCrudController(JobListing, {
 *     searchFields: ['title', 'description', 'category'],
 *     defaultSort: { createdAt: -1 },
 *     populateFields: [{ path: 'client', select: 'displayName walletAddress' }],
 *   });
 *   router.get('/', jobController.getAll);
 *   router.get('/:id', jobController.getById);
 *   router.post('/', jobController.create);
 *   router.put('/:id', jobController.update);
 *   router.delete('/:id', jobController.remove);
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Request, Response } from 'express';
import { Model, Document, FilterQuery, PopulateOptions, SortOrder } from 'mongoose';
import { logger } from '../utils/logger.js';
import { escapeRegex, ensureString } from '../utils/sanitize.js';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendServerError,
  sendConflict,
  buildPagination,
  parsePaginationQuery,
} from '../utils/apiResponse.js';

// ── Configuration ─────────────────────────────────────────────────────────────

export interface CrudControllerOptions {
  /** Fields to search across when ?search= is provided */
  searchFields?: string[];
  /** Default sort order (e.g. { createdAt: -1 }) */
  defaultSort?: Record<string, SortOrder>;
  /** Mongoose populate definitions for relational joins */
  populateFields?: (string | PopulateOptions)[];
  /** Fields to select by default (projection). '-field' excludes. */
  defaultSelect?: string;
  /** The unique identifier field name (default: '_id') */
  idField?: string;
  /** Human-readable resource name for error messages (e.g. 'Job listing') */
  resourceName?: string;
}

// ── Controller Factory ───────────────────────────────────────────────────────

export function createCrudController<T extends Document>(
  model: Model<T>,
  options: CrudControllerOptions = {},
) {
  const {
    searchFields = [],
    defaultSort = { createdAt: -1 },
    populateFields = [],
    defaultSelect,
    idField = '_id',
    resourceName = model.modelName,
  } = options;

  // ── Helper: apply populate to a query ───────────────────────────────────
  function applyPopulate(query: any) {
    for (const pop of populateFields) {
      query = query.populate(pop);
    }
    return query;
  }

  // ── Helper: build filter from query params ──────────────────────────────
  function buildFilter(queryParams: Record<string, unknown>): FilterQuery<T> {
    const filter: Record<string, unknown> = {};

    // Direct field filters (e.g. ?status=open&category=dev)
    for (const [key, val] of Object.entries(queryParams)) {
      if (['page', 'limit', 'sort', 'order', 'search', 'select', 'populate'].includes(key)) continue;
      const strVal = ensureString(val as any);
      if (strVal !== undefined && strVal !== '') {
        filter[key] = strVal;
      }
    }

    // Full-text search across configured fields
    const searchStr = ensureString(queryParams.search as any);
    if (searchStr && searchFields.length > 0) {
      const escaped = escapeRegex(searchStr);
      filter.$or = searchFields.map((field) => ({
        [field]: { $regex: escaped, $options: 'i' },
      }));
    }

    return filter as FilterQuery<T>;
  }

  // ── Helper: parse sort from query ───────────────────────────────────────
  function parseSort(queryParams: Record<string, unknown>): Record<string, SortOrder> {
    const sortField = ensureString(queryParams.sort as any);
    if (!sortField) return defaultSort;
    const order: SortOrder = queryParams.order === 'asc' ? 1 : -1;
    return { [sortField]: order };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CRUD Handlers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET / — List all documents with pagination, search, filter, sort.
   */
  async function getAll(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, skip } = parsePaginationQuery(req.query as any);
      const filter = buildFilter(req.query as Record<string, unknown>);
      const sort = parseSort(req.query as Record<string, unknown>);

      let query = model.find(filter);
      if (defaultSelect) query = query.select(defaultSelect);
      query = applyPopulate(query);
      query = query.sort(sort).skip(skip).limit(limit);

      const [docs, total] = await Promise.all([
        query.lean(),
        model.countDocuments(filter),
      ]);

      sendSuccess(res, docs, buildPagination(page, limit, total));
    } catch (error: any) {
      logger.error(`${resourceName} getAll failed:`, error.message || error);
      sendServerError(res, `Failed to fetch ${resourceName.toLowerCase()} list`);
    }
  }

  /**
   * GET /:id — Get a single document by ID (supports custom idField).
   */
  async function getById(req: Request, res: Response): Promise<void> {
    try {
      const idValue = req.params.id;
      const findQuery: Record<string, unknown> = {};

      // If idField is a Number type in the schema, parse it
      if (idField !== '_id') {
        const parsed = parseInt(idValue, 10);
        findQuery[idField] = isNaN(parsed) ? idValue : parsed;
      } else {
        findQuery[idField] = idValue;
      }

      let query = model.findOne(findQuery as FilterQuery<T>);
      if (defaultSelect) query = query.select(defaultSelect);
      query = applyPopulate(query);

      const doc = await query.lean();

      if (!doc) {
        sendNotFound(res, `${resourceName} not found`);
        return;
      }

      sendSuccess(res, doc);
    } catch (error: any) {
      logger.error(`${resourceName} getById failed:`, error.message || error);
      sendServerError(res, `Failed to fetch ${resourceName.toLowerCase()}`);
    }
  }

  /**
   * POST / — Create a new document.
   */
  async function create(req: Request, res: Response): Promise<void> {
    try {
      const doc = new model(req.body);
      await doc.save();
      sendCreated(res, doc.toObject());
    } catch (error: any) {
      // Duplicate key error → 409 Conflict
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        sendConflict(res, `${resourceName} with this ${field} already exists`);
        return;
      }
      // Validation error → 400
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors || {}).map((e: any) => e.message);
        sendBadRequest(res, messages.join('. ') || 'Validation failed');
        return;
      }
      logger.error(`${resourceName} create failed:`, error.message || error);
      sendServerError(res, `Failed to create ${resourceName.toLowerCase()}`);
    }
  }

  /**
   * PUT /:id — Update a document by ID.
   */
  async function update(req: Request, res: Response): Promise<void> {
    try {
      const idValue = req.params.id;
      const findQuery: Record<string, unknown> = {};

      if (idField !== '_id') {
        const parsed = parseInt(idValue, 10);
        findQuery[idField] = isNaN(parsed) ? idValue : parsed;
      } else {
        findQuery[idField] = idValue;
      }

      const doc = await model.findOneAndUpdate(
        findQuery as FilterQuery<T>,
        { $set: req.body },
        { new: true, runValidators: true }
      );

      if (!doc) {
        sendNotFound(res, `${resourceName} not found`);
        return;
      }

      sendSuccess(res, doc.toObject());
    } catch (error: any) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        sendConflict(res, `${resourceName} with this ${field} already exists`);
        return;
      }
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors || {}).map((e: any) => e.message);
        sendBadRequest(res, messages.join('. ') || 'Validation failed');
        return;
      }
      logger.error(`${resourceName} update failed:`, error.message || error);
      sendServerError(res, `Failed to update ${resourceName.toLowerCase()}`);
    }
  }

  /**
   * DELETE /:id — Soft or hard delete a document by ID.
   */
  async function remove(req: Request, res: Response): Promise<void> {
    try {
      const idValue = req.params.id;
      const findQuery: Record<string, unknown> = {};

      if (idField !== '_id') {
        const parsed = parseInt(idValue, 10);
        findQuery[idField] = isNaN(parsed) ? idValue : parsed;
      } else {
        findQuery[idField] = idValue;
      }

      const doc = await model.findOneAndDelete(findQuery as FilterQuery<T>);

      if (!doc) {
        sendNotFound(res, `${resourceName} not found`);
        return;
      }

      sendSuccess(res, { deleted: true, id: idValue });
    } catch (error: any) {
      logger.error(`${resourceName} delete failed:`, error.message || error);
      sendServerError(res, `Failed to delete ${resourceName.toLowerCase()}`);
    }
  }

  /**
   * GET /count — Count documents matching a filter.
   */
  async function count(req: Request, res: Response): Promise<void> {
    try {
      const filter = buildFilter(req.query as Record<string, unknown>);
      const total = await model.countDocuments(filter);
      sendSuccess(res, { count: total });
    } catch (error: any) {
      logger.error(`${resourceName} count failed:`, error.message || error);
      sendServerError(res, `Failed to count ${resourceName.toLowerCase()}`);
    }
  }

  return {
    getAll,
    getById,
    create,
    update,
    remove,
    count,
    // Expose helpers for custom route handlers
    buildFilter,
    parseSort,
    applyPopulate,
  };
}
