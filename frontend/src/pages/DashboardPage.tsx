import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Briefcase,
  CheckCircle2,
  Clock,
  TrendingUp,
  Award,
  Users,
  Plus,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Button, Card, StatCard, Badge, Progress, Skeleton } from '@/components/common';
import { useAuthStore } from '@/context/authStore';
import { useJobsStore } from '@/context/jobsStore';
import { formatUSDC, formatRelativeTime, calculateProgress } from '@/utils/helpers';

// Freelancer Dashboard Component
function FreelancerDashboard() {
  const { user, address } = useAuthStore();
  const { myJobs, isLoading, fetchMyJobs } = useJobsStore();

  useEffect(() => {
    if (address) {
      fetchMyJobs(address, 'freelancer');
    }
  }, [address, fetchMyJobs]);

  const activeJobs = myJobs.filter(j => j.status === 'in_progress');
  const completedJobs = myJobs.filter(j => j.status === 'completed');
  
  // Calculate stats (mock data for now)
  const stats = {
    totalEarnings: '12450000000', // $12,450 in USDC smallest unit
    pendingPayments: '3500000000', // $3,500
    activeProjects: activeJobs.length,
    completedProjects: completedJobs.length,
    skillBadges: 5,
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-900">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-surface-600 mt-1">Here's what's happening with your freelance work.</p>
        </div>
        <Link to="/jobs">
          <Button>
            Find Jobs
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Earnings"
          value={formatUSDC(stats.totalEarnings)}
          change="+12% this month"
          changeType="positive"
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          label="Pending Payments"
          value={formatUSDC(stats.pendingPayments)}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="Active Projects"
          value={stats.activeProjects}
          icon={<Briefcase className="w-5 h-5" />}
        />
        <StatCard
          label="Skill Badges"
          value={stats.skillBadges}
          icon={<Award className="w-5 h-5" />}
        />
      </div>

      {/* Active Projects */}
      <div>
        <div className="section-header">
          <h2 className="section-title">Active Projects</h2>
          <Link to="/jobs?filter=active" className="text-primary-500 hover:text-primary-600 text-sm font-medium">
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : activeJobs.length > 0 ? (
          <div className="space-y-4">
            {activeJobs.slice(0, 3).map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-surface-900">{job.title}</h3>
                        <Badge variant="primary">In Progress</Badge>
                      </div>
                      <p className="text-sm text-surface-600 mt-1">
                        Client: {job.clientName || 'Anonymous'}
                      </p>
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-surface-600">Progress</span>
                          <span className="font-medium">{calculateProgress(job.milestones)}%</span>
                        </div>
                        <Progress value={calculateProgress(job.milestones)} />
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-surface-900">{formatUSDC(job.totalAmount)}</p>
                      <p className="text-sm text-surface-500 mt-1">
                        {job.milestones.filter(m => m.status === 2).length}/{job.milestones.length} milestones
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Briefcase className="w-12 h-12 text-surface-300 mx-auto mb-4" />
            <h3 className="font-semibold text-surface-900">No active projects</h3>
            <p className="text-surface-600 mt-1">Start applying to jobs to get your first project!</p>
            <Link to="/jobs">
              <Button className="mt-4">Browse Jobs</Button>
            </Link>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="section-title mb-4">Recent Activity</h2>
        <Card className="divide-y divide-surface-100">
          {[
            { icon: CheckCircle2, color: 'text-success-500', text: 'Milestone "Design Phase" approved', time: '2 hours ago' },
            { icon: DollarSign, color: 'text-primary-500', text: 'Payment received: $2,500', time: '1 day ago' },
            { icon: Award, color: 'text-accent-500', text: 'Earned "React Expert" badge', time: '3 days ago' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center gap-4 p-4">
              <div className={`p-2 rounded-xl bg-surface-50 ${activity.color}`}>
                <activity.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-surface-800">{activity.text}</p>
                <p className="text-sm text-surface-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// Recruiter Dashboard Component
function RecruiterDashboard() {
  const { user, address } = useAuthStore();
  const { myJobs, isLoading, fetchMyJobs } = useJobsStore();

  useEffect(() => {
    if (address) {
      fetchMyJobs(address, 'client');
    }
  }, [address, fetchMyJobs]);

  const openJobs = myJobs.filter(j => j.status === 'open');
  const activeJobs = myJobs.filter(j => j.status === 'in_progress');
  const completedJobs = myJobs.filter(j => j.status === 'completed');

  const stats = {
    totalSpent: '45000000000', // $45,000
    pendingPayments: '8500000000', // $8,500
    openJobs: openJobs.length,
    activeProjects: activeJobs.length,
    totalHires: completedJobs.length + activeJobs.length,
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-surface-900">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-surface-600 mt-1">Manage your jobs and find top talent.</p>
        </div>
        <Link to="/jobs/create">
          <Button>
            <Plus className="w-4 h-4" />
            Post a Job
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Spent"
          value={formatUSDC(stats.totalSpent)}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          label="In Escrow"
          value={formatUSDC(stats.pendingPayments)}
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="Open Jobs"
          value={stats.openJobs}
          icon={<Briefcase className="w-5 h-5" />}
        />
        <StatCard
          label="Total Hires"
          value={stats.totalHires}
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      {/* Active Projects Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Jobs Needing Attention */}
        <div>
          <h2 className="section-title mb-4">Needs Your Attention</h2>
          <Card className="divide-y divide-surface-100">
            {activeJobs.length > 0 ? (
              activeJobs.slice(0, 3).map((job) => {
                const pendingMilestones = job.milestones.filter(m => m.status === 1);
                if (pendingMilestones.length === 0) return null;
                
                return (
                  <div key={job.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-surface-900">{job.title}</h4>
                        <p className="text-sm text-surface-600 mt-1">
                          {pendingMilestones.length} milestone(s) pending approval
                        </p>
                      </div>
                      <Link to={`/messages?job=${job.id}`}>
                        <Button variant="secondary" size="sm">Review</Button>
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-success-400 mx-auto mb-3" />
                <p className="text-surface-600">All caught up! No pending reviews.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Open Jobs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Your Open Jobs</h2>
            <Link to="/jobs/manage" className="text-primary-500 hover:text-primary-600 text-sm font-medium">
              Manage all
            </Link>
          </div>
          <Card className="divide-y divide-surface-100">
            {openJobs.length > 0 ? (
              openJobs.slice(0, 3).map((job) => (
                <div key={job.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-surface-900">{job.title}</h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-surface-600">
                        <span>{formatUSDC(job.budget)}</span>
                        <span>•</span>
                        <span>{job.applicants || 0} applicants</span>
                      </div>
                    </div>
                    <Badge variant="success">Open</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <Briefcase className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                <p className="text-surface-600">No open jobs yet.</p>
                <Link to="/jobs/create">
                  <Button className="mt-3" size="sm">Post a Job</Button>
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Active Projects */}
      <div>
        <div className="section-header">
          <h2 className="section-title">Active Projects</h2>
          <Link to="/jobs?filter=active" className="text-primary-500 hover:text-primary-600 text-sm font-medium">
            View all
          </Link>
        </div>

        {activeJobs.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {activeJobs.slice(0, 4).map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-5 card-hover">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-surface-900">{job.title}</h3>
                      <p className="text-sm text-surface-600 mt-1">
                        Freelancer: {job.freelancerName || 'Assigned'}
                      </p>
                    </div>
                    <Badge variant="primary">Active</Badge>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-surface-600">Progress</span>
                      <span className="font-medium">{calculateProgress(job.milestones)}%</span>
                    </div>
                    <Progress value={calculateProgress(job.milestones)} />
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-100">
                    <span className="text-sm text-surface-600">
                      {formatUSDC(job.amountPaid)} / {formatUSDC(job.totalAmount)}
                    </span>
                    <Link to={`/messages?job=${job.id}`}>
                      <Button variant="ghost" size="sm">View Details</Button>
                    </Link>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 text-surface-300 mx-auto mb-4" />
            <h3 className="font-semibold text-surface-900">No active projects</h3>
            <p className="text-surface-600 mt-1">Post a job to start hiring freelancers!</p>
            <Link to="/jobs/create">
              <Button className="mt-4">
                <Plus className="w-4 h-4" />
                Post a Job
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}

// Main Dashboard Page
export function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return (
      <div className="page-container">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-warning-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-surface-900">Not Authenticated</h2>
          <p className="text-surface-600 mt-2">Please connect your wallet to view your dashboard.</p>
          <Link to="/">
            <Button className="mt-4">Go Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      {user.role === 'freelancer' ? <FreelancerDashboard /> : <RecruiterDashboard />}
    </div>
  );
}

export default DashboardPage;
