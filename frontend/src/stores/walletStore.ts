import { create } from 'zustand';
import { BrowserProvider } from 'ethers';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  isConnected: false,
  connect: async () => {
    if (window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      set({ address: accounts[0], isConnected: true });
    } else {
      alert("Please install MetaMask");
    }
  }
}));