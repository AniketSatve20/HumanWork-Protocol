import { Router, Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Dispute, DisputeOutcome } from '../models/Dispute.js';
import { Project, MilestoneStatus } from '../models/Project.js';
import { aiService } from '../services/ai.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

const MAX_PAGE_SIZE = 100;

// GET /disputes - List disputes (filtered by user involvement)
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const address = req.user?.walletAddress?.toLowerCase();
    if (!address) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { page = '1', limit = '20', status, role } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, MAX_PAGE_SIZE);
    const skip = (pageNum - 1) * limitNum;

    const query: Record<string, unknown> = {};

    // Filter by user role
    if (role === 'client') {
      query.client = { $regex: new RegExp(`^${address}$`, 'i') };
    } else if (role === 'freelancer') {
      query.freelancer = { $regex: new RegExp(`^${address}$`, 'i') };
    } else if (role === 'juror') {
      query.jurors = { $regex: new RegExp(`^${address}$`, 'i') };
    } else {
      // Default: show disputes where user is involved as client, freelancer, or juror
      query.$or = [
        { client: { $regex: new RegExp(`^${address}$`, 'i') } },
        { freelancer: { $regex: new RegExp(`^${address}$`, 'i') } },
        { jurors: { $regex: new RegExp(`^${address}$`, 'i') } },
      ];
    }

    // Filter by outcome status
    if (status !== undefined && status !== '' && status !== 'all') {
      const statusNum = parseInt(status as string, 10);
      if (!isNaN(statusNum) && statusNum >= 0 && statusNum <= 3) {
        query.outcome = statusNum;
      }
    }

    const [disputes, total] = await Promise.all([
      Dispute.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Dispute.countDocuments(query),
    ]);

    res.json({
      success: true,
      disputes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Failed to list disputes:', error);
    res.status(500).json({ success: false, error: 'Failed to list disputes' });
  }
});

// GET /disputes/:id - Get dispute details
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const disputeId = parseInt(req.params.id);
    if (isNaN(disputeId)) {
      res.status(400).json({ success: false, error: 'Invalid dispute ID' });
      return;
    }

    const dispute = await Dispute.findOne({ disputeId }).lean();
    if (!dispute) {
      res.status(404).json({ success: false, error: 'Dispute not found' });
      return;
    }

    res.json({ success: true, dispute });
  } catch (error) {
    logger.error(`Failed to get dispute ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Failed to get dispute' });
  }
});

// POST /disputes - Create a new dispute (initiate dispute on a milestone)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const address = req.user?.walletAddress?.toLowerCase();
    if (!address) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { projectId, milestoneIndex, reason } = req.body;

    if (projectId === undefined || milestoneIndex === undefined) {
      res.status(400).json({ success: false, error: 'projectId and milestoneIndex are required' });
      return;
    }

    // Verify the project exists and user is involved
    const project = await Project.findOne({ projectId });
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const isClient = project.client.toLowerCase() === address;
    const isFreelancer = project.freelancer.toLowerCase() === address;
    if (!isClient && !isFreelancer) {
      res.status(403).json({ success: false, error: 'Only project participants can raise disputes' });
      return;
    }

    // Check milestone exists
    const milestone = project.milestones[milestoneIndex];
    if (!milestone) {
      res.status(400).json({ success: false, error: 'Invalid milestone index' });
      return;
    }

    // Check for existing open dispute on the same project + milestone
    const existingDispute = await Dispute.findOne({
      projectId,
      milestoneIndex,
      outcome: DisputeOutcome.Pending,
    });
    if (existingDispute) {
      res.status(409).json({ success: false, error: 'An active dispute already exists for this milestone' });
      return;
    }

    // Generate AI analysis report
    let aiReport = '';
    let aiSplit = 50;
    try {
      const analysis = await aiService.analyzeDispute({
        projectTitle: `Project #${projectId}`,
        milestoneDescription: `Milestone #${milestoneIndex}: ${milestone.description}`,
        disputeReason: reason || 'Dispute raised by participant',
        clientEvidence: '',
        freelancerEvidence: '',
      });
      aiReport = analysis.report || JSON.stringify(analysis);
      if (analysis.recommendedSplit) {
        aiSplit = analysis.recommendedSplit.client || 50;
      }
    } catch (aiError) {
      logger.warn('AI analysis failed, proceeding without:', aiError);
      aiReport = 'AI analysis unavailable';
    }

    // Get next dispute ID
    const lastDispute = await Dispute.findOne().sort({ disputeId: -1 }).lean();
    const nextDisputeId = (lastDispute?.disputeId || 0) + 1;

    const dispute = await Dispute.create({
      disputeId: nextDisputeId,
      projectId,
      milestoneIndex,
      client: project.client,
      freelancer: project.freelancer,
      amount: milestone.amount,
      jurors: [],
      votes: [],
      outcome: DisputeOutcome.Pending,
      aiReport,
      aiRecommendedSplit: aiSplit,
    });

    // Update milestone status to disputed
    project.milestones[milestoneIndex].status = MilestoneStatus.Disputed;
    await project.save();

    res.status(201).json({
      success: true,
      dispute: dispute.toObject(),
      message: 'Dispute created successfully. Awaiting jury assignment.',
    });
  } catch (error) {
    logger.error('Failed to create dispute:', error);
    res.status(500).json({ success: false, error: 'Failed to create dispute' });
  }
});

