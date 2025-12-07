import { Router, Request, Response } from 'express';
import { blockchainService } from '../services/blockchain.service.js';
import { ipfsService } from '../services/ipfs.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/skills/tests
 * List all available skill tests
 */
router.get('/tests', async (req: Request, res: Response) => {
  try {
    // In production, we'd paginate through contract
    const tests = [];
    
    for (let i = 0; i < 10; i++) {
      try {
        const test = await blockchainService.getSkillTest(i);
        if (test.isActive) {
          tests.push({ id: i, ...test });
        }
      } catch {
        break; // No more tests
      }
    }

    res.json({ success: true, tests });
  } catch (error) {
    logger.error('Failed to fetch skill tests:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tests' });
  }
});

/**
 * GET /api/skills/tests/:id
 * Get specific skill test details
 */
router.get('/tests/:id', async (req: Request, res: Response) => {
  try {
    const testId = parseInt(req.params.id);
    const test = await blockchainService.getSkillTest(testId);
    
    res.json({ success: true, test: { id: testId, ...test } });
  } catch (error) {
    logger.error(`Failed to fetch test ${req.params.id}:`, error);
    res.status(404).json({ success: false, error: 'Test not found' });
  }
});

/**
 * POST /api/skills/submit
 * Upload submission to IPFS (client handles on-chain submission)
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { testId, content, metadata } = req.body;

    if (!testId || !content) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Upload submission to IPFS
    const submission = {
      testId,
      content,
      metadata: metadata || {},
      submittedAt: new Date().toISOString(),
    };

    const cid = await ipfsService.uploadJSON(submission, `submission-${Date.now()}.json`);

    res.json({ 
      success: true, 
      cid,
      ipfsUrl: ipfsService.getGatewayUrl(cid),
    });
  } catch (error) {
    logger.error('Failed to upload submission:', error);
    res.status(500).json({ success: false, error: 'Failed to upload submission' });
  }
});

/**
 * GET /api/skills/badges/:address
 * Get user's skill badges
 */
router.get('/badges/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const profile = await blockchainService.getUserProfile(address);
    
    // Filter for SKILL attestations
    const skillBadges = profile.attestations.filter((a: any) => a.type === 0);

    res.json({ 
      success: true, 
      badges: skillBadges,
      totalBadges: skillBadges.length,
    });
  } catch (error) {
    logger.error(`Failed to fetch badges for ${req.params.address}:`, error);
    res.status(500).json({ success: false, error: 'Failed to fetch badges' });
  }
});

export default router;
