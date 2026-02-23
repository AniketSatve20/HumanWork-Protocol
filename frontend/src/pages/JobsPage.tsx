import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Clock,
  DollarSign,
  Briefcase,
  ChevronDown,
  X,
  Plus,
} from 'lucide-react';
import { Button, Card, Badge, Skeleton, EmptyState } from '@/components/common';
import { useAuthStore } from '@/context/authStore';
import { useJobsStore } from '@/context/jobsStore';
import { formatUSDC, formatRelativeTime, cn } from '@/utils/helpers';
import type { Job } from '@/types';

const categories = [
  'All Categories',
  'Web Development',
  'Mobile Development',
  'Smart Contracts',
  'UI/UX Design',
  'Data Science',
  'DevOps',
  'Technical Writing',
];

const budgetRanges = [
  { label: 'Any Budget', min: 0, max: Infinity },
  { label: 'Under $1,000', min: 0, max: 1000 },
  { label: '$1,000 - $5,000', min: 1000, max: 5000 },
  { label: '$5,000 - $10,000', min: 5000, max: 10000 },
  { label: '$10,000+', min: 10000, max: Infinity },
];

function JobCard({ job, isRecruiter }: { job: Job; isRecruiter: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link to={`/jobs/${job.id}`}>
        <Card className="p-6 h-full card-hover">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src={job.clientAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${job.client}`}
                alt=""
                className="w-10 h-10 rounded-xl"
              />
              <div>
                <p className="text-sm text-surface-600">{job.clientName || 'Anonymous'}</p>
                <p className="text-xs text-surface-400">{formatRelativeTime(job.createdAt)}</p>
              </div>
            </div>
            <Badge variant={job.status === 'open' ? 'success' : 'primary'}>
              {job.status === 'open' ? 'Open' : job.status}
            </Badge>
          </div>

          <h3 className="text-lg font-semibold text-surface-900 mb-2 line-clamp-2">
            {job.title}
          </h3>
          
          <p className="text-surface-600 text-sm mb-4 line-clamp-2">
            {job.description}
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {job.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="px-2 py-1 text-xs bg-surface-100 text-surface-600 rounded-lg"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="px-2 py-1 text-xs bg-surface-100 text-surface-500 rounded-lg">
                +{job.skills.length - 4} more
              </span>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-surface-100">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm text-surface-600">
                <DollarSign className="w-4 h-4" />
                <span className="font-semibold text-surface-900">{formatUSDC(job.budget)}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-surface-500">
                <Clock className="w-4 h-4" />
                <span>{job.duration}</span>
              </div>
            </div>
            {!isRecruiter && job.status === 'open' && (
              <span className="text-primary-500 text-sm font-medium">Apply →</span>
            )}
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

export function JobsPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { jobs, featuredJobs, isLoading, fetchJobs, fetchFeaturedJobs, setFilters } = useJobsStore();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All Categories');
  const [selectedBudget, setSelectedBudget] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const isRecruiter = user?.role === 'recruiter';

  useEffect(() => {
    fetchJobs();
    fetchFeaturedJobs();
  }, [fetchJobs, fetchFeaturedJobs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ search: searchQuery });
    fetchJobs({ search: searchQuery });
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    const categoryFilter = category === 'All Categories' ? undefined : category;
    setFilters({ category: categoryFilter });
    fetchJobs({ category: categoryFilter });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All Categories');
    setSelectedBudget(0);
    setFilters({});
    fetchJobs();
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'All Categories' || selectedBudget !== 0;

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-white">
              {isRecruiter ? 'Manage Your Jobs' : 'Find Your Next Opportunity'}
            </h1>
            <p className="mt-2 text-lg text-white/80 max-w-2xl mx-auto">
              {isRecruiter
                ? 'Post jobs and find the perfect freelancers for your projects.'
                : 'Browse through verified job listings with secure escrow payments.'}
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mt-8 max-w-2xl mx-auto">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Search jobs by title, skills, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-0 bg-white shadow-lg focus:ring-2 focus:ring-primary-300"
                />
              </div>
              <Button type="submit" className="px-6">
                Search
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Recruiter CTA */}
        {isRecruiter && (
          <div className="mb-8">
            <Card className="p-6 bg-gradient-to-r from-accent-50 to-accent-100 border-accent-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-surface-900">Ready to hire?</h3>
                  <p className="text-surface-600">Post a job and connect with verified freelancers.</p>
                </div>
                <Link to="/jobs/create">
                  <Button variant="accent">
                    <Plus className="w-4 h-4" />
                    Post a Job
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Category Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-surface-200 rounded-xl hover:border-surface-300 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>{selectedCategory}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {showFilters && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-surface-200 py-2 z-20">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      handleCategoryChange(category);
                      setShowFilters(false);
                    }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-sm hover:bg-surface-50 transition-colors',
                      selectedCategory === category && 'bg-primary-50 text-primary-600'
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Budget Filter */}
          <select
            value={selectedBudget}
            onChange={(e) => setSelectedBudget(Number(e.target.value))}
            className="px-4 py-2 bg-white border border-surface-200 rounded-xl hover:border-surface-300 transition-colors text-sm"
          >
            {budgetRanges.map((range, index) => (
              <option key={range.label} value={index}>{range.label}</option>
            ))}
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-surface-600 hover:text-surface-900 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear filters
            </button>
          )}

          <div className="flex-1" />

          {/* Results Count */}
          <p className="text-sm text-surface-500">
            {jobs.length} jobs found
          </p>
        </div>

        {/* Featured Jobs */}
        {!hasActiveFilters && featuredJobs.length > 0 && (
          <div className="mb-12">
            <h2 className="section-title mb-4">Featured Jobs</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredJobs.slice(0, 3).map((job) => (
                <JobCard key={job.id} job={job} isRecruiter={isRecruiter} />
              ))}
            </div>
          </div>
        )}

        {/* All Jobs */}
        <div>
          <h2 className="section-title mb-4">
            {hasActiveFilters ? 'Search Results' : 'All Jobs'}
          </h2>
          
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : jobs.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} isRecruiter={isRecruiter} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Briefcase className="w-16 h-16" />}
              title="No jobs found"
              description={
                hasActiveFilters
                  ? "Try adjusting your search filters."
                  : "Check back later for new opportunities."
              }
              action={
                hasActiveFilters && (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default JobsPage;
