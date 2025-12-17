import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types';
import { web3Service } from '@/services/web3.service';
import { apiService } from '@/services/api.service';
import toast from 'react-hot-toast';

interface AuthState {
  user: User | null;
  address: string | null;
  isAuthenticated: boolean;
  isConnecting: boolean;
  isRegistering: boolean;
  error: string | null;
  
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
          const { message } = await apiService.getAuthMessage();
          
          const signer = web3Service.getSigner();
          if (!signer) {
            throw new Error('No signer available');
          }
          
          const signature = await signer.signMessage(message);
          const response = await apiService.verifySignature(address, signature);
          
          if (response.success && response.token) {
            localStorage.setItem('authToken', response.token);
            
            const storedState = localStorage.getItem('humanwork-auth');
            let existingUser = null;
            
            if (storedState) {
              try {
                const parsed = JSON.parse(storedState);
                if (parsed.state?.user?.address?.toLowerCase() === address.toLowerCase()) {
                  existingUser = parsed.state.user;
                }
              } catch (e) {
                console.error('Failed to parse stored state:', e);
              }
            }
            
            if (existingUser) {
              set({
                user: existingUser,
                address,
                isAuthenticated: true,
                isConnecting: false,
              });
              toast.success('Welcome back!');
            } else {
              set({
                address,
                isConnecting: false,
              });
            }
          } else {
            throw new Error('Authentication failed');
          }
        } catch (error) {
          console.error('Connection error:', error);
          const message = error instanceof Error ? error.message : 'Failed to connect wallet';
          set({
            error: message,
            isConnecting: false,
          });
          toast.error(message);
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
        toast.success('Disconnected');
      },

      register: async (role: UserRole, name: string) => {
        const { address } = get();
        
        if (!address) {
          set({ error: 'Please connect your wallet first' });
          return;
        }

        set({ isRegistering: true, error: null });

        try {
          try {
            toast.loading('Registering on blockchain...', { id: 'register' });
            const tx = await web3Service.registerUser();
            await tx.wait();
            toast.success('Registered on blockchain!', { id: 'register' });
          } catch (e: unknown) {
            const errorMessage = (e as Error).message || '';
            if (!errorMessage.includes('already registered') && !errorMessage.includes('AlreadyRegistered')) {
              console.log('Registration note:', errorMessage);
            }
            toast.dismiss('register');
          }

          try {
            toast.loading('Verifying as human...', { id: 'verify' });
            const verifyTx = await web3Service.verifyHuman();
            await verifyTx.wait();
            toast.success('Verified as human!', { id: 'verify' });
          } catch (e: unknown) {
            const errorMessage = (e as Error).message || '';
            if (!errorMessage.includes('already verified') && !errorMessage.includes('AlreadyVerified')) {
              console.log('Verification note:', errorMessage);
            }
            toast.dismiss('verify');
          }

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

          toast.success(`Welcome to HumanWork, ${name}!`);
        } catch (error) {
          console.error('Registration error:', error);
          const message = error instanceof Error ? error.message : 'Failed to register';
          set({
            error: message,
            isRegistering: false,
          });
          toast.error(message);
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