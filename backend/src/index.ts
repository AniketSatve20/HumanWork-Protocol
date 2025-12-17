import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { connectDatabase } from './database.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import skillsRoutes from './routes/skills.routes.js';
import statsRoutes from './routes/stats.routes.js';
import messagesRoutes from './routes/messages.routes.js';

// Import workers
import { oracleWorker } from './workers/oracle.worker.js';
import { projectEventListener } from './workers/projectEvent.worker.js';

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/skills', skillsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/messages', messagesRoutes);

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

    // Start HTTP server
    app.listen(config.port, () => {
      logger.info(`🚀 Server running on http://localhost:${config.port}`);
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

startServer();

export default app;
