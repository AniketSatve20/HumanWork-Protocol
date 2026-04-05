import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, Clock, History, Loader2, XCircle } from 'lucide-react';
import type { Submission } from '../model/types';

interface HistoryTabProps {
  submissions: Submission[];
  statusColor: (status: number) => string;
  onViewSubmission: (submission: Submission) => void;
  onViewCertificate: (submission: Submission) => void;
}

export function HistoryTab({
  submissions,
  statusColor,
  onViewSubmission,
  onViewCertificate,
}: HistoryTabProps) {
  if (submissions.length === 0) {
    return (
      <div className="text-center py-16">
        <History className="w-12 h-12 text-surface-300 mx-auto mb-4" />
        <p className="text-surface-500 font-medium">No submissions yet</p>
        <p className="text-surface-400 text-sm mt-1">Take a test to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <motion.div
          key={submission.submissionId}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="card card-hover p-5 flex items-center justify-between cursor-pointer"
          onClick={() => onViewSubmission(submission)}
        >
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              submission.status === 2 && submission.passed
                ? 'bg-green-500/10'
                : submission.status === 2
                  ? 'bg-red-500/10'
                  : submission.status === 1
                    ? 'bg-blue-500/10'
                    : 'bg-yellow-500/10'
            }`}>
              {submission.status === 2 && submission.passed ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : submission.status === 2 ? (
                <XCircle className="w-5 h-5 text-red-500" />
              ) : submission.status === 1 ? (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              ) : (
                <Clock className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            <div>
              <h3 className="font-medium text-surface-900">{submission.testTitle}</h3>
              <p className="text-xs text-surface-400">
                {new Date(submission.createdAt).toLocaleDateString()} &middot; {submission.statusLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {submission.score !== undefined && (
              <div className={`text-lg font-bold ${submission.passed ? 'text-green-500' : 'text-red-500'}`}>
                {submission.score}/100
              </div>
            )}
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(submission.status)}`}>
              {submission.statusLabel}
            </span>
            {submission.passed && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onViewCertificate(submission);
                }}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 transition-colors"
              >
                Certificate
              </button>
            )}
            <ChevronRight className="w-4 h-4 text-surface-300" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
