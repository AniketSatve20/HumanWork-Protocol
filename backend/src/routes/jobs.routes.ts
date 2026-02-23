import { Router, Request, Response } from 'express';
import { JobListing, getNextJobId } from '../models/JobListing.js';
import { Application } from '../models/Application.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ── GET /api/jobs ─────────────────────────────────────────────────────────────
// Public: list open job listings with optional filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status, category, search, client } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const query: Record<string, unknown> = {};

    if (status && status !== 'all') {
      query.status = status;
    } else if (!status) {
      // Default to open listings when browsing
      query.status = 'open';
    }

    if (category) query.category = category;
    if (client) query.clientAddressLower = (client as string).toLowerCase();

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
      // Don't restrict by status when searching
      delete query.status;
    }

    const [listings, total] = await Promise.all([
      JobListing.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      JobListing.countDocuments(query),
    ]);

    res.json({
      success: true,
      jobs: listings,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    logger.error('Failed to list jobs:', error);
    res.status(500).json({ success: false, error: 'Failed to list jobs' });
  }
});

// ── GET /api/jobs/:id ─────────────────────────────────────────────────────────
// Public: get a single job listing
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      res.status(400).json({ success: false, error: 'Invalid job ID' });
      return;
    }
    const job = await JobListing.findOne({ jobId }).lean();
    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }
    res.json({ success: true, job });
  } catch (error) {
    logger.error('Failed to get job:', error);
    res.status(500).json({ success: false, error: 'Failed to get job' });
  }
});

// ── POST /api/jobs ────────────────────────────────────────────────────────────
// Auth required: recruiter creates a job listing (no blockchain interaction)
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const clientAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!clientAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { title, description, category, skills, duration, milestones } = req.body;

    if (!title || !description || !category || !milestones?.length) {
      res.status(400).json({ success: false, error: 'Missing required fields: title, description, category, milestones' });
      return;
    }

    // Validate string lengths
    if (typeof title !== 'string' || title.length > 200) {
      res.status(400).json({ success: false, error: 'Title must be a string of at most 200 characters' });
      return;
    }
    if (typeof description !== 'string' || description.length > 10000) {
      res.status(400).json({ success: false, error: 'Description must be a string of at most 10000 characters' });
      return;
    }
    if (typeof category !== 'string' || category.length > 100) {
      res.status(400).json({ success: false, error: 'Category must be a string of at most 100 characters' });
      return;
    }
    if (milestones.length > 20) {
      res.status(400).json({ success: false, error: 'A job can have at most 20 milestones' });
      return;
    }

    // Validate milestones and compute total budget
    let budget = 0;
    for (const m of milestones) {
      const amt = parseFloat(m.amount);
      if (!m.description || isNaN(amt) || amt <= 0) {
        res.status(400).json({ success: false, error: 'Each milestone must have a description and a positive amount' });
        return;
      }
      budget += amt;
    }

    const jobId = await getNextJobId();

    const listing = new JobListing({
      jobId,
      clientAddress,
      title,
      description,
      category,
      skills: skills || [],
      duration: duration || '',
      milestones: milestones.map((m: { description: string; amount: string }) => ({
        description: m.description,
        amount: m.amount,
      })),
      budget: budget.toString(),
      status: 'open',
    });

    await listing.save();

    logger.info(`Job listing created: #${jobId} by ${clientAddress}`);
    res.status(201).json({ success: true, job: listing });
  } catch (error) {
    logger.error('Failed to create job:', error);
    res.status(500).json({ success: false, error: 'Failed to create job listing' });
  }
});

// ── POST /api/jobs/:id/apply ──────────────────────────────────────────────────
// Auth required: freelancer applies to a job
router.post('/:id/apply', authenticateToken, async (req: Request, res: Response) => {
  try {
    const freelancerAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!freelancerAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      res.status(400).json({ success: false, error: 'Invalid job ID' });
      return;
    }

    const job = await JobListing.findOne({ jobId });
    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }
    if (job.status !== 'open') {
      res.status(400).json({ success: false, error: 'This job is no longer accepting applications' });
      return;
    }
    if (job.clientAddressLower === freelancerAddress.toLowerCase()) {
      res.status(400).json({ success: false, error: 'You cannot apply to your own job' });
      return;
    }

    const { coverLetter, proposedAmount, estimatedDuration } = req.body;
    if (!coverLetter || !proposedAmount) {
      res.status(400).json({ success: false, error: 'Cover letter and proposed amount are required' });
      return;
    }
    if (typeof coverLetter !== 'string' || coverLetter.length > 5000) {
      res.status(400).json({ success: false, error: 'Cover letter must be at most 5000 characters' });
      return;
    }

    // Check for duplicate application
    const existing = await Application.findOne({
      jobId,
      freelancerAddressLower: freelancerAddress.toLowerCase(),
    });
    if (existing) {
      res.status(400).json({ success: false, error: 'You have already applied to this job' });
      return;
    }

    const application = new Application({
      jobId,
      freelancerAddress,
      coverLetter,
      proposedAmount,
      estimatedDuration: estimatedDuration || job.duration || '',
      status: 'pending',
    });

    await application.save();

    // Increment applicant counter
    await JobListing.updateOne({ jobId }, { $inc: { applicantCount: 1 } });

    logger.info(`Application submitted for job #${jobId} by ${freelancerAddress}`);
    res.status(201).json({ success: true, application });
  } catch (error: unknown) {
    if ((error as { code?: number })?.code === 11000) {
      res.status(400).json({ success: false, error: 'You have already applied to this job' });
      return;
    }
    logger.error('Failed to submit application:', error);
    res.status(500).json({ success: false, error: 'Failed to submit application' });
  }
});

