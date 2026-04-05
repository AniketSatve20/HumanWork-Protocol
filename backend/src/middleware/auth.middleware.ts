import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { SecureUser, type UserRole } from '../models/SecureUser.js';

// User payload interface
export interface UserPayload {
  walletAddress: string;
  walletAddressLower?: string;
  role?: UserRole;
  iat?: number;
  exp?: number;
}

// Extended Request with user
export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

const SECRET_KEY = config.jwt.secret;

if (SECRET_KEY === 'unsafe-default-secret-change-in-production') {
  logger.warn('⚠️ JWT_SECRET using default value. Set JWT_SECRET in .env for production.');
}

export const authenticateToken = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): void => {
  const token = req.cookies?.authToken || null;

  if (!token) {
    res.status(401).json({ 
      success: false, 
      message: 'Access denied. Token required.' 
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY, { algorithms: [config.jwt.algorithm] }) as UserPayload;
    req.user = {
      ...decoded,
      walletAddress: decoded.walletAddress,
      walletAddressLower: decoded.walletAddress?.toLowerCase(),
    };
    next();
  } catch (err: any) {
    const message = err.name === 'TokenExpiredError' 
      ? 'Session expired. Please login again.' 
      : 'Invalid token.';
    
    res.status(403).json({ success: false, message });
  }
};

async function resolveRoleFromDatabase(walletAddress: string): Promise<UserRole | null> {
  const walletAddressLower = walletAddress.toLowerCase();

  const secureUser = await SecureUser.findOne(
    {
      $or: [
        { walletAddressLower },
        { walletAddress: walletAddressLower },
      ],
    },
    { role: 1 }
  ).lean();

  if (!secureUser?.role) {
    return null;
  }

  return secureUser.role as UserRole;
}

export const requireRoles = (...allowedRoles: UserRole[]) => {
  const allowedRoleSet = new Set<UserRole>(allowedRoles);

  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const walletAddress = req.user?.walletAddress;

    if (!walletAddress) {
      res.status(401).json({
        success: false,
        message: 'Access denied. Token required.',
      });
      return;
    }

    try {
      // Server-side RBAC source of truth: role from secure DB record only.
      const role = await resolveRoleFromDatabase(walletAddress);

      if (!role) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Role is not configured for this account.',
        });
        return;
      }

      if (!allowedRoleSet.has(role)) {
        res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        });
        return;
      }

      req.user = {
        ...req.user,
        walletAddress,
        walletAddressLower: walletAddress.toLowerCase(),
        role,
      };

      next();
    } catch (error) {
      logger.error('RBAC role lookup failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to authorize request.',
      });
    }
  };
};

export const requireRole = (role: UserRole) => requireRoles(role);

export function generateToken(walletAddress: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (jwt.sign as any)({ walletAddress }, SECRET_KEY, { 
    expiresIn: config.jwt.expiresIn,
    algorithm: config.jwt.algorithm,
  });
}
