import PinataSDK from '@pinata/sdk';
import { Readable } from 'stream';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

class IPFSService {
  private pinata: PinataSDK | null = null;

  constructor() {
    if (config.pinata.apiKey && config.pinata.secretKey) {
      this.pinata = new PinataSDK(config.pinata.apiKey, config.pinata.secretKey);
      logger.info('✅ Pinata SDK initialized');
    } else {
      logger.warn('⚠️ Pinata keys missing. IPFS uploads will fail.');
    }
  }

  async uploadFile(buffer: Buffer, filename: string): Promise<string> {
    if (!this.pinata) throw new Error('Pinata not initialized');
    
    const stream = Readable.from(buffer) as Readable & { path?: string };
    stream.path = filename;

    const res = await this.pinata.pinFileToIPFS(stream, {
      pinataMetadata: { name: filename }
    });
    
    logger.info(`📤 Uploaded file to IPFS: ${res.IpfsHash}`);
    return res.IpfsHash;
  }

  async uploadJSON(data: object, name: string): Promise<string> {
    if (!this.pinata) throw new Error('Pinata not initialized');
    
    const res = await this.pinata.pinJSONToIPFS(data, {
      pinataMetadata: { name }
    });
    
    logger.info(`📤 Uploaded JSON to IPFS: ${res.IpfsHash}`);
    return res.IpfsHash;
  }

  getGatewayUrl(cid: string): string {
    return `${config.pinata.gateway}/${cid}`;
  }
}

export const ipfsService = new IPFSService();
