import type { SkillCategory, SkillDifficulty } from '@/types';

export interface SkillTest {
  id: number;
  title: string;
  description: string;
  ipfsHash: string;
  fee: string;
  isActive: boolean;
  submissionCount: number;
  category?: SkillCategory;
  difficulty?: SkillDifficulty;
}

export interface Badge {
  attestationId: number;
  type: number;
  referenceId: number;
  timestamp: number;
  issuer: string;
  metadata: string;
  isPositive: boolean;
  testTitle?: string;
  score?: number;
  gradedAt?: string;
  category?: SkillCategory;
  difficulty?: SkillDifficulty;
}

export interface Submission {
  submissionId: number;
  testId: number;
  testTitle: string;
  testDescription?: string;
  status: number;
  statusLabel: string;
  score?: number;
  passed?: boolean;
  aiReport?: string;
  gradingDetails?: {
    correctness: number;
    security: number;
    efficiency: number;
    style: number;
    feedback: string;
  };
  submissionIpfsHash?: string;
  badgeTokenId?: number;
  transactionHash?: string;
  gradingStartedAt?: string;
  gradingCompletedAt?: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  applicant: string;
  testTitle: string;
  testId: number;
  score: number;
  passed: boolean;
  hasBadge: boolean;
  gradedAt: string;
}

export interface SkillStats {
  totalSubmissions: number;
  gradedSubmissions: number;
  passedSubmissions: number;
  passRate: number;
  averageScore: number;
}

export type ViewMode = 'browse' | 'test' | 'results' | 'history' | 'leaderboard' | 'detail' | 'certificate';

export type SkillsTab = 'tests' | 'badges' | 'history' | 'certificates';
