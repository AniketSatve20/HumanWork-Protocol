import { Router, Request, Response } from 'express';
import { blockchainService } from '../services/blockchain.service.js';
import { ipfsService } from '../services/ipfs.service.js';
import { logger } from '../utils/logger.js';
import { authenticateToken, AuthenticatedRequest, requireRoles } from '../middleware/auth.middleware.js';
import { SkillSubmission, SubmissionStatus, getNextTemporarySubmissionId } from '../models/SkillSubmission.js';
import {
  sendSuccess, sendBadRequest, sendForbidden, sendNotFound,
  sendServerError,
} from '../utils/apiResponse.js';
const router = Router();

// ── Browse all active skill tests ──
router.get('/tests', async (_req: Request, res: Response) => {
  try {
    const tests = [];
    const MAX_TESTS = 200; // Safety cap
    
    for (let i = 0; i < MAX_TESTS; i++) {
      try {
        const test = await blockchainService.getSkillTest(i);
        if (test.isActive) {
          tests.push({ id: i, ...test });
        }
      } catch {
        // No more tests on-chain — stop iterating
        break;
      }
    }

    sendSuccess(res, { tests, total: tests.length });
  } catch (error) {
    logger.error('Failed to fetch skill tests:', error);
    sendServerError(res, 'Failed to fetch tests');
  }
});

// ── Get single test details ──
router.get('/tests/:id', async (req: Request, res: Response) => {
  try {
    const testId = parseInt(req.params.id);
    const test = await blockchainService.getSkillTest(testId);
    
    sendSuccess(res, { id: testId, ...test });
  } catch (error) {
    logger.error(`Failed to fetch test ${req.params.id}:`, error);
    sendNotFound(res, 'Test not found');
  }
});

// ── Submit a skill trial (upload to IPFS) ──
router.post('/submit', authenticateToken, requireRoles('freelancer'), async (req: Request, res: Response) => {
  try {
    const { testId, content, metadata } = req.body;
    const address = (req as AuthenticatedRequest).user?.walletAddress;

    if (testId === undefined || !content) {
      sendBadRequest(res, 'Missing required fields');
      return;
    }

    const submission = {
      testId,
      content,
      metadata: metadata || {},
      submittedAt: new Date().toISOString(),
    };

    const cid = await ipfsService.uploadJSON(submission, `submission-${Date.now()}.json`);

    // Record pending submission in MongoDB with a unique temporary ID.
    // This avoids deterministic unique-index collisions while waiting for
    // the on-chain submission ID to become available.
    if (address) {
      const temporarySubmissionId = await getNextTemporarySubmissionId();

      await SkillSubmission.create({
        submissionId: temporarySubmissionId,
        testId: Number(testId),
        applicant: address,
        applicantLower: address.toLowerCase(),
        submissionIpfsHash: cid,
        status: SubmissionStatus.Pending,
        transactionHash: '',
        blockNumber: 0,
      });

      sendSuccess(res, {
        cid,
        ipfsUrl: ipfsService.getGatewayUrl(cid),
        submissionId: temporarySubmissionId,
      });
      return;
    }

    sendSuccess(res, {
      cid,
      ipfsUrl: ipfsService.getGatewayUrl(cid),
    });
  } catch (error) {
    logger.error('Failed to upload submission:', error);
    sendServerError(res, 'Failed to upload submission');
  }
});

// ── Get user's submission history (authenticated — own data only) ──
router.get('/submissions/:address', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const callerAddress = (req as AuthenticatedRequest).user?.walletAddress;

    if (!callerAddress || callerAddress.toLowerCase() !== address.toLowerCase()) {
      sendForbidden(res, 'You can only view your own submissions');
      return;
    }
    const { status, testId, limit = '20', offset = '0' } = req.query;

    const filter: Record<string, unknown> = {
      applicantLower: address.toLowerCase(),
    };

    if (status !== undefined) {
      filter.status = Number(status);
    }
    if (testId !== undefined) {
      filter.testId = Number(testId);
    }

    const submissions = await SkillSubmission.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .lean();

    const total = await SkillSubmission.countDocuments(filter);

    sendSuccess(res, {
      submissions: submissions.map((s) => ({
        submissionId: s.submissionId,
        testId: s.testId,
        testTitle: s.testTitle || `Test #${s.testId}`,
        testDescription: s.testDescription,
        status: s.status,
        statusLabel: ['Pending', 'Grading', 'Graded', 'Failed'][s.status] || 'Unknown',
        score: s.score,
        passed: s.score !== undefined ? s.score >= 80 : undefined,
        aiReport: s.aiReport,
        gradingDetails: s.gradingDetails,
        submissionIpfsHash: s.submissionIpfsHash,
        badgeTokenId: s.badgeTokenId,
        transactionHash: s.transactionHash,
        gradingStartedAt: s.gradingStartedAt,
        gradingCompletedAt: s.gradingCompletedAt,
        createdAt: s.createdAt,
      })),
      total,
      hasMore: Number(offset) + Number(limit) < total,
    });
  } catch (error) {
    logger.error(`Failed to fetch submissions for ${req.params.address}:`, error);
    sendServerError(res, 'Failed to fetch submissions');
  }
});

