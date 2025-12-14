import { ethers, BrowserProvider, JsonRpcSigner } from 'ethers';
import { config } from '@/utils/config';

// Contract ABIs (minimal interfaces)
export const USDC_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

export const USER_REGISTRY_ABI = [
  'function registerBasic() external',
  'function verifyHuman(bytes memory zkProof, uint256[] memory publicSignals) external',
  'function isVerifiedHuman(address user) view returns (bool)',
  'function getUserLevel(address user) view returns (uint8)',
  'function getUserProfile(address user) view returns (uint8 level, string ensName, bool hasDeposited, uint256 registrationTime)',
  'function getAttestationCount(address user) view returns (uint256)',
  'function getPositiveAttestationCount(address user) view returns (uint256)',
];

export const PROJECT_ESCROW_ABI = [
  'function createProject(address freelancer, uint256[] calldata milestoneAmounts, string[] calldata milestoneDescriptions) external returns (uint256)',
  'function addMilestone(uint256 projectId, uint256 amount, string memory description) external',
  'function completeMilestone(uint256 projectId, uint256 milestoneId) external',
  'function approveMilestone(uint256 projectId, uint256 milestoneId) external',
  'function clientCancel(uint256 projectId) external',
  'function freelancerCancel(uint256 projectId) external',
  'function createDispute(uint256 projectId, uint256 milestoneId) external',
  'function getProject(uint256 projectId) view returns (tuple(uint256 projectId, address client, address freelancer, uint256 agencyId, uint256 totalAmount, uint256 amountPaid, uint8 status, tuple(string description, uint256 amount, uint8 status, uint256 completionTime)[] milestones, bool isEnterpriseProject))',
  'function getMilestone(uint256 projectId, uint256 milestoneId) view returns (tuple(string description, uint256 amount, uint8 status, uint256 completionTime))',
  'function getMilestoneCount(uint256 projectId) view returns (uint256)',
  'function projectCounter() view returns (uint256)',
  'event ProjectCreated(uint256 indexed projectId, address indexed client, address indexed freelancer, uint256 totalAmount)',
  'event MilestoneCompleted(uint256 indexed projectId, uint256 indexed milestoneId)',
  'event MilestoneApproved(uint256 indexed projectId, uint256 indexed milestoneId, uint256 amount)',
];

export const SKILL_TRIAL_ABI = [
  'function submitTrial(uint256 testId, string memory submissionHash) external returns (uint256)',
  'function getTest(uint256 testId) view returns (tuple(string title, string description, string ipfsHash, uint256 fee, bool isActive, uint256 submissionCount))',
  'function getSubmission(uint256 submissionId) view returns (tuple(uint256 testId, address applicant, string submissionHash, uint8 status, uint256 submittedAt, uint8 score, string report))',
  'function getFreelancerBadges(address user) view returns (uint256[])',
  'function getTestCount() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
];

class Web3Service {
  private provider: BrowserProvider | null = null;
  private signer: JsonRpcSigner | null = null;
  private contracts: Record<string, ethers.Contract> = {};

