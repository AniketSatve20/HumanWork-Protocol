import { create } from 'zustand';
import type { Conversation, Message } from '@/types';
import { apiService } from '@/services/api.service';

interface MessagesState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  unreadCount: number;
  
  // Actions
  fetchConversations: () => Promise<void>;
  fetchConversation: (id: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, type?: string, metadata?: Record<string, unknown>) => Promise<void>;
  startConversation: (jobId: number, participantAddress: string) => Promise<Conversation>;
  addMessage: (message: Message) => void;
  markAsRead: (conversationId: string) => void;
  setError: (error: string | null) => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  unreadCount: 0,

  fetchConversations: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiService.getConversations();
      
      if (response.success && response.data) {
        const conversations = response.data;
        const unreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
        
        set({
          conversations,
          unreadCount,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      set({
        error: 'Failed to load conversations',
        isLoading: false,
      });
    }
  },

  fetchConversation: async (id) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiService.getConversation(id);
      
      if (response.success && response.data) {
        set({
          currentConversation: response.data,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      set({
        error: 'Failed to load conversation',
        isLoading: false,
      });
    }
  },

  fetchMessages: async (conversationId) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiService.getMessages(conversationId);
      
      if (response.success && response.data) {
        set({
          messages: response.data,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      set({
        error: 'Failed to load messages',
        isLoading: false,
      });
    }
  },

  sendMessage: async (conversationId, content, type = 'text', metadata) => {
    set({ isSending: true, error: null });
    
    try {
      const response = await apiService.sendMessage(conversationId, {
        content,
        type,
        metadata,
      });
      
      if (response.success && response.data) {
        const { messages } = get();
        set({
          messages: [...messages, response.data],
          isSending: false,
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      set({
        error: 'Failed to send message',
        isSending: false,
      });
      throw error;
    }
  },

  startConversation: async (jobId, participantAddress) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiService.startConversation(jobId, participantAddress);
      
      if (response.success && response.data) {
        const { conversations } = get();
        set({
          conversations: [response.data, ...conversations],
          currentConversation: response.data,
          isLoading: false,
        });
        return response.data;
      }
      throw new Error('Failed to start conversation');
    } catch (error) {
      console.error('Failed to start conversation:', error);
      set({
        error: 'Failed to start conversation',
        isLoading: false,
      });
      throw error;
    }
  },

  addMessage: (message) => {
    const { messages, conversations } = get();
    
    set({
      messages: [...messages, message],
      conversations: conversations.map((c) =>
        c.id === message.conversationId
          ? { ...c, lastMessage: message, unreadCount: c.unreadCount + 1 }
          : c
      ),
    });
  },

  markAsRead: (conversationId) => {
    const { conversations, unreadCount } = get();
    const conversation = conversations.find((c) => c.id === conversationId);
    
    if (conversation) {
      set({
        conversations: conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        ),
        unreadCount: unreadCount - conversation.unreadCount,
      });
    }
  },

  setError: (error) => set({ error }),
}));

export default useMessagesStore;
