import { Router, Request, Response } from 'express';
import { getPlatformStats } from '../controllers/stats.controller.js';
import { authenticateToken, requireRoles } from '../middleware/auth.middleware.js';
import { getDbMetrics } from '../utils/dbMonitor.js';
import { sendSuccess, sendServerError } from '../utils/apiResponse.js';

const router = Router();

router.get('/', authenticateToken, getPlatformStats);

// ── GET /api/stats/db — Database health & metrics (admin/dev) ────────────────
router.get('/db', authenticateToken, requireRoles('admin'), async (_req: Request, res: Response) => {
  try {
    const metrics = await getDbMetrics();
    sendSuccess(res, metrics);
  } catch (error) {
    sendServerError(res, 'Failed to get database metrics');
  }
});

export default router;
