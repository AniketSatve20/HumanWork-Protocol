import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { Dispute, DisputeStatus } from '../models/Dispute.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';

const router = Router();

const standardLimit = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });
const writeLimit = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });

// Public: Get a single dispute by id
router.get('/:id', standardLimit, async (req: Request, res: Response) => {
  try {
    const dispute = await Dispute.findById(req.params.id).lean();
    if (!dispute) {
      res.status(404).json({ success: false, error: 'Dispute not found' });
      return;
    }
    res.json({ success: true, data: dispute });
  } catch (error) {
    logger.error('Failed to get dispute:', error);
    res.status(500).json({ success: false, error: 'Failed to get dispute' });
  }
});

// Public: Get disputes for a project
router.get('/project/:projectId', standardLimit, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const disputes = await Dispute.find({ projectId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: disputes });
  } catch (error) {
    logger.error('Failed to get disputes:', error);
    res.status(500).json({ success: false, error: 'Failed to get disputes' });
  }
});

// All write routes require authentication
router.use(standardLimit);
router.use(authenticateToken);

// Create a new dispute (client or freelancer)
router.post('/', writeLimit, async (req: Request, res: Response) => {
  try {
    const userAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!userAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { projectId, milestoneIndex, reason, amount, evidenceDescription, evidenceIpfsHash } = req.body;

    if (!projectId || milestoneIndex === undefined || !reason || !amount) {
      res.status(400).json({ success: false, error: 'Missing required fields: projectId, milestoneIndex, reason, amount' });
      return;
    }

    // Check if dispute already exists for this project+milestone
    const existing = await Dispute.findOne({ projectId, milestoneIndex, status: { $ne: DisputeStatus.Cancelled } });
    if (existing) {
      res.status(409).json({ success: false, error: 'A dispute already exists for this milestone' });
      return;
    }

    const evidenceList = evidenceDescription
      ? [{ submittedBy: userAddress, description: evidenceDescription, ipfsHash: evidenceIpfsHash, submittedAt: new Date() }]
      : [];

    // We don't know client/freelancer roles here without project lookup.
    // The counterpartyAddress field allows the requester to specify the other party.
    // Both addresses can be updated later when the on-chain dispute ID is linked.
    const dispute = new Dispute({
      projectId,
      milestoneIndex,
      clientAddress: userAddress, // Overridden when on-chain dispute is linked
      freelancerAddress: req.body.counterpartyAddress || userAddress,
      amount: String(amount),
      reason,
      evidence: evidenceList,
      status: DisputeStatus.Pending,
    });

    await dispute.save();

    res.status(201).json({ success: true, data: dispute });
  } catch (error) {
    logger.error('Failed to create dispute:', error);
    res.status(500).json({ success: false, error: 'Failed to create dispute' });
  }
});

// Add evidence to a dispute
router.post('/:id/evidence', writeLimit, async (req: Request, res: Response) => {
  try {
    const userAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!userAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { description, ipfsHash } = req.body;
    if (!description) {
      res.status(400).json({ success: false, error: 'Description is required' });
      return;
    }

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) {
      res.status(404).json({ success: false, error: 'Dispute not found' });
      return;
    }

    // Only parties involved can add evidence
    const isParty =
      dispute.clientAddress.toLowerCase() === userAddress.toLowerCase() ||
      dispute.freelancerAddress.toLowerCase() === userAddress.toLowerCase();
    if (!isParty) {
      res.status(403).json({ success: false, error: 'Only dispute parties can add evidence' });
      return;
    }

    if (dispute.status !== DisputeStatus.Pending && dispute.status !== DisputeStatus.VotingOpen) {
      res.status(400).json({ success: false, error: 'Cannot add evidence to a resolved or cancelled dispute' });
      return;
    }

    dispute.evidence.push({ submittedBy: userAddress, description, ipfsHash, submittedAt: new Date() });
    await dispute.save();

    res.json({ success: true, data: dispute });
  } catch (error) {
    logger.error('Failed to add evidence:', error);
    res.status(500).json({ success: false, error: 'Failed to add evidence' });
  }
});

// Get disputes where the authenticated user is a party
router.get('/my/disputes', standardLimit, async (req: Request, res: Response) => {
  try {
    const userAddress = (req as AuthenticatedRequest).user?.walletAddress?.toLowerCase();
    if (!userAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const disputes = await Dispute.find({
      $or: [
        { clientAddress: { $regex: new RegExp(`^${userAddress}$`, 'i') } },
        { freelancerAddress: { $regex: new RegExp(`^${userAddress}$`, 'i') } },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: disputes });
  } catch (error) {
    logger.error('Failed to get user disputes:', error);
    res.status(500).json({ success: false, error: 'Failed to get disputes' });
  }
});

export default router;
