import { Router } from 'express';
import { getPlatformStats } from '../controllers/stats.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticateToken, getPlatformStats);

export default router;
