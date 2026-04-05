import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type { SkillCategory, SkillDifficulty } from '@/types';
import type { SkillTest, Submission, SkillsTab, ViewMode } from '../model/types';

interface UseSkillsControllerParams {
  tests: SkillTest[];
  isFreelancer: boolean;
  hasConnectedWallet: boolean;
}

interface UseSkillsControllerReturn {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedTest: SkillTest | null;
  selectedSubmission: Submission | null;
  submissionContent: string;
  setSubmissionContent: (value: string) => void;
  activeTab: SkillsTab;
  setActiveTab: (tab: SkillsTab) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  categoryFilter: SkillCategory | 'all';
  setCategoryFilter: (value: SkillCategory | 'all') => void;
  difficultyFilter: SkillDifficulty | 'all';
  setDifficultyFilter: (value: SkillDifficulty | 'all') => void;
  filteredTests: SkillTest[];
  handleTakeTest: (test: SkillTest) => void;
  handleViewSubmission: (sub: Submission) => void;
  handleViewCertificate: (sub: Submission) => void;
  goBack: () => void;
}

export function useSkillsController({ tests, isFreelancer, hasConnectedWallet }: UseSkillsControllerParams): UseSkillsControllerReturn {
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [selectedTest, setSelectedTest] = useState<SkillTest | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');

  const [activeTab, setActiveTab] = useState<SkillsTab>('tests');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SkillCategory | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<SkillDifficulty | 'all'>('all');

  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (difficultyFilter !== 'all' && t.difficulty !== difficultyFilter) return false;
      return true;
    });
  }, [tests, searchQuery, categoryFilter, difficultyFilter]);

  const handleTakeTest = (test: SkillTest) => {
    if (!isFreelancer) {
      toast.error('Only freelancers can take skill tests');
      return;
    }

    if (!hasConnectedWallet) {
      toast.error('Please connect your wallet first');
      return;
    }

    setSelectedTest(test);
    setSubmissionContent('');
    setViewMode('test');
  };

  const handleViewSubmission = (sub: Submission) => {
    setSelectedSubmission(sub);
    setViewMode('detail');
  };

  const handleViewCertificate = (sub: Submission) => {
    setSelectedSubmission(sub);
    setViewMode('certificate');
  };

  const goBack = () => {
    setViewMode('browse');
    setSelectedTest(null);
    setSelectedSubmission(null);
    setSubmissionContent('');
  };

  return {
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
    goBack,
  };
}
