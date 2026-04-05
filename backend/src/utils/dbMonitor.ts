/**
 * Database Monitoring Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides runtime metrics about MongoDB connection, collections, and indexes.
 * Used by the /health and /api/stats/db endpoints.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';
import { logger } from './logger.js';

export interface DbMetrics {
  connection: {
    status: string;
    readyState: number;
    host: string;
    name: string;
  };
  collections: { name: string; count: number; indexes: number }[];
  poolSize: {
    min: number;
    max: number;
  };
  uptime: number; // seconds since connection
}

let connectionStartTime: number | null = null;

/** Call once on connection to start tracking uptime */
export function markConnectionStart(): void {
  connectionStartTime = Date.now();
}

/**
 * Gather comprehensive DB metrics for monitoring.
 */
export async function getDbMetrics(): Promise<DbMetrics> {
  const conn = mongoose.connection;
  const states: Record<number, string> = {
    0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting',
  };

  const collections: DbMetrics['collections'] = [];

  if (conn.readyState === 1 && conn.db) {
    try {
      const colls = await conn.db.listCollections().toArray();
      for (const col of colls) {
        try {
          const count = await conn.db.collection(col.name).countDocuments();
          const idxs = await conn.db.collection(col.name).listIndexes().toArray();
          collections.push({ name: col.name, count, indexes: idxs.length });
        } catch {
          collections.push({ name: col.name, count: -1, indexes: -1 });
        }
      }
      collections.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err: any) {
      logger.warn('Failed to collect DB metrics:', err.message);
    }
  }

  const opts = (conn as any).config || {};

  return {
    connection: {
      status: states[conn.readyState] || 'unknown',
      readyState: conn.readyState,
      host: conn.host || 'unknown',
      name: conn.name || 'unknown',
    },
    collections,
    poolSize: {
      min: opts.minPoolSize || 2,
      max: opts.maxPoolSize || 10,
    },
    uptime: connectionStartTime ? Math.floor((Date.now() - connectionStartTime) / 1000) : 0,
  };
}
