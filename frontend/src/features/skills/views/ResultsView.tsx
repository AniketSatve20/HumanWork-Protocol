import { motion } from 'framer-motion';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/common';
import type { Submission } from '../model/types';

interface ResultsViewProps {
  submissions: Submission[];
  statusColor: (status: number) => string;
  onBack: () => void;
  onRefreshNow: () => void;
}

export function ResultsView({ submissions, statusColor, onBack, onRefreshNow }: ResultsViewProps) {
  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto text-center py-12"
    >
      <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
      <h2 className="text-2xl font-display font-bold text-surface-900 mb-2">
        AI Grading in Progress
      </h2>
      <p className="text-surface-500 mb-4 max-w-md mx-auto">
        Your submission has been uploaded to IPFS and sent to the AI Oracle for grading.
        This usually takes 30-60 seconds.
      </p>
      <div className="flex items-center justify-center gap-2 text-sm text-blue-400 mb-8">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Auto-refreshing every 5 seconds...
      </div>

      {submissions.length > 0 && (
        <div className="card p-6 text-left max-w-md mx-auto mb-8">
          <h3 className="text-sm font-medium text-surface-600 mb-3">Latest Submissions</h3>
          {submissions.slice(0, 3).map((sub) => (
            <div key={sub.submissionId} className="flex items-center justify-between py-2 border-b border-surface-50 last:border-0">
              <span className="text-sm text-surface-700">{sub.testTitle}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor(sub.status)}`}>
                {sub.statusLabel}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          Browse More Tests
        </Button>
        <Button onClick={onRefreshNow}>
          <RefreshCw className="w-4 h-4" />
          Refresh Now
        </Button>
      </div>
    </motion.div>
  );
}
