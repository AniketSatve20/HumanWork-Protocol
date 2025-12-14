import { ethers, Contract } from 'ethers';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import ProjectEscrowABI from '../abi/ProjectEscrow.json' with { type: 'json' };

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
    if (!config.contracts.projectEscrow) {
      logger.warn('⚠️ Project Listener skipped: Missing PROJECT_ESCROW_ADDRESS');
      return;
    }

    logger.info('🎧 Starting Project Event Listener...');
    try {
      const network = new ethers.Network("hedera-testnet", config.hedera.chainId);
      this.provider = new ethers.JsonRpcProvider(config.hedera.rpcUrl, network, { staticNetwork: network });
      this.contract = new ethers.Contract(config.contracts.projectEscrow, ProjectEscrowABI, this.provider);

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
      if (currentBlock <= this.lastProcessedBlock) {
        this.isProcessing = false;
        return;
      }

      const events = await this.contract.queryFilter('ProjectCreated', this.lastProcessedBlock + 1, currentBlock);
      for (const event of events) {
        if ('args' in event) {
          const [projectId, client, freelancer, totalAmount] = event.args;
          logger.info(`✨ Project Created: #${projectId} - Client: ${client}, Freelancer: ${freelancer}, Amount: ${totalAmount}`);
          
          const key = `${client.toLowerCase()}-${freelancer.toLowerCase()}`;
          const metadata = pendingMetadata.get(key);
          if (metadata) {
            logger.info(`📎 Found pending metadata for project #${projectId}`);
            pendingMetadata.delete(key);
          }
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

export const projectEventListener = new ProjectEventListener();
