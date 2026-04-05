import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Loader2,
  Users,
  Shield,
  Gavel,
  ArrowLeft,
  Send,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/common';
import { useAuthStore } from '@/context/authStore';
import { useSoundSystem } from '@/components/ui/SoundSystem';
import { web3Service } from '@/services/web3.service';
import { formatAddress, cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

const ScalesScene = lazy(() => import('@/components/three/ScalesScene'));

interface Dispute {
  projectId: number;
  milestoneId: number;
  status: number; // 0=Open, 1=Voting, 2=Resolved
  clientAddress: string;
  freelancerAddress: string;
  clientVotes: number;
  freelancerVotes: number;
  totalVotes: number;
  deadline: number;
  resolution: string;
}

type ViewMode = 'list' | 'detail' | 'create';

const statusLabels: Record<number, { label: string; color: string; icon: typeof Scale }> = {
  0: { label: 'Open', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: AlertTriangle },
  1: { label: 'Voting', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Users },
  2: { label: 'Resolved', color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: CheckCircle2 },
};

export function DisputesPage() {
  const { address, isAuthenticated } = useAuthStore();
  const { playNavigationHum } = useSoundSystem();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // BR2049 atmospheric hum on page entry
  useEffect(() => { playNavigationHum(); }, [playNavigationHum]);

  // Create dispute form
  const [projectId, setProjectId] = useState('');
  const [milestoneId, setMilestoneId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    try {
      // Use DisputeJury contract for real dispute data
      let disputeCount = 0;
      try {
        disputeCount = await web3Service.getDisputeCount();
      } catch {
        // Fallback: scan projects for disputed status
      }

      const disputeList: Dispute[] = [];

      if (disputeCount > 0) {
        // Fetch from DisputeJury contract
        for (let i = 0; i < disputeCount; i++) {
          try {
            const d = await web3Service.getDispute(i);
            disputeList.push({
              projectId: d.projectId,
              milestoneId: d.milestoneIndex,
              status: d.status, // Real status from contract
              clientAddress: d.client,
              freelancerAddress: d.freelancer,
              clientVotes: d.clientVotes,
              freelancerVotes: d.freelancerVotes,
              totalVotes: d.selectedJurors?.length || 0,
              deadline: Number(d.votingDeadline),
              resolution: d.finalized ? `Client: ${Number(d.recommendedClientShare)}% / Freelancer: ${Number(d.recommendedFreelancerShare)}%` : '',
            });
          } catch {
            // Skip invalid disputes
          }
        }
      } else {
        // Fallback: scan escrow for disputed projects
        const escrow = web3Service.getContract('projectEscrow');
        if (escrow) {
          const projectCount = await escrow.projectCounter().catch(() => BigInt(0));
          for (let i = 0; i < Number(projectCount) && i < 100; i++) {
            try {
              const project = await escrow.getProject(i);
              if (Number(project.status) === 4) {
                disputeList.push({
                  projectId: i,
                  milestoneId: 0,
                  status: 0,
                  clientAddress: project.client,
                  freelancerAddress: project.freelancer,
                  clientVotes: 0,
                  freelancerVotes: 0,
                  totalVotes: 0,
                  deadline: 0,
                  resolution: '',
                });
              }
            } catch { /* skip */ }
          }
        }
      }

      setDisputes(disputeList);
    } catch (err) {
      console.error('Failed to load disputes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadDisputes();
    else setLoading(false);
  }, [isAuthenticated, loadDisputes]);

  const handleCreateDispute = async () => {
    if (!projectId || !milestoneId) {
      toast.error('Enter both project and milestone IDs');
      return;
    }

    setIsCreating(true);
    try {
      const escrow = web3Service.getContract('projectEscrow');
      if (!escrow) throw new Error('Contract not initialized. Connect wallet first.');

      toast.loading('Submitting dispute on-chain...', { id: 'dispute' });
      const tx = await escrow.createDispute(Number(projectId), Number(milestoneId));
      await tx.wait();

      toast.success('Dispute created successfully', { id: 'dispute' });
      setViewMode('list');
      setProjectId('');
      setMilestoneId('');
      loadDisputes();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to create dispute';
      toast.error(msg.includes('user rejected') ? 'Transaction cancelled' : msg, { id: 'dispute' });
    } finally {
      setIsCreating(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Shield className="w-16 h-16 text-surface-300 mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold text-surface-900 mb-2">
          Connect Wallet to View Disputes
        </h2>
        <p className="text-surface-500">
          You need to be authenticated to participate in the dispute resolution system.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AnimatePresence mode="wait">
        {viewMode === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-6">
                {/* 3D Scales visualization */}
                <div className="hidden md:block w-28 h-28 flex-shrink-0">
                  <Suspense fallback={null}>
                    <ScalesScene tilt={0} />
                  </Suspense>
                </div>
                <div>
                  <h1 className="text-3xl font-display font-bold text-surface-900">
                    Dispute Resolution
                  </h1>
                  <p className="mt-1 text-surface-500">
                    On-chain jury-based dispute resolution for project milestones
                  </p>
                </div>
              </div>
              <Button onClick={() => setViewMode('create')}>
                <Gavel className="w-4 h-4" />
                File Dispute
              </Button>
            </div>

            {/* Info Card */}
            <div className="card p-6 mb-8 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border-indigo-500/20">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                  <Scale className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-indigo-300 mb-1">How Disputes Work</h3>
                  <p className="text-sm text-indigo-400">
                    When a milestone is disputed, qualified jurors stake tokens and vote on the outcome.
                    The winning party receives the funds, and correct jurors earn rewards. Jurors with
                    conflicts of interest are automatically excluded.
                  </p>
                </div>
              </div>
            </div>

            {/* Disputes List */}
            {disputes.length === 0 ? (
              <div className="text-center py-16">
                <Scale className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                <p className="text-surface-500 mb-2">No active disputes found</p>
                <p className="text-sm text-surface-400">
                  Disputes appear here when a project milestone is contested
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {disputes.map((dispute) => {
                  const status = statusLabels[dispute.status] || statusLabels[0];
                  const StatusIcon = status.icon;
                  const isParty =
                    address?.toLowerCase() === dispute.clientAddress.toLowerCase() ||
                    address?.toLowerCase() === dispute.freelancerAddress.toLowerCase();

                  return (
                    <motion.div
                      key={`${dispute.projectId}-${dispute.milestoneId}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="card card-hover p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center">
                            <Gavel className="w-6 h-6 text-surface-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-surface-900">
                                Project #{dispute.projectId} — Milestone #{dispute.milestoneId}
                              </h3>
                              {isParty && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-50 text-primary-600">
                                  Your Dispute
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-surface-500">
                              <span>Client: {formatAddress(dispute.clientAddress)}</span>
                              <span>Freelancer: {formatAddress(dispute.freelancerAddress)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border',
                              status.color
                            )}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {status.label}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedDispute(dispute);
                              setViewMode('detail');
                            }}
                            className="btn-icon btn-ghost"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Voting Progress */}
                      {dispute.status === 1 && dispute.totalVotes > 0 && (
                        <div className="mt-4 pt-4 border-t border-surface-100">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-surface-500">Votes</span>
                            <span className="text-surface-700 font-medium">
                              {dispute.clientVotes + dispute.freelancerVotes} / {dispute.totalVotes} needed
                            </span>
                          </div>
                          <div className="flex h-2 rounded-full overflow-hidden bg-surface-100">
                            <div
                              className="bg-blue-500 transition-all"
                              style={{
                                width: `${(dispute.clientVotes / Math.max(dispute.clientVotes + dispute.freelancerVotes, 1)) * 100}%`,
                              }}
                            />
                            <div
                              className="bg-violet-500 transition-all"
                              style={{
                                width: `${(dispute.freelancerVotes / Math.max(dispute.clientVotes + dispute.freelancerVotes, 1)) * 100}%`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-surface-400 mt-1">
                            <span>Client: {dispute.clientVotes}</span>
                            <span>Freelancer: {dispute.freelancerVotes}</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {viewMode === 'detail' && selectedDispute && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-3xl mx-auto"
          >
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2 text-surface-500 hover:text-surface-700 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Disputes
            </button>

            <div className="card p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center">
                  <Gavel className="w-6 h-6 text-surface-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-surface-900">
                    Project #{selectedDispute.projectId}
                  </h2>
                  <p className="text-surface-500">Milestone #{selectedDispute.milestoneId}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-surface-50 rounded-xl p-4">
                  <p className="text-xs text-surface-400 mb-1">Client</p>
                  <p className="text-sm font-mono text-surface-700">
                    {formatAddress(selectedDispute.clientAddress)}
                  </p>
                </div>
                <div className="bg-surface-50 rounded-xl p-4">
                  <p className="text-xs text-surface-400 mb-1">Freelancer</p>
                  <p className="text-sm font-mono text-surface-700">
                    {formatAddress(selectedDispute.freelancerAddress)}
                  </p>
                </div>
              </div>

              {selectedDispute.status === 2 && selectedDispute.resolution && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <h3 className="font-semibold text-green-300">Resolution</h3>
                  </div>
                  <p className="text-sm text-green-400">{selectedDispute.resolution}</p>
                </div>
              )}

              {selectedDispute.status < 2 && (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-amber-400" />
                      <h3 className="font-semibold text-amber-300">Awaiting Resolution</h3>
                    </div>
                    <p className="text-sm text-amber-400">
                      This dispute is currently being reviewed by the jury. Qualified jurors will
                      stake tokens and vote on the outcome.
                    </p>
                    {selectedDispute.deadline > 0 && (
                      <p className="text-xs text-amber-500 mt-2">
                        Voting deadline: {new Date(selectedDispute.deadline * 1000).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Vote Counts */}
                  {selectedDispute.totalVotes > 0 && (
                    <div className="bg-surface-50 rounded-xl p-4">
                      {/* 3D scales tilted by vote ratio */}
                      <div className="h-36 mb-3">
                        <Suspense fallback={null}>
                          <ScalesScene
                            tilt={
                              selectedDispute.clientVotes + selectedDispute.freelancerVotes > 0
                                ? (selectedDispute.freelancerVotes - selectedDispute.clientVotes) /
                                  Math.max(selectedDispute.clientVotes + selectedDispute.freelancerVotes, 1)
                                : 0
                            }
                          />
                        </Suspense>
                      </div>
                      <p className="text-sm text-surface-500 mb-3">Current Votes</p>
                      <div className="flex h-3 rounded-full overflow-hidden bg-surface-200 mb-2">
                        <div
                          className="bg-blue-500 transition-all"
                          style={{ width: `${(selectedDispute.clientVotes / Math.max(selectedDispute.clientVotes + selectedDispute.freelancerVotes, 1)) * 100}%` }}
                        />
                        <div
                          className="bg-violet-500 transition-all"
                          style={{ width: `${(selectedDispute.freelancerVotes / Math.max(selectedDispute.clientVotes + selectedDispute.freelancerVotes, 1)) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-surface-500">
                        <span>Client: {selectedDispute.clientVotes}</span>
                        <span>Freelancer: {selectedDispute.freelancerVotes}</span>
                      </div>
                    </div>
                  )}

                  {/* Voting Buttons for Jurors */}
                  {selectedDispute.status === 1 && (
                    <div className="bg-surface-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-surface-700 mb-3">Cast Your Vote (Jurors Only)</p>
                      <div className="flex gap-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            try {
                              toast.loading('Casting vote...', { id: 'vote' });
                              const tx = await web3Service.castVote(selectedDispute.projectId, 0);
                              await tx.wait();
                              toast.success('Vote cast for client', { id: 'vote' });
                              loadDisputes();
                            } catch (e: any) {
                              const msg = e?.message || 'Failed to vote';
                              toast.error(msg.includes('user rejected') ? 'Cancelled' : msg, { id: 'vote' });
                            }
                          }}
                        >
                          Vote: Client
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            try {
                              toast.loading('Casting vote...', { id: 'vote' });
                              const tx = await web3Service.castVote(selectedDispute.projectId, 1);
                              await tx.wait();
                              toast.success('Vote cast for freelancer', { id: 'vote' });
                              loadDisputes();
                            } catch (e: any) {
                              const msg = e?.message || 'Failed to vote';
                              toast.error(msg.includes('user rejected') ? 'Cancelled' : msg, { id: 'vote' });
                            }
                          }}
                        >
                          Vote: Freelancer
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            try {
                              toast.loading('Casting vote...', { id: 'vote' });
                              const tx = await web3Service.castVote(selectedDispute.projectId, 2);
                              await tx.wait();
                              toast.success('Vote: Accept AI recommendation', { id: 'vote' });
                              loadDisputes();
                            } catch (e: any) {
                              const msg = e?.message || 'Failed to vote';
                              toast.error(msg.includes('user rejected') ? 'Cancelled' : msg, { id: 'vote' });
                            }
                          }}
                        >
                          Accept AI Split
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {viewMode === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto"
          >
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2 text-surface-500 hover:text-surface-700 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Disputes
            </button>

            <div className="card p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-surface-900">
                    File a Dispute
                  </h2>
                  <p className="text-surface-500">
                    Contest a milestone decision on-chain
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-amber-700">
                  <strong>Warning:</strong> Filing a dispute triggers on-chain jury selection.
                  Only file a dispute if you believe a milestone was unfairly rejected or approved.
                  False disputes may affect your reputation score.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Project ID
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="Enter project ID"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">
                    Milestone ID
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={milestoneId}
                    onChange={(e) => setMilestoneId(e.target.value)}
                    placeholder="Enter milestone ID"
                    className="input"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleCreateDispute}
                  isLoading={isCreating}
                  disabled={!projectId || !milestoneId}
                  variant="primary"
                >
                  <Send className="w-4 h-4" />
                  Submit Dispute
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DisputesPage;
