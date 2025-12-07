import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken'; // Fixes "jwt.verify is not a function"
import { logger } from '../utils/logger';

// 1. Define what the User object looks like inside the token
export interface UserPayload extends jwt.JwtPayload {
  walletAddress: string;
}

// 2. Extend Express Request to include 'user'
export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

// 3. Secure Secret Handling
const SECRET_KEY = process.env.JWT_SECRET || 'UNSAFE_DEFAULT_SECRET';

if (!process.env.JWT_SECRET) {
  logger.warn('⚠️ JWT_SECRET missing in .env. Using unsafe default.');
}

export const authenticateToken = (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  
  // Handle "Bearer <token>" or just "<token>"
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.split(' ')[1] 
    : authHeader;

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access denied. Token required.' 
    });
  }

  // 4. Verify with explicit types
  jwt.verify(token, SECRET_KEY, (err: jwt.VerifyErrors | null, decoded: string | jwt.JwtPayload | undefined) => {
    if (err) {
      const message = err.name === 'TokenExpiredError' 
        ? 'Session expired. Please login again.' 
        : 'Invalid token.';
      
      return res.status(403).json({ success: false, message });
    }

    if (!decoded) {
      return res.status(403).json({ success: false, message: 'Token payload empty.' });
    }

    // Success! Attach user to request
    req.user = decoded as UserPayload;
    next();
  });
};

export function generateToken(walletAddress: string): string {
  return jwt.sign({ walletAddress }, SECRET_KEY, { expiresIn: '7d' });
}