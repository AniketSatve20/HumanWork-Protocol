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
  companyDetails?: CompanyDetails;
  isVerifiedHuman: boolean;
  isVerifiedCompany?: boolean;
  level: number;
  verifiedSkillBadges?: number;
  createdAt: string;
}

// Company Verification (Recruiter)
export interface CompanyDetails {
  companyName: string;
  registrationNumber: string;
  industry: string;
  website?: string;
  country: string;
  employeeCount?: string;
  description?: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  submittedAt?: string;
  verifiedAt?: string;
}

// Skill System Types
export type SkillCategory = 
  | 'smart-contracts'
  | 'frontend'
  | 'backend'
  | 'design'
  | 'devops'
  | 'data-science'
  | 'mobile'
  | 'security';

export type SkillDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export const SKILL_CATEGORIES: { id: SkillCategory; label: string; icon: string; color: string }[] = [
  { id: 'smart-contracts', label: 'Smart Contracts', icon: '⛓️', color: 'text-purple-500' },
  { id: 'frontend', label: 'Frontend', icon: '🎨', color: 'text-blue-500' },
  { id: 'backend', label: 'Backend', icon: '⚙️', color: 'text-green-500' },
  { id: 'design', label: 'UI/UX Design', icon: '🖌️', color: 'text-pink-500' },
  { id: 'devops', label: 'DevOps', icon: '🚀', color: 'text-orange-500' },
  { id: 'data-science', label: 'Data Science', icon: '📊', color: 'text-cyan-500' },
  { id: 'mobile', label: 'Mobile', icon: '📱', color: 'text-indigo-500' },
  { id: 'security', label: 'Security', icon: '🔒', color: 'text-red-500' },
];

export const SKILL_DIFFICULTY_CONFIG: Record<SkillDifficulty, { label: string; color: string; bgColor: string; borderColor: string }> = {
  beginner: { label: 'Beginner', color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' },
  intermediate: { label: 'Intermediate', color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
  advanced: { label: 'Advanced', color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20' },
  expert: { label: 'Expert', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' },
};

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
  gasSponsor: string;
  insurancePool: string;
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