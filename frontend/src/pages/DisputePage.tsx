import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Scale,
  FileText,
  Plus,
  User,
} from 'lucide-react';
import { Button, Card, Badge, Skeleton } from '@/components/common';
import { useAuthStore } from '@/context/authStore';
import { apiService } from '@/services/api.service';
import { formatUSDC, formatRelativeTime, formatAddress } from '@/utils/helpers';
import toast from 'react-hot-toast';

type DisputeStatus = 'pending' | 'voting_open' | 'resolved' | 'cancelled';
type DisputeOutcome = 'accept_ai_split' | 'client_wins' | 'freelancer_wins';

interface DisputeEvidence {
  submittedBy: string;
  description: string;
  ipfsHash?: string;
  submittedAt: string;
}

interface Dispute {
  _id: string;
  projectId: number;
  milestoneIndex: number;
  clientAddress: string;
  freelancerAddress: string;
  amount: string;
  reason: string;
  evidence: DisputeEvidence[];
  aiReport?: string;
  aiRecommendedSplit?: number;
  status: DisputeStatus;
  outcome?: DisputeOutcome;
  createdAt: string;
  resolvedAt?: string;
}

function statusColor(status: DisputeStatus): 'warning' | 'primary' | 'success' | 'error' | undefined {
  switch (status) {
    case 'pending': return 'warning';
    case 'voting_open': return 'primary';
    case 'resolved': return 'success';
    case 'cancelled': return 'error';
    default: return undefined;
  }
}

function outcomeLabel(outcome?: DisputeOutcome): string {
  switch (outcome) {
    case 'accept_ai_split': return 'AI Split Accepted';
    case 'client_wins': return 'Client Won';
    case 'freelancer_wins': return 'Freelancer Won';
    default: return 'Pending';
  }
}

