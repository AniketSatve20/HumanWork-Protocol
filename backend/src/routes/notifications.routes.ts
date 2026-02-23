import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { Notification } from '../models/Notification.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';

const router = Router();
const standardLimit = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });

// All routes require authentication
router.use(standardLimit);
router.use(authenticateToken);

// Get notifications for the authenticated user
router.get('/', standardLimit, async (req: Request, res: Response) => {
  try {
    const userAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!userAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { page = '1', limit = '20', unreadOnly = 'false' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, parseInt(limit as string) || 20);
    const skip = (pageNum - 1) * limitNum;

    const filter: Record<string, unknown> = { recipientAddress: { $regex: new RegExp(`^${userAddress}$`, 'i') } };
    if (unreadOnly === 'true') filter.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        recipientAddress: { $regex: new RegExp(`^${userAddress}$`, 'i') },
        read: false,
      }),
    ]);

    res.json({ success: true, data: notifications, total, unreadCount, page: pageNum, limit: limitNum });
  } catch (error) {
    logger.error('Failed to get notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to get notifications' });
  }
});

// Mark a notification as read
router.patch('/:id/read', standardLimit, async (req: Request, res: Response) => {
  try {
    const userAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!userAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientAddress: { $regex: new RegExp(`^${userAddress}$`, 'i') } },
      { read: true },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ success: false, error: 'Notification not found' });
      return;
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    logger.error('Failed to mark notification as read:', error);
    res.status(500).json({ success: false, error: 'Failed to update notification' });
  }
});

// Mark all notifications as read
router.patch('/read-all', standardLimit, async (req: Request, res: Response) => {
  try {
    const userAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!userAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    await Notification.updateMany(
      { recipientAddress: { $regex: new RegExp(`^${userAddress}$`, 'i') }, read: false },
      { read: true }
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to mark all notifications as read:', error);
    res.status(500).json({ success: false, error: 'Failed to update notifications' });
  }
});

export default router;
