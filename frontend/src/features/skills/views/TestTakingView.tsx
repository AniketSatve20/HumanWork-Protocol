import { motion } from 'framer-motion';
import { ArrowLeft, BadgeCheck, Send, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/common';
import { SKILL_CATEGORIES, SKILL_DIFFICULTY_CONFIG } from '@/types';
import type { SkillTest } from '../model/types';

interface TestTakingViewProps {
  selectedTest: SkillTest;
  submissionContent: string;
  isSubmitting: boolean;
  onSetSubmissionContent: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function TestTakingView({
  selectedTest,
  submissionContent,
  isSubmitting,
  onSetSubmissionContent,
  onSubmit,
  onBack,
}: TestTakingViewProps) {
  return (
    <motion.div
      key="test"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl mx-auto"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-surface-500 hover:text-surface-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tests
      </button>

      <div className="card p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
            <span className="text-2xl">{SKILL_CATEGORIES.find((c) => c.id === selectedTest.category)?.icon || '📋'}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-display font-bold text-surface-900">
                {selectedTest.title}
              </h2>
              {selectedTest.difficulty && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${SKILL_DIFFICULTY_CONFIG[selectedTest.difficulty].bgColor} ${SKILL_DIFFICULTY_CONFIG[selectedTest.difficulty].borderColor} ${SKILL_DIFFICULTY_CONFIG[selectedTest.difficulty].color}`}
                >
                  {SKILL_DIFFICULTY_CONFIG[selectedTest.difficulty].label}
                </span>
              )}
            </div>
            <p className="text-surface-500">{selectedTest.description}</p>
          </div>
        </div>

        <div className="bg-surface-50 rounded-xl p-4 mb-6 space-y-2">
          <p className="text-sm text-surface-600">
            <strong>Instructions:</strong> Write your answer below. Your submission will be
            uploaded to IPFS and graded by the AI Oracle. Scores are based on correctness,
            security, efficiency, and code style.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-surface-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Score 80+ to earn an NFT badge
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-green-500" /> Permanent on-chain credential
            </span>
            <span className="flex items-center gap-1">
              <BadgeCheck className="w-3.5 h-3.5 text-primary-500" /> Certificate of achievement
            </span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-surface-700 mb-2">
            Your Submission
          </label>
          <textarea
            value={submissionContent}
            onChange={(e) => onSetSubmissionContent(e.target.value)}
            placeholder="Write your answer, paste code, or describe your solution..."
            rows={12}
            className="input font-mono text-sm"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-surface-400">
            <p>Fee: {selectedTest.fee !== '0' ? `${(parseInt(selectedTest.fee, 10) / 1e6).toFixed(2)} USDC` : 'Free'}</p>
            {selectedTest.fee !== '0' && (
              <p className="text-xs text-surface-300 mt-0.5">USDC approval required before submission</p>
            )}
          </div>
          <Button
            onClick={onSubmit}
            isLoading={isSubmitting}
            disabled={!submissionContent.trim()}
          >
            <Send className="w-4 h-4" />
            Submit for Grading
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