// ── GET /api/jobs/:id/applications ────────────────────────────────────────────
// Auth required: only the job owner (client) can view applications
router.get('/:id/applications', authenticateToken, async (req: Request, res: Response) => {
  try {
    const clientAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!clientAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      res.status(400).json({ success: false, error: 'Invalid job ID' });
      return;
    }

    const { page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const skip = (pageNum - 1) * limitNum;

    const job = await JobListing.findOne({ jobId }).lean();
    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }
    if (job.clientAddressLower !== clientAddress.toLowerCase()) {
      res.status(403).json({ success: false, error: 'Only the job owner can view applications' });
      return;
    }

    const [applications, total] = await Promise.all([
      Application.find({ jobId }).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Application.countDocuments({ jobId }),
    ]);

    res.json({
      success: true,
      applications,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    logger.error('Failed to get applications:', error);
    res.status(500).json({ success: false, error: 'Failed to get applications' });
  }
});

// ── POST /api/jobs/:id/accept ─────────────────────────────────────────────────
// Auth required: client accepts a freelancer application
// Body: { applicationId: string, onChainProjectId?: number }
router.post('/:id/accept', authenticateToken, async (req: Request, res: Response) => {
  try {
    const clientAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!clientAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      res.status(400).json({ success: false, error: 'Invalid job ID' });
      return;
    }

    const { applicationId, onChainProjectId } = req.body;
    if (!applicationId) {
      res.status(400).json({ success: false, error: 'applicationId is required' });
      return;
    }

    const job = await JobListing.findOne({ jobId });
    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }
    if (job.clientAddressLower !== clientAddress.toLowerCase()) {
      res.status(403).json({ success: false, error: 'Only the job owner can accept applications' });
      return;
    }
    if (job.status !== 'open') {
      res.status(400).json({ success: false, error: 'This job is no longer open' });
      return;
    }

    const application = await Application.findById(applicationId);
    if (!application || application.jobId !== jobId) {
      res.status(404).json({ success: false, error: 'Application not found' });
      return;
    }

    // Accept the chosen application
    application.status = 'accepted';
    await application.save();

    // Reject all other pending applications
    await Application.updateMany(
      { jobId, _id: { $ne: application._id }, status: 'pending' },
      { status: 'rejected' }
    );

    // Update job listing
    job.status = 'assigned';
    job.assignedFreelancerAddress = application.freelancerAddress;
    if (onChainProjectId !== undefined) {
      job.onChainProjectId = onChainProjectId;
    }
    await job.save();

    logger.info(`Application ${applicationId} accepted for job #${jobId} — freelancer: ${application.freelancerAddress}`);
    res.json({
      success: true,
      freelancerAddress: application.freelancerAddress,
      application,
      job,
    });
  } catch (error) {
    logger.error('Failed to accept application:', error);
    res.status(500).json({ success: false, error: 'Failed to accept application' });
  }
});

// ── POST /api/jobs/:id/project ────────────────────────────────────────────────
// Auth required: client links the job to an on-chain project ID after contract creation
router.post('/:id/project', authenticateToken, async (req: Request, res: Response) => {
  try {
    const clientAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!clientAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const jobId = parseInt(req.params.id);
    const { onChainProjectId } = req.body;

    if (isNaN(jobId) || onChainProjectId === undefined) {
      res.status(400).json({ success: false, error: 'jobId and onChainProjectId are required' });
      return;
    }

    const job = await JobListing.findOne({ jobId });
    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }
    if (job.clientAddressLower !== clientAddress.toLowerCase()) {
      res.status(403).json({ success: false, error: 'Only the job owner can update this' });
      return;
    }

    job.onChainProjectId = onChainProjectId;
    await job.save();

    res.json({ success: true, job });
  } catch (error) {
    logger.error('Failed to link on-chain project:', error);
    res.status(500).json({ success: false, error: 'Failed to link on-chain project' });
  }
});

export default router;
