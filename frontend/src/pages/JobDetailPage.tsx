import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Send,
  Briefcase,
  Users,
} from 'lucide-react';
import { Button, Card, Badge, Textarea, Skeleton } from '@/components/common';
import { useAuthStore } from '@/context/authStore';
import { useJobsStore } from '@/context/jobsStore';
import { useMessagesStore } from '@/context/messagesStore';
import { apiService } from '@/services/api.service';
import { web3Service } from '@/services/web3.service';
import { parseUSDC, formatUSDC, formatDate, formatRelativeTime, getMilestoneStatusLabel, getMilestoneStatusColor, cn } from '@/utils/helpers';
import { config } from '@/utils/config';
import type { JobApplication } from '@/types';
import toast from 'react-hot-toast';

export function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, address, isAuthenticated } = useAuthStore();
  const { currentJob, isLoading, fetchJob, applyToJob } = useJobsStore();
  const { startConversation } = useMessagesStore();

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedAmount, setProposedAmount] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // Applications management (for job owner)
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
  const [isAccepting, setIsAccepting] = useState<string | null>(null); // applicationId being accepted

  const isRecruiter = user?.role === 'recruiter';
  const isOwner = currentJob?.client?.toLowerCase() === address?.toLowerCase();
  const isAssignedFreelancer = currentJob?.freelancer?.toLowerCase() === address?.toLowerCase();

  useEffect(() => {
    if (id) {
      fetchJob(parseInt(id));
    }
  }, [id, fetchJob]);

  // Fetch applications when owner is viewing an open job
  useEffect(() => {
    if (isOwner && currentJob?.status === 'open' && id) {
      setIsLoadingApplications(true);
      apiService.getApplications(parseInt(id))
        .then((res) => {
          if (res.success && res.data) setApplications(res.data);
        })
        .catch(console.error)
        .finally(() => setIsLoadingApplications(false));
    }
  }, [isOwner, currentJob?.status, id]);

  const handleApply = async () => {
    if (!currentJob || !id) return;
    
    setIsApplying(true);
    try {
      await applyToJob(parseInt(id), {
        coverLetter,
        proposedAmount,
        estimatedDuration: currentJob.duration,
      });
      toast.success('Application submitted! The client will review it.');
      setShowApplyModal(false);
      // Start conversation with client
      const conv = await startConversation(parseInt(id), currentJob.client);
      navigate(`/messages?conversation=${conv.id}`);
    } catch (error) {
      console.error('Failed to apply:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleAcceptFreelancer = async (application: JobApplication) => {
    if (!currentJob || !id) return;
    setIsAccepting(application.id);
    try {
      // 1. Mark application as accepted in backend
      const acceptRes = await apiService.acceptApplication(parseInt(id), application.id);
      if (!acceptRes.success) throw new Error('Failed to accept application');

      const freelancerAddress = acceptRes.data?.freelancerAddress || application.freelancerAddress;

      // 2. Approve USDC for the escrow contract
      toast.loading('Approving USDC...', { id: 'escrow' });
      const totalAmount = parseUSDC(currentJob.budget);
      const approveTx = await web3Service.approveUSDC(config.contracts.projectEscrow, totalAmount);
      await approveTx.wait();
      toast.loading('Creating escrow contract...', { id: 'escrow' });

      // 3. Create on-chain project (locks funds in escrow)
      const milestoneAmounts = currentJob.milestones.map(m => parseUSDC(m.amount));
      const milestoneDescriptions = currentJob.milestones.map(m => m.description);
      const createTx = await web3Service.createProject(freelancerAddress, milestoneAmounts, milestoneDescriptions);
      const receipt = await createTx.wait();

      // 4. Extract the on-chain project ID from the ProjectCreated event log.
      // ProjectCreated(uint256 indexed projectId, address indexed client, address indexed freelancer, uint256 totalAmount)
      // topics[0] = event signature hash, topics[1] = projectId (first indexed param)
      let onChainProjectId: number | undefined;
      if (receipt?.logs) {
        for (const log of receipt.logs) {
          if (
            log.address.toLowerCase() === config.contracts.projectEscrow.toLowerCase() &&
            log.topics &&
            log.topics.length >= 4
          ) {
            try {
              onChainProjectId = parseInt(log.topics[1], 16);
              break;
            } catch { /* ignore parsing error */ }
          }
        }
      }

      // 5. Link on-chain project ID back to the job listing
      if (onChainProjectId) {
        await apiService.linkOnChainProject(parseInt(id), onChainProjectId);
      }

      toast.success(`Freelancer accepted! Funds locked in escrow. ${onChainProjectId ? `Project #${onChainProjectId} created.` : ''}`, { id: 'escrow' });

      // Refresh job to show updated status
      fetchJob(parseInt(id));
    } catch (error: unknown) {
      console.error('Failed to accept freelancer:', error);
      toast.error((error as Error).message || 'Failed to create escrow contract', { id: 'escrow' });
    } finally {
      setIsAccepting(null);
    }
  };

  const handleContactFreelancer = async () => {
    if (!currentJob?.freelancer || !id) return;
    try {
      const conv = await startConversation(parseInt(id), currentJob.freelancer);
      navigate(`/messages?conversation=${conv.id}`);
    } catch {
      navigate(`/messages?job=${id}`);
    }
  };

  if (isLoading || !currentJob) {
    return (
      <div className="page-container">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-surface-600 hover:text-surface-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <Badge variant={currentJob.status === 'open' ? 'success' : 'primary'}>
                {currentJob.status === 'open' ? 'Open for Applications' : currentJob.status}
              </Badge>
              <span className="text-sm text-surface-500">
                Posted {formatRelativeTime(currentJob.createdAt)}
              </span>
            </div>

            <h1 className="text-2xl font-display font-bold text-surface-900 mb-4">
              {currentJob.title}
            </h1>

            <div className="flex items-center gap-4 mb-6">
              <img
                src={currentJob.clientAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${currentJob.client}`}
                alt=""
                className="w-12 h-12 rounded-xl"
              />
              <div>
                <p className="font-medium text-surface-900">
                  {currentJob.clientName || 'Anonymous Client'}
                </p>
                <p className="text-sm text-surface-500">
                  {currentJob.applicants || 0} applicants
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2 text-surface-600">
                <DollarSign className="w-4 h-4" />
                <span className="font-semibold text-surface-900">{formatUSDC(currentJob.budget)}</span>
                <span>Budget</span>
              </div>
              <div className="flex items-center gap-2 text-surface-600">
                <Clock className="w-4 h-4" />
                <span>{currentJob.duration}</span>
              </div>
              <div className="flex items-center gap-2 text-surface-600">
                <Briefcase className="w-4 h-4" />
                <span>{currentJob.category}</span>
              </div>
            </div>
          </Card>

          {/* Description Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Project Description</h2>
            <div className="prose prose-surface max-w-none">
              <p className="text-surface-700 whitespace-pre-wrap">{currentJob.description}</p>
            </div>
          </Card>

          {/* Skills Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">Required Skills</h2>
            <div className="flex flex-wrap gap-2">
              {currentJob.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Card>

          {/* Milestones Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">
              Milestones ({currentJob.milestones.length})
            </h2>
            <div className="space-y-4">
              {currentJob.milestones.map((milestone, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-surface-50 rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                      milestone.status === 2 ? 'bg-success-100 text-success-600' : 'bg-surface-200 text-surface-600'
                    )}>
                      {milestone.status === 2 ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-surface-900">{milestone.description}</p>
                      <p className={cn('text-xs mt-1', getMilestoneStatusColor(milestone.status))}>
                        {getMilestoneStatusLabel(milestone.status)}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-surface-900">
                    {formatUSDC(milestone.amount)}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Applications Card - only visible to job owner for open jobs */}
          {isOwner && currentJob.status === 'open' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-surface-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-500" />
                Applications ({applications.length})
              </h2>
              {isLoadingApplications ? (
                <p className="text-sm text-surface-500">Loading applications...</p>
              ) : applications.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="w-10 h-10 text-surface-300 mx-auto mb-3" />
                  <p className="text-surface-600">No applications yet. Share your job listing to attract freelancers.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div key={app.id} className="p-4 border border-surface-200 rounded-xl">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={`https://api.dicebear.com/7.x/identicon/svg?seed=${app.freelancerAddress}`}
                            alt=""
                            className="w-10 h-10 rounded-xl"
                          />
                          <div>
                            <p className="font-medium text-surface-900 font-mono text-sm">
                              {app.freelancerAddress.slice(0, 6)}...{app.freelancerAddress.slice(-4)}
                            </p>
                            <p className="text-xs text-surface-500">{app.estimatedDuration}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-surface-900">${parseFloat(app.proposedAmount).toLocaleString()}</p>
                          <Badge
                            variant={app.status === 'accepted' ? 'success' : app.status === 'rejected' ? 'error' : 'primary'}
                            className="text-xs mt-1"
                          >
                            {app.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-surface-700 mb-3 line-clamp-3">{app.coverLetter}</p>
                      {app.status === 'pending' && (
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => handleAcceptFreelancer(app)}
                          isLoading={isAccepting === app.id}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Accept & Create Escrow
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Action Card */}
          <Card className="p-6 sticky top-24">
            <div className="text-center mb-6">
              <p className="text-sm text-surface-500">Total Budget</p>
              <p className="text-3xl font-display font-bold text-surface-900 mt-1">
                {formatUSDC(currentJob.totalAmount)}
              </p>
            </div>

            {/* Action Buttons based on role and status */}
            {!isAuthenticated ? (
              <div className="space-y-3">
                <p className="text-center text-surface-600 mb-4">
                  Connect your wallet to apply for this job.
                </p>
                <Link to="/">
                  <Button className="w-full">Connect Wallet</Button>
                </Link>
              </div>
            ) : isOwner ? (
              <div className="space-y-3">
                <p className="text-sm text-surface-600 text-center">
                  {applications.length} application{applications.length !== 1 ? 's' : ''} received
                </p>
                {currentJob.freelancer && (
                  <Button variant="secondary" className="w-full" onClick={handleContactFreelancer}>
                    <Send className="w-4 h-4" />
                    Message Freelancer
                  </Button>
                )}
              </div>
            ) : isAssignedFreelancer ? (
              <div className="space-y-3">
                <div className="bg-success-50 text-success-700 p-4 rounded-xl text-center mb-4">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-2" />
                  <p className="font-medium">You're assigned to this project!</p>
                </div>
                <Button className="w-full" onClick={async () => {
                  if (!currentJob?.client || !id) return;
                  try {
                    const conv = await startConversation(parseInt(id), currentJob.client);
                    navigate(`/messages?conversation=${conv.id}`);
                  } catch {
                    navigate(`/messages?job=${id}`);
                  }
                }}>
                  <Send className="w-4 h-4" />
                  Go to Project Chat
                </Button>
              </div>
            ) : isRecruiter ? (
              <div className="bg-surface-50 text-surface-600 p-4 rounded-xl text-center">
                <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm">You're signed in as a recruiter. Switch to freelancer mode to apply.</p>
              </div>
            ) : currentJob.status === 'open' ? (
              <div className="space-y-3">
                <Button className="w-full" onClick={() => setShowApplyModal(true)}>
                  Apply Now
                </Button>
                <p className="text-xs text-center text-surface-500">
                  Your application will start a conversation with the client.
                </p>
              </div>
            ) : (
              <div className="bg-surface-50 text-surface-600 p-4 rounded-xl text-center">
                <p className="text-sm">This job is no longer accepting applications.</p>
              </div>
            )}

            {/* Job Stats */}
            <div className="mt-6 pt-6 border-t border-surface-200 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-500">Posted</span>
                <span className="text-surface-900">{formatDate(currentJob.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-500">Applications</span>
                <span className="text-surface-900">{currentJob.applicants || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-500">Milestones</span>
                <span className="text-surface-900">{currentJob.milestones.length}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-semibold text-surface-900 mb-4">
              Apply to: {currentJob.title}
            </h2>

            <div className="space-y-4">
              <Textarea
                label="Cover Letter"
                placeholder="Introduce yourself and explain why you're the perfect fit for this project..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="min-h-[150px]"
              />

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Your Proposed Rate
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                  <input
                    type="number"
                    placeholder="Enter amount in USD"
                    value={proposedAmount}
                    onChange={(e) => setProposedAmount(e.target.value)}
                    className="input pl-10"
                  />
                </div>
                <p className="text-xs text-surface-500 mt-1">
                  Client's budget: {formatUSDC(currentJob.budget)}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowApplyModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleApply}
                isLoading={isApplying}
                disabled={!coverLetter.trim() || !proposedAmount}
              >
                Submit Application
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default JobDetailPage;