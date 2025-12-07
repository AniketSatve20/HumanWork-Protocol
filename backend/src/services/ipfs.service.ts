import pinataSDK from '@pinata/sdk';
import { Readable } from 'stream';
import { config } from '../config'; // ✅ FIXED IMPORT
import { logger } from '../utils/logger';

class IPFSService {
  private pinata: any;

  constructor() {
    if (config.pinata.apiKey) {
      this.pinata = new pinataSDK(config.pinata.apiKey, config.pinata.secretKey);
    } else {
      logger.warn('⚠️ Pinata keys missing. IPFS uploads will fail.');
    }
  }

  async uploadFile(buffer: Buffer, filename: string): Promise<string> {
    if (!this.pinata) throw new Error('Pinata not initialized');
    const stream = Readable.from(buffer);
    // @ts-ignore
    stream.path = filename;

    const res = await this.pinata.pinFileToIPFS(stream, {
        pinataMetadata: { name: filename }
    });
    return res.IpfsHash;
  }

  getGatewayUrl(cid: string): string {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
}
export const ipfsService = new IPFSService();