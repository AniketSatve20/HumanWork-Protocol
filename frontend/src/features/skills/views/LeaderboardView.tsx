import { motion } from 'framer-motion';
import { ArrowLeft, Award, Trophy } from 'lucide-react';
import { LeaderboardEntry } from '../model/types';

interface LeaderboardViewProps {
  leaderboard: LeaderboardEntry[];
  onBack: () => void;
}

function shortenAddr(address: string): string {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
}

export function LeaderboardView({ leaderboard, onBack }: LeaderboardViewProps) {
  return (
    <motion.div
      key="leaderboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <button onClick={onBack} className="flex items-center gap-2 text-surface-500 hover:text-surface-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Tests
      </button>

      <div className="flex items-center gap-3 mb-8">
        <Trophy className="w-8 h-8 text-amber-500" />
        <div>
          <h2 className="text-2xl font-display font-bold text-surface-900">Skill Leaderboard</h2>
          <p className="text-surface-500">Top performers across all skill tests</p>
        </div>
      </div>

      {leaderboard.length === 0 ? (
        <div className="text-center py-16">
          <Trophy className="w-12 h-12 text-surface-300 mx-auto mb-4" />
          <p className="text-surface-500">No graded submissions yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-400 uppercase">Test</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-surface-400 uppercase">Score</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-surface-400 uppercase">Badge</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={`${entry.applicant}-${entry.testId}`} className="border-b border-surface-50 hover:bg-surface-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`font-bold ${
                      entry.rank === 1 ? 'text-amber-500 text-lg' :
                      entry.rank === 2 ? 'text-surface-400 text-lg' :
                      entry.rank === 3 ? 'text-orange-700 text-lg' :
                      'text-surface-500'
                    }`}>
                      {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <a href={`/users/${entry.applicant}`} className="text-sm font-mono text-primary-500 hover:text-primary-600">
                      {shortenAddr(entry.applicant)}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-surface-700">{entry.testTitle}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`font-bold ${entry.passed ? 'text-green-500' : 'text-red-500'}`}>
                      {entry.score}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {entry.hasBadge ? (
                      <Award className="w-5 h-5 text-amber-500 mx-auto" />
                    ) : (
                      <span className="text-surface-300">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
