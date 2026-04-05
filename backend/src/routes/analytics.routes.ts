import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  getJobFunnel,
  getRevenueAnalytics,
  getUserGrowth,
  getSkillAnalytics,
  getTopFreelancers,
  getMilestoneAnalytics,
  getActivityAnalytics,
  getSkillDemand,
} from '../controllers/analytics.controller.js';

const router = Router();

// All analytics endpoints require authentication
router.use(authenticateToken);

// ── Job Funnel ───────────────────────────────────────────────────────────────
// GET /api/analytics/jobs/funnel?period=30d
router.get('/jobs/funnel', getJobFunnel);

// ── Revenue / Earnings ──────────────────────────────────────────────────────
// GET /api/analytics/revenue?groupBy=month&period=90d
router.get('/revenue', getRevenueAnalytics);

// ── User Growth & Demographics ──────────────────────────────────────────────
// GET /api/analytics/users?groupBy=month&period=1y
router.get('/users', getUserGrowth);

// ── Skill Trial Analytics ───────────────────────────────────────────────────
// GET /api/analytics/skills?period=90d
router.get('/skills', getSkillAnalytics);

// ── Top Freelancers ─────────────────────────────────────────────────────────
// GET /api/analytics/freelancers?sortBy=earnings&limit=10
router.get('/freelancers', getTopFreelancers);

// ── Milestone Analytics ─────────────────────────────────────────────────────
// GET /api/analytics/milestones?period=30d
router.get('/milestones', getMilestoneAnalytics);

// ── Platform Activity ───────────────────────────────────────────────────────
// GET /api/analytics/activity?groupBy=month&period=90d
router.get('/activity', getActivityAnalytics);

// ── Skill Supply vs Demand ──────────────────────────────────────────────────
// GET /api/analytics/demand?period=30d
router.get('/demand', getSkillDemand);

export default router;
