import { create } from 'zustand';
import type { Job, JobApplication } from '@/types';
import { apiService } from '@/services/api.service';

interface JobsState {
  jobs: Job[];
  featuredJobs: Job[];
  myJobs: Job[];
  currentJob: Job | null;
  applications: JobApplication[];
  isLoading: boolean;
  error: string | null;
  
  // Pagination
  page: number;
  totalPages: number;
  
  // Filters
  filters: {
    category?: string;
    search?: string;
    status?: string;
  };
  
  // Actions
  fetchJobs: (params?: { page?: number; category?: string; search?: string }) => Promise<void>;
  fetchFeaturedJobs: () => Promise<void>;
  fetchMyJobs: (address: string, role: 'client' | 'freelancer') => Promise<void>;
  fetchJob: (id: number) => Promise<void>;
  fetchApplications: (jobId: number) => Promise<void>;
  applyToJob: (jobId: number, data: { coverLetter: string; proposedAmount: string; estimatedDuration: string }) => Promise<void>;
  setFilters: (filters: Partial<JobsState['filters']>) => void;
  clearFilters: () => void;
  setError: (error: string | null) => void;
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  featuredJobs: [],
  myJobs: [],
  currentJob: null,
  applications: [],
  isLoading: false,
  error: null,
  page: 1,
  totalPages: 1,
  filters: {},

  fetchJobs: async (params) => {
    set({ isLoading: true, error: null });
    
    try {
      const { filters } = get();
      const response = await apiService.getJobs({
        page: params?.page || 1,
        limit: 12,
        category: params?.category || filters.category,
        search: params?.search || filters.search,
        status: filters.status,
      });

      if (response.success && response.data) {
        set({
          jobs: response.data,
          page: response.pagination?.page || 1,
          totalPages: response.pagination?.pages || 1,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      set({
        error: 'Failed to load jobs',
        isLoading: false,
      });
    }
  },

  fetchFeaturedJobs: async () => {
    try {
      const response = await apiService.getJobs({ limit: 6, status: 'open' });
      
      if (response.success && response.data) {
        set({ featuredJobs: response.data });
      }
    } catch (error) {
      console.error('Failed to fetch featured jobs:', error);
    }
  },

  fetchMyJobs: async (address, role) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiService.getMyJobs(address, role);
      
      if (response.success && response.data) {
        set({
          myJobs: response.data,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch my jobs:', error);
      set({
        error: 'Failed to load your jobs',
        isLoading: false,
      });
    }
  },

  fetchJob: async (id) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiService.getJob(id);
      
      if (response.success && response.data) {
        set({
          currentJob: response.data,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch job:', error);
      set({
        error: 'Failed to load job details',
        isLoading: false,
      });
    }
  },

  fetchApplications: async (jobId) => {
    try {
      const response = await apiService.getApplications(jobId);
      
      if (response.success && response.data) {
        set({ applications: response.data });
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    }
  },

  applyToJob: async (jobId, data) => {
    set({ isLoading: true, error: null });
    
    try {
      await apiService.applyToJob(jobId, data);
      set({ isLoading: false });
    } catch (error) {
      console.error('Failed to apply to job:', error);
      set({
        error: 'Failed to submit application',
        isLoading: false,
      });
      throw error;
    }
  },

  setFilters: (newFilters) => {
    const { filters } = get();
    set({ filters: { ...filters, ...newFilters } });
  },

  clearFilters: () => {
    set({ filters: {} });
  },

  setError: (error) => set({ error }),
}));

export default useJobsStore;
