import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// User payload interface
export interface UserPayload {
  walletAddress: string;
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
  const authHeader = req.headers['authorization'];
  
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : authHeader;

  if (!token) {
    res.status(401).json({ 
      success: false, 
      message: 'Access denied. Token required.' 
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as UserPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    const message = err.name === 'TokenExpiredError' 
      ? 'Session expired. Please login again.' 
      : 'Invalid token.';
    
    res.status(403).json({ success: false, message });
  }
};

export function generateToken(walletAddress: string): string {
  const expiresIn = (config.jwt.expiresIn || '7d') as any;
  return jwt.sign({ walletAddress }, SECRET_KEY, { expiresIn });
}
