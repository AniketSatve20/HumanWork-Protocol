import { motion } from 'framer-motion';
import { Award, ExternalLink, Shield } from 'lucide-react';
import type { Badge } from '../model/types';

interface BadgesTabProps {
  badges: Badge[];
  isFreelancer: boolean;
  skillTrialAddress: string;
}

export function BadgesTab({ badges, isFreelancer, skillTrialAddress }: BadgesTabProps) {
  if (!isFreelancer || badges.length === 0) {
    return (
      <div className="text-center py-16">
        <Award className="w-12 h-12 text-surface-300 mx-auto mb-4" />
        <p className="text-surface-500 font-medium">
          {!isFreelancer ? 'Connect as a freelancer to see badges' : 'No badges earned yet'}
        </p>
        {isFreelancer && (
          <p className="text-surface-400 text-sm mt-1">Score 80+ on a skill test to earn your first badge</p>
        )}
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {badges.map((badge, index) => (
        <motion.div
          key={badge.attestationId || index}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className="card p-5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

          <div className="flex items-start gap-4 relative">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Award className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-surface-900">
                {badge.testTitle || `Skill Badge #${badge.referenceId}`}
              </h3>
              {badge.score !== undefined && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold text-green-500">{badge.score}/100</span>
                  <span className="px-1.5 py-0.5 rounded text-xs bg-green-500/10 text-green-500 font-medium">
                    PASSED
                  </span>
                </div>
              )}
              <p className="text-xs text-surface-400 mt-1">
                {badge.gradedAt
                  ? `Earned ${new Date(badge.gradedAt).toLocaleDateString()}`
                  : badge.timestamp
                    ? `Earned ${new Date(badge.timestamp * 1000).toLocaleDateString()}`
                    : 'On-chain verified'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-surface-100">
            <span className="flex items-center gap-1 text-xs text-surface-400">
              <Shield className="w-3.5 h-3.5 text-green-500" />
              On-chain NFT
            </span>
            <span className="flex items-center gap-1 text-xs text-surface-400 ml-auto">
              <ExternalLink className="w-3.5 h-3.5" />
              <a
                href={`https://hashscan.io/testnet/token/${skillTrialAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-600"
              >
                View NFT
              </a>
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
