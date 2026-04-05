import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Plus,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/common';
import { useAuthStore } from '@/context/authStore';
import { useJobsStore } from '@/context/jobsStore';
import { formatUSDC, cn } from '@/utils/helpers';
import type { JobStatus } from '@/types';

const statusConfig: Record<JobStatus, { label: string; color: string; icon: typeof Briefcase }> = {
  open: { label: 'Open', color: 'text-green-500 bg-green-50', icon: Briefcase },
  in_progress: { label: 'In Progress', color: 'text-blue-500 bg-blue-50', icon: Clock },
  completed: { label: 'Completed', color: 'text-emerald-500 bg-emerald-50', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'text-red-500 bg-red-50', icon: XCircle },
  disputed: { label: 'Disputed', color: 'text-amber-500 bg-amber-50', icon: Users },
};

type FilterStatus = 'all' | JobStatus;

export function JobManagePage() {
  const { address, user } = useAuthStore();
  const { myJobs, isLoading, fetchMyJobs } = useJobsStore();
  const [filter, setFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    if (address) {
      fetchMyJobs(address, user?.role === 'freelancer' ? 'freelancer' : 'client');
    }
  }, [address, user?.role, fetchMyJobs]);

  const filteredJobs = filter === 'all' ? myJobs : myJobs.filter(j => j.status === filter);

  const counts = {
    all: myJobs.length,
    open: myJobs.filter(j => j.status === 'open').length,
    in_progress: myJobs.filter(j => j.status === 'in_progress').length,
    completed: myJobs.filter(j => j.status === 'completed').length,
    disputed: myJobs.filter(j => j.status === 'disputed').length,
    cancelled: myJobs.filter(j => j.status === 'cancelled').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-900">
            {user?.role === 'freelancer' ? 'My Projects' : 'Job Management'}
          </h1>
          <p className="text-surface-500 mt-1">
            {user?.role === 'freelancer'
              ? 'Track and manage your active projects'
              : 'Manage your posted jobs and track progress'}
          </p>
        </div>
        {user?.role !== 'freelancer' && (
          <Link to="/jobs/create">
            <Button>
              <Plus className="w-4 h-4" />
              Post New Job
            </Button>
          </Link>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'open', 'in_progress', 'completed', 'disputed', 'cancelled'] as FilterStatus[]).map((status) => {
          const count = counts[status];
          if (status !== 'all' && count === 0) return null;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                filter === status
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              )}
            >
              {status === 'all' ? 'All' : statusConfig[status]?.label || status} ({count})
            </button>
          );
        })}
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <Card className="p-12 text-center">
          <Briefcase className="w-12 h-12 text-surface-300 mx-auto mb-4" />
          <h3 className="font-semibold text-surface-900 mb-2">
            {filter === 'all' ? 'No jobs yet' : `No ${statusConfig[filter as JobStatus]?.label || filter} jobs`}
          </h3>
          <p className="text-surface-500 mb-4">
            {user?.role === 'freelancer'
              ? 'Find and apply to jobs to see them here.'
              : 'Post your first job to start hiring talent.'}
          </p>
          <Link to={user?.role === 'freelancer' ? '/jobs' : '/jobs/create'}>
            <Button>
              {user?.role === 'freelancer' ? 'Browse Jobs' : 'Post a Job'}
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job, index) => {
            const config = statusConfig[job.status] || statusConfig.open;
            const StatusIcon = config.icon;

            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 card-hover">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="text-lg font-semibold text-surface-900 hover:text-primary-500 transition-colors"
                        >
                          {job.title}
                        </Link>
                        <Badge
                          variant={
                            job.status === 'open' ? 'success' :
                            job.status === 'in_progress' ? 'primary' :
                            job.status === 'completed' ? 'success' : 'warning'
                          }
                          className="gap-1"
                        >
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                      </div>

                      <p className="text-sm text-surface-500 line-clamp-2 mb-3">
                        {job.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-surface-400">
                        <span className="font-medium text-surface-700">
                          {formatUSDC(job.budget || job.totalAmount)}
                        </span>
                        {job.status === 'in_progress' && job.milestones.length > 0 && (
                          <span>
                            {job.milestones.filter(m => m.status === 2).length}/{job.milestones.length} milestones
                          </span>
                        )}
                        {job.applicants !== undefined && job.applicants > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {job.applicants} applicants
                          </span>
                        )}
                        {job.freelancer && (
                          <span>
                            Freelancer: {job.freelancerName || job.freelancer.slice(0, 10) + '...'}
                          </span>
                        )}
                      </div>

                      {/* Skills */}
                      {job.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {job.skills.slice(0, 5).map((skill) => (
                            <span
                              key={skill}
                              className="text-xs px-2 py-0.5 rounded-full bg-surface-100 text-surface-500"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.skills.length > 5 && (
                            <span className="text-xs text-surface-400">+{job.skills.length - 5} more</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link to={`/jobs/${job.id}`}>
                        <Button variant="secondary" size="sm">
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default JobManagePage;