// POST /disputes/:id/vote - Cast a jury vote
router.post('/:id/vote', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const address = req.user?.walletAddress?.toLowerCase();
    if (!address) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const disputeId = parseInt(req.params.id);
    if (isNaN(disputeId)) {
      res.status(400).json({ success: false, error: 'Invalid dispute ID' });
      return;
    }

    const { choice } = req.body;
    if (choice === undefined || choice < 0 || choice > 2) {
      res.status(400).json({ success: false, error: 'Valid vote choice required (0=AcceptAI, 1=Client, 2=Freelancer)' });
      return;
    }

    const dispute = await Dispute.findOne({ disputeId });
    if (!dispute) {
      res.status(404).json({ success: false, error: 'Dispute not found' });
      return;
    }

    if (dispute.outcome !== DisputeOutcome.Pending) {
      res.status(400).json({ success: false, error: 'Dispute already resolved' });
      return;
    }

    // Check if user is a juror on this dispute
    const isJuror = dispute.jurors.some(j => j.toLowerCase() === address);
    if (!isJuror) {
      res.status(403).json({ success: false, error: 'Only assigned jurors can vote' });
      return;
    }

    // Check if already voted
    const alreadyVoted = dispute.votes.some(v => v.juror.toLowerCase() === address);
    if (alreadyVoted) {
      res.status(409).json({ success: false, error: 'You have already voted on this dispute' });
      return;
    }

    // Cast vote
    dispute.votes.push({ juror: address, choice, timestamp: new Date() });

    // Update vote counts
    if (choice === 0) dispute.votesAcceptAi += 1;
    else if (choice === 1) dispute.votesForClient += 1;
    else if (choice === 2) dispute.votesForFreelancer += 1;

    // Check if all jurors have voted (auto-resolve)
    if (dispute.votes.length >= dispute.jurors.length && dispute.jurors.length > 0) {
      const maxVotes = Math.max(dispute.votesAcceptAi, dispute.votesForClient, dispute.votesForFreelancer);
      if (dispute.votesAcceptAi === maxVotes) {
        dispute.outcome = DisputeOutcome.AcceptAISplit;
      } else if (dispute.votesForClient === maxVotes) {
        dispute.outcome = DisputeOutcome.ClientWins;
      } else {
        dispute.outcome = DisputeOutcome.FreelancerWins;
      }
      dispute.resolvedAt = new Date();
    }

    await dispute.save();

    res.json({
      success: true,
      dispute: dispute.toObject(),
      message: dispute.outcome !== DisputeOutcome.Pending
        ? 'Vote cast. Dispute has been resolved.'
        : 'Vote cast successfully.',
    });
  } catch (error) {
    logger.error(`Failed to vote on dispute ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: 'Failed to cast vote' });
  }
});

export default router;
