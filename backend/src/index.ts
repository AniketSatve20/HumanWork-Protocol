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

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  skip: (req) => req.method === 'OPTIONS',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: (req) => req.method === 'OPTIONS',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many auth attempts, please try again later.' },
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip: (req) => req.method === 'OPTIONS',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// ── Refined Dynamic CORS Configuration ───────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'https://worq-roan.vercel.app'
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) return callback(null, true);

    const lowerOrigin = origin.toLowerCase();
    const isAllowedOrigin = allowedOrigins.includes(lowerOrigin);
    
    // Check for any Vercel preview URL related to your specific account/project
    const isVercelPreview = lowerOrigin.endsWith('.vercel.app') && 
                            lowerOrigin.includes('aniketsatve-1473s-projects');

    if (isAllowedOrigin || isVercelPreview) {
      callback(null, true);
    } else {
      // Log the specific origin that was blocked for debugging
      logger.warn(`CORS attempt blocked for origin: ${origin}`);
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS to all routes
app.use(cors(corsOptions));
// Specifically handle pre-flight (OPTIONS) requests globally
app.options('*', cors(corsOptions));

// ── Standard Middleware ───────────────────────────────────────────────────────
app.use(globalLimiter);
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// NoSQL injection prevention
app.use(mongoSanitize);

// Health check
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
app.use('/api/radar', radarRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err.message && err.message.includes('CORS blocked')) {
    return res.status(403).json({ success: false, error: err.message });
  }
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    try {
      await connectDatabase();
    } catch (dbError) {
      logger.warn('⚠️ MongoDB connection failed. Running without database.');
    }

    httpServer.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`🔌 Socket.IO ready for real-time messaging`);
      logger.info(`📍 Environment: ${config.nodeEnv}`);
    });

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