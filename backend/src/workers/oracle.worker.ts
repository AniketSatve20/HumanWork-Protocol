import { ethers, Contract, EventLog, Log } from 'ethers';
import { logger } from '../utils/logger';
import { aiService } from '../modules/ai/huggingface';
import AIOracleABI from '../abi/AIOracle.json'; 
import SkillTrialABI from '../abi/SkillTrial.json';

const RPC_URL = process.env.HEDERA_RPC_URL || 'https://testnet.hashio.io/api';
const AI_ORACLE_ADDRESS = process.env.AI_ORACLE_ADDRESS || '';
const SKILL_TRIAL_ADDRESS = process.env.SKILL_TRIAL_ADDRESS || '';
const PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY || '';
const CHAIN_ID = parseInt(process.env.HEDERA_CHAIN_ID || '296');

// Job types enum
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
    if (!AI_ORACLE_ADDRESS || !PRIVATE_KEY) {
      logger.warn('⚠️ AI Worker skipped: Missing AI_ORACLE_ADDRESS or ORACLE_PRIVATE_KEY');
      return; 
    }

    logger.info('🤖 Starting AI Oracle Worker...');

    try {
      const network = new ethers.Network("hedera-testnet", CHAIN_ID);
      this.provider = new ethers.JsonRpcProvider(RPC_URL, network, { staticNetwork: network });
      this.signer = new ethers.Wallet(PRIVATE_KEY, this.provider);
      this.oracleContract = new ethers.Contract(AI_ORACLE_ADDRESS, AIOracleABI, this.signer);

      this.lastProcessedBlock = await this.provider.getBlockNumber();
      logger.info(`📍 AI Listening from block: ${this.lastProcessedBlock}`);
      
      // Poll every 10 seconds
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
      if (currentBlock <= this.lastProcessedBlock) return;

      const events = await this.oracleContract.queryFilter('JobRequested', this.lastProcessedBlock + 1, currentBlock);
      
      for (const event of events) {
         if ('args' in event) {
             const [jobId, requester, jobType, dataCid] = event.args;
             logger.info(`🔔 New Job #${jobId} Type: ${jobType} from ${requester}`);
             // Add your handling logic here (handleSkillGrading / handleDisputeResolution)
         }
      }
      this.lastProcessedBlock = currentBlock;
    } catch (error) {
      logger.error('AI Polling Error:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}

// THIS EXPORT IS CRITICAL
export const oracleWorker = new OracleWorker();