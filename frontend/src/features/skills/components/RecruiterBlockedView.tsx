import { motion } from 'framer-motion';
import { Award, BadgeCheck, Building2, Lock, RefreshCw, Search, Shield, Trophy } from 'lucide-react';
import { Button } from '@/components/common';
import type { LeaderboardEntry } from '../model/types';

interface RecruiterBlockedViewProps {
  leaderboard: LeaderboardEntry[];
  onLoadLeaderboard: () => void;
}

function shortenAddr(address: string): string {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
}

export function RecruiterBlockedView({ leaderboard, onLoadLeaderboard }: RecruiterBlockedViewProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-16"
      >
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-amber-500" />
        </div>
        <h1 className="text-3xl font-display font-bold text-surface-900 mb-3">
          Skill Tests Are for Freelancers
        </h1>
        <p className="text-surface-500 max-w-lg mx-auto mb-8">
          As a recruiter, you can verify your company credentials instead. Skill assessments
          are designed for freelancers to prove their abilities and earn on-chain badges.
        </p>

        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto mb-10">
          <div className="card p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-primary-500" />
            </div>
            <h3 className="font-semibold text-surface-900 mb-2">Company Verification</h3>
            <p className="text-sm text-surface-500 mb-3">
              Verify your company details to earn a trusted recruiter badge and unlock premium features.
            </p>
            <Button onClick={() => { window.location.href = '/settings'; }} variant="secondary" size="sm">
              <BadgeCheck className="w-4 h-4" />
              Verify Company
            </Button>
          </div>

          <div className="card p-6 text-left">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-green-500" />
            </div>
            <h3 className="font-semibold text-surface-900 mb-2">Browse Verified Talent</h3>
            <p className="text-sm text-surface-500 mb-3">
              Find freelancers with verified skill badges and on-chain proof of competency.
            </p>
            <Button onClick={() => { window.location.href = '/jobs'; }} variant="secondary" size="sm">
              <Search className="w-4 h-4" />
              Browse Talent
            </Button>
          </div>
        </div>

        <div className="text-left max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-display font-bold text-surface-900">Top Verified Freelancers</h2>
          </div>
          {leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-surface-400">Leaderboard loading...</p>
              <Button variant="ghost" onClick={onLoadLeaderboard} className="mt-2">
                <RefreshCw className="w-4 h-4" /> Load Leaderboard
              </Button>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-100">
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase">Freelancer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase">Test</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-surface-400 uppercase">Score</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-surface-400 uppercase">Badge</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.slice(0, 10).map((entry) => (
                    <tr
                      key={`${entry.applicant}-${entry.testId}`}
                      className="border-b border-surface-50 hover:bg-surface-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`font-bold ${
                            entry.rank === 1
                              ? 'text-amber-500 text-lg'
                              : entry.rank === 2
                                ? 'text-surface-400 text-lg'
                                : entry.rank === 3
                                  ? 'text-orange-700 text-lg'
                                  : 'text-surface-500'
                          }`}
                        >
                          {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <a href={`/users/${entry.applicant}`} className="text-sm font-mono text-primary-500 hover:text-primary-600">
                          {shortenAddr(entry.applicant)}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-surface-700">{entry.testTitle}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${entry.passed ? 'text-green-500' : 'text-red-500'}`}>{entry.score}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {entry.hasBadge ? <Award className="w-5 h-5 text-amber-500 mx-auto" /> : <span className="text-surface-300">&mdash;</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
