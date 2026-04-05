import { motion } from 'framer-motion';
import { ArrowLeft, BadgeCheck, ExternalLink, Shield } from 'lucide-react';
import { Button } from '@/components/common';
import type { Submission } from '../model/types';

interface CertificateViewProps {
  submission: Submission;
  userName?: string;
  address?: string;
  onBack: () => void;
}

function shortenAddr(address: string): string {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
}

export function CertificateView({ submission, userName, address, onBack }: CertificateViewProps) {
  return (
    <motion.div
      key="certificate"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="max-w-3xl mx-auto"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-surface-500 hover:text-surface-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="card relative overflow-hidden">
        <div className="absolute inset-0 border-4 border-amber-500/20 rounded-2xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />

        <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-amber-500/30 rounded-tl-xl" />
        <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-amber-500/30 rounded-tr-xl" />
        <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-amber-500/30 rounded-bl-xl" />
        <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-amber-500/30 rounded-br-xl" />

        <div className="px-12 py-16 text-center relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-6 shadow-xl">
            <BadgeCheck className="w-12 h-12 text-white" />
          </div>

          <p className="text-xs text-amber-500 font-bold uppercase tracking-[0.25em] mb-2">
            HumanWork Protocol
          </p>
          <h1 className="text-4xl font-display font-bold text-surface-900 mb-2">
            Certificate of Achievement
          </h1>
          <div className="w-32 h-0.5 bg-amber-500/30 mx-auto mb-6" />

          <p className="text-surface-500 text-lg mb-2">This certifies that</p>
          <p className="text-2xl font-display font-bold text-surface-900 mb-2">
            {userName || shortenAddr(address || '')}
          </p>
          <p className="text-sm font-mono text-surface-400 mb-6">{address}</p>

          <p className="text-surface-500 mb-2">has successfully completed</p>
          <h2 className="text-2xl font-display font-bold text-primary-500 mb-4">
            {submission.testTitle}
          </h2>

          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="text-center">
              <p className="text-4xl font-bold text-green-500">{submission.score}</p>
              <p className="text-xs text-surface-400">Score / 100</p>
            </div>
            {submission.gradingDetails && (
              <>
                <div className="w-px h-12 bg-surface-200" />
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { l: 'Correctness', v: submission.gradingDetails.correctness },
                    { l: 'Security', v: submission.gradingDetails.security },
                    { l: 'Efficiency', v: submission.gradingDetails.efficiency },
                    { l: 'Style', v: submission.gradingDetails.style },
                  ].map((m) => (
                    <div key={m.l} className="text-center">
                      <p className="text-lg font-bold text-surface-900">{m.v}</p>
                      <p className="text-[10px] text-surface-400">{m.l}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-surface-400 mb-6">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-green-500" />
              On-chain verified NFT badge
            </span>
            <span>&middot;</span>
            <span>
              Issued: {submission.gradingCompletedAt
                ? new Date(submission.gradingCompletedAt).toLocaleDateString()
                : new Date(submission.createdAt).toLocaleDateString()}
            </span>
            {submission.badgeTokenId !== undefined && submission.badgeTokenId >= 0 && (
              <>
                <span>&middot;</span>
                <span>Token #{submission.badgeTokenId}</span>
              </>
            )}
          </div>

          {submission.transactionHash && (
            <a
              href={`https://hashscan.io/testnet/transaction/${submission.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600"
            >
              Verify on HashScan <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      </div>
    </motion.div>
  );
}
