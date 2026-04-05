import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Award, BadgeCheck, CheckCircle2, ExternalLink, Loader2, RefreshCw, XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/common';
import type { SkillTest, Submission } from '../model/types';

const SkillBadge3D = lazy(() => import('@/components/three/SkillBadge3D'));

interface SubmissionDetailViewProps {
  submission: Submission;
  tests: SkillTest[];
  statusColor: (status: number) => string;
  onBack: () => void;
  onViewCertificate: (submission: Submission) => void;
  onTakeTest: (test: SkillTest) => void;
}

export function SubmissionDetailView({
  submission,
  tests,
  statusColor,
  onBack,
  onViewCertificate,
  onTakeTest,
}: SubmissionDetailViewProps) {
  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl mx-auto"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-surface-500 hover:text-surface-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="card p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              submission.passed
                ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                : submission.status === 2
                  ? 'bg-gradient-to-br from-red-500 to-rose-600'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600'
            }`}>
              {submission.passed ? (
                <CheckCircle2 className="w-7 h-7 text-white" />
              ) : submission.status === 2 ? (
                <XCircle className="w-7 h-7 text-white" />
              ) : (
                <Loader2 className="w-7 h-7 text-white animate-spin" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-surface-900">
                {submission.testTitle}
              </h2>
              <p className="text-surface-500 mt-1">
                Submission #{submission.submissionId} &middot;{' '}
                {new Date(submission.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {submission.score !== undefined && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-24 h-24">
                <Suspense fallback={null}>
                  <SkillBadge3D score={submission.score} />
                </Suspense>
              </div>
              <div className={`text-center px-6 py-3 rounded-xl ${
                submission.passed
                  ? 'bg-green-500/10 border border-green-500/20'
                  : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <p className={`text-3xl font-bold ${submission.passed ? 'text-green-500' : 'text-red-500'}`}>
                  {submission.score}
                </p>
                <p className="text-xs text-surface-400">out of 100</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mb-6">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${statusColor(submission.status)}`}>
            {submission.statusLabel}
          </span>
          {submission.passed && (
            <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center gap-1">
              <Award className="w-4 h-4" /> Badge Earned
            </span>
          )}
          {submission.passed && (
            <button
              onClick={() => onViewCertificate(submission)}
              className="px-3 py-1.5 rounded-full text-sm font-medium bg-primary-500/10 border border-primary-500/20 text-primary-500 flex items-center gap-1 hover:bg-primary-500/20 transition-colors"
            >
              <BadgeCheck className="w-4 h-4" /> View Certificate
            </button>
          )}
          {submission.passed === false && submission.status === 2 && (
            <span className="text-sm text-surface-400">Score below 80 — no badge</span>
          )}
        </div>

        {submission.gradingDetails && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-surface-600 mb-3">Score Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Correctness', value: submission.gradingDetails.correctness },
                { label: 'Security', value: submission.gradingDetails.security },
                { label: 'Efficiency', value: submission.gradingDetails.efficiency },
                { label: 'Style', value: submission.gradingDetails.style },
              ].map((metric) => (
                <div key={metric.label} className="bg-surface-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-surface-900">{metric.value}</p>
                  <p className="text-xs text-surface-400">{metric.label}</p>
                  <div className="mt-2 h-1.5 bg-surface-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${metric.value >= 80 ? 'bg-green-500' : metric.value >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {submission.aiReport && (
          <div>
            <h3 className="text-sm font-medium text-surface-600 mb-3">AI Feedback</h3>
            <div className="bg-surface-50 rounded-xl p-4 text-sm text-surface-700 whitespace-pre-wrap font-mono">
              {submission.aiReport}
            </div>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-medium text-surface-600 mb-3">Details</h3>
        <div className="space-y-2 text-sm">
          {submission.transactionHash && (
            <div className="flex items-center justify-between">
              <span className="text-surface-400">Transaction</span>
              <a
                href={`https://hashscan.io/testnet/transaction/${submission.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-600 flex items-center gap-1"
              >
                {submission.transactionHash.slice(0, 10)}...
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
          {submission.submissionIpfsHash && (
            <div className="flex items-center justify-between">
              <span className="text-surface-400">IPFS Hash</span>
              <a
                href={`https://gateway.pinata.cloud/ipfs/${submission.submissionIpfsHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-600 flex items-center gap-1"
              >
                {submission.submissionIpfsHash.slice(0, 12)}...
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
          {submission.gradingCompletedAt && (
            <div className="flex items-center justify-between">
              <span className="text-surface-400">Graded At</span>
              <span className="text-surface-700">{new Date(submission.gradingCompletedAt).toLocaleString()}</span>
            </div>
          )}
          {submission.badgeTokenId !== undefined && submission.badgeTokenId >= 0 && (
            <div className="flex items-center justify-between">
              <span className="text-surface-400">Badge Token ID</span>
              <span className="text-amber-500 font-medium">#{submission.badgeTokenId}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back to Tests
        </Button>
        {submission.status === 2 && !submission.passed && (
          <Button
            onClick={() => {
              const test = tests.find((t) => t.id === submission.testId);
              if (test) onTakeTest(test);
            }}
          >
            <RefreshCw className="w-4 h-4" /> Retry This Test
          </Button>
        )}
      </div>
    </motion.div>
  );
}
