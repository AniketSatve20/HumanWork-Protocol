import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { connectDatabase, getConnectionState } from './database.js';
import { setupSocket } from './socket.js';
import { mongoSanitize } from './middleware/sanitize.middleware.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import jobsRoutes from './routes/jobs.routes.js';
import skillsRoutes from './routes/skills.routes.js';
import statsRoutes from './routes/stats.routes.js';
import messagesRoutes from './routes/messages.routes.js';
import kycRoutes from './routes/kyc.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import radarRoutes from './routes/radar.routes.js';

// Import workers
import { oracleWorker } from './workers/oracle.worker.js';
import { projectEventListener } from './workers/projectEvent.worker.js';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
setupSocket(httpServer);

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());

// Global rate limit: 1000 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  skip: (req) => req.method === 'OPTIONS',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// Stricter rate limit for auth endpoints: 10 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: (req) => req.method === 'OPTIONS',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many auth attempts, please try again later.' },
});

// Rate limit for write endpoints: 30 requests per 15 minutes
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip: (req) => req.method === 'OPTIONS',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// ── Standard Middleware ───────────────────────────────────────────────────────
const configuredCorsOrigins = new Set(config.corsOrigin);
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (configuredCorsOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    if (config.nodeEnv !== 'production' && localhostOriginPattern.test(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(globalLimiter);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// NoSQL injection prevention — strip $operators from all inputs
app.use(mongoSanitize);

// Health check — includes DB status
app.get('/health', (_req, res) => {
  const db = getConnectionState();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: db.status,
  });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', writeLimiter, usersRoutes);
app.use('/api/projects', writeLimiter, projectsRoutes);
app.use('/api/jobs', writeLimiter, jobsRoutes);
app.use('/api/skills', writeLimiter, skillsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/messages', writeLimiter, messagesRoutes);
app.use('/api/kyc', writeLimiter, kycRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/analytics', radarRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB (optional - will warn if not configured)
    try {
      await connectDatabase();
    } catch (dbError) {
      logger.warn('⚠️ MongoDB connection failed. Running without database.');
    }

    // Start HTTP + WebSocket server
    httpServer.listen(config.port, () => {
      logger.info(`🚀 Server running on http://localhost:${config.port}`);
      logger.info(`🔌 Socket.IO ready for real-time messaging`);
      logger.info(`📍 Environment: ${config.nodeEnv}`);
    });

    // Start background workers
    await oracleWorker.start();
    await projectEventListener.start();

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
