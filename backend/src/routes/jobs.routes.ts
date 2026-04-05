import { Router, Request, Response } from 'express';
import { escapeRegex, ensureString, sanitizeTextField } from '../utils/sanitize.js';
import { JobListing, getNextJobId } from '../models/JobListing.js';
import { Application } from '../models/Application.js';
import { authenticateToken, AuthenticatedRequest, requireRoles } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';
import {
  sendSuccess, sendCreated, sendBadRequest, sendNotFound,
  sendUnauthorized, sendForbidden, sendServerError, sendConflict,
  buildPagination,
} from '../utils/apiResponse.js';

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

    const categoryStr = ensureString(category);
    const clientStr = ensureString(client);
    if (categoryStr) query.category = categoryStr;
    if (clientStr) query.clientAddressLower = clientStr.toLowerCase();

    const searchStr = ensureString(search);
    if (searchStr) {
      const escaped = escapeRegex(searchStr);
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } },
      ];
      // Don't restrict by status when searching
      delete query.status;
    }

    const [listings, total] = await Promise.all([
      JobListing.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      JobListing.countDocuments(query),
    ]);

    sendSuccess(res, listings, buildPagination(pageNum, limitNum, total));
  } catch (error) {
    logger.error('Failed to list jobs:', error);
    sendServerError(res, 'Failed to list jobs');
  }
});

// ── GET /api/jobs/:id ─────────────────────────────────────────────────────────
// Public: get a single job listing
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      sendBadRequest(res, 'Invalid job ID');
      return;
    }
    const job = await JobListing.findOne({ jobId }).lean();
    if (!job) {
      sendNotFound(res, 'Job not found');
      return;
    }
    sendSuccess(res, job);
  } catch (error) {
    logger.error('Failed to get job:', error);
    sendServerError(res, 'Failed to get job');
  }
});

// ── POST /api/jobs ────────────────────────────────────────────────────────────
// Auth required: recruiter creates a job listing (no blockchain interaction)
router.post('/', authenticateToken, requireRoles('recruiter'), async (req: Request, res: Response) => {
  try {
    const clientAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!clientAddress) {
      sendUnauthorized(res);
      return;
    }

    const { title, description, category, skills, duration, milestones } = req.body;

    if (!title || !description || !category || !milestones?.length) {
      sendBadRequest(res, 'Missing required fields: title, description, category, milestones');
      return;
    }

    // Validate milestones and compute total budget
    let budget = 0;
    for (const m of milestones) {
      const amt = parseFloat(m.amount);
      if (!m.description || isNaN(amt) || amt <= 0) {
        sendBadRequest(res, 'Each milestone must have a description and a positive amount');
        return;
      }
      budget += amt;
    }

    const jobId = await getNextJobId();

    const listing = new JobListing({
      jobId,
      clientAddress,
      title: sanitizeTextField(title, 200),
      description: sanitizeTextField(description, 5000),
      category: sanitizeTextField(category, 100),
      skills: Array.isArray(skills) ? skills.map((s: unknown) => sanitizeTextField(s, 50)).filter(Boolean) : [],
      duration: sanitizeTextField(duration, 50) || '',
      milestones: milestones.map((m: { description: string; amount: string }) => ({
        description: sanitizeTextField(m.description, 500),
        amount: m.amount,
      })),
      budget: budget.toString(),
      status: 'open',
    });

    await listing.save();

    logger.info(`Job listing created: #${jobId} by ${clientAddress}`);
    sendCreated(res, listing.toObject());
  } catch (error) {
    logger.error('Failed to create job:', error);
    sendServerError(res, 'Failed to create job listing');
  }
});

