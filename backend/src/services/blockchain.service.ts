import { ethers, Contract } from 'ethers';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Import ABIs
import ProjectEscrowABI from '../abi/ProjectEscrow.json' with { type: 'json' };
import UserRegistryABI from '../abi/UserRegistry.json' with { type: 'json' };
import AIOracleABI from '../abi/AIOracle.json' with { type: 'json' };
import SkillTrialABI from '../abi/SkillTrial.json' with { type: 'json' };
import DisputeJuryABI from '../abi/DisputeJury.json' with { type: 'json' };
import InsurancePoolABI from '../abi/InsurancePool.json' with { type: 'json' };
import GasSponsorABI from '../abi/GasSponsor.json' with { type: 'json' };
import AgencyRegistryABI from '../abi/AgencyRegistry.json' with { type: 'json' };
import EnterpriseAccessABI from '../abi/EnterpriseAccess.json' with { type: 'json' };

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet | null = null;
  
  public projectEscrow: Contract | null = null;
  public userRegistry: Contract | null = null;
  public aiOracle: Contract | null = null;
  public skillTrial: Contract | null = null;
  public disputeJury: Contract | null = null;
  public insurancePool: Contract | null = null;
  public gasSponsor: Contract | null = null;
  public agencyRegistry: Contract | null = null;
  public enterpriseAccess: Contract | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.hedera.rpcUrl, undefined, {
      batchMaxCount: 1,
    });
    
    if (config.oracle.privateKey) {
      this.wallet = new ethers.Wallet(config.oracle.privateKey, this.provider);
    }
    
    this.initContracts();
  }

  private loadContract(address: string | undefined, abi: any, label: string, useSigner = false): Contract | null {
    if (!address) return null;
    const signerOrProvider = useSigner && this.wallet ? this.wallet : this.provider;
    const contract = new ethers.Contract(address, abi, signerOrProvider);
    logger.info(`✅ ${label} loaded: ${address}`);
    return contract;
  }

  private initContracts() {
    try {
      this.projectEscrow = this.loadContract(config.contracts.projectEscrow, ProjectEscrowABI, 'ProjectEscrow');
      this.userRegistry = this.loadContract(config.contracts.userRegistry, UserRegistryABI, 'UserRegistry');
      this.aiOracle = this.loadContract(config.contracts.aiOracle, AIOracleABI, 'AIOracle', true);
      this.skillTrial = this.loadContract(config.contracts.skillTrial, SkillTrialABI, 'SkillTrial');
      this.disputeJury = this.loadContract(config.contracts.disputeJury, DisputeJuryABI, 'DisputeJury', true);
      this.insurancePool = this.loadContract(config.contracts.insurancePool, InsurancePoolABI, 'InsurancePool');
      this.gasSponsor = this.loadContract(config.contracts.gasSponsor, GasSponsorABI, 'GasSponsor');
      this.agencyRegistry = this.loadContract(config.contracts.agencyRegistry, AgencyRegistryABI, 'AgencyRegistry');
      this.enterpriseAccess = this.loadContract(config.contracts.enterpriseAccess, EnterpriseAccessABI, 'EnterpriseAccess');
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

  // ── DisputeJury helpers ───────────────────────────────────────────────────
  async getDispute(disputeId: number) {
    if (!this.disputeJury) throw new Error('DisputeJury contract not initialized');
    const d = await this.disputeJury.getDispute(disputeId);
    return {
      projectId: Number(d.projectId),
      milestoneIndex: Number(d.milestoneIndex),
      client: d.client,
      freelancer: d.freelancer,
      amount: d.amount.toString(),
      totalVotes: Number(d.totalVotes),
      outcome: Number(d.outcome),
      createdAt: Number(d.createdAt),
      resolvedAt: Number(d.resolvedAt),
      fundsDistributed: d.fundsDistributed,
      aiReport: d.aiReport,
      aiRecommendedSplit: Number(d.aiRecommendedSplit),
    };
  }

  async setAiReport(disputeId: number, report: string, recommendedSplit: number) {
    if (!this.disputeJury) throw new Error('DisputeJury contract not initialized');
    const tx = await this.disputeJury.setAiReport(disputeId, report, recommendedSplit);
    return tx;
  }

  // ── InsurancePool helpers ─────────────────────────────────────────────────
  async getPoolMetrics() {
    if (!this.insurancePool) throw new Error('InsurancePool contract not initialized');
    const metrics = await this.insurancePool.getPoolMetrics();
    return {
      totalPremiums: metrics.totalPremiums?.toString() || '0',
      totalClaims: metrics.totalClaims?.toString() || '0',
      activePolicies: Number(metrics.activePolicies || 0),
      poolBalance: metrics.poolBalance?.toString() || '0',
    };
  }

  async getPolicy(policyId: number) {
    if (!this.insurancePool) throw new Error('InsurancePool contract not initialized');
    const p = await this.insurancePool.getPolicy(policyId);
    return {
      holder: p.holder,
      projectId: Number(p.projectId),
      coverageAmount: p.coverageAmount.toString(),
      premium: p.premium.toString(),
      isActive: p.isActive,
      startTime: Number(p.startTime),
      endTime: Number(p.endTime),
    };
  }

  // ── GasSponsor helpers ────────────────────────────────────────────────────
  async getUserGasBalance(address: string) {
    if (!this.gasSponsor) throw new Error('GasSponsor contract not initialized');
    const balance = await this.gasSponsor.getUserBalance(address);
    return balance.toString();
  }

  async getTreasuryMetrics() {
    if (!this.gasSponsor) throw new Error('GasSponsor contract not initialized');
    const metrics = await this.gasSponsor.getTreasuryMetrics();
    return {
      totalDeposited: metrics.totalDeposited?.toString() || '0',
      totalSpent: metrics.totalSpent?.toString() || '0',
      userCount: Number(metrics.userCount || 0),
    };
  }

  // ── AgencyRegistry helpers ────────────────────────────────────────────────
  async getAgency(agencyId: number) {
    if (!this.agencyRegistry) throw new Error('AgencyRegistry contract not initialized');
    const a = await this.agencyRegistry.getAgency(agencyId);
    return {
      owner: a.owner,
      name: a.companyName || a.name || '',
      companyName: a.companyName || a.name || '',
      gstNumberHash: (a.gstNumberHash || a.gstHash || ethers.ZeroHash).toString(),
      isGstVerified: Boolean(a.isGstVerified || a.gstVerified),
      stakeAmount: (a.stakeAmount || 0n).toString(),
      metadataHash: a.metadataHash || '',
      isActive: Boolean(a.isActive || a.active),
      teamSize: Number(a.teamSize || a.memberCount || 0),
    };
  }

  async getTeamMembers(agencyId: number) {
    if (!this.agencyRegistry) throw new Error('AgencyRegistry contract not initialized');
    return await this.agencyRegistry.getTeamMembers(agencyId);
  }

  // ── EnterpriseAccess helpers ──────────────────────────────────────────────
  async isEnterpriseUser(address: string) {
    if (!this.enterpriseAccess) throw new Error('EnterpriseAccess contract not initialized');
    return await this.enterpriseAccess.isEnterpriseUser(address);
  }

  async getSubscription(address: string) {
    if (!this.enterpriseAccess) throw new Error('EnterpriseAccess contract not initialized');
    const s = await this.enterpriseAccess.getSubscription(address);
    return {
      isActive: s.isActive,
      tier: Number(s.tier),
      startTime: Number(s.startTime),
      endTime: Number(s.endTime),
      amount: s.amount?.toString() || '0',
    };
  }
}

export const blockchainService = new BlockchainService();
