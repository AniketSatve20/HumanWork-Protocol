import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Message, Conversation } from '../models/Message.js';
import { Project } from '../models/Project.js';
import { JobListing } from '../models/JobListing.js';
import { User } from '../models/User.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';
import { getIO } from '../socket.js';
import { sanitizeHtml } from '../utils/sanitize.js';
import {
  sendSuccess, sendBadRequest, sendUnauthorized, sendNotFound,
  sendServerError, sendForbidden,
} from '../utils/apiResponse.js';

// Allowed message types — prevents type spoofing (SAST-018)
const ALLOWED_MESSAGE_TYPES = ['text', 'file', 'image'] as const;

type ConversationParticipantRole = 'recruiter' | 'freelancer';

interface ResolvedRequesterIdentity {
  address: string;
  addressLower: string;
}

interface JobConversationContext {
  jobId: number;
  jobTitle: string;
  recruiterAddress: string;
  recruiterLower: string;
  freelancerAddress: string | null;
  freelancerLower: string | null;
}

interface ConversationLike {
  jobId: number;
  participants: Array<{ addressLower: string }>;
}

const router = Router();

// Helper to get unread count from either Map or plain object
function getUnreadCount(unreadCount: Map<string, number> | Record<string, number> | undefined, key: string): number {
  if (!unreadCount) return 0;
  if (unreadCount instanceof Map) {
    return unreadCount.get(key) || 0;
  }
  return (unreadCount as Record<string, number>)[key] || 0;
}

function parseJobId(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

async function resolveRequesterIdentity(req: AuthenticatedRequest): Promise<ResolvedRequesterIdentity | null> {
  const walletAddress = req.user?.walletAddress?.trim();
  if (walletAddress) {
    return {
      address: walletAddress,
      addressLower: walletAddress.toLowerCase(),
    };
  }

  const userId = typeof (req.user as { userId?: unknown } | undefined)?.userId === 'string'
    ? ((req.user as { userId?: string }).userId || '').trim()
    : '';

  if (!userId) {
    return null;
  }

  const orClauses: Array<Record<string, unknown>> = [
    { walletAddressLower: userId.toLowerCase() },
    { walletAddress: userId },
  ];

  if (mongoose.Types.ObjectId.isValid(userId)) {
    orClauses.unshift({ _id: new mongoose.Types.ObjectId(userId) });
  }

  const user = await User.findOne(
    { $or: orClauses },
    { walletAddress: 1, walletAddressLower: 1 }
  ).lean();

  if (!user?.walletAddress) {
    return null;
  }

  return {
    address: user.walletAddress,
    addressLower: user.walletAddress.toLowerCase(),
  };
}

async function resolveJobConversationContext(jobId: number): Promise<JobConversationContext | null> {
  const listing = await JobListing.findOne(
    { jobId },
    {
      jobId: 1,
      title: 1,
      clientAddress: 1,
      clientAddressLower: 1,
      assignedFreelancerAddress: 1,
      onChainProjectId: 1,
    }
  ).lean();

  const projectIdsToTry = new Set<number>([jobId]);
  if (listing?.onChainProjectId !== undefined && listing.onChainProjectId !== null) {
    const onChainProjectId = Number(listing.onChainProjectId);
    if (Number.isFinite(onChainProjectId) && onChainProjectId > 0) {
      projectIdsToTry.add(onChainProjectId);
    }
  }

  let project: {
    title?: string;
    client?: string;
    clientLower?: string;
    freelancer?: string;
    freelancerLower?: string;
  } | null = null;

  for (const projectId of projectIdsToTry) {
    const candidate = await Project.findOne(
      { projectId },
      { title: 1, client: 1, clientLower: 1, freelancer: 1, freelancerLower: 1 }
    ).lean();

    if (candidate) {
      project = candidate;
      break;
    }
  }

  const recruiterAddress = (project?.client || listing?.clientAddress || '').trim();
  if (!recruiterAddress) {
    return null;
  }

  const recruiterLower = (
    project?.clientLower || listing?.clientAddressLower || recruiterAddress.toLowerCase()
  ).toLowerCase();

  const freelancerAddressRaw = (project?.freelancer || listing?.assignedFreelancerAddress || '').trim();
  const freelancerAddress = freelancerAddressRaw || null;
  const freelancerLower = freelancerAddress
    ? (project?.freelancerLower || freelancerAddress.toLowerCase()).toLowerCase()
    : null;

  return {
    jobId,
    jobTitle: project?.title || listing?.title || `Project #${jobId}`,
    recruiterAddress,
    recruiterLower,
    freelancerAddress,
    freelancerLower,
  };
}

function getRequesterConversationRole(
  jobContext: JobConversationContext,
  requesterLower: string
): ConversationParticipantRole | null {
  if (requesterLower === jobContext.recruiterLower) {
    return 'recruiter';
  }
  if (jobContext.freelancerLower && requesterLower === jobContext.freelancerLower) {
    return 'freelancer';
  }
  return null;
}

function hasAuthorizedParticipantPair(
  conversation: ConversationLike,
  jobContext: JobConversationContext
): boolean {
  if (!jobContext.freelancerLower) {
    return false;
  }

  const participantSet = new Set(
    (conversation.participants || [])
      .map((participant) => participant.addressLower?.toLowerCase())
      .filter((address): address is string => Boolean(address))
  );

  if (participantSet.size !== 2) {
    return false;
  }

  return participantSet.has(jobContext.recruiterLower) && participantSet.has(jobContext.freelancerLower);
}

async function validateConversationAccessForRequester(
  conversation: ConversationLike,
  requesterLower: string,
  cache?: Map<number, JobConversationContext | null>
): Promise<JobConversationContext | null> {
  const jobId = parseJobId(conversation.jobId);
  if (!jobId) {
    return null;
  }

  let jobContext: JobConversationContext | null;
  if (cache) {
    if (!cache.has(jobId)) {
      cache.set(jobId, await resolveJobConversationContext(jobId));
    }
    jobContext = cache.get(jobId) ?? null;
  } else {
    jobContext = await resolveJobConversationContext(jobId);
  }

  if (!jobContext?.freelancerLower) {
    return null;
  }

  if (!hasAuthorizedParticipantPair(conversation, jobContext)) {
    return null;
  }

  const requesterRole = getRequesterConversationRole(jobContext, requesterLower);
  if (!requesterRole) {
    return null;
  }

  return jobContext;
}

// All routes require authentication
router.use(authenticateToken);

// Get all conversations for the authenticated user
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const requester = await resolveRequesterIdentity(req as AuthenticatedRequest);
    const userAddress = requester?.addressLower;
    
    if (!userAddress) {
      sendUnauthorized(res);
      return;
    }

    const conversations = await Conversation.find({
      'participants.addressLower': userAddress
    })
      .sort({ updatedAt: -1 })
      .lean();

    const jobContextCache = new Map<number, JobConversationContext | null>();
    const authorizedConversations = (
      await Promise.all(
        conversations.map(async (conv) => {
          const context = await validateConversationAccessForRequester(
            conv as unknown as ConversationLike,
            userAddress,
            jobContextCache
          );

          if (!context) {
            return null;
          }

          return { conv, context };
        })
      )
    ).filter(
      (entry): entry is { conv: typeof conversations[number]; context: JobConversationContext } => entry !== null
    );

    // Transform for frontend - filter out current user from participants display
    const transformed = authorizedConversations.map(({ conv, context }) => ({
      id: conv._id,
      jobId: conv.jobId,
      jobTitle: context.jobTitle || conv.jobTitle,
      participants: conv.participants.filter(p => p.addressLower !== userAddress),
      lastMessage: conv.lastMessage,
      unreadCount: getUnreadCount(conv.unreadCount, userAddress),
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }));

    sendSuccess(res, transformed);
  } catch (error) {
    logger.error('Failed to get conversations:', error);
    sendServerError(res, 'Failed to get conversations');
  }
});

