import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types';
import { web3Service } from '@/services/web3.service';
import { apiService } from '@/services/api.service';

interface AuthState {
  user: User | null;
  address: string | null;
  isAuthenticated: boolean;
  isConnecting: boolean;
  isRegistering: boolean;
  error: string | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  register: (role: UserRole, name: string) => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      address: null,
      isAuthenticated: false,
      isConnecting: false,
      isRegistering: false,
      error: null,

      connect: async () => {
        set({ isConnecting: true, error: null });
        
        try {
          const address = await web3Service.connect();
          
          // Get auth message and sign it
          const { message } = await apiService.getAuthMessage(address);
          const signer = web3Service.getSigner();
          
          if (!signer) {
            throw new Error('No signer available');
          }
          
          const signature = await signer.signMessage(message);
          
          // Verify signature and get token
          const { token, user } = await apiService.verifySignature(address, signature);
          
          localStorage.setItem('authToken', token);
          
          if (user) {
            set({
              user: user as User,
              address,
              isAuthenticated: true,
              isConnecting: false,
            });
          } else {
            // User not registered yet, just store address
            set({
              address,
              isConnecting: false,
            });
          }
        } catch (error) {
          console.error('Connection error:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to connect wallet',
            isConnecting: false,
          });
        }
      },

      disconnect: () => {
        web3Service.disconnect();
        localStorage.removeItem('authToken');
        set({
          user: null,
          address: null,
          isAuthenticated: false,
          error: null,
        });
      },

      register: async (role: UserRole, name: string) => {
        const { address } = get();
        
        if (!address) {
          set({ error: 'Please connect your wallet first' });
          return;
        }

        set({ isRegistering: true, error: null });

        try {
          // Register on blockchain
          const tx = await web3Service.registerUser();
          await tx.wait();

          // Verify as human (MockVerifier auto-passes)
          const verifyTx = await web3Service.verifyHuman();
          await verifyTx.wait();

          // Create user in backend
          const user: User = {
            id: address,
            address,
            role,
            name,
            isVerifiedHuman: true,
            level: 2,
            createdAt: new Date().toISOString(),
          };

          set({
            user,
            isAuthenticated: true,
            isRegistering: false,
          });
        } catch (error) {
          console.error('Registration error:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to register',
            isRegistering: false,
          });
        }
      },

      updateUser: (data: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...data } });
        }
      },

      setError: (error: string | null) => set({ error }),
      
      clearError: () => set({ error: null }),
    }),
    {
      name: 'humanwork-auth',
      partialize: (state) => ({
        user: state.user,
        address: state.address,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
