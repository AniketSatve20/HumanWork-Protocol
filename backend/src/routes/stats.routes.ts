import { Router } from 'express';
import { getPlatformStats } from '../controllers/stats.controller';
import { authenticateToken } from '../middleware/auth.middleware'; // Protect the admin/analytics data

const router = Router();

/**
 * GET /api/stats
 * Provides platform-wide analytics like TVL and Dispute Rate.
 */
router.get('/', authenticateToken, getPlatformStats);

export default router;