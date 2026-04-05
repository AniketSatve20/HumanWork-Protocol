import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import type { UserPayload } from './middleware/auth.middleware.js';
import { Conversation } from './models/Message.js';

// Extend Socket type with user data
interface AuthenticatedSocket extends Socket {
  user?: UserPayload;
}

let io: Server | null = null;
const AUTH_COOKIE_NAME = 'authToken';

function getCookieValue(cookieHeader: string | undefined, cookieName: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookiePairs = cookieHeader.split(';');
  for (const pair of cookiePairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;

    const name = trimmed.slice(0, separatorIndex);
    if (name !== cookieName) continue;

    const value = trimmed.slice(separatorIndex + 1);
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

/**
 * Initialize Socket.IO server with JWT authentication.
 * Users join rooms named after their wallet address (lowercase)
 * so messages can be pushed to specific users.
 */
export function setupSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── JWT Authentication Middleware ─────────────────────────────────────────
  io.use((socket: AuthenticatedSocket, next) => {
    const cookieHeader = socket.handshake.headers.cookie;
    const token = getCookieValue(cookieHeader, AUTH_COOKIE_NAME);

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret, { algorithms: [config.jwt.algorithm] }) as UserPayload;
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection Handler ────────────────────────────────────────────────────
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userAddress = socket.user?.walletAddress?.toLowerCase();

    if (!userAddress) {
      socket.disconnect(true);
      return;
    }

    // Join a personal room so we can push messages to this user
    socket.join(`user:${userAddress}`);
    logger.info(`🔌 Socket connected: ${userAddress} (${socket.id})`);

    // ── Join conversation room (with authorization check) ────────────────
    socket.on('join_conversation', async (conversationId: string) => {
      if (!conversationId) return;
      try {
        // Verify user is a participant in this conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          'participants.addressLower': userAddress,
        }).lean();
        if (!conversation) {
          socket.emit('error', { message: 'Not authorized to join this conversation' });
          return;
        }
        socket.join(`conversation:${conversationId}`);
        logger.debug(`User ${userAddress} joined conversation ${conversationId}`);
      } catch {
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    // ── Leave conversation room ───────────────────────────────────────────
    socket.on('leave_conversation', (conversationId: string) => {
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
        logger.debug(`User ${userAddress} left conversation ${conversationId}`);
      }
    });

    // ── Typing indicators ─────────────────────────────────────────────────
    socket.on('typing_start', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        userAddress,
      });
    });

    socket.on('typing_stop', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
        conversationId,
        userAddress,
      });
    });

    // ── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Socket disconnected: ${userAddress} (${reason})`);
    });
  });

  logger.info('🔌 Socket.IO server initialized');
  return io;
}

/**
 * Get the Socket.IO server instance (for emitting from routes/services).
 */
export function getIO(): Server | null {
  return io;
}