// Get single conversation
router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const requester = await resolveRequesterIdentity(req as AuthenticatedRequest);
    const userAddress = requester?.addressLower;
    
    if (!userAddress) {
      sendUnauthorized(res);
      return;
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      'participants.addressLower': userAddress
    }).lean();

    if (!conversation) {
      sendNotFound(res, 'Conversation not found');
      return;
    }

    const jobContext = await validateConversationAccessForRequester(
      conversation as unknown as ConversationLike,
      userAddress
    );

    if (!jobContext) {
      sendForbidden(res, 'You are not authorized to access this conversation');
      return;
    }

    sendSuccess(res, {
        id: conversation._id,
        jobId: conversation.jobId,
        jobTitle: jobContext.jobTitle || conversation.jobTitle,
        participants: conversation.participants.filter(p => p.addressLower !== userAddress),
        lastMessage: conversation.lastMessage,
        unreadCount: getUnreadCount(conversation.unreadCount, userAddress),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
    });
  } catch (error) {
    logger.error('Failed to get conversation:', error);
    sendServerError(res, 'Failed to get conversation');
  }
});

// Start a new conversation
router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const requester = await resolveRequesterIdentity(req as AuthenticatedRequest);
    const userAddress = requester?.addressLower;
    const originalUserAddress = requester?.address;
    const { jobId, participantAddress } = req.body;

    if (!userAddress || !originalUserAddress) {
      sendUnauthorized(res);
      return;
    }

    if (!jobId || !participantAddress) {
      sendBadRequest(res, 'Missing jobId or participantAddress');
      return;
    }

    const parsedJobId = parseJobId(jobId);
    if (!parsedJobId) {
      sendBadRequest(res, 'Invalid jobId');
      return;
    }

    const participantLower = participantAddress.toLowerCase();
    if (participantLower === userAddress) {
      sendBadRequest(res, 'You cannot create a conversation with yourself');
      return;
    }

    const jobContext = await resolveJobConversationContext(parsedJobId);
    if (!jobContext) {
      sendNotFound(res, 'Job not found');
      return;
    }

    if (!jobContext.freelancerLower || !jobContext.freelancerAddress) {
      sendForbidden(res, 'Conversation requires a formally contracted freelancer for this job');
      return;
    }

    const requesterRole = getRequesterConversationRole(jobContext, userAddress);
    if (!requesterRole) {
      sendForbidden(res, 'You are not authorized to create a conversation for this job');
      return;
    }

    const expectedParticipantLower = requesterRole === 'recruiter'
      ? jobContext.freelancerLower
      : jobContext.recruiterLower;

    if (participantLower !== expectedParticipantLower) {
      sendForbidden(res, 'Participant is not the authorized counterparty for this job');
      return;
    }

    const expectedParticipantAddress = requesterRole === 'recruiter'
      ? jobContext.freelancerAddress
      : jobContext.recruiterAddress;

    const participantRole: ConversationParticipantRole = requesterRole === 'recruiter'
      ? 'freelancer'
      : 'recruiter';

    // Check if conversation already exists
    const existing = await Conversation.findOne({
      jobId: parsedJobId,
      'participants.addressLower': { $all: [userAddress, expectedParticipantLower] }
    }).lean();

    if (existing) {
      const existingContext = await validateConversationAccessForRequester(
        existing as unknown as ConversationLike,
        userAddress
      );

      if (!existingContext) {
        sendForbidden(res, 'You are not authorized to access this conversation');
        return;
      }

      sendSuccess(res, {
          id: existing._id,
          jobId: existing.jobId,
          jobTitle: existingContext.jobTitle || existing.jobTitle,
          participants: existing.participants.filter(p => p.addressLower !== userAddress),
          lastMessage: existing.lastMessage,
          unreadCount: getUnreadCount(existing.unreadCount, userAddress),
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
      });
      return;
    }

    const conversation = new Conversation({
      jobId: parsedJobId,
      jobTitle: jobContext.jobTitle,
      participants: [
        {
          address: originalUserAddress,
          addressLower: userAddress,
          role: requesterRole,
        },
        {
          address: expectedParticipantAddress,
          addressLower: expectedParticipantLower,
          role: participantRole,
        }
      ],
      unreadCount: new Map<string, number>([[userAddress, 0], [expectedParticipantLower, 0]]),
    });

    await conversation.save();

    sendSuccess(res, {
        id: conversation._id,
        jobId: conversation.jobId,
        jobTitle: conversation.jobTitle,
        participants: conversation.participants.filter(p => p.addressLower !== userAddress),
        lastMessage: conversation.lastMessage,
        unreadCount: 0,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
    });
  } catch (error) {
    logger.error('Failed to create conversation:', error);
    sendServerError(res, 'Failed to create conversation');
  }
});

