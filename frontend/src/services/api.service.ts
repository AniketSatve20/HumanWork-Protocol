import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '@/utils/config';
import type { Job, Conversation, Message, ApiResponse, Milestone, JobStatus } from '@/types';

// Map backend Project to frontend Job
function mapProjectToJob(project: Record<string, unknown>): Job {
  const statusMap: Record<number, JobStatus> = {
    0: 'open',
    1: 'in_progress',
    2: 'completed',
    3: 'cancelled',
    4: 'disputed',
  };

  const milestones = (project.milestones as Array<Record<string, unknown>> || []).map((m, idx) => ({
    id: idx,
    description: m.description as string || `Milestone ${idx + 1}`,
    amount: m.amount as string || '0',
    status: (m.status as number) || 0,
    completionTime: m.completionTime as number,
  })) as Milestone[];

  return {
    id: project.projectId as number,
    title: project.title as string || `Project #${project.projectId}`,
    description: project.briefDescription as string || project.description as string || '',
    category: project.category as string || 'General',
    skills: project.skills as string[] || [],
    budget: project.totalAmount as string || '0',
    duration: project.duration as string || '2-4 weeks',
    status: statusMap[project.status as number] || 'open',
    client: project.client as string || '',
    clientName: project.clientName as string,
    clientAvatar: project.clientAvatar as string,
    freelancer: project.freelancer as string,
    freelancerName: project.freelancerName as string,
    freelancerAvatar: project.freelancerAvatar as string,
    milestones,
    totalAmount: project.totalAmount as string || '0',
    amountPaid: project.amountPaid as string || '0',
    createdAt: project.createdAt as string || new Date().toISOString(),
    applicants: project.applicants as number,
    ipfsHash: project.fullDescriptionIpfsHash as string,
  };
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((cfg) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        cfg.headers.Authorization = `Bearer ${token}`;
      }
      return cfg;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
        }
        return Promise.reject(error);
      }
    );
  }

  // ============ Auth Endpoints ============
  
  async getAuthMessage(): Promise<{ success: boolean; message: string }> {
    const response = await this.client.get('/api/auth/message');
    return response.data;
  }

  async verifySignature(walletAddress: string, signature: string): Promise<{ 
    success: boolean; 
    token: string; 
    walletAddress: string 
  }> {
    const response = await this.client.post('/api/auth/verify', { 
      walletAddress, 
      signature 
    });
    return response.data;
  }

  // ============ User Endpoints ============
  
  async getUser(address: string): Promise<ApiResponse<unknown>> {
    const response = await this.client.get(`/api/users/${address}`);
    return response.data;
  }

  async getUserReputation(address: string): Promise<ApiResponse<{
    score: number;
    positiveAttestations: number;
    negativeAttestations: number;
    totalAttestations: number;
    level: number;
    isVerifiedHuman: boolean;
  }>> {
    const response = await this.client.get(`/api/users/${address}/reputation`);
    return response.data;
  }

  // ============ Project/Job Endpoints ============
  
  async getProjects(params?: {
    page?: number;
    limit?: number;
    status?: string | number;
    client?: string;
    freelancer?: string;
    category?: string;
    search?: string;
  }): Promise<ApiResponse<Job[]>> {
    const response = await this.client.get('/api/projects', { params });
    const projects = response.data.projects || [];
    return {
      success: response.data.success,
      data: projects.map(mapProjectToJob),
      pagination: response.data.pagination,
    };
  }

  async getJobs(params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    search?: string;
  }): Promise<ApiResponse<Job[]>> {
    return this.getProjects(params);
  }

  async getProject(id: number): Promise<ApiResponse<Job>> {
    const response = await this.client.get(`/api/projects/${id}`);
    return {
      success: response.data.success,
      data: response.data.project ? mapProjectToJob(response.data.project) : undefined,
    };
  }

  async getJob(id: number): Promise<ApiResponse<Job>> {
    return this.getProject(id);
  }

  async getMyProjects(address: string, role: 'client' | 'freelancer'): Promise<ApiResponse<Job[]>> {
    const params = role === 'client' 
      ? { client: address } 
      : { freelancer: address };
    return this.getProjects(params);
  }

  async getMyJobs(address: string, role: 'client' | 'freelancer'): Promise<ApiResponse<Job[]>> {
    return this.getMyProjects(address, role);
  }

  async getProjectStats(address: string): Promise<ApiResponse<{
    asClient: unknown[];
    asFreelancer: unknown[];
  }>> {
    const response = await this.client.get(`/api/projects/stats/${address}`);
    return response.data;
  }

  async uploadProjectBrief(file: File): Promise<ApiResponse<{ 
    ipfsHash: string; 
    gatewayUrl: string 
  }>> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.client.post('/api/projects/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async createJob(data: {
    title: string;
    description: string;
    category: string;
    skills: string[];
    milestones: { description: string; amount: string }[];
  }): Promise<ApiResponse<{ ipfsHash: string }>> {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const file = new File([blob], 'job-metadata.json', { type: 'application/json' });
    
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.client.post('/api/projects/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    return {
      success: response.data.success,
      data: { ipfsHash: response.data.ipfsHash },
    };
  }

  // ============ Skills Endpoints ============
  
  async getSkillTests(): Promise<ApiResponse<unknown[]>> {
    const response = await this.client.get('/api/skills/tests');
    return response.data;
  }

  async getSkillTest(id: number): Promise<ApiResponse<unknown>> {
    const response = await this.client.get(`/api/skills/tests/${id}`);
    return response.data;
  }

  async submitSkillTest(testId: number, content: string, metadata?: Record<string, unknown>): Promise<ApiResponse<{
    cid: string;
    ipfsUrl: string;
  }>> {
    const response = await this.client.post('/api/skills/submit', { 
      testId, 
      content,
      metadata 
    });
    return response.data;
  }

  async getUserBadges(address: string): Promise<ApiResponse<{
    badges: unknown[];
    totalBadges: number;
  }>> {
    const response = await this.client.get(`/api/skills/badges/${address}`);
    return response.data;
  }

  // ============ Message Endpoints ============
  
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    const response = await this.client.get('/api/messages/conversations');
    return response.data;
  }

  async getConversation(id: string): Promise<ApiResponse<Conversation>> {
    const response = await this.client.get(`/api/messages/conversations/${id}`);
    return response.data;
  }

  async startConversation(jobId: number, participantAddress: string): Promise<ApiResponse<Conversation>> {
    const response = await this.client.post('/api/messages/conversations', {
      jobId,
      participantAddress,
    });
    return response.data;
  }

  async getMessages(conversationId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Message[]>> {
    const response = await this.client.get(`/api/messages/${conversationId}`, { params });
    return response.data;
  }

  async sendMessage(conversationId: string, data: {
    content: string;
    type?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ApiResponse<Message>> {
    const response = await this.client.post(`/api/messages/${conversationId}`, data);
    return response.data;
  }

  // ============ Stats Endpoints ============
  
  async getPlatformStats(): Promise<ApiResponse<{
    totalValueLocked: string;
    totalProjects: number;
    disputeRate: string;
    averageFreelancerScore: string;
    projectCountsByStatus: Record<number, number>;
  }>> {
    const response = await this.client.get('/api/stats');
    return response.data;
  }

  // ============ Health Check ============
  
  async healthCheck(): Promise<{ status: string; timestamp: string; environment: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // ============ Placeholder Endpoints ============
  
  async applyToJob(_jobId: number, _data: {
    coverLetter: string;
    proposedAmount: string;
    estimatedDuration: string;
  }): Promise<ApiResponse<unknown>> {
    return { success: true, data: {} };
  }

  async getApplications(_jobId: number): Promise<ApiResponse<unknown[]>> {
    return { success: true, data: [] };
  }
}

export const apiService = new ApiService();
export default apiService;