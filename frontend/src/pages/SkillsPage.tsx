import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/context/authStore';
import { config } from '@/utils/config';
import { useSkillsData, useSkillsController, useSkillSubmission } from '@/features/skills';
import { RecruiterBlockedView } from '@/features/skills/components/RecruiterBlockedView';
import { BrowseView } from '@/features/skills/views/BrowseView';
import { ResultsView } from '@/features/skills/views/ResultsView';
import { SubmissionDetailView } from '@/features/skills/views/SubmissionDetailView';
import { CertificateView } from '@/features/skills/views/CertificateView';
import { LeaderboardView } from '@/features/skills/views/LeaderboardView';
import { TestTakingView } from '@/features/skills/views/TestTakingView';
import type { SkillDifficulty } from '@/types';

function getDifficultyStars(d: SkillDifficulty) {
  const map: Record<SkillDifficulty, number> = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
  return map[d] || 1;
}

// ── Component ──────────────────────────────────────────────────────

export function SkillsPage() {
  const { user, address } = useAuthStore();
  const isFreelancer = user?.role === 'freelancer';
  const isRecruiter = user?.role === 'recruiter';

  const {
    tests,
    badges,
    submissions,
    leaderboard,
    stats,
    loading,
    setSubmissions,
    loadData,
    loadLeaderboard,
  } = useSkillsData({
    address: address || undefined,
    isFreelancer,
  });

  const {
    viewMode,
    setViewMode,
    selectedTest,
    selectedSubmission,
    submissionContent,
    setSubmissionContent,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    difficultyFilter,
    setDifficultyFilter,
    filteredTests,
    handleTakeTest,
    handleViewSubmission,
    handleViewCertificate,
    goBack: resetViewState,
  } = useSkillsController({
    tests,
    isFreelancer,
    hasConnectedWallet: Boolean(user && address),
  });

  const { isSubmitting, handleSubmit, stopPolling } = useSkillSubmission({
    address: address || undefined,
    selectedTest,
    submissionContent,
    setSubmissions,
    loadData,
    setViewMode,
  });

  const goBack = () => {
    resetViewState();
    stopPolling();
  };

  const statusColor = (status: number) => {
    switch (status) {
      case 0: return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500';
      case 1: return 'bg-blue-500/10 border-blue-500/20 text-blue-500';
      case 2: return 'bg-green-500/10 border-green-500/20 text-green-500';
      case 3: return 'bg-red-500/10 border-red-500/20 text-red-500';
      default: return 'bg-surface-100 border-surface-200 text-surface-500';
    }
  };

  const renderModeView = () => {
    const controller = {
      view: {
        mode: viewMode,
      },
    };

    switch (controller.view.mode) {
      case 'browse':
        return (
          <BrowseView
            stats={stats}
            badges={badges}
            submissions={submissions}
            tests={tests}
            filteredTests={filteredTests}
            isFreelancer={isFreelancer}
            activeTab={activeTab}
            searchQuery={searchQuery}
            categoryFilter={categoryFilter}
            difficultyFilter={difficultyFilter}
            onSetActiveTab={setActiveTab}
            onSetSearchQuery={setSearchQuery}
            onSetCategoryFilter={setCategoryFilter}
            onSetDifficultyFilter={setDifficultyFilter}
            onTakeTest={handleTakeTest}
            onViewSubmission={handleViewSubmission}
            onViewCertificate={handleViewCertificate}
            onOpenLeaderboard={() => {
              void loadLeaderboard();
              setViewMode('leaderboard');
            }}
            onRefreshData={() => {
              void loadData();
            }}
            statusColor={statusColor}
            getDifficultyStars={getDifficultyStars}
            skillTrialAddress={config.contracts.skillTrial}
          />
        );
      case 'test':
        if (!selectedTest) return null;
        return (
          <TestTakingView
            selectedTest={selectedTest}
            submissionContent={submissionContent}
            isSubmitting={isSubmitting}
            onSetSubmissionContent={setSubmissionContent}
            onSubmit={() => {
              void handleSubmit();
            }}
            onBack={goBack}
          />
        );
      case 'results':
        return (
          <ResultsView
            submissions={submissions}
            statusColor={statusColor}
            onBack={goBack}
            onRefreshNow={() => {
              void loadData();
            }}
          />
        );
      case 'detail':
        if (!selectedSubmission) return null;
        return (
          <SubmissionDetailView
            submission={selectedSubmission}
            tests={tests}
            statusColor={statusColor}
            onBack={goBack}
            onViewCertificate={handleViewCertificate}
            onTakeTest={handleTakeTest}
          />
        );
      case 'certificate':
        if (!selectedSubmission || !selectedSubmission.passed) return null;
        return (
          <CertificateView
            submission={selectedSubmission}
            userName={user?.name}
            address={address || undefined}
            onBack={goBack}
          />
        );
      case 'leaderboard':
        return (
          <LeaderboardView
            leaderboard={leaderboard}
            onBack={goBack}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  // ── Recruiter Blocked View ──
  if (isRecruiter) {
    return (
      <RecruiterBlockedView
        leaderboard={leaderboard}
        onLoadLeaderboard={() => {
          void loadLeaderboard();
        }}
      />
    );
  }

  // ── Main Freelancer Skill Page ──
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AnimatePresence mode="wait">
        {renderModeView()}
      </AnimatePresence>
    </div>
  );
}

export default SkillsPage;