// Get messages for a conversation
router.get('/:conversationId', async (req: Request, res: Response) => {
  try {
    const requester = await resolveRequesterIdentity(req as AuthenticatedRequest);
    const userAddress = requester?.addressLower;
    const { conversationId } = req.params;
    const { page = '1', limit = '50' } = req.query;

    if (!userAddress) {
      sendUnauthorized(res);
      return;
    }

    // Verify user is part of conversation (no .lean() so we can save)
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.addressLower': userAddress
    });

    if (!conversation) {
      sendNotFound(res, 'Conversation not found');
      return;
    }

    const jobContext = await validateConversationAccessForRequester(
      conversation as unknown as ConversationLike,
      userAddress
    );

    if (!jobContext) {
      sendForbidden(res, 'You are not authorized to access this conversation');
      return;
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const skip = (pageNum - 1) * limitNum;

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Mark messages as read
    await Message.updateMany(
      { conversationId, senderLower: { $ne: userAddress }, read: false },
      { read: true }
    );

    // Reset unread count for this user
    if (conversation.unreadCount) {
      conversation.unreadCount.set(userAddress, 0);
      await conversation.save();
    }

    sendSuccess(res, messages.map(m => ({
        id: m._id,
        conversationId: m.conversationId,
        sender: m.sender,
        content: m.content,
        type: m.type,
        metadata: m.metadata,
        read: m.read,
        createdAt: m.createdAt,
      })));
  } catch (error) {
    logger.error('Failed to get messages:', error);
    sendServerError(res, 'Failed to get messages');
  }
});

