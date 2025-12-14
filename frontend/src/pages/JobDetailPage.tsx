import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  User,
  Send,
  Briefcase,
  Award,
  MapPin,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { Button, Card, Badge, Textarea, Skeleton, Progress } from '@/components/common';
import { useAuthStore } from '@/context/authStore';
import { useJobsStore } from '@/context/jobsStore';
import { useMessagesStore } from '@/context/messagesStore';
import { formatUSDC, formatDate, formatRelativeTime, getMilestoneStatusLabel, getMilestoneStatusColor, cn } from '@/utils/helpers';

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

  const isRecruiter = user?.role === 'recruiter';
  const isOwner = currentJob?.client === address;
  const isAssignedFreelancer = currentJob?.freelancer === address;

  useEffect(() => {
    if (id) {
      fetchJob(parseInt(id));
    }
  }, [id, fetchJob]);

  const handleApply = async () => {
    if (!currentJob || !id) return;
    
    setIsApplying(true);
    try {
      await applyToJob(parseInt(id), {
        coverLetter,
        proposedAmount,
        estimatedDuration: currentJob.duration,
      });
      setShowApplyModal(false);
      // Start conversation with client
      await startConversation(parseInt(id), currentJob.client);
      navigate('/messages');
    } catch (error) {
      console.error('Failed to apply:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const handleContactFreelancer = async () => {
    if (!currentJob?.freelancer || !id) return;
    await startConversation(parseInt(id), currentJob.freelancer);
    navigate('/messages');
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
                <Link to={`/jobs/${id}/applications`}>
                  <Button className="w-full">
                    View Applications ({currentJob.applicants || 0})
                  </Button>
                </Link>
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
                <Link to={`/messages?job=${id}`}>
                  <Button className="w-full">
                    <Send className="w-4 h-4" />
                    Go to Project Chat
                  </Button>
                </Link>
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
