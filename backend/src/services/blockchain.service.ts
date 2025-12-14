import { ethers, Contract } from 'ethers';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Import ABIs
import ProjectEscrowABI from '../abi/ProjectEscrow.json' with { type: 'json' };
import UserRegistryABI from '../abi/UserRegistry.json' with { type: 'json' };
import AIOracleABI from '../abi/AIOracle.json' with { type: 'json' };
import SkillTrialABI from '../abi/SkillTrial.json' with { type: 'json' };

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;
  
  public projectEscrow: Contract | null = null;
  public userRegistry: Contract | null = null;
  public aiOracle: Contract | null = null;
  public skillTrial: Contract | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.hedera.rpcUrl);
    
    if (config.oracle.privateKey) {
      this.wallet = new ethers.Wallet(config.oracle.privateKey, this.provider);
    }
    
    this.initContracts();
  }

  private initContracts() {
    try {
      if (config.contracts.projectEscrow) {
        this.projectEscrow = new ethers.Contract(
          config.contracts.projectEscrow, 
          ProjectEscrowABI, 
          this.provider
        );
        logger.info(`✅ ProjectEscrow loaded: ${config.contracts.projectEscrow}`);
      }
      
      if (config.contracts.userRegistry) {
        this.userRegistry = new ethers.Contract(
          config.contracts.userRegistry, 
          UserRegistryABI, 
          this.provider
        );
        logger.info(`✅ UserRegistry loaded: ${config.contracts.userRegistry}`);
      }
      
      if (config.contracts.aiOracle && this.wallet) {
        this.aiOracle = new ethers.Contract(
          config.contracts.aiOracle, 
          AIOracleABI, 
          this.wallet
        );
        logger.info(`✅ AIOracle loaded: ${config.contracts.aiOracle}`);
      }
      
      if (config.contracts.skillTrial) {
        this.skillTrial = new ethers.Contract(
          config.contracts.skillTrial, 
          SkillTrialABI, 
          this.provider
        );
        logger.info(`✅ SkillTrial loaded: ${config.contracts.skillTrial}`);
      }
    } catch (e) {
      logger.error('Failed to load contracts:', e);
    }
  }

  async getProject(projectId: number) {
    if (!this.projectEscrow) throw new Error('ProjectEscrow contract not initialized');
    
    const p = await this.projectEscrow.getProject(projectId);
    return {
      projectId: Number(p.projectId),
      client: p.client,
      freelancer: p.freelancer,
      agencyId: Number(p.agencyId),
      totalAmount: p.totalAmount.toString(),
      amountPaid: p.amountPaid.toString(),
      status: Number(p.status),
      milestones: p.milestones.map((m: any, i: number) => ({
        index: i,
        description: m.description,
        amount: m.amount.toString(),
        status: Number(m.status),
        completionTime: Number(m.completionTime),
      })),
      isEnterpriseProject: p.isEnterpriseProject,
    };
  }

  async getUserProfile(address: string) {
    if (!this.userRegistry) throw new Error('UserRegistry contract not initialized');
    
    const [level, ensName, hasDeposited, registrationTime] = await this.userRegistry.getUserProfile(address);
    const isVerified = await this.userRegistry.isVerifiedHuman(address);
    
    let attestations: any[] = [];
    try {
      attestations = await this.userRegistry.getAttestations(address);
    } catch {
      // No attestations
    }
    
    return {
      level: Number(level),
      ensName,
      hasDeposited,
      registrationTime: Number(registrationTime),
      isVerifiedHuman: isVerified,
      attestations: attestations.map((a: any) => ({
        attestationId: Number(a.attestationId),
        type: Number(a.attestationType),
        referenceId: Number(a.referenceId),
        timestamp: Number(a.timestamp),
        issuer: a.issuer,
        metadata: a.metadata,
        isPositive: a.isPositive,
      })),
    };
  }

  async getSkillTest(testId: number) {
    if (!this.skillTrial) throw new Error('SkillTrial contract not initialized');
    
    const test = await this.skillTrial.getTest(testId);
    return {
      title: test.title,
      description: test.description,
      ipfsHash: test.ipfsHash,
      fee: test.fee.toString(),
      isActive: test.isActive,
      submissionCount: Number(test.submissionCount),
    };
  }

  async getSubmission(submissionId: number) {
    if (!this.skillTrial) throw new Error('SkillTrial contract not initialized');
    
    const sub = await this.skillTrial.getSubmission(submissionId);
    return {
      testId: Number(sub.testId),
      applicant: sub.applicant,
      submissionHash: sub.submissionHash,
      status: Number(sub.status),
      submittedAt: Number(sub.submittedAt),
      score: Number(sub.score),
      report: sub.report,
    };
  }

  getProvider() {
    return this.provider;
  }

  getWallet() {
    return this.wallet;
  }
}

export const blockchainService = new BlockchainService();
