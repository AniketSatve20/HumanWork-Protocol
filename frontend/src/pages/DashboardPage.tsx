import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  Briefcase,
  CheckCircle2,
  Clock,
  Award,
  Users,
  Plus,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Button, Card, StatCard, Badge, Progress, Skeleton } from '@/components/common';
import { useAuthStore } from '@/context/authStore';
import { useJobsStore } from '@/context/jobsStore';
import { apiService } from '@/services/api.service';
import { formatUSDC, calculateProgress } from '@/utils/helpers';

/* ═══════════════════════════════════════════════════════════════════════════
   Delos Terminal Entrance — Clinical fade-in with scan line
   Triggers ONCE when the authStore confirms a valid JWT session.
   ═══════════════════════════════════════════════════════════════════════════ */
const terminalKeyframes = {
  hidden: {
    opacity: 0,
    y: 8,
    filter: 'brightness(0.7)',
  },
  enter: {
    opacity: [0, 0.6, 1],
    y: [8, 2, 0],
    filter: [
      'brightness(0.7)',
      'brightness(1.15)',
      'brightness(1)',
    ],
    transition: {
      duration: 0.8,
      ease: [0.25, 0.1, 0.25, 1],
      times: [0, 0.5, 1],
    },
  },
};

function TerminalReveal({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          variants={terminalKeyframes}
          initial="hidden"
          animate="enter"
          className="relative"
        >
          {/* Horizontal scan line */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D1D1D1]/20 to-transparent"
            aria-hidden
            initial={{ top: 0 }}
            animate={{ top: '100%' }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Freelancer Dashboard ──────────────────────────────────────────────────
function FreelancerDashboard() {
  const { user, address } = useAuthStore();
  const { myJobs, isLoading, fetchMyJobs } = useJobsStore();
  const [stats, setStats] = useState({
    totalEarnings: '0',
    pendingPayments: '0',
    activeProjects: 0,
    completedProjects: 0,
    skillBadges: 0,
  });

  useEffect(() => {
    if (address) {
      fetchMyJobs(address, 'freelancer');
      apiService.getUserStats(address).then((res) => {
        if (res.success && res.data) {
          setStats((prev) => ({
            ...prev,
            totalEarnings: (res.data as any).totalEarned || '0',
            skillBadges: (res.data as any).skillBadges || 0,
          }));
        }
      }).catch(() => {});
    }
  }, [address, fetchMyJobs]);

  const activeJobs = myJobs.filter(j => j.status === 'in_progress');
  const completedJobs = myJobs.filter(j => j.status === 'completed');

  const pendingAmount = activeJobs.reduce((sum, job) => {
    const pending = job.milestones
      .filter(m => m.status === 1)
      .reduce((s, m) => s + BigInt(m.amount || '0'), BigInt(0));
    return sum + pending;
  }, BigInt(0));

  const computedStats = {
    totalEarnings: stats.totalEarnings,
    pendingPayments: pendingAmount.toString(),
    activeProjects: activeJobs.length,
    completedProjects: completedJobs.length,
    skillBadges: stats.skillBadges,
  };

  return (
    <div className="space-y-8">
      {/* Welcome — Delos Terminal header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-[10px] font-mono text-mesa/50 tracking-[0.2em] uppercase mb-1.5">
            DELOS TERMINAL — SESSION ACTIVE
          </p>
          <h1 className="text-2xl font-serif font-semibold text-ivory tracking-wide">
            Welcome back, <span className="text-delos">{user?.name}</span>
          </h1>
          <p className="text-surface-500 mt-1 text-sm">Here's what's happening with your freelance work.</p>
        </div>
        <Link to="/jobs">
          <Button>
            Find Jobs
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </motion.div>

      {/* Stats Grid — data terminal cards */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total Earnings', value: formatUSDC(computedStats.totalEarnings), change: '+12% this month', changeType: 'positive' as const, icon: <DollarSign className="w-5 h-5" /> },
          { label: 'Pending Payments', value: formatUSDC(computedStats.pendingPayments), icon: <Clock className="w-5 h-5" /> },
          { label: 'Active Projects', value: computedStats.activeProjects, icon: <Briefcase className="w-5 h-5" /> },
          { label: 'Skill Badges', value: computedStats.skillBadges, icon: <Award className="w-5 h-5" />, href: '/skills' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
          >
            {(stat as any).href ? (
              <Link to={(stat as any).href}>
                <StatCard {...stat} />
              </Link>
            ) : (
              <StatCard {...stat} />
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Get Verified CTA — show when no skill badges */}
      {computedStats.skillBadges === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-5 border-[#2A9D8F]/15 bg-gradient-to-r from-[#2A9D8F]/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#2A9D8F]/10 flex items-center justify-center border border-[#2A9D8F]/20">
                  <Award className="w-6 h-6 text-[#2A9D8F]" />
                </div>
                <div>
                  <h3 className="font-serif font-semibold text-ivory">Get Verified</h3>
                  <p className="text-sm text-surface-500">Take skill tests to earn on-chain badges and stand out to recruiters.</p>
                </div>
              </div>
              <Link to="/skills">
                <Button variant="secondary">
                  Take a Test
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Active Projects — Delos terminal list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif tracking-widest text-xl text-[#F5F5F5] mb-2" style={{ fontFamily: 'Bodoni Moda, serif', letterSpacing: '0.12em' }}>
            Narrative Loop
          </h2>
          <Link to="/jobs?filter=active" className="text-delos hover:text-delos/80 text-sm font-medium font-mono">
            View all →
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-32" />
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
                <Card className="p-5 delos-card transition-all duration-300 relative overflow-hidden group">
                  {/* Subtle topo background on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.02] transition-opacity pointer-events-none topo-lines" />
                  <div className="relative flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-serif font-semibold text-ivory text-lg" style={{ fontFamily: 'Bodoni Moda, serif', letterSpacing: '0.12em' }}>{job.title}</h3>
                        <Badge variant="primary">In Progress</Badge>
                      </div>
                      <p className="text-sm text-surface-500 mt-1">
                        Client: {job.clientName || 'Anonymous'}
                      </p>
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-surface-500 font-mono text-[10px] tracking-wider uppercase">Progress</span>
                          <span className="font-medium text-mesa font-mono text-xs">{calculateProgress(job.milestones)}%</span>
                        </div>
                        <Progress value={calculateProgress(job.milestones)} />
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-delos font-mono">{formatUSDC(job.totalAmount)}</p>
                      <p className="text-sm text-surface-500 mt-1 font-mono">
                        {job.milestones.filter(m => m.status === 2).length}/{job.milestones.length} milestones
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center delos-card">
            <Briefcase className="w-12 h-12 text-mesa/20 mx-auto mb-4" />
            <h3 className="font-serif font-semibold text-ivory" style={{ fontFamily: 'Bodoni Moda, serif', letterSpacing: '0.12em' }}>No active Narrative Loops</h3>
            <p className="text-surface-500 mt-1">Start applying to jobs to get your first project!</p>
            <Link to="/jobs">
              <Button className="mt-4">Browse Jobs</Button>
            </Link>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="font-serif tracking-widest text-xl text-[#F5F5F5] mb-2" style={{ fontFamily: 'Bodoni Moda, serif', letterSpacing: '0.12em' }}>
          Core Drive Anomalies
        </h2>
        <Card className="divide-y delos-card">
          {completedJobs.length > 0 || activeJobs.length > 0 ? (
            [
              ...completedJobs.slice(0, 2).map((job) => ({
                icon: CheckCircle2,
                color: 'text-[#2A9D8F]',
                text: `Completed: "${job.title}"`,
                time: job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently',
              })),
              ...activeJobs.slice(0, 1).map((job) => ({
                icon: Briefcase,
                color: 'text-delos',
                text: `Working on: "${job.title}"`,
                time: job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently',
              })),
            ].slice(0, 3).map((activity, index) => (
            <div key={index} className="flex items-center gap-4 p-4">
              <div className={`p-2 border border-aluminum/8 bg-surface-100 ${activity.color}`}>
                <activity.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-ivory/90 text-sm">{activity.text}</p>
                <p className="text-sm text-surface-500 font-mono">{activity.time}</p>
              </div>
            </div>
          ))
          ) : (
            <div className="p-8 text-center">
              <Clock className="w-12 h-12 text-mesa/20 mx-auto mb-3" />
              <p className="text-surface-500">No recent activity yet. Start applying to jobs!</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Recruiter Dashboard ───────────────────────────────────────────────────
function RecruiterDashboard() {
  const { user, address } = useAuthStore();
  const { myJobs, fetchMyJobs } = useJobsStore();

  useEffect(() => {
    if (address) {
      fetchMyJobs(address, 'client');
    }
  }, [address, fetchMyJobs]);

  const openJobs = myJobs.filter(j => j.status === 'open');
  const activeJobs = myJobs.filter(j => j.status === 'in_progress');
  const completedJobs = myJobs.filter(j => j.status === 'completed');

  const totalSpent = completedJobs.reduce((sum, job) => sum + BigInt(job.amountPaid || '0'), BigInt(0));
  const pendingPayments = activeJobs.reduce((sum, job) => {
    const remaining = BigInt(job.totalAmount || '0') - BigInt(job.amountPaid || '0');
    return sum + (remaining > BigInt(0) ? remaining : BigInt(0));
  }, BigInt(0));

  const stats = {
    totalSpent: totalSpent.toString(),
    pendingPayments: pendingPayments.toString(),
    openJobs: openJobs.length,
    activeProjects: activeJobs.length,
    totalHires: completedJobs.length + activeJobs.length,
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-[10px] font-mono text-mesa/50 tracking-[0.2em] uppercase mb-1.5">
            DELOS TERMINAL — RECRUITER MODE
          </p>
          <h1 className="text-2xl font-serif font-semibold text-ivory tracking-wide">
            Welcome back, <span className="text-delos">{user?.name}</span>
          </h1>
          <p className="text-surface-500 mt-1 text-sm">Manage your jobs and find top talent.</p>
        </div>
        <Link to="/jobs/create">
          <Button>
            <Plus className="w-4 h-4" />
            Post a Job
          </Button>
        </Link>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total Spent', value: formatUSDC(stats.totalSpent), icon: <DollarSign className="w-5 h-5" /> },
          { label: 'In Escrow', value: formatUSDC(stats.pendingPayments), icon: <Clock className="w-5 h-5" /> },
          { label: 'Open Jobs', value: stats.openJobs, icon: <Briefcase className="w-5 h-5" /> },
          { label: 'Total Hires', value: stats.totalHires, icon: <Users className="w-5 h-5" /> },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </motion.div>

      {/* Active Projects Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Needs Attention */}
        <div>
          <h2 className="text-[10px] font-mono text-[#8B0000]/80 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8B0000] animate-pulse" />
            Needs Your Attention
          </h2>
          <Card className="divide-y divide-aluminum/8 border-aluminum/8">
            {activeJobs.length > 0 ? (
              activeJobs.slice(0, 3).map((job) => {
                const pendingMilestones = job.milestones.filter(m => m.status === 1);
                if (pendingMilestones.length === 0) return null;
                return (
                  <div key={job.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-serif font-medium text-ivory">{job.title}</h4>
                        <p className="text-sm text-surface-500 mt-1 font-mono">
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
                <CheckCircle2 className="w-12 h-12 text-[#2A9D8F]/30 mx-auto mb-3" />
                <p className="text-surface-500">All caught up! No pending reviews.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Open Jobs */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] font-mono text-mesa/60 uppercase tracking-[0.2em]">Your Open Jobs</h2>
            <Link to="/jobs/manage" className="text-delos hover:text-delos/80 text-sm font-medium font-mono">
              Manage all →
            </Link>
          </div>
          <Card className="divide-y divide-aluminum/8 border-aluminum/8">
            {openJobs.length > 0 ? (
              openJobs.slice(0, 3).map((job) => (
                <div key={job.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-serif font-medium text-ivory">{job.title}</h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-surface-500 font-mono">
                        <span>{formatUSDC(job.budget)}</span>
                        <span className="text-aluminum/20">│</span>
                        <span>{job.applicants || 0} applicants</span>
                      </div>
                    </div>
                    <Badge variant="verified" dot>Open</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <Briefcase className="w-12 h-12 text-mesa/20 mx-auto mb-3" />
                <p className="text-surface-500">No open jobs yet.</p>
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[10px] font-mono text-mesa/60 uppercase tracking-[0.2em]">Active Projects</h2>
          <Link to="/jobs?filter=active" className="text-delos hover:text-delos/80 text-sm font-medium font-mono">
            View all →
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
                <Card className="p-5 border-aluminum/8 hover:border-aluminum/20 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-[0.02] transition-opacity pointer-events-none topo-lines" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <h3 className="font-serif font-semibold text-ivory">{job.title}</h3>
                      <p className="text-sm text-surface-500 mt-1">
                        Freelancer: {job.freelancerName || 'Assigned'}
                      </p>
                    </div>
                    <Badge variant="primary">Active</Badge>
                  </div>
                  <div className="relative mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-surface-500 font-mono text-[10px] tracking-wider uppercase">Progress</span>
                      <span className="font-medium text-mesa font-mono text-xs">{calculateProgress(job.milestones)}%</span>
                    </div>
                    <Progress value={calculateProgress(job.milestones)} />
                  </div>
                  <div className="relative flex items-center justify-between mt-4 pt-4 border-t border-aluminum/8">
                    <span className="text-sm text-surface-500 font-mono">
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
          <Card className="p-8 text-center border-aluminum/8">
            <Users className="w-12 h-12 text-mesa/20 mx-auto mb-4" />
            <h3 className="font-serif font-semibold text-ivory">No active projects</h3>
            <p className="text-surface-500 mt-1">Post a job to start hiring freelancers!</p>
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

// ── Main Dashboard Page ───────────────────────────────────────────────────
export function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-10">
        <Card className="p-8 text-center border-aluminum/10">
          <AlertCircle className="w-12 h-12 text-delos/40 mx-auto mb-4" />
          <h2 className="text-xl font-serif font-semibold text-ivory">Not Authenticated</h2>
          <p className="text-surface-500 mt-2">Please connect your wallet to view your dashboard.</p>
          <Link to="/">
            <Button className="mt-4">Go Home</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <TerminalReveal show={isAuthenticated}>
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-10 relative">
        {/* Film grain overlay */}
        <div className="delos-film-grain" />
        {/* Vignette overlay */}
        <div className="delos-vignette" />
        <div className="relative z-10">
          {user.role === 'freelancer' ? <FreelancerDashboard /> : <RecruiterDashboard />}
        </div>
      </div>
    </TerminalReveal>
  );
}

export default DashboardPage;
