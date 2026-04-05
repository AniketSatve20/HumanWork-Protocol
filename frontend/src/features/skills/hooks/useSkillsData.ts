import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { apiService } from '@/services/api.service';
import { inferCategory, inferDifficulty } from '../model/inference';
import type { SkillTest, Badge, Submission, LeaderboardEntry, SkillStats } from '../model/types';

interface UseSkillsDataParams {
  address?: string;
  isFreelancer: boolean;
}

interface UseSkillsDataReturn {
  tests: SkillTest[];
  badges: Badge[];
  submissions: Submission[];
  leaderboard: LeaderboardEntry[];
  stats: SkillStats | null;
  loading: boolean;
  setSubmissions: Dispatch<SetStateAction<Submission[]>>;
  loadData: () => Promise<void>;
  loadLeaderboard: () => Promise<void>;
}

export function useSkillsData({ address, isFreelancer }: UseSkillsDataParams): UseSkillsDataReturn {
  const [tests, setTests] = useState<SkillTest[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<SkillStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const requests: Promise<unknown>[] = [
        apiService.getSkillTests(),
        apiService.getSkillStats(),
      ];

      if (address && isFreelancer) {
        requests.push(
          apiService.getUserBadges(address),
          apiService.getSubmissionHistory(address)
        );
      }

      const results = await Promise.allSettled(requests);

      if (results[0].status === 'fulfilled') {
        const data = results[0].value as { tests?: unknown[]; data?: { tests?: unknown[] } };
        const rawTests = data.tests || data.data?.tests || [];
        setTests(
          rawTests.map((t) => {
            const test = t as SkillTest;
            return {
              ...test,
              category: test.category || inferCategory(test.title),
              difficulty: test.difficulty || inferDifficulty(test.title, test.fee || '0'),
            };
          })
        );
      }

      if (results[1].status === 'fulfilled') {
        const data = results[1].value as { stats?: SkillStats; data?: { stats?: SkillStats } };
        setStats(data.stats || data.data?.stats || null);
      }

      if (results[2]?.status === 'fulfilled') {
        const data = results[2].value as { badges?: Badge[]; data?: { badges?: Badge[] } };
        setBadges(data.badges || data.data?.badges || []);
      }

      if (results[3]?.status === 'fulfilled') {
        const data = results[3].value as { submissions?: Submission[]; data?: { submissions?: Submission[] } };
        setSubmissions(data.submissions || data.data?.submissions || []);
      }
    } catch (err) {
      console.error('Failed to load skill data:', err);
    } finally {
      setLoading(false);
    }
  }, [address, isFreelancer]);

  const loadLeaderboard = useCallback(async () => {
    try {
      const res = await apiService.getSkillLeaderboard();
      const data = res as { leaderboard?: LeaderboardEntry[]; data?: { leaderboard?: LeaderboardEntry[] } };
      setLeaderboard(data.leaderboard || data.data?.leaderboard || []);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return {
    tests,
    badges,
    submissions,
    leaderboard,
    stats,
    loading,
    setSubmissions,
    loadData,
    loadLeaderboard,
  };
}