function DisputeCard({ dispute, address, onClick }: { dispute: Dispute; address: string; onClick: () => void }) {
  const isClient = dispute.clientAddress.toLowerCase() === address?.toLowerCase();
  const role = isClient ? 'Client' : 'Freelancer';
  const opponent = isClient ? dispute.freelancerAddress : dispute.clientAddress;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <Card className="p-5 card-hover">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="w-4 h-4 text-warning-500" />
              <span className="font-semibold text-surface-900">Project #{dispute.projectId}</span>
              <span className="text-surface-400">·</span>
              <span className="text-sm text-surface-500">Milestone {dispute.milestoneIndex + 1}</span>
            </div>
            <p className="text-sm text-surface-700 line-clamp-2 mb-3">{dispute.reason}</p>
            <div className="flex items-center gap-4 text-sm text-surface-500">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                You ({role}) vs. {formatAddress(opponent)}
              </span>
              <span>•</span>
              <span>{formatRelativeTime(dispute.createdAt)}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <Badge variant={statusColor(dispute.status)}>
              {dispute.status.replace('_', ' ')}
            </Badge>
            <span className="font-semibold text-surface-900">{formatUSDC(dispute.amount)}</span>
            {dispute.outcome && (
              <span className="text-xs text-surface-500">{outcomeLabel(dispute.outcome)}</span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function DisputeDetail({
  dispute,
  address,
  onClose,
  onRefresh,
}: {
  dispute: Dispute;
  address: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [evidenceText, setEvidenceText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddEvidence = async () => {
    if (!evidenceText.trim()) return;
    setIsSubmitting(true);
    try {
      await apiService.addDisputeEvidence(dispute._id, { description: evidenceText.trim() });
      toast.success('Evidence submitted successfully');
      setEvidenceText('');
      onRefresh();
    } catch {
      toast.error('Failed to submit evidence');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isParty =
    dispute.clientAddress.toLowerCase() === address?.toLowerCase() ||
    dispute.freelancerAddress.toLowerCase() === address?.toLowerCase();

  const canAddEvidence = isParty && (dispute.status === 'pending' || dispute.status === 'voting_open');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-sm text-primary-500 hover:underline flex items-center gap-1">
          ← Back to disputes
        </button>
        <Badge variant={statusColor(dispute.status)}>
          {dispute.status.replace('_', ' ')}
        </Badge>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold text-surface-900">
          Dispute – Project #{dispute.projectId} / Milestone {dispute.milestoneIndex + 1}
        </h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-surface-500 mb-1">Amount in Dispute</p>
            <p className="font-semibold text-surface-900">{formatUSDC(dispute.amount)}</p>
          </div>
          <div>
            <p className="text-surface-500 mb-1">Client</p>
            <p className="font-mono text-surface-700">{formatAddress(dispute.clientAddress)}</p>
          </div>
          <div>
            <p className="text-surface-500 mb-1">Freelancer</p>
            <p className="font-mono text-surface-700">{formatAddress(dispute.freelancerAddress)}</p>
          </div>
        </div>
        <div>
          <p className="text-surface-500 text-sm mb-1">Reason</p>
          <p className="text-surface-800">{dispute.reason}</p>
        </div>
        {dispute.outcome && (
          <div className="bg-success-50 border border-success-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success-500" />
              <span className="font-medium text-success-700">Outcome: {outcomeLabel(dispute.outcome)}</span>
            </div>
            {dispute.aiRecommendedSplit !== undefined && (
              <p className="text-sm text-success-600 mt-1">
                AI recommended {dispute.aiRecommendedSplit}% to freelancer / {100 - dispute.aiRecommendedSplit}% to client.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* AI Report */}
      {dispute.aiReport && (
        <Card className="p-6">
          <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-500" />
            AI Assessment Report
          </h3>
          <p className="text-sm text-surface-700 whitespace-pre-wrap">{dispute.aiReport}</p>
        </Card>
      )}

      {/* Evidence */}
      <Card className="p-6">
        <h3 className="font-semibold text-surface-900 mb-4">Evidence ({dispute.evidence.length})</h3>
        {dispute.evidence.length === 0 ? (
          <p className="text-surface-500 text-sm">No evidence submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {dispute.evidence.map((ev, i) => (
              <div key={i} className="bg-surface-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-surface-700">{formatAddress(ev.submittedBy)}</span>
                  <span className="text-xs text-surface-400">{formatRelativeTime(ev.submittedAt)}</span>
                </div>
                <p className="text-sm text-surface-800">{ev.description}</p>
                {ev.ipfsHash && (
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${ev.ipfsHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-500 hover:underline mt-1 block"
                  >
                    View attachment →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {canAddEvidence && (
          <div className="mt-4 pt-4 border-t border-surface-100">
            <textarea
              value={evidenceText}
              onChange={(e) => setEvidenceText(e.target.value)}
              placeholder="Describe your evidence or situation clearly..."
              rows={3}
              className="input w-full resize-none mb-3"
            />
            <Button onClick={handleAddEvidence} isLoading={isSubmitting} disabled={!evidenceText.trim()}>
              <Plus className="w-4 h-4" />
              Submit Evidence
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export function DisputePage() {
  const navigate = useNavigate();
  const { address, isAuthenticated } = useAuthStore();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  const loadDisputes = async (): Promise<Dispute[]> => {
    setIsLoading(true);
    try {
      const resp = await apiService.getMyDisputes();
      const loaded = (resp.data as Dispute[]) || [];
      setDisputes(loaded);
      return loaded;
    } catch {
      toast.error('Failed to load disputes');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    loadDisputes();
  }, [isAuthenticated, navigate]);

  const openDisputes = disputes.filter(d => d.status === 'pending' || d.status === 'voting_open');
  const resolvedDisputes = disputes.filter(d => d.status === 'resolved' || d.status === 'cancelled');

  if (selectedDispute) {
    return (
      <div className="page-container max-w-3xl mx-auto">
        <DisputeDetail
          dispute={selectedDispute}
          address={address || ''}
          onClose={() => setSelectedDispute(null)}
          onRefresh={async () => {
            const updated = await loadDisputes();
            const refreshed = updated.find(d => d._id === selectedDispute._id);
            if (refreshed) setSelectedDispute(refreshed);
          }}
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-warning-500" />
            Dispute Resolution
          </h1>
          <p className="text-surface-600 mt-1">
            Manage your active disputes and review resolved cases.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : disputes.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle2 className="w-16 h-16 text-success-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-surface-900">No disputes</h2>
          <p className="text-surface-600 mt-2">
            You have no disputes. Keep up the great work!
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          {openDisputes.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-warning-500" />
                Active Disputes ({openDisputes.length})
              </h2>
              <div className="space-y-3">
                {openDisputes.map(d => (
                  <DisputeCard
                    key={d._id}
                    dispute={d}
                    address={address || ''}
                    onClick={() => setSelectedDispute(d)}
                  />
                ))}
              </div>
            </section>
          )}

          {resolvedDisputes.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success-500" />
                Resolved Disputes ({resolvedDisputes.length})
              </h2>
              <div className="space-y-3">
                {resolvedDisputes.map(d => (
                  <DisputeCard
                    key={d._id}
                    dispute={d}
                    address={address || ''}
                    onClick={() => setSelectedDispute(d)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Info Box */}
      <Card className="p-6 mt-8 bg-primary-50 border-primary-200">
        <div className="flex gap-4">
          <AlertTriangle className="w-6 h-6 text-primary-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-primary-800 mb-1">How Dispute Resolution Works</h3>
            <ul className="text-sm text-primary-700 space-y-1 list-disc list-inside">
              <li>Either party can raise a dispute on any active milestone.</li>
              <li>An AI Project Manager generates an assessment report.</li>
              <li>5 verified jurors stake USDC and vote on the outcome.</li>
              <li>Jurors can: accept the AI recommendation, side with client, or side with freelancer.</li>
              <li>Funds are released according to the jury verdict within 7 days.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default DisputePage;
