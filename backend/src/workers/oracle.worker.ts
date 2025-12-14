import { ethers, Contract } from 'ethers';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { aiService } from '../services/ai.service.js';
import AIOracleABI from '../abi/AIOracle.json' with { type: 'json' };

enum JobType {
  GST_VERIFICATION = 0,
  SKILL_GRADING = 1,
  DISPUTE_RESOLUTION = 2 
}

export class OracleWorker {
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Wallet | null = null;
  private oracleContract: Contract | null = null;
  private isProcessing = false;
  private lastProcessedBlock = 0;

  async start() {
    if (!config.contracts.aiOracle || !config.oracle.privateKey) {
      logger.warn('⚠️ AI Worker skipped: Missing AI_ORACLE_ADDRESS or ORACLE_PRIVATE_KEY');
      return; 
    }

    logger.info('🤖 Starting AI Oracle Worker...');

    try {
      const network = new ethers.Network("hedera-testnet", config.hedera.chainId);
      this.provider = new ethers.JsonRpcProvider(config.hedera.rpcUrl, network, { staticNetwork: network });
      this.signer = new ethers.Wallet(config.oracle.privateKey, this.provider);
      this.oracleContract = new ethers.Contract(config.contracts.aiOracle, AIOracleABI, this.signer);

      this.lastProcessedBlock = await this.provider.getBlockNumber();
      logger.info(`📍 AI Listening from block: ${this.lastProcessedBlock}`);
      
      setInterval(() => this.pollForEvents(), 10000);

    } catch (error) {
      logger.error('❌ Failed to start AI worker:', error);
    }
  }

  private async pollForEvents() {
    if (this.isProcessing || !this.oracleContract || !this.provider) return;
    this.isProcessing = true;

    try {
      const currentBlock = await this.provider.getBlockNumber();
      if (currentBlock <= this.lastProcessedBlock) {
        this.isProcessing = false;
        return;
      }

      const events = await this.oracleContract.queryFilter('JobRequested', this.lastProcessedBlock + 1, currentBlock);
      
      for (const event of events) {
        if ('args' in event) {
          const [jobId, jobType, referenceId] = event.args;
          logger.info(`🔔 New Job #${jobId} Type: ${jobType}`);
          
          if (Number(jobType) === JobType.SKILL_GRADING) {
            await this.handleSkillGrading(Number(jobId), Number(referenceId));
          }
        }
      }
      this.lastProcessedBlock = currentBlock;
    } catch (error) {
      logger.error('AI Polling Error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async handleSkillGrading(jobId: number, submissionId: number) {
    try {
      logger.info(`📝 Grading submission #${submissionId}...`);
      
      const result = await aiService.gradeSubmission({
        question: 'Skill test submission',
        answer: 'Submission content from IPFS',
        expectedCriteria: 'Standard criteria'
      });

      if (this.oracleContract && this.signer) {
        const tx = await this.oracleContract.fulfillSkillGrade(
          jobId,
          submissionId,
          await this.signer.getAddress(),
          result.score,
          result.report
        );
        await tx.wait();
        logger.info(`✅ Grading fulfilled for job #${jobId}`);
      }
    } catch (error) {
      logger.error(`Failed to grade submission #${submissionId}:`, error);
    }
  }
}

export const oracleWorker = new OracleWorker();
