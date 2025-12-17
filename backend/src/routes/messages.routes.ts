import { Router, Request, Response } from 'express';
import { Message, Conversation } from '../models/Message.js';
import { Project } from '../models/Project.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Helper to get unread count from either Map or plain object
function getUnreadCount(unreadCount: Map<string, number> | Record<string, number> | undefined, key: string): number {
  if (!unreadCount) return 0;
  if (unreadCount instanceof Map) {
    return unreadCount.get(key) || 0;
  }
  return (unreadCount as Record<string, number>)[key] || 0;
}

// All routes require authentication
router.use(authenticateToken);

// Get all conversations for the authenticated user
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const userAddress = (req as AuthenticatedRequest).user?.walletAddress?.toLowerCase();
    
    if (!userAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const conversations = await Conversation.find({
      'participants.addressLower': userAddress
    })
      .sort({ updatedAt: -1 })
      .lean();

    // Transform for frontend - filter out current user from participants display
    const transformed = conversations.map(conv => ({
      id: conv._id,
      jobId: conv.jobId,
      jobTitle: conv.jobTitle,
      participants: conv.participants.filter(p => p.addressLower !== userAddress),
      lastMessage: conv.lastMessage,
      unreadCount: getUnreadCount(conv.unreadCount, userAddress),
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }));

    res.json({ success: true, data: transformed });
  } catch (error) {
    logger.error('Failed to get conversations:', error);
    res.status(500).json({ success: false, error: 'Failed to get conversations' });
  }
});

// Get single conversation
router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const userAddress = (req as AuthenticatedRequest).user?.walletAddress?.toLowerCase();
    
    if (!userAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      'participants.addressLower': userAddress
    }).lean();

    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: conversation._id,
        jobId: conversation.jobId,
        jobTitle: conversation.jobTitle,
        participants: conversation.participants.filter(p => p.addressLower !== userAddress),
        lastMessage: conversation.lastMessage,
        unreadCount: getUnreadCount(conversation.unreadCount, userAddress),
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      }
    });
  } catch (error) {
    logger.error('Failed to get conversation:', error);
    res.status(500).json({ success: false, error: 'Failed to get conversation' });
  }
});

// Start a new conversation
router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const userAddress = (req as AuthenticatedRequest).user?.walletAddress?.toLowerCase();
    const originalUserAddress = (req as AuthenticatedRequest).user?.walletAddress;
    const { jobId, participantAddress } = req.body;

    if (!userAddress || !originalUserAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!jobId || !participantAddress) {
      res.status(400).json({ success: false, error: 'Missing jobId or participantAddress' });
      return;
    }

    const participantLower = participantAddress.toLowerCase();

    // Check if conversation already exists
    const existing = await Conversation.findOne({
      jobId,
      'participants.addressLower': { $all: [userAddress, participantLower] }
    }).lean();

    if (existing) {
      res.json({ 
        success: true, 
        data: {
          id: existing._id,
          jobId: existing.jobId,
          jobTitle: existing.jobTitle,
          participants: existing.participants.filter(p => p.addressLower !== userAddress),
          lastMessage: existing.lastMessage,
          unreadCount: getUnreadCount(existing.unreadCount, userAddress),
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        }
      });
      return;
    }

    // Get job details
    const project = await Project.findOne({ projectId: jobId }).lean();
    
    // Determine roles
    const isUserClient = project?.clientLower === userAddress;
    
    const conversation = new Conversation({
      jobId,
      jobTitle: project?.title || `Project #${jobId}`,
      participants: [
        {
          address: originalUserAddress,
          addressLower: userAddress,
          role: isUserClient ? 'recruiter' : 'freelancer',
        },
        {
          address: participantAddress,
          addressLower: participantLower,
          role: isUserClient ? 'freelancer' : 'recruiter',
        }
      ],
      unreadCount: new Map<string, number>([[userAddress, 0], [participantLower, 0]]),
    });

    await conversation.save();

    res.json({ 
      success: true, 
      data: {
        id: conversation._id,
        jobId: conversation.jobId,
        jobTitle: conversation.jobTitle,
        participants: conversation.participants.filter(p => p.addressLower !== userAddress),
        lastMessage: conversation.lastMessage,
        unreadCount: 0,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      }
    });
  } catch (error) {
    logger.error('Failed to create conversation:', error);
    res.status(500).json({ success: false, error: 'Failed to create conversation' });
  }
});

// Get messages for a conversation
router.get('/:conversationId', async (req: Request, res: Response) => {
  try {
    const userAddress = (req as AuthenticatedRequest).user?.walletAddress?.toLowerCase();
    const { conversationId } = req.params;
    const { page = '1', limit = '50' } = req.query;

    if (!userAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // Verify user is part of conversation (no .lean() so we can save)
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.addressLower': userAddress
    });

    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
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

    res.json({
      success: true,
      data: messages.map(m => ({
        id: m._id,
        conversationId: m.conversationId,
        sender: m.sender,
        content: m.content,
        type: m.type,
        metadata: m.metadata,
        read: m.read,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Failed to get messages:', error);
    res.status(500).json({ success: false, error: 'Failed to get messages' });
  }
});

// Send a message
router.post('/:conversationId', async (req: Request, res: Response) => {
  try {
    const userAddress = (req as AuthenticatedRequest).user?.walletAddress;
    const userAddressLower = userAddress?.toLowerCase();
    const { conversationId } = req.params;
    const { content, type = 'text', metadata } = req.body;

    if (!userAddress || !userAddressLower) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!content?.trim()) {
      res.status(400).json({ success: false, error: 'Message content is required' });
      return;
    }

    // Verify user is part of conversation (no .lean() so we can save)
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.addressLower': userAddressLower
    });

    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    const message = new Message({
      conversationId,
      sender: userAddress,
      senderLower: userAddressLower,
      content: content.trim(),
      type,
      metadata,
      read: false,
    });

    await message.save();

    // Update conversation's last message and unread counts
    conversation.lastMessage = {
      content: content.trim().substring(0, 100),
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

    res.json({
      success: true,
      data: {
        id: message._id,
        conversationId: message.conversationId,
        sender: message.sender,
        content: message.content,
        type: message.type,
        metadata: message.metadata,
        read: message.read,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    logger.error('Failed to send message:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

export default router;