  async connect(): Promise<string> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('Please install MetaMask or another Web3 wallet');
    }

    this.provider = new BrowserProvider(window.ethereum);
    
    // Request account access
    const accounts = await this.provider.send('eth_requestAccounts', []);
    
    if (!accounts.length) {
      throw new Error('No accounts found');
    }

    this.signer = await this.provider.getSigner();
    
    // Check network
    const network = await this.provider.getNetwork();
    if (Number(network.chainId) !== config.chainId) {
      await this.switchNetwork();
    }

    // Initialize contracts
    this.initContracts();

    return accounts[0];
  }

  async switchNetwork(): Promise<void> {
    if (!window.ethereum) throw new Error('No wallet found');

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${config.chainId.toString(16)}` }],
      });
    } catch (switchError: unknown) {
      // Chain not added, try to add it
      if ((switchError as { code: number }).code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${config.chainId.toString(16)}`,
            chainName: 'Hedera Testnet',
            nativeCurrency: {
              name: 'HBAR',
              symbol: 'HBAR',
              decimals: 18,
            },
            rpcUrls: [config.rpcUrl],
            blockExplorerUrls: ['https://hashscan.io/testnet'],
          }],
        });
      } else {
        throw switchError;
      }
    }
  }

  private initContracts(): void {
    if (!this.signer) return;

    if (config.contracts.usdc) {
      this.contracts.usdc = new ethers.Contract(
        config.contracts.usdc,
        USDC_ABI,
        this.signer
      );
    }

    if (config.contracts.userRegistry) {
      this.contracts.userRegistry = new ethers.Contract(
        config.contracts.userRegistry,
        USER_REGISTRY_ABI,
        this.signer
      );
    }

    if (config.contracts.projectEscrow) {
      this.contracts.projectEscrow = new ethers.Contract(
        config.contracts.projectEscrow,
        PROJECT_ESCROW_ABI,
        this.signer
      );
    }

    if (config.contracts.skillTrial) {
      this.contracts.skillTrial = new ethers.Contract(
        config.contracts.skillTrial,
        SKILL_TRIAL_ABI,
        this.signer
      );
    }
  }

  disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
  }

  getProvider(): BrowserProvider | null {
    return this.provider;
  }

  getSigner(): JsonRpcSigner | null {
    return this.signer;
  }

  getContract(name: string): ethers.Contract | null {
    return this.contracts[name] || null;
  }

  // USDC Methods
  async getUSDCBalance(address: string): Promise<bigint> {
    const usdc = this.contracts.usdc;
    if (!usdc) throw new Error('USDC contract not initialized');
    return usdc.balanceOf(address);
  }

  async approveUSDC(spender: string, amount: bigint): Promise<ethers.ContractTransactionResponse> {
    const usdc = this.contracts.usdc;
    if (!usdc) throw new Error('USDC contract not initialized');
    return usdc.approve(spender, amount);
  }

  // User Registry Methods
  async registerUser(): Promise<ethers.ContractTransactionResponse> {
    const registry = this.contracts.userRegistry;
    if (!registry) throw new Error('UserRegistry contract not initialized');
    return registry.registerBasic();
  }

  async verifyHuman(): Promise<ethers.ContractTransactionResponse> {
    const registry = this.contracts.userRegistry;
    if (!registry) throw new Error('UserRegistry contract not initialized');
    // MockVerifier accepts empty proof
    return registry.verifyHuman('0x', []);
  }

  async isVerifiedHuman(address: string): Promise<boolean> {
    const registry = this.contracts.userRegistry;
    if (!registry) throw new Error('UserRegistry contract not initialized');
    return registry.isVerifiedHuman(address);
  }

  async getUserProfile(address: string): Promise<{
    level: number;
    ensName: string;
    hasDeposited: boolean;
    registrationTime: bigint;
  }> {
    const registry = this.contracts.userRegistry;
    if (!registry) throw new Error('UserRegistry contract not initialized');
    const [level, ensName, hasDeposited, registrationTime] = await registry.getUserProfile(address);
    return { level, ensName, hasDeposited, registrationTime };
  }

  // Project Escrow Methods
  async createProject(
    freelancer: string,
    milestoneAmounts: bigint[],
    milestoneDescriptions: string[]
  ): Promise<ethers.ContractTransactionResponse> {
    const escrow = this.contracts.projectEscrow;
    if (!escrow) throw new Error('ProjectEscrow contract not initialized');
    return escrow.createProject(freelancer, milestoneAmounts, milestoneDescriptions);
  }

  async completeMilestone(
    projectId: number,
    milestoneId: number
  ): Promise<ethers.ContractTransactionResponse> {
    const escrow = this.contracts.projectEscrow;
    if (!escrow) throw new Error('ProjectEscrow contract not initialized');
    return escrow.completeMilestone(projectId, milestoneId);
  }

  async approveMilestone(
    projectId: number,
    milestoneId: number
  ): Promise<ethers.ContractTransactionResponse> {
    const escrow = this.contracts.projectEscrow;
    if (!escrow) throw new Error('ProjectEscrow contract not initialized');
    return escrow.approveMilestone(projectId, milestoneId);
  }

  async getProject(projectId: number): Promise<unknown> {
    const escrow = this.contracts.projectEscrow;
    if (!escrow) throw new Error('ProjectEscrow contract not initialized');
    return escrow.getProject(projectId);
  }

  // Skill Trial Methods
  async getSkillBadges(address: string): Promise<bigint[]> {
    const trial = this.contracts.skillTrial;
    if (!trial) throw new Error('SkillTrial contract not initialized');
    return trial.getFreelancerBadges(address);
  }

  // Event listener setup
  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', callback);
    }
  }

  onChainChanged(callback: (chainId: string) => void): void {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', callback);
    }
  }

  removeAllListeners(): void {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
  }
}

export const web3Service = new Web3Service();
export default web3Service;

// Type augmentation for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeAllListeners: (event: string) => void;
    };
  }
}
