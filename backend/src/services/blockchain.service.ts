import { ethers, Contract } from 'ethers';
import { config } from '../config'; // ✅ Corrected Import (Named)
import { logger } from '../utils/logger';

// Import ABIs
import ProjectEscrow_ABI from '../abi/ProjectEscrow.json'; 
import UserRegistry_ABI from '../abi/UserRegistry.json';
import AIOracle_ABI from '../abi/AIOracle.json';
import SkillTrial_ABI from '../abi/SkillTrial.json';

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  
  public projectEscrow: Contract | null = null;
  public userRegistry: Contract | null = null;
  public aiOracle: Contract | null = null;
  public skillTrial: Contract | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.hedera.rpcUrl);
    this.wallet = new ethers.Wallet(config.oracle.privateKey, this.provider);
    
    this.initContracts();
  }

  private initContracts() {
    try {
      if (config.contracts.projectEscrow) {
        this.projectEscrow = new ethers.Contract(config.contracts.projectEscrow, ProjectEscrow_ABI, this.provider);
      }
      if (config.contracts.userRegistry) {
        this.userRegistry = new ethers.Contract(config.contracts.userRegistry, UserRegistry_ABI, this.provider);
      }
      if (config.contracts.aiOracle) {
        this.aiOracle = new ethers.Contract(config.contracts.aiOracle, AIOracle_ABI, this.wallet);
      }
      if (config.contracts.skillTrial) {
        this.skillTrial = new ethers.Contract(config.contracts.skillTrial, SkillTrial_ABI, this.provider);
      }
    } catch (e) {
      logger.error("Failed to load contracts:", e);
    }
  }

  async getProject(projectId: number) {
    if (!this.projectEscrow) throw new Error("Contract not initialized");
    const p = await this.projectEscrow.getProject(projectId);
    return {
      client: p.client,
      freelancer: p.freelancer,
      status: Number(p.status)
    };
  }
}

export const blockchainService = new BlockchainService();