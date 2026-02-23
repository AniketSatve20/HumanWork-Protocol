import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Scale,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Shield,
  Users,
  Bot,
} from 'lucide-react';
import { Button, Badge, Spinner } from '@/components/common';
import { apiService } from '@/services/api.service';
import { useAuthStore } from '@/context/authStore';
import { formatAddress } from '@/utils/helpers';
import type { Dispute } from '@/types';
import { DisputeOutcome } from '@/types';

const outcomeLabels: Record<number, string> = {
  [DisputeOutcome.Pending]: 'Pending',
  [DisputeOutcome.AcceptAISplit]: 'AI Split Accepted',
  [DisputeOutcome.ClientWins]: 'Client Wins',
  [DisputeOutcome.FreelancerWins]: 'Freelancer Wins',
};

const outcomeColors: Record<number, 'warning' | 'primary' | 'success' | 'accent'> = {
  [DisputeOutcome.Pending]: 'warning',
  [DisputeOutcome.AcceptAISplit]: 'primary',
  [DisputeOutcome.ClientWins]: 'success',
  [DisputeOutcome.FreelancerWins]: 'accent',
};

export function DisputesPage() {
  const { address } = useAuthStore();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [voting, setVoting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  useEffect(() => {
    loadDisputes();
  }, [filter]);

  async function loadDisputes() {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (filter === 'pending') params.status = DisputeOutcome.Pending;
      else if (filter === 'resolved') params.status = -1; // handled client-side

      const res = await apiService.getDisputes(params as any);
      if (res.success && res.data) {
        let filtered = res.data;
        if (filter === 'resolved') {
          filtered = filtered.filter(d => d.outcome !== DisputeOutcome.Pending);
        }
        setDisputes(filtered);
      }
    } catch (err) {
      console.error('Failed to load disputes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(disputeId: number, choice: number) {
    setVoting(true);
    try {
      const res = await apiService.voteOnDispute(disputeId, choice);
      if (res.success && res.data) {
        setSelectedDispute(res.data);
        await loadDisputes();
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    } finally {
      setVoting(false);
    }
  }

  const userAddress = address?.toLowerCase();

  return (
    <div className="page-container max-w-5xl">
      {/* Page Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary-500" />
            Dispute Resolution
          </h1>
          <p className="text-surface-500 mt-1">
            View and manage disputes on your projects
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'resolved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f
                ? 'bg-primary-50 text-primary-600'
                : 'text-surface-600 hover:bg-surface-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="w-8 h-8" />
        </div>
      ) : disputes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Scale className="w-16 h-16 text-surface-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-surface-900">No Disputes</h3>
          <p className="text-surface-500 mt-2">
            {filter === 'pending'
              ? 'No active disputes to resolve.'
              : 'No disputes found. Great track record!'}
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          {disputes.map((dispute, index) => {
            const isClient = dispute.client.toLowerCase() === userAddress;
            const isFreelancer = dispute.freelancer.toLowerCase() === userAddress;
            const isJuror = dispute.jurors.some(j => j.toLowerCase() === userAddress);
            const isPending = dispute.outcome === DisputeOutcome.Pending;

            return (
              <motion.div
                key={dispute.disputeId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card card-hover p-6 cursor-pointer"
                onClick={() => setSelectedDispute(dispute)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-surface-900">
                        Dispute #{dispute.disputeId}
                      </h3>
                      <Badge variant={outcomeColors[dispute.outcome]}>
                        {outcomeLabels[dispute.outcome]}
                      </Badge>
                      {isClient && <Badge variant="primary">Client</Badge>}
                      {isFreelancer && <Badge variant="accent">Freelancer</Badge>}
                      {isJuror && <Badge variant="success">Juror</Badge>}
                    </div>

                    <div className="mt-2 text-sm text-surface-500 space-y-1">
                      <p>Project #{dispute.projectId} · Milestone #{dispute.milestoneIndex}</p>
                      <p>Amount: <span className="font-medium text-surface-700">{dispute.amount} USDC</span></p>
                      <p>
                        {formatAddress(dispute.client)} vs {formatAddress(dispute.freelancer)}
                      </p>
                    </div>

                    {isPending && (
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-surface-400">
                          <Users className="w-4 h-4" />
                          {dispute.votes.length}/{dispute.jurors.length} votes
                        </span>
                        <span className="flex items-center gap-1 text-surface-400">
                          <Clock className="w-4 h-4" />
                          Active
                        </span>
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-surface-400 shrink-0" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Dispute Detail Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedDispute(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold font-display">
                Dispute #{selectedDispute.disputeId}
              </h2>
              <Badge variant={outcomeColors[selectedDispute.outcome]}>
                {outcomeLabels[selectedDispute.outcome]}
              </Badge>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-surface-50 rounded-xl">
                  <p className="text-sm text-surface-500">Client</p>
                  <p className="font-mono text-sm mt-1">{formatAddress(selectedDispute.client)}</p>
                </div>
                <div className="p-4 bg-surface-50 rounded-xl">
                  <p className="text-sm text-surface-500">Freelancer</p>
                  <p className="font-mono text-sm mt-1">{formatAddress(selectedDispute.freelancer)}</p>
                </div>
              </div>

              <div className="p-4 bg-surface-50 rounded-xl">
                <p className="text-sm text-surface-500">Disputed Amount</p>
                <p className="text-2xl font-bold font-display mt-1">{selectedDispute.amount} USDC</p>
                <p className="text-sm text-surface-500 mt-1">
                  Project #{selectedDispute.projectId} · Milestone #{selectedDispute.milestoneIndex}
                </p>
              </div>

              {/* AI Report */}
              {selectedDispute.aiReport && (
                <div className="p-4 bg-primary-50 border border-primary-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-primary-600" />
                    <p className="text-sm font-semibold text-primary-700">AI Analysis Report</p>
                  </div>
                  <p className="text-sm text-primary-700 whitespace-pre-wrap">
                    {selectedDispute.aiReport}
                  </p>
                  <p className="text-sm text-primary-600 mt-2">
                    AI Recommended Split: {selectedDispute.aiRecommendedSplit}% client / {100 - selectedDispute.aiRecommendedSplit}% freelancer
                  </p>
                </div>
              )}

              {/* Voting Results */}
              <div className="p-4 bg-surface-50 rounded-xl">
                <p className="text-sm font-semibold text-surface-700 mb-3">Jury Votes</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-white rounded-xl border border-surface-200">
                    <Bot className="w-5 h-5 text-primary-500 mx-auto" />
                    <p className="text-lg font-bold mt-1">{selectedDispute.votesAcceptAi}</p>
                    <p className="text-xs text-surface-500">Accept AI</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-xl border border-surface-200">
                    <Shield className="w-5 h-5 text-blue-500 mx-auto" />
                    <p className="text-lg font-bold mt-1">{selectedDispute.votesForClient}</p>
                    <p className="text-xs text-surface-500">Client</p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-xl border border-surface-200">
                    <Users className="w-5 h-5 text-accent-500 mx-auto" />
                    <p className="text-lg font-bold mt-1">{selectedDispute.votesForFreelancer}</p>
                    <p className="text-xs text-surface-500">Freelancer</p>
                  </div>
                </div>
              </div>

              {/* Jury Voting Buttons (for assigned jurors) */}
              {selectedDispute.outcome === DisputeOutcome.Pending &&
                selectedDispute.jurors.some(j => j.toLowerCase() === userAddress) &&
                !selectedDispute.votes.some(v => v.juror.toLowerCase() === userAddress) && (
                <div className="p-4 bg-warning-400/10 border border-warning-400/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-warning-600" />
                    <p className="text-sm font-semibold text-warning-700">Your Vote Required</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleVote(selectedDispute.disputeId, 0)}
                      isLoading={voting}
                    >
                      <Bot className="w-4 h-4" />
                      Accept AI
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleVote(selectedDispute.disputeId, 1)}
                      isLoading={voting}
                    >
                      <Shield className="w-4 h-4" />
                      Client
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleVote(selectedDispute.disputeId, 2)}
                      isLoading={voting}
                    >
                      <Users className="w-4 h-4" />
                      Freelancer
                    </Button>
                  </div>
                </div>
              )}

              {/* Resolution */}
              {selectedDispute.outcome !== DisputeOutcome.Pending && (
                <div className="p-4 bg-success-400/10 border border-success-400/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success-600" />
                    <div>
                      <p className="font-semibold text-success-700">Resolved</p>
                      <p className="text-sm text-success-600">
                        Outcome: {outcomeLabels[selectedDispute.outcome]}
                      </p>
                      {selectedDispute.resolvedAt && (
                        <p className="text-xs text-success-500 mt-1">
                          {new Date(selectedDispute.resolvedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Close button */}
            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedDispute(null)}>
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default DisputesPage;