// Mark conversation as read
router.patch('/:conversationId/read', async (req: Request, res: Response) => {
  try {
    const requester = await resolveRequesterIdentity(req as AuthenticatedRequest);
    const userAddress = requester?.addressLower;
    const { conversationId } = req.params;

    if (!userAddress) {
      sendUnauthorized(res);
      return;
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.addressLower': userAddress,
    });

    if (!conversation) {
      sendNotFound(res, 'Conversation not found');
      return;
    }

    const jobContext = await validateConversationAccessForRequester(
      conversation as unknown as ConversationLike,
      userAddress
    );

    if (!jobContext) {
      sendForbidden(res, 'You are not authorized to access this conversation');
      return;
    }

    // Mark all messages from other participants as read
    await Message.updateMany(
      { conversationId, senderLower: { $ne: userAddress }, read: false },
      { read: true },
    );

    // Reset unread count for this user
    if (conversation.unreadCount) {
      conversation.unreadCount.set(userAddress, 0);
      await conversation.save();
    }

    sendSuccess(res, { marked: true });
  } catch (error) {
    logger.error('Failed to mark as read:', error);
    sendServerError(res, 'Failed to mark as read');
  }
});

// Send a message
router.post('/:conversationId', async (req: Request, res: Response) => {
  try {
    const requester = await resolveRequesterIdentity(req as AuthenticatedRequest);
    const userAddress = requester?.address;
    const userAddressLower = requester?.addressLower;
    const { conversationId } = req.params;
    const { content, type = 'text', metadata } = req.body;

    if (!userAddress || !userAddressLower) {
      sendUnauthorized(res);
      return;
    }

    if (!content?.trim()) {
      sendBadRequest(res, 'Message content is required');
      return;
    }

    // Sanitize message type — only allow safe types (SAST-018)
    const safeType = ALLOWED_MESSAGE_TYPES.includes(type) ? type : 'text';

    // Sanitize message content — prevent stored XSS (SAST-009)
    const safeContent = sanitizeHtml(content.trim());
    if (!safeContent) {
      sendBadRequest(res, 'Message content is required');
      return;
    }

    // Sanitize metadata — strip any system-level keys
    const safeMetadata = metadata ? {
      ...(typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}),
    } : undefined;
    // Remove sensitive/spoofable keys from metadata
    if (safeMetadata) {
      delete (safeMetadata as any).transactionHash;
      delete (safeMetadata as any).amount;
      delete (safeMetadata as any).system;
    }

    // Verify user is part of conversation (no .lean() so we can save)
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.addressLower': userAddressLower
    });

    if (!conversation) {
      sendNotFound(res, 'Conversation not found');
      return;
    }

    const jobContext = await validateConversationAccessForRequester(
      conversation as unknown as ConversationLike,
      userAddressLower
    );

    if (!jobContext) {
      sendForbidden(res, 'You are not authorized to access this conversation');
      return;
    }

    const message = new Message({
      conversationId,
      sender: userAddress,
      senderLower: userAddressLower,
      content: safeContent,
      type: safeType,
      metadata: safeMetadata,
      read: false,
    });

    await message.save();

    // Update conversation's last message and unread counts
    conversation.lastMessage = {
      content: safeContent.substring(0, 100),
      createdAt: new Date(),
      sender: userAddress,
    };

    // Increment unread count for other participants
    conversation.participants.forEach(p => {
      if (p.addressLower !== userAddressLower && conversation.unreadCount) {
        const currentCount = conversation.unreadCount.get(p.addressLower) || 0;
        conversation.unreadCount.set(p.addressLower, currentCount + 1);
      }
    });

    await conversation.save();

    const messageData = {
      id: message._id,
      conversationId: message.conversationId,
      sender: message.sender,
      content: message.content,
      type: message.type,
      metadata: message.metadata,
      read: message.read,
      createdAt: message.createdAt,
    };

    // ── Push real-time update via Socket.IO ────────────────────────────────
    const io = getIO();
    if (io) {
      // Emit to everyone in the conversation room (except sender)
      io.to(`conversation:${conversationId}`).emit('new_message', messageData);

      // Also emit to each participant's personal room (for updating sidebar/badge)
      conversation.participants.forEach(p => {
        if (p.addressLower !== userAddressLower) {
          io.to(`user:${p.addressLower}`).emit('conversation_updated', {
            conversationId,
            lastMessage: {
              content: content.trim().substring(0, 100),
              createdAt: new Date(),
              sender: userAddress,
            },
          });
        }
      });
    }

    sendSuccess(res, messageData);
  } catch (error) {
    logger.error('Failed to send message:', error);
    sendServerError(res, 'Failed to send message');
  }
});

export default router;