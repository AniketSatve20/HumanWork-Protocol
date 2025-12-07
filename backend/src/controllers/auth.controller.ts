// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { generateToken } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

// The fixed message users sign to prove ownership of their wallet
const SIGNING_MESSAGE = "Welcome to HumanWork Protocol. Sign this message to authenticate.";

/**
 * GET /api/auth/message
 * Returns the message that the frontend needs to sign.
 */
export const getAuthMessage = (req: Request, res: Response) => {
  res.status(200).json({ 
    success: true, 
    message: SIGNING_MESSAGE 
  });
};

/**
 * POST /api/auth/verify
 * Verifies the signature and issues a JWT.
 * Body: { walletAddress: string, signature: string }
 */
export const verifySignature = async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing walletAddress or signature.' 
      });
    }

    // 1. Recover the address from the signature
    // This confirms that the person who signed the message actually owns the wallet
    const recoveredAddress = ethers.verifyMessage(SIGNING_MESSAGE, signature);

    // 2. Verify the recovered address matches the claimed address
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      logger.warn(`Auth failed: Signature from ${recoveredAddress} did not match ${walletAddress}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid signature. Wallet ownership not proven.' 
      });
    }

    // 3. Generate JWT (Valid for 7 days)
    const token = generateToken(walletAddress);

    logger.info(`🔐 User authenticated: ${walletAddress}`);

    res.status(200).json({ 
      success: true, 
      token, 
      walletAddress 
    });

  } catch (error: any) {
    logger.error('Signature verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify signature.' 
    });
  }
};