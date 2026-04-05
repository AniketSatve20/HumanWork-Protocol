import { motion } from 'framer-motion';
import {
  Award,
  Code2,
  FileText,
  Trophy,
  BarChart3,
  History,
  RefreshCw,
  TrendingUp,
  BadgeCheck,
} from 'lucide-react';
import { Button } from '@/components/common';
import type { SkillCategory, SkillDifficulty } from '@/types';
import type { Badge, SkillStats, SkillTest, SkillsTab, Submission } from '../model/types';
import { TestsTab } from '../tabs/TestsTab';
import { BadgesTab } from '../tabs/BadgesTab';
import { HistoryTab } from '../tabs/HistoryTab';
import { CertificatesTab } from '../tabs/CertificatesTab';

interface BrowseViewProps {
  stats: SkillStats | null;
  badges: Badge[];
  submissions: Submission[];
  tests: SkillTest[];
  filteredTests: SkillTest[];
  isFreelancer: boolean;
  activeTab: SkillsTab;
  searchQuery: string;
  categoryFilter: SkillCategory | 'all';
  difficultyFilter: SkillDifficulty | 'all';
  onSetActiveTab: (tab: SkillsTab) => void;
  onSetSearchQuery: (value: string) => void;
  onSetCategoryFilter: (value: SkillCategory | 'all') => void;
  onSetDifficultyFilter: (value: SkillDifficulty | 'all') => void;
  onTakeTest: (test: SkillTest) => void;
  onViewSubmission: (submission: Submission) => void;
  onViewCertificate: (submission: Submission) => void;
  onOpenLeaderboard: () => void;
  onRefreshData: () => void;
  statusColor: (status: number) => string;
  getDifficultyStars: (difficulty: SkillDifficulty) => number;
  skillTrialAddress: string;
}

export function BrowseView({
  stats,
  badges,
  submissions,
  tests,
  filteredTests,
  isFreelancer,
  activeTab,
  searchQuery,
  categoryFilter,
  difficultyFilter,
  onSetActiveTab,
  onSetSearchQuery,
  onSetCategoryFilter,
  onSetDifficultyFilter,
  onTakeTest,
  onViewSubmission,
  onViewCertificate,
  onOpenLeaderboard,
  onRefreshData,
  statusColor,
  getDifficultyStars,
  skillTrialAddress,
}: BrowseViewProps) {
  const controller = {
    tab: activeTab,
  };

  const renderTabContent = () => {
    switch (controller.tab) {
      case 'tests':
        return (
          <TestsTab
            filteredTests={filteredTests}
            isFreelancer={isFreelancer}
            searchQuery={searchQuery}
            categoryFilter={categoryFilter}
            difficultyFilter={difficultyFilter}
            onSetSearchQuery={onSetSearchQuery}
            onSetCategoryFilter={onSetCategoryFilter}
            onSetDifficultyFilter={onSetDifficultyFilter}
            onTakeTest={onTakeTest}
            getDifficultyStars={getDifficultyStars}
          />
        );
      case 'badges':
        return (
          <BadgesTab
            badges={badges}
            isFreelancer={isFreelancer}
            skillTrialAddress={skillTrialAddress}
          />
        );
      case 'history':
        return (
          <HistoryTab
            submissions={submissions}
            statusColor={statusColor}
            onViewSubmission={onViewSubmission}
            onViewCertificate={onViewCertificate}
          />
        );
      case 'certificates':
        return (
          <CertificatesTab
            submissions={submissions}
            onViewCertificate={onViewCertificate}
          />
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      key="browse"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-surface-900">
            Skill Verification
          </h1>
          <p className="text-surface-500 mt-1">
            Prove your abilities. Earn on-chain badges & certificates.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onOpenLeaderboard}>
            <Trophy className="w-4 h-4" />
            Leaderboard
          </Button>
          <Button variant="ghost" onClick={onRefreshData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Your Badges', value: badges.length, icon: <Award className="w-4 h-4 text-amber-500" /> },
            { label: 'Submissions', value: submissions.length, icon: <FileText className="w-4 h-4 text-blue-500" /> },
            { label: 'Total Tests', value: tests.length, icon: <Code2 className="w-4 h-4 text-purple-500" /> },
            { label: 'Pass Rate', value: `${stats.passRate}%`, icon: <TrendingUp className="w-4 h-4 text-green-500" /> },
            { label: 'Avg Score', value: stats.averageScore, icon: <BarChart3 className="w-4 h-4 text-cyan-500" /> },
          ].map((stat) => (
            <div key={stat.label} className="card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-surface-50 flex items-center justify-center">{stat.icon}</div>
              <div>
                <p className="text-lg font-bold text-surface-900">{stat.value}</p>
                <p className="text-xs text-surface-400">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-100 rounded-xl w-fit mb-6">
        {([
          { id: 'tests' as const, label: 'Skill Tests', icon: <Code2 className="w-4 h-4" /> },
          { id: 'badges' as const, label: `Badges (${badges.length})`, icon: <Award className="w-4 h-4" /> },
          { id: 'history' as const, label: 'History', icon: <History className="w-4 h-4" /> },
          { id: 'certificates' as const, label: 'Certificates', icon: <BadgeCheck className="w-4 h-4" /> },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSetActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-surface-900 text-white shadow-sm'
                : 'text-surface-500 hover:text-surface-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {renderTabContent()}
    </motion.div>
  );
}
