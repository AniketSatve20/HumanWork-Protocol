import { Request, Response } from 'express';
import { SkillSubmission } from '../models/SkillSubmission.js';
import { User } from '../models/User.js';
import { sendSuccess, sendServerError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// Dummy: Replace with actual DisputeJury contract address
const DISPUTE_JURY_ADDRESS = '0x3bB6';

/**
 * GET /api/analytics/radar/:userId
 * Returns HostRadarChart data for a user, including Narrative Glitch if flagged.
 */
export const getRadarData = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) return sendServerError(res, 'Missing userId');

    // Fetch latest SkillSubmission with AI scores for this user
    const submission = await SkillSubmission.findOne({ applicant: userId, status: 2 })
      .sort({ gradingCompletedAt: -1 });
    if (!submission) return sendSuccess(res, { found: false });

    // Map AI scores to radar chart format
    // Fallback to 0 if missing
    const radarData = {
      technicalPrecision: submission.gradingDetails?.correctness ?? submission.score ?? 0,
      narrativeConsistency: submission.gradingDetails?.style ?? 0,
      improvisation: submission.gradingDetails?.efficiency ?? 0,
      cognitiveFluidity: submission.gradingDetails?.security ?? 0,
      protocolAdherence: submission.score ?? 0,
    };

    // Check for Dispute flag (simulate: if user.narrativeState === 'Dispute')
    const user = await User.findOne({ walletAddress: userId });
    let narrativeGlitch = false;
    if (user && user.narrativeState && user.narrativeState.toLowerCase().includes('dispute')) {
      narrativeGlitch = true;
    }

    sendSuccess(res, { found: true, radarData, narrativeGlitch });
  } catch (err) {
    logger.error('Radar data error', err);
    sendServerError(res, 'Failed to fetch radar data');
  }
};
