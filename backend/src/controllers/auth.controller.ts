import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { generateToken } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';

const SIGNING_MESSAGE = "Welcome to HumanWork Protocol. Sign this message to authenticate.";

export const getAuthMessage = (_req: Request, res: Response): void => {
  res.status(200).json({ 
    success: true, 
    message: SIGNING_MESSAGE 
  });
};

export const verifySignature = async (req: Request, res: Response): Promise<void> => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      res.status(400).json({ 
        success: false, 
        message: 'Missing walletAddress or signature.' 
      });
      return;
    }

    const recoveredAddress = ethers.verifyMessage(SIGNING_MESSAGE, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      logger.warn(`Auth failed: Signature from ${recoveredAddress} did not match ${walletAddress}`);
      res.status(401).json({ 
        success: false, 
        message: 'Invalid signature. Wallet ownership not proven.' 
      });
      return;
    }

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
