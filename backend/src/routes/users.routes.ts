import { Router, Request, Response } from 'express';
import { blockchainService } from '../services/blockchain.service.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

const router = Router();

// Store nonces for wallet signature verification
const nonces = new Map<string, { nonce: string; expires: number }>();

/**
 * POST /api/users/nonce
 * Generate nonce for wallet signature
 */
router.post('/nonce', (req: Request, res: Response) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ success: false, error: 'Address required' });
  }

  const nonce = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 5 * 60 * 1000; // 5 minutes

  nonces.set(address.toLowerCase(), { nonce, expires });

  res.json({
    success: true,
    nonce,
    message: `Sign this message to authenticate with HumanWork Protocol:\n\nNonce: ${nonce}`,
  });
});

/**
 * POST /api/users/verify
 * Verify wallet signature
 */
router.post('/verify', async (req: Request, res: Response) => {
  const { address, signature } = req.body;

  if (!address || !signature) {
    return res.status(400).json({ success: false, error: 'Address and signature required' });
  }

  const stored = nonces.get(address.toLowerCase());
  
  if (!stored || stored.expires < Date.now()) {
    return res.status(401).json({ success: false, error: 'Nonce expired or not found' });
  }

  // In production, verify the signature matches
  // For now, accept any signature for demo
  nonces.delete(address.toLowerCase());

  // Fetch user profile from blockchain
  try {
    const profile = await blockchainService.getUserProfile(address);
    
    res.json({
      success: true,
      user: {
        address,
        ...profile,
      },
    });
  } catch (error) {
    // User not registered yet
    res.json({
      success: true,
      user: {
        address,
        level: 0,
        isVerifiedHuman: false,
        attestations: [],
      },
    });
  }
});

/**
 * GET /api/users/:address
 * Get user profile
 */
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const profile = await blockchainService.getUserProfile(address);
    
    res.json({
      success: true,
      user: {
        address,
        ...profile,
      },
    });
  } catch (error) {
    logger.error(`Failed to fetch user ${req.params.address}:`, error);
    res.status(404).json({ success: false, error: 'User not found' });
  }
});

/**
 * GET /api/users/:address/reputation
 * Get user reputation score
 */
router.get('/:address/reputation', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const profile = await blockchainService.getUserProfile(address);
    
    // Calculate reputation from attestations
    const positiveCount = profile.attestations.filter((a: any) => a.isPositive).length;
    const negativeCount = profile.attestations.filter((a: any) => !a.isPositive).length;
    
    const reputationScore = Math.max(0, Math.min(100, 
      50 + (positiveCount * 10) - (negativeCount * 20)
    ));

    res.json({
      success: true,
      reputation: {
        score: reputationScore,
        positiveAttestations: positiveCount,
        negativeAttestations: negativeCount,
        totalAttestations: profile.attestations.length,
        level: profile.level,
        isVerifiedHuman: profile.isVerifiedHuman,
      },
    });
  } catch (error) {
    logger.error(`Failed to fetch reputation for ${req.params.address}:`, error);
    res.status(500).json({ success: false, error: 'Failed to fetch reputation' });
  }
});

export default router;