// ── Get single submission result (for polling, authenticated) ──
router.get('/submissions/:address/:submissionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { address, submissionId } = req.params;
    const callerAddress = (req as AuthenticatedRequest).user?.walletAddress;

    if (!callerAddress || callerAddress.toLowerCase() !== address.toLowerCase()) {
      sendForbidden(res, 'You can only view your own submissions');
      return;
    }

    // Try MongoDB first
    let submission = await SkillSubmission.findOne({
      applicantLower: address.toLowerCase(),
      submissionId: Number(submissionId),
    }).lean();

    // If not in DB, try on-chain
    if (!submission && Number(submissionId) >= 0) {
      try {
        const onChainSub = await blockchainService.getSubmission(Number(submissionId));
        if (onChainSub.applicant.toLowerCase() === address.toLowerCase()) {
          submission = {
            submissionId: Number(submissionId),
            testId: onChainSub.testId,
            applicant: onChainSub.applicant,
            status: onChainSub.status,
            score: onChainSub.score,
            aiReport: onChainSub.report,
          } as any;
        }
      } catch {
        // Not found on-chain either
      }
    }

    if (!submission) {
      sendNotFound(res, 'Submission not found');
      return;
    }

    sendSuccess(res, {
        submissionId: (submission as any).submissionId,
        testId: (submission as any).testId,
        testTitle: (submission as any).testTitle,
        status: (submission as any).status,
        statusLabel: ['Pending', 'Grading', 'Graded', 'Failed'][(submission as any).status] || 'Unknown',
        score: (submission as any).score,
        passed: (submission as any).score !== undefined ? (submission as any).score >= 80 : undefined,
        aiReport: (submission as any).aiReport,
        gradingDetails: (submission as any).gradingDetails,
        gradingCompletedAt: (submission as any).gradingCompletedAt,
        badgeTokenId: (submission as any).badgeTokenId,
        transactionHash: (submission as any).transactionHash,
    });
  } catch (error) {
    logger.error(`Failed to fetch submission:`, error);
    sendServerError(res, 'Failed to fetch submission');
  }
});

// ── Get user's badges ──
router.get('/badges/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const profile = await blockchainService.getUserProfile(address);
    
    const skillBadges = profile.attestations.filter((a: any) => a.type === 0);

    // Enrich badges with submission details from MongoDB
    const enrichedBadges = await Promise.all(
      skillBadges.map(async (badge: any) => {
        const sub = await SkillSubmission.findOne({ submissionId: badge.referenceId }).lean();
        return {
          ...badge,
          testTitle: sub?.testTitle,
          score: sub?.score,
          gradedAt: sub?.gradingCompletedAt,
        };
      })
    );

    sendSuccess(res, { badges: enrichedBadges, totalBadges: enrichedBadges.length });
  } catch (error) {
    logger.error(`Failed to fetch badges for ${req.params.address}:`, error);
    sendServerError(res, 'Failed to fetch badges');
  }
});

// ── Leaderboard: top graded submissions ──
router.get('/leaderboard', async (_req: Request, res: Response) => {
  try {
    const topSubmissions = await SkillSubmission.find({ status: 2 }) // Graded
      .sort({ score: -1, gradingCompletedAt: -1 })
      .limit(50)
      .lean();

    const leaderboard = topSubmissions.map((s, rank) => ({
      rank: rank + 1,
      applicant: s.applicant,
      applicantLower: s.applicantLower,
      testTitle: s.testTitle || `Test #${s.testId}`,
      testId: s.testId,
      score: s.score,
      passed: s.score !== undefined ? s.score >= 80 : false,
      hasBadge: (s.badgeTokenId ?? -1) >= 0,
      gradedAt: s.gradingCompletedAt,
    }));

    sendSuccess(res, { leaderboard, total: leaderboard.length });
  } catch (error) {
    logger.error('Failed to fetch leaderboard:', error);
    sendServerError(res, 'Failed to fetch leaderboard');
  }
});

// ── Stats: skill verification platform stats ──
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [totalSubmissions, gradedSubmissions, passedSubmissions, avgScore] = await Promise.all([
      SkillSubmission.countDocuments(),
      SkillSubmission.countDocuments({ status: 2 }),
      SkillSubmission.countDocuments({ status: 2, score: { $gte: 80 } }),
      SkillSubmission.aggregate([
        { $match: { status: 2 } },
        { $group: { _id: null, avg: { $avg: '$score' } } },
      ]),
    ]);

    sendSuccess(res, {
        totalSubmissions,
        gradedSubmissions,
        passedSubmissions,
        passRate: gradedSubmissions > 0 ? Math.round((passedSubmissions / gradedSubmissions) * 100) : 0,
        averageScore: avgScore[0]?.avg ? Math.round(avgScore[0].avg) : 0,
    });
  } catch (error) {
    logger.error('Failed to fetch skill stats:', error);
    sendServerError(res, 'Failed to fetch stats');
  }
});

export default router;
