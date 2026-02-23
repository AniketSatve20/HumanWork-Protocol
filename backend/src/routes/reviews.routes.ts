import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';

const router = Router();
const standardLimit = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
const writeLimit = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false });

// Public: Get reviews for a user (as reviewee)
router.get('/user/:address', standardLimit, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const reviews = await Review.find({ revieweeAddress: address.toLowerCase() })
      .sort({ createdAt: -1 })
      .lean();

    const avgRating =
      reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)
        : null;

    res.json({ success: true, data: reviews, averageRating: avgRating, totalReviews: reviews.length });
  } catch (error) {
    logger.error('Failed to get reviews:', error);
    res.status(500).json({ success: false, error: 'Failed to get reviews' });
  }
});

// Public: Get reviews for a project
router.get('/project/:projectId', standardLimit, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const reviews = await Review.find({ projectId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: reviews });
  } catch (error) {
    logger.error('Failed to get project reviews:', error);
    res.status(500).json({ success: false, error: 'Failed to get project reviews' });
  }
});

// All write routes require authentication
router.use(standardLimit);
router.use(authenticateToken);

// Submit a review
router.post('/', writeLimit, async (req: Request, res: Response) => {
  try {
    const reviewerAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!reviewerAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { projectId, revieweeAddress, reviewerRole, rating, comment, skillTags } = req.body;

    if (!projectId || !revieweeAddress || !reviewerRole || !rating || !comment) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
      return;
    }

    if (!['client', 'freelancer'].includes(reviewerRole)) {
      res.status(400).json({ success: false, error: 'reviewerRole must be client or freelancer' });
      return;
    }

    // Check duplicate (reviewerAddress stored lowercase)
    const existing = await Review.findOne({ projectId, reviewerAddress: reviewerAddress.toLowerCase() });
    if (existing) {
      res.status(409).json({ success: false, error: 'You have already reviewed this project' });
      return;
    }

    const review = new Review({
      projectId,
      reviewerAddress: reviewerAddress.toLowerCase(),
      revieweeAddress: revieweeAddress.toLowerCase(),
      reviewerRole,
      rating,
      comment: comment.trim(),
      skillTags: skillTags || [],
    });

    await review.save();

    // Update average rating on User document (best-effort)
    try {
      const allReviews = await Review.find({ revieweeAddress: revieweeAddress.toLowerCase() }).lean();
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      await User.findOneAndUpdate(
        { walletAddressLower: revieweeAddress.toLowerCase() },
        { averageRating: parseFloat(avg.toFixed(2)) }
      );
    } catch {
      // Non-critical: ignore update errors
    }

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    logger.error('Failed to create review:', error);
    res.status(500).json({ success: false, error: 'Failed to create review' });
  }
});

export default router;
