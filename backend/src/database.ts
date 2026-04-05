import mongoose from 'mongoose';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { markConnectionStart } from './utils/dbMonitor.js';

/* ═══════════════════════════════════════════════════════════════════════════
   MongoDB Connection — Production-Grade
   ═══════════════════════════════════════════════════════════════════════════
   • strictQuery   — prevents accidental field leaks in queries
   • Connection pool — scaled for high-traffic (min 5 / max 50)
   • Auto-reconnect — on 'disconnected' event with exponential backoff
   • Graceful shutdown — SIGINT/SIGTERM drain connections before exit
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Global Mongoose settings ──────────────────────────────────────────────────
mongoose.set('strictQuery', true); // Only allow fields defined in schema in queries

// Track reconnection attempts
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY_MS = 2000; // 2s base, exponential backoff

/**
 * Connect to MongoDB with production-ready pool configuration and reconnection logic.
 */
export async function connectDatabase(): Promise<typeof mongoose> {
  const uri = config.mongodb.uri;

  if (!uri) {
    logger.error('FATAL: MONGODB_URI is not configured.');
    if (config.nodeEnv === 'production') process.exit(1);
    throw new Error('MONGODB_URI not configured');
  }

  try {
    const connection = await mongoose.connect(uri, {
      // ── Pool ────────────────────────────────────────────────────────────
      minPoolSize: config.nodeEnv === 'production' ? 5 : 2,
      maxPoolSize: config.nodeEnv === 'production' ? 50 : 10,

      // ── Timeouts ────────────────────────────────────────────────────────
      serverSelectionTimeoutMS: 10000,  // 10s to find a server
      socketTimeoutMS: 45000,           // 45s socket idle timeout
      connectTimeoutMS: 15000,          // 15s initial connection timeout
      heartbeatFrequencyMS: 10000,      // 10s health check interval

      // ── Write/Read ──────────────────────────────────────────────────────
      retryWrites: true,
      retryReads: true,
      w: 'majority',

      // ── Misc ────────────────────────────────────────────────────────────
      autoIndex: config.nodeEnv !== 'production', // Build indexes in dev, not prod
      maxIdleTimeMS: 30000,             // Close idle sockets after 30s
    });

    reconnectAttempts = 0; // Reset on successful connect
    markConnectionStart();
    const { host, port, name } = connection.connection;
    logger.info(`✅ MongoDB connected: ${host}:${port}/${name}`);
    logger.info(`   Pool: min=${config.nodeEnv === 'production' ? 5 : 2} max=${config.nodeEnv === 'production' ? 50 : 10} | strictQuery=true`);

    // ── Event Listeners ──────────────────────────────────────────────────
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err.message || err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected — attempting auto-reconnect...');
      attemptReconnect();
    });

    mongoose.connection.on('reconnected', () => {
      reconnectAttempts = 0;
      logger.info('✅ MongoDB reconnected successfully');
    });

    mongoose.connection.on('close', () => {
      logger.info('MongoDB connection closed');
    });

    // ── Slow Query Logging (development/staging) ─────────────────────────
    if (config.nodeEnv !== 'production') {
      mongoose.set('debug', (collectionName: string, methodName: string, ...methodArgs: any[]) => {
        const start = Date.now();
        // Log all queries with timing
        const query = JSON.stringify(methodArgs[0] || {});
        const truncated = query.length > 200 ? query.substring(0, 200) + '...' : query;
        logger.info(`📊 ${collectionName}.${methodName}(${truncated})`);
      });
    }

    // ── Connection Pool Monitoring ───────────────────────────────────────
    mongoose.connection.on('open', () => {
      logger.info('🔗 MongoDB connection pool established');
    });

    // ── Graceful Shutdown ────────────────────────────────────────────────
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received — closing MongoDB connection pool...`);
      await disconnectDatabase();
      process.exit(0);
    };

    process.once('SIGINT', () => gracefulShutdown('SIGINT'));
    process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

    return connection;
  } catch (error: any) {
    logger.error(`Failed to connect to MongoDB: ${error.message || error}`);
    if (config.nodeEnv === 'production') {
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Attempt to reconnect with exponential backoff.
 */
function attemptReconnect(): void {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    logger.error(`MongoDB reconnection failed after ${MAX_RECONNECT_ATTEMPTS} attempts. Giving up.`);
    if (config.nodeEnv === 'production') process.exit(1);
    return;
  }

  reconnectAttempts++;
  const delay = Math.min(BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts - 1), 60000); // max 60s

  logger.info(`Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms...`);

  setTimeout(async () => {
    try {
      await mongoose.connect(config.mongodb.uri);
      reconnectAttempts = 0;
      logger.info('✅ MongoDB reconnected on retry');
    } catch (err: any) {
      logger.error(`Reconnect attempt ${reconnectAttempts} failed: ${err.message || err}`);
      attemptReconnect(); // Recurse with incremented counter
    }
  }, delay);
}

/**
 * Disconnect gracefully — drains the pool and closes all connections.
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected gracefully');
  } catch (error: any) {
    logger.error('Error disconnecting from MongoDB:', error.message || error);
  }
}

/**
 * Get the current connection state for health checks.
 */
export function getConnectionState(): { status: string; readyState: number } {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const readyState = mongoose.connection.readyState;
  return { status: states[readyState] || 'unknown', readyState };
}
