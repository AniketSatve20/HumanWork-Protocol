import { Request, Response } from 'express';
import crypto from 'crypto';
import { ethers } from 'ethers';
import { generateToken } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';
import Nonce from '../models/Nonce.js';
import User from '../models/User.js';
import { SecureUser, type UserRole } from '../models/SecureUser.js';

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const AUTH_COOKIE_NAME = 'authToken';
const AUTH_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h
const ALLOWED_REGISTRATION_ROLES: ReadonlySet<UserRole> = new Set(['freelancer', 'recruiter']);

const authCookieBaseOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
};

// In-memory fallback when MongoDB is unavailable
const memoryNonces = new Map<string, { nonce: string; message: string; expiresAt: Date }>();

/**
 * GET /api/auth/nonce?address=0x...
 * Returns a unique nonce + message for the wallet to sign.
 */
export const getNonce = async (req: Request, res: Response): Promise<void> => {
  const address = (req.query.address as string) || (req.body.address as string);

  if (!address || !ethers.isAddress(address)) {
    res.status(400).json({ success: false, message: 'Valid wallet address required.' });
    return;
  }

  const nonce = crypto.randomBytes(32).toString('hex');
  const message = `Sign this message to authenticate with HumanWork Protocol.\n\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
  const key = address.toLowerCase();

  try {
    await Nonce.findOneAndUpdate(
      { address: key },
      { nonce, message, expiresAt: new Date(Date.now() + NONCE_TTL_MS) },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, nonce, message });
  } catch (error) {
    // MongoDB unavailable — use in-memory fallback
    logger.warn('MongoDB unavailable for nonce, using in-memory fallback');
    memoryNonces.set(key, { nonce, message, expiresAt: new Date(Date.now() + NONCE_TTL_MS) });
    res.status(200).json({ success: true, nonce, message });
  }
};

/**
 * POST /api/auth/verify
 * Body: { walletAddress, signature }
 * Verifies the signed nonce message and issues an auth cookie.
 */
export const verifySignature = async (req: Request, res: Response): Promise<void> => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      res.status(400).json({ success: false, message: 'Missing walletAddress or signature.' });
      return;
    }

    const key = walletAddress.toLowerCase();
    
    // Try MongoDB first, then memory fallback
    let stored: { nonce: string; message: string; expiresAt: Date } | null = null;
    let usingMemory = false;

    try {
      stored = await Nonce.findOne({ address: key });
    } catch {
      // MongoDB unavailable
    }

    if (!stored && memoryNonces.has(key)) {
      stored = memoryNonces.get(key)!;
      usingMemory = true;
    }

    if (!stored) {
      res.status(401).json({ success: false, message: 'No pending nonce. Request /api/auth/nonce first.' });
      return;
    }

    if (stored.expiresAt < new Date()) {
      if (usingMemory) {
        memoryNonces.delete(key);
      } else {
        await Nonce.deleteOne({ address: key }).catch(() => {});
      }
      res.status(401).json({ success: false, message: 'Nonce expired. Request a new one.' });
      return;
    }

    // Verify the signature against the nonce message
    const recoveredAddress = ethers.verifyMessage(stored.message, signature);

    if (recoveredAddress.toLowerCase() !== key) {
      logger.warn(`Auth failed: Signature from ${recoveredAddress} did not match ${walletAddress}`);
      if (usingMemory) {
        memoryNonces.delete(key);
      } else {
        await Nonce.deleteOne({ address: key }).catch(() => {});
      }
      res.status(401).json({ success: false, message: 'Invalid signature. Wallet ownership not proven.' });
      return;
    }

    // Nonce is single-use — delete it
    if (usingMemory) {
      memoryNonces.delete(key);
    } else {
      await Nonce.deleteOne({ address: key }).catch(() => {});
    }

    const token = generateToken(walletAddress);

    logger.info(`🔐 User authenticated: ${walletAddress}`);

    res.cookie(AUTH_COOKIE_NAME, token, {
      ...authCookieBaseOptions,
      maxAge: AUTH_COOKIE_MAX_AGE_MS,
    });

    res.status(200).json({ success: true, walletAddress });
  } catch (error: any) {
    logger.error('Signature verification error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify signature.' });
  }
};

/**
 * POST /api/auth/logout
 * Clears auth cookie.
 */
export const logout = (_req: Request, res: Response): void => {
  res.clearCookie(AUTH_COOKIE_NAME, authCookieBaseOptions);
  res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

/**
 * POST /api/auth/register
 * Body: { role, name?, walletAddress? }
 * Persists role for fail-closed RBAC and optional display alias.
 */
export const registerAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const walletAddress = req.user?.walletAddress;
    const walletAddressLower = walletAddress?.toLowerCase();

    if (!walletAddress || !walletAddressLower) {
      res.status(401).json({ success: false, message: 'Access denied. Token required.' });
      return;
    }

    const { role, name, walletAddress: requestedWalletAddress } = req.body ?? {};

    if (typeof requestedWalletAddress === 'string' && requestedWalletAddress.toLowerCase() !== walletAddressLower) {
      res.status(403).json({ success: false, message: 'Cannot register another wallet address.' });
      return;
    }

    if (typeof role !== 'string' || !ALLOWED_REGISTRATION_ROLES.has(role as UserRole)) {
      res.status(400).json({ success: false, message: 'Invalid role. Must be freelancer or recruiter.' });
      return;
    }

    const safeAlias = typeof name === 'string' ? name.trim().slice(0, 100) : '';

    await SecureUser.findOneAndUpdate(
      {
        $or: [
          { walletAddressLower },
          { walletAddress: walletAddressLower },
        ],
      },
      {
        $set: {
          walletAddress: walletAddressLower,
          walletAddressLower,
          role,
          ...(safeAlias ? { publicAlias: safeAlias } : {}),
        },
        $setOnInsert: {
          registrationDate: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    if (safeAlias) {
      await User.findOneAndUpdate(
        { walletAddressLower },
        {
          $set: {
            walletAddress: walletAddressLower,
            displayName: safeAlias,
          },
          $setOnInsert: {
            walletAddressLower,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    res.status(200).json({
      success: true,
      walletAddress: walletAddressLower,
      role,
    });
  } catch (error) {
    logger.error('Registration persistence error:', error);
    res.status(500).json({ success: false, message: 'Failed to persist registration data.' });
  }
};