// ── POST /api/jobs/:id/apply ──────────────────────────────────────────────────
// Auth required: freelancer applies to a job
router.post('/:id/apply', authenticateToken, requireRoles('freelancer'), async (req: Request, res: Response) => {
  try {
    const freelancerAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!freelancerAddress) {
      sendUnauthorized(res);
      return;
    }

    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      sendBadRequest(res, 'Invalid job ID');
      return;
    }

    const job = await JobListing.findOne({ jobId });
    if (!job) {
      sendNotFound(res, 'Job not found');
      return;
    }
    if (job.status !== 'open') {
      sendBadRequest(res, 'This job is no longer accepting applications');
      return;
    }
    if (job.clientAddressLower === freelancerAddress.toLowerCase()) {
      sendBadRequest(res, 'You cannot apply to your own job');
      return;
    }

    const { coverLetter, proposedAmount, estimatedDuration } = req.body;
    if (!coverLetter || !proposedAmount) {
      sendBadRequest(res, 'Cover letter and proposed amount are required');
      return;
    }

    // Check for duplicate application
    const existing = await Application.findOne({
      jobId,
      freelancerAddressLower: freelancerAddress.toLowerCase(),
    });
    if (existing) {
      sendConflict(res, 'You have already applied to this job');
      return;
    }

    const application = new Application({
      jobId,
      freelancerAddress,
      coverLetter: sanitizeTextField(coverLetter, 3000),
      proposedAmount: sanitizeTextField(proposedAmount, 20),
      estimatedDuration: sanitizeTextField(estimatedDuration, 50) || job.duration || '',
      status: 'pending',
    });

    await application.save();

    // Increment applicant counter
    await JobListing.updateOne({ jobId }, { $inc: { applicantCount: 1 } });

    logger.info(`Application submitted for job #${jobId} by ${freelancerAddress}`);
    sendCreated(res, application.toObject());
  } catch (error: unknown) {
    if ((error as { code?: number })?.code === 11000) {
      sendConflict(res, 'You have already applied to this job');
      return;
    }
    logger.error('Failed to submit application:', error);
    sendServerError(res, 'Failed to submit application');
  }
});

// ── GET /api/jobs/:id/applications ────────────────────────────────────────────
// Auth required: only the job owner (client) can view applications
router.get('/:id/applications', authenticateToken, requireRoles('recruiter'), async (req: Request, res: Response) => {
  try {
    const clientAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!clientAddress) {
      sendUnauthorized(res);
      return;
    }

    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      sendBadRequest(res, 'Invalid job ID');
      return;
    }

    const job = await JobListing.findOne({ jobId }).lean();
    if (!job) {
      sendNotFound(res, 'Job not found');
      return;
    }
    if (job.clientAddressLower !== clientAddress.toLowerCase()) {
      sendForbidden(res, 'Only the job owner can view applications');
      return;
    }

    const applications = await Application.find({ jobId }).sort({ createdAt: -1 }).lean();

    sendSuccess(res, applications);
  } catch (error) {
    logger.error('Failed to get applications:', error);
    sendServerError(res, 'Failed to get applications');
  }
});

// ── POST /api/jobs/:id/accept ─────────────────────────────────────────────────
// Auth required: client accepts a freelancer application
// Body: { applicationId: string, onChainProjectId?: number }
router.post('/:id/accept', authenticateToken, requireRoles('recruiter'), async (req: Request, res: Response) => {
  try {
    const clientAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!clientAddress) {
      sendUnauthorized(res);
      return;
    }

    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      sendBadRequest(res, 'Invalid job ID');
      return;
    }

    const { applicationId, onChainProjectId } = req.body;
    if (!applicationId) {
      sendBadRequest(res, 'applicationId is required');
      return;
    }

    const job = await JobListing.findOne({ jobId });
    if (!job) {
      sendNotFound(res, 'Job not found');
      return;
    }
    if (job.clientAddressLower !== clientAddress.toLowerCase()) {
      sendForbidden(res, 'Only the job owner can accept applications');
      return;
    }
    if (job.status !== 'open') {
      sendBadRequest(res, 'This job is no longer open');
      return;
    }

    const application = await Application.findById(applicationId);
    if (!application || application.jobId !== jobId) {
      sendNotFound(res, 'Application not found');
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
    sendSuccess(res, {
      freelancerAddress: application.freelancerAddress,
      application: application.toObject(),
      job: job.toObject(),
    });
  } catch (error) {
    logger.error('Failed to accept application:', error);
    sendServerError(res, 'Failed to accept application');
  }
});

// ── POST /api/jobs/:id/project ────────────────────────────────────────────────
// Auth required: client links the job to an on-chain project ID after contract creation
router.post('/:id/project', authenticateToken, requireRoles('recruiter'), async (req: Request, res: Response) => {
  try {
    const clientAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!clientAddress) {
      sendUnauthorized(res);
      return;
    }

    const jobId = parseInt(req.params.id);
    const { onChainProjectId } = req.body;

    if (isNaN(jobId) || onChainProjectId === undefined) {
      sendBadRequest(res, 'jobId and onChainProjectId are required');
      return;
    }

    const job = await JobListing.findOne({ jobId });
    if (!job) {
      sendNotFound(res, 'Job not found');
      return;
    }
    if (job.clientAddressLower !== clientAddress.toLowerCase()) {
      sendForbidden(res, 'Only the job owner can update this');
      return;
    }

    job.onChainProjectId = onChainProjectId;
    await job.save();

    sendSuccess(res, job.toObject());
  } catch (error) {
    logger.error('Failed to link on-chain project:', error);
    sendServerError(res, 'Failed to link on-chain project');
  }
});

export default router;
