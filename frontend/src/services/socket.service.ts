import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;

/**
 * Connect to Socket.IO server using cookie-based session auth.
 */
export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.error('🔌 Socket connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  return socket;
}

/**
 * Disconnect the Socket.IO client.
 * Call this on logout.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get the current Socket.IO client instance.
 * Returns null if not connected.
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Join a conversation room to receive real-time messages.
 */
export function joinConversation(conversationId: string): void {
  socket?.emit('join_conversation', conversationId);
}

/**
 * Leave a conversation room.
 */
export function leaveConversation(conversationId: string): void {
  socket?.emit('leave_conversation', conversationId);
}

/**
 * Emit typing start indicator.
 */
export function emitTypingStart(conversationId: string): void {
  socket?.emit('typing_start', conversationId);
}

/**
 * Emit typing stop indicator.
 */
export function emitTypingStop(conversationId: string): void {
  socket?.emit('typing_stop', conversationId);
}
