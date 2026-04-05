import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { getRadarData } from '../controllers/radar.controller.js';

const router = Router();

router.use(authenticateToken);

// GET /api/analytics/radar/:userId
router.get('/radar/:userId', getRadarData);

export default router;
