import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  conversationId: string;
  sender: string;
  senderLower: string;
  content: string;
  type: 'text' | 'milestone_update' | 'payment' | 'system';
  metadata?: {
    milestoneId?: number;
    action?: string;
    amount?: string;
    transactionHash?: string;
  };
  read: boolean;
  createdAt: Date;
}

export interface IConversation extends Document {
  jobId: number;
  jobTitle: string;
  participants: {
    address: string;
    addressLower: string;
    name?: string;
    avatar?: string;
    role: 'freelancer' | 'recruiter';
  }[];
  lastMessage?: {
    content: string;
    createdAt: Date;
    sender: string;
  };
  unreadCount: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: String, required: true, index: true },
    sender: { type: String, required: true },
    senderLower: { type: String, required: true, index: true },
    content: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['text', 'milestone_update', 'payment', 'system'],
      default: 'text' 
    },
    metadata: {
      milestoneId: Number,
      action: String,
      amount: String,
      transactionHash: String,
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ConversationSchema = new Schema<IConversation>(
  {
    jobId: { type: Number, required: true, index: true },
    jobTitle: { type: String, required: true },
    participants: [{
      address: { type: String, required: true },
      addressLower: { type: String, required: true },
      name: String,
      avatar: String,
      role: { type: String, enum: ['freelancer', 'recruiter'], required: true },
    }],
    lastMessage: {
      content: String,
      createdAt: Date,
      sender: String,
    },
    unreadCount: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
ConversationSchema.index({ 'participants.addressLower': 1 });
MessageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);