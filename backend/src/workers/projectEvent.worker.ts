import { ethers, Contract } from 'ethers';
import { logger } from '../utils/logger';
import ProjectEscrowABI from '../abi/ProjectEscrow.json';

const RPC_URL = process.env.HEDERA_RPC_URL || 'https://testnet.hashio.io/api';
const PROJECT_ESCROW_ADDRESS = process.env.PROJECT_ESCROW_ADDRESS || '';
const CHAIN_ID = parseInt(process.env.HEDERA_CHAIN_ID || '296');

// Metadata Storage
export const pendingMetadata: Map<string, any> = new Map();
export function registerPendingMetadata(client: string, freelancer: string, metadata: any) {
  const key = `${client.toLowerCase()}-${freelancer.toLowerCase()}`;
  pendingMetadata.set(key, { ...metadata, timestamp: Date.now() });
  return key;
}

export class ProjectEventListener {
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: Contract | null = null;
  private lastProcessedBlock = 0;
  private isProcessing = false;

  async start() {
    if (!PROJECT_ESCROW_ADDRESS) {
      logger.warn('⚠️ Project Listener skipped: Missing PROJECT_ESCROW_ADDRESS');
      return;
    }

    logger.info('🎧 Starting Project Event Listener...');
    try {
      const network = new ethers.Network("hedera-testnet", CHAIN_ID);
      this.provider = new ethers.JsonRpcProvider(RPC_URL, network, { staticNetwork: network });
      this.contract = new ethers.Contract(PROJECT_ESCROW_ADDRESS, ProjectEscrowABI, this.provider);

      this.lastProcessedBlock = await this.provider.getBlockNumber();
      logger.info(`📍 Project Listener active from block: ${this.lastProcessedBlock}`);
      
      setInterval(() => this.poll(), 5000);
    } catch (error) {
      logger.error('❌ Failed to start project listener:', error);
    }
  }

  private async poll() {
    if (this.isProcessing || !this.contract || !this.provider) return;
    this.isProcessing = true;
    try {
      const currentBlock = await this.provider.getBlockNumber();
      if (currentBlock <= this.lastProcessedBlock) return;

      const events = await this.contract.queryFilter('ProjectCreated', this.lastProcessedBlock + 1, currentBlock);
      for (const event of events) {
         if ('args' in event) {
            const [projectId, client, freelancer] = event.args;
            logger.info(`✨ Project Created: #${projectId}`);
            // Metadata matching logic goes here
         }
      }
      this.lastProcessedBlock = currentBlock;
    } catch (e) {
      logger.error('Project polling error', e);
    } finally {
      this.isProcessing = false;
    }
  }
}

// THIS EXPORT IS CRITICAL
export const projectEventListener = new ProjectEventListener();