import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '@/utils/config';
import type { Job, JobApplication, Conversation, Message, ApiResponse } from '@/types';

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
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async getAuthMessage(address: string): Promise<{ message: string; nonce: string }> {
    const response = await this.client.post('/api/auth/message', { address });
    return response.data;
  }

  async verifySignature(address: string, signature: string): Promise<{ token: string; user: unknown }> {
    const response = await this.client.post('/api/auth/verify', { address, signature });
    return response.data;
  }

  // User endpoints
  async getUser(address: string): Promise<ApiResponse<unknown>> {
    const response = await this.client.get(`/api/users/${address}`);
    return response.data;
  }

  async updateUser(address: string, data: Partial<{ name: string; bio: string; skills: string[] }>): Promise<ApiResponse<unknown>> {
    const response = await this.client.put(`/api/users/${address}`, data);
    return response.data;
  }

  async getUserStats(address: string): Promise<ApiResponse<unknown>> {
    const response = await this.client.get(`/api/users/${address}/stats`);
    return response.data;
  }

  // Job endpoints
  async getJobs(params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    search?: string;
  }): Promise<ApiResponse<Job[]>> {
    const response = await this.client.get('/api/projects', { params });
    return response.data;
  }

  async getJob(id: number): Promise<ApiResponse<Job>> {
    const response = await this.client.get(`/api/projects/${id}`);
    return response.data;
  }

  async createJob(data: {
    title: string;
    description: string;
    category: string;
    skills: string[];
    milestones: { description: string; amount: string }[];
  }): Promise<ApiResponse<{ ipfsHash: string }>> {
    const response = await this.client.post('/api/projects/upload', data);
    return response.data;
  }

  async getMyJobs(address: string, role: 'client' | 'freelancer'): Promise<ApiResponse<Job[]>> {
    const params = role === 'client' ? { client: address } : { freelancer: address };
    const response = await this.client.get('/api/projects', { params });
    return response.data;
  }

  // Application endpoints
  async applyToJob(jobId: number, data: {
    coverLetter: string;
    proposedAmount: string;
    estimatedDuration: string;
  }): Promise<ApiResponse<JobApplication>> {
    const response = await this.client.post(`/api/projects/${jobId}/apply`, data);
    return response.data;
  }

  async getApplications(jobId: number): Promise<ApiResponse<JobApplication[]>> {
    const response = await this.client.get(`/api/projects/${jobId}/applications`);
    return response.data;
  }

  async acceptApplication(jobId: number, applicationId: string): Promise<ApiResponse<unknown>> {
    const response = await this.client.post(`/api/projects/${jobId}/applications/${applicationId}/accept`);
    return response.data;
  }

  // Conversation/Message endpoints
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    const response = await this.client.get('/api/messages/conversations');
    return response.data;
  }

  async getConversation(conversationId: string): Promise<ApiResponse<Conversation>> {
    const response = await this.client.get(`/api/messages/conversations/${conversationId}`);
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

  async startConversation(jobId: number, participantAddress: string): Promise<ApiResponse<Conversation>> {
    const response = await this.client.post('/api/messages/conversations', {
      jobId,
      participantAddress,
    });
    return response.data;
  }

  // Skills endpoints
  async getSkillTests(): Promise<ApiResponse<unknown[]>> {
    const response = await this.client.get('/api/skills/tests');
    return response.data;
  }

  async submitSkillTest(testId: number, submission: { content: string }): Promise<ApiResponse<unknown>> {
    const response = await this.client.post('/api/skills/submit', { testId, ...submission });
    return response.data;
  }

  // Platform stats
  async getPlatformStats(): Promise<ApiResponse<{
    totalProjects: number;
    totalUsers: number;
    totalValueLocked: string;
  }>> {
    const response = await this.client.get('/api/stats');
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
