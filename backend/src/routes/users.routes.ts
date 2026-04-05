import { getFreelancerWorkHistory } from '../services/workHistoryService.js';
import { Router, Request, Response } from 'express';
import { blockchainService } from '../services/blockchain.service.js';
import { logger } from '../utils/logger.js';
import { authenticateToken, AuthenticatedRequest, requireRoles } from '../middleware/auth.middleware.js';
import User from '../models/User.js';
import { sanitizeTextField, sanitizeUrl } from '../utils/sanitize.js';
import {
  sendSuccess, sendBadRequest, sendForbidden, sendNotFound,
  sendServerError,
} from '../utils/apiResponse.js';

const router = Router();

// ── User profile routes (auth is in auth.routes.ts) ──────────────────────────

// GET /:address/work-history — Narrative Flow tree for freelancer
router.get('/:address/work-history', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const tree = await getFreelancerWorkHistory(address);
    sendSuccess(res, tree);
  } catch (error) {
    logger.error(`Failed to fetch work history for ${req.params.address}:`, error);
    sendServerError(res, 'Failed to fetch work history');
  }
});

// GET /:address — Public profile (merges on-chain + off-chain data)
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // Fetch on-chain data
    let onChainProfile: any = null;
    try {
      onChainProfile = await blockchainService.getUserProfile(address);
    } catch {
      // User may not be registered on-chain yet
    }

    // Fetch off-chain profile from MongoDB
    const dbUser = await User.findOne({ walletAddressLower: address.toLowerCase() });

    sendSuccess(res, {
        address,
        // On-chain fields
        level: onChainProfile?.level ?? dbUser?.level ?? 0,
        hasDeposited: onChainProfile?.hasDeposited ?? false,
        isVerifiedHuman: onChainProfile?.isVerifiedHuman ?? false,
        registrationTime: onChainProfile?.registrationTime ?? dbUser?.registrationTime,
        attestations: onChainProfile?.attestations ?? [],
        // Off-chain fields
        displayName: dbUser?.displayName,
        bio: dbUser?.bio,
        email: undefined, // Never expose email publicly
        skills: dbUser?.skills ?? [],
        hourlyRate: dbUser?.hourlyRate,
        portfolio: dbUser?.portfolio ?? [],
        socialLinks: dbUser?.socialLinks,
        avatarIpfsHash: dbUser?.avatarIpfsHash,
        totalProjects: dbUser?.totalProjects ?? 0,
        completedProjects: dbUser?.completedProjects ?? 0,
        totalEarned: dbUser?.totalEarned ?? '0',
        averageRating: dbUser?.averageRating,
    });
  } catch (error) {
    logger.error(`Failed to fetch user ${req.params.address}:`, error);
    sendNotFound(res, 'User not found');
  }
});

// PUT /:address — Update off-chain profile (auth required, own profile only)
router.put('/:address', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { address } = req.params;

    // Ensure user can only update their own profile
    if (req.user?.walletAddress.toLowerCase() !== address.toLowerCase()) {
      sendForbidden(res, 'Cannot update another user\'s profile');
      return;
    }

    const allowedFields = [
      'displayName', 'bio', 'email', 'skills', 'hourlyRate',
      'portfolio', 'socialLinks', 'avatarIpfsHash',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Sanitize each field based on its type (SAST-015, SAST-022)
        switch (field) {
          case 'displayName':
            updates[field] = sanitizeTextField(req.body[field], 100);
            break;
          case 'bio':
            updates[field] = sanitizeTextField(req.body[field], 1000);
            break;
          case 'email': {
            const email = req.body[field];
            if (typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              updates[field] = email.toLowerCase().trim();
            }
            break;
          }
          case 'skills':
            if (Array.isArray(req.body[field])) {
              updates[field] = req.body[field].slice(0, 20).map((s: unknown) => sanitizeTextField(s, 50)).filter(Boolean);
            }
            break;
          case 'hourlyRate': {
            const rate = Number(req.body[field]);
            if (isFinite(rate) && rate >= 0 && rate <= 10000) {
              updates[field] = rate;
            }
            break;
          }
          case 'portfolio':
            if (Array.isArray(req.body[field])) {
              updates[field] = req.body[field].slice(0, 10).map((u: unknown) => sanitizeUrl(u)).filter(Boolean);
            }
            break;
          case 'socialLinks': {
            const links = req.body[field];
            if (typeof links === 'object' && !Array.isArray(links)) {
              updates[field] = {
                github: sanitizeUrl(links.github),
                linkedin: sanitizeUrl(links.linkedin),
                twitter: sanitizeUrl(links.twitter),
                website: sanitizeUrl(links.website),
              };
            }
            break;
          }
          case 'avatarIpfsHash': {
            const hash = req.body[field];
            if (typeof hash === 'string' && /^[a-zA-Z0-9]{10,100}$/.test(hash)) {
              updates[field] = hash;
            }
            break;
          }
          default:
            updates[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      sendBadRequest(res, 'No valid fields to update');
      return;
    }

    const user = await User.findOneAndUpdate(
      { walletAddressLower: address.toLowerCase() },
      {
        $set: { ...updates, walletAddress: address },
        $setOnInsert: { walletAddressLower: address.toLowerCase() },
      },
      { upsert: true, new: true, runValidators: true }
    );

    logger.info(`Profile updated for ${address}`);
    // Strip sensitive fields from response
    const safeUser = user.toObject() as any;
    delete safeUser.email;
    sendSuccess(res, safeUser);
  } catch (error) {
    logger.error(`Failed to update user ${req.params.address}:`, error);
    sendServerError(res, 'Failed to update profile');
  }
});

// GET /:address/reputation
router.get('/:address/reputation', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const profile = await blockchainService.getUserProfile(address);
    
    const positiveCount = profile.attestations.filter((a: any) => a.isPositive).length;
    const negativeCount = profile.attestations.filter((a: any) => !a.isPositive).length;
    
    const reputationScore = Math.max(0, Math.min(100, 
      50 + (positiveCount * 10) - (negativeCount * 20)
    ));

    sendSuccess(res, {
        score: reputationScore,
        positiveAttestations: positiveCount,
        negativeAttestations: negativeCount,
        totalAttestations: profile.attestations.length,
        level: profile.level,
        isVerifiedHuman: profile.isVerifiedHuman,
    });
  } catch (error) {
    logger.error(`Failed to fetch reputation for ${req.params.address}:`, error);
    sendServerError(res, 'Failed to fetch reputation');
  }
});

// GET /:address/stats — Dashboard stats computed from on-chain + off-chain data
router.get('/:address/stats', authenticateToken, requireRoles('admin', 'recruiter', 'freelancer'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { address } = req.params;
    const requestedAddressLower = address.toLowerCase();
    const requesterAddressLower = req.user?.walletAddressLower;
    const requesterRole = req.user?.role;

    const isSelf = requesterAddressLower === requestedAddressLower;
    const isAdmin = requesterRole === 'admin';

    if (!isSelf && !isAdmin) {
      sendForbidden(res, 'You can only view your own stats unless you are an admin');
      return;
    }

    const dbUser = await User.findOne({ walletAddressLower: address.toLowerCase() });

    // Fetch on-chain profile for attestation data
    let onChain: any = null;
    try {
      onChain = await blockchainService.getUserProfile(address);
    } catch { /* not registered */ }

    const skillBadges = onChain?.attestations?.filter((a: any) => a.attestationType === 0)?.length ?? 0;

    sendSuccess(res, {
        totalEarned: dbUser?.totalEarned ?? '0',
        totalProjects: dbUser?.totalProjects ?? 0,
        completedProjects: dbUser?.completedProjects ?? 0,
        averageRating: dbUser?.averageRating ?? 0,
        skillBadges,
        level: onChain?.level ?? dbUser?.level ?? 0,
    });
  } catch (error) {
    logger.error(`Failed to fetch stats for ${req.params.address}:`, error);
    sendServerError(res, 'Failed to fetch stats');
  }
});

export default router;
