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
  disconnect: () => Promise<void>;
  register: (role: UserRole, name: string) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
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
          
          // Step 1: Request a nonce for this wallet address
          const { message } = await apiService.getNonce(address);
          
          const signer = web3Service.getSigner();
          if (!signer) {
            throw new Error('No signer available');
          }
          
          // Step 2: Sign the nonce message
          const signature = await signer.signMessage(message);
          
          // Step 3: Verify signature and establish cookie-based session
          const response = await apiService.verifySignature(address, signature);
          
          if (response.success) {
            const existingUser =
              get().user?.address?.toLowerCase() === address.toLowerCase()
                ? get().user
                : null;
            
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

      disconnect: async () => {
        try {
          await apiService.logout();
        } catch (error) {
          console.warn('Logout endpoint call failed:', error);
        }

        web3Service.disconnect();
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

          // Fetch real on-chain state after registration
          let isVerifiedHuman = false;
          let level = 1;
          try {
            const [profile, verified] = await Promise.all([
              web3Service.getUserProfile(address),
              web3Service.isVerifiedHuman(address),
            ]);
            isVerifiedHuman = verified ?? false;
            level = profile.level ?? 1;
          } catch {
            // On-chain query failed — use conservative defaults
            console.warn('Could not verify on-chain registration state');
          }

          // Persist role using cookie-authenticated backend registration flow.
          await apiService.registerAccount(address, role, name.trim());

          const user: User = {
            id: address,
            address,
            role,
            name,
            isVerifiedHuman,
            level,
            createdAt: new Date().toISOString(),
          };

          // Persist to backend
          try {
            await apiService.updateUserProfile(address, {
              displayName: name,
            });
          } catch {
            console.warn('Failed to persist profile to backend');
          }

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

      updateUser: async (data: Partial<User>) => {
        const { user, address } = get();
        if (!user || !address) return;

        // Persist to backend
        try {
          await apiService.updateUserProfile(address, {
            displayName: data.name,
            bio: data.bio,
            email: data.email,
            skills: data.skills,
          });
        } catch (e) {
          console.warn('Failed to persist profile to backend:', e);
          // Still update local state even if backend fails
        }

        set({ user: { ...user, ...data } });
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