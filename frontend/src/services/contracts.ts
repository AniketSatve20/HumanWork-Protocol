import { ethers, BrowserProvider, Contract } from "ethers";
import { CONTRACT_ADDRESSES, CONTRACT_ABIS } from "../config/contracts";

export const contractService = {
  // 1. Get Provider (Read-Only)
  getProvider: () => {
    if (window.ethereum) return new BrowserProvider(window.ethereum);
    return ethers.getDefaultProvider("https://testnet.hashio.io/api");
  },

  // 2. Get Signer (Write/Transaction)
  getSigner: async () => {
    if (!window.ethereum) throw new Error("No crypto wallet found");
    const provider = new BrowserProvider(window.ethereum);
    return await provider.getSigner();
  },

  // 3. Get Project Contract
  getProjectEscrow: async (withSigner = false) => {
    const providerOrSigner = withSigner 
      ? await contractService.getSigner() 
      : contractService.getProvider();
      
    return new Contract(
      CONTRACT_ADDRESSES.PROJECT_ESCROW, 
      CONTRACT_ABIS.PROJECT_ESCROW, 
      providerOrSigner
    );
  },

  // 4. Get USDC Contract
  getUSDC: async (withSigner = false) => {
    const providerOrSigner = withSigner 
      ? await contractService.getSigner() 
      : contractService.getProvider();

    return new Contract(
      CONTRACT_ADDRESSES.USDC, 
      CONTRACT_ABIS.USDC, 
      providerOrSigner
    );
  }
};