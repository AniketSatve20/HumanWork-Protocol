import { motion } from 'framer-motion';
import { BadgeCheck, Shield } from 'lucide-react';
import type { Submission } from '../model/types';

interface CertificatesTabProps {
  submissions: Submission[];
  onViewCertificate: (submission: Submission) => void;
}

export function CertificatesTab({ submissions, onViewCertificate }: CertificatesTabProps) {
  const passedSubmissions = submissions.filter((submission) => submission.passed);

  if (passedSubmissions.length === 0) {
    return (
      <div className="text-center py-16">
        <BadgeCheck className="w-12 h-12 text-surface-300 mx-auto mb-4" />
        <p className="text-surface-500 font-medium">No certificates yet</p>
        <p className="text-surface-400 text-sm mt-1">Score 80+ on a test to earn a certificate</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {passedSubmissions.map((submission) => (
        <motion.div
          key={submission.submissionId}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-6 relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => onViewCertificate(submission)}
        >
          <div className="absolute inset-0 border-2 border-amber-500/20 rounded-2xl pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />

          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <BadgeCheck className="w-8 h-8 text-white" />
            </div>
            <p className="text-xs text-amber-500 font-semibold uppercase tracking-wider mb-1">
              Certificate of Achievement
            </p>
            <h3 className="text-lg font-display font-bold text-surface-900 mb-1">
              {submission.testTitle}
            </h3>
            <p className="text-2xl font-bold text-green-500 mb-2">{submission.score}/100</p>
            <div className="flex items-center justify-center gap-2 text-xs text-surface-400">
              <Shield className="w-3.5 h-3.5 text-green-500" />
              On-chain verified &middot; {submission.gradingCompletedAt ? new Date(submission.gradingCompletedAt).toLocaleDateString() : new Date(submission.createdAt).toLocaleDateString()}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
