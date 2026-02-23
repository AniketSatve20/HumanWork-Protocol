// User & Auth Types
export type UserRole = 'freelancer' | 'recruiter';

export interface User {
  id: string;
  address: string;
  role: UserRole;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
  company?: string;
  isVerifiedHuman: boolean;
  level: number;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Job Types
export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';

export enum MilestoneStatus {
  PENDING = 0,
  COMPLETED = 1,
  APPROVED = 2,
  DISPUTED = 3,
}

export interface Milestone {
  id: number;
  description: string;
  amount: string;
  status: MilestoneStatus;
  completionTime?: number;
}

export interface Job {
  id: number;
  title: string;
  description: string;
  category: string;
  skills: string[];
  budget: string;
  duration: string;
  status: JobStatus;
  client: string;
  clientName?: string;
  clientAvatar?: string;
  freelancer?: string;
  freelancerName?: string;
  freelancerAvatar?: string;
  milestones: Milestone[];
  totalAmount: string;
  amountPaid: string;
  createdAt: string;
  applicants?: number;
  ipfsHash?: string;
}

export interface JobApplication {
  id: string;
  jobId: number;
  freelancerAddress: string;
  freelancerName: string;
  freelancerAvatar?: string;
  coverLetter: string;
  proposedAmount: string;
  estimatedDuration: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

// Message Types
export interface Message {
  id: string;
  conversationId: string;
  sender: string;
  content: string;
  type: 'text' | 'milestone_update' | 'payment' | 'system';
  metadata?: {
    milestoneId?: number;
    action?: 'complete' | 'approve' | 'dispute';
    amount?: string;
    transactionHash?: string;
  };
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  jobId: number;
  jobTitle: string;
  participants: {
    address: string;
    name: string;
    avatar?: string;
    role: UserRole;
  }[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

// Dashboard Stats
export interface FreelancerStats {
  totalEarnings: string;
  activeProjects: number;
  completedProjects: number;
  avgRating: number;
  skillBadges: number;
  pendingPayments: string;
}

export interface RecruiterStats {
  totalSpent: string;
  activeProjects: number;
  completedProjects: number;
  openJobs: number;
  totalHires: number;
  pendingPayments: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'job_application' | 'milestone_complete' | 'payment' | 'message' | 'dispute';
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

// Contract Types
export interface ContractAddresses {
  usdc: string;
  userRegistry: string;
  agencyRegistry: string;
  aiOracle: string;
  skillTrial: string;
  projectEscrow: string;
  disputeJury: string;
  enterpriseAccess: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Dispute Types
export enum DisputeOutcome {
  Pending = 0,
  AcceptAISplit = 1,
  ClientWins = 2,
  FreelancerWins = 3,
}

export interface DisputeVote {
  juror: string;
  choice: number;
  timestamp: string;
}

export interface Dispute {
  disputeId: number;
  projectId: number;
  milestoneIndex: number;
  client: string;
  freelancer: string;
  amount: string;
  jurors: string[];
  votes: DisputeVote[];
  votesAcceptAi: number;
  votesForClient: number;
  votesForFreelancer: number;
  outcome: DisputeOutcome;
  aiReport: string;
  aiRecommendedSplit: number;
  createdAt: string;
  resolvedAt?: string;
  fundsDistributed: boolean;
}