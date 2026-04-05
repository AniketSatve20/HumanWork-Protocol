import PinataSDK from '@pinata/sdk';
import FormData from 'form-data';
import axios from 'axios';
import { Readable } from 'stream';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

class IPFSService {
  private pinata: any = null;
  private readonly gateway: string;
  private initialized = false;

  constructor() {
    this.gateway = config.pinata.gateway || 'https://gateway.pinata.cloud/ipfs';

    if (config.pinata.apiKey && config.pinata.secretKey) {
      this.pinata = new (PinataSDK as any)(config.pinata.apiKey, config.pinata.secretKey);
      this.initialized = true;
      logger.info('✅ Pinata SDK initialized');
    } else if (config.pinata.jwt) {
      this.initialized = true;
      logger.info('✅ Pinata initialized with JWT');
    } else {
      logger.warn('⚠️ Pinata not configured. IPFS uploads will fail.');
    }
  }

  async uploadFile(buffer: Buffer, filename: string): Promise<string> {
    if (this.pinata) {
      const stream = Readable.from(buffer) as Readable & { path?: string };
      stream.path = filename;

      const res = await this.pinata.pinFileToIPFS(stream, {
        pinataMetadata: { name: filename },
      });
      logger.info(`📤 Uploaded file to IPFS: ${res.IpfsHash}`);
      return res.IpfsHash;
    }

    if (config.pinata.jwt) {
      const formData = new FormData();
      const stream = Readable.from(buffer);
      formData.append('file', stream, { filename });
      formData.append('pinataMetadata', JSON.stringify({ name: filename }));
      formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinFileToIPFS',
        formData,
        {
          maxBodyLength: Infinity,
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${config.pinata.jwt}`,
          },
        }
      );
      logger.info(`📤 Uploaded file to IPFS: ${response.data.IpfsHash} (${filename})`);
      return response.data.IpfsHash;
    }

    throw new Error('Pinata not initialized');
  }

  async uploadJSON(data: object, name: string): Promise<string> {
    if (this.pinata) {
      const res = await this.pinata.pinJSONToIPFS(data, {
        pinataMetadata: { name },
      });
      logger.info(`📤 Uploaded JSON to IPFS: ${res.IpfsHash}`);
      return res.IpfsHash;
    }

    if (config.pinata.jwt) {
      const response = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        {
          pinataContent: data,
          pinataMetadata: { name },
          pinataOptions: { cidVersion: 1 },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.pinata.jwt}`,
          },
        }
      );
      logger.info(`📤 Uploaded JSON to IPFS: ${response.data.IpfsHash}`);
      return response.data.IpfsHash;
    }

    throw new Error('Pinata not initialized');
  }

  async retrieve(cid: string): Promise<any> {
    try {
      const url = this.getGatewayUrl(cid);
      const response = await axios.get(url, { timeout: 30000 });
      return response.data;
    } catch (error) {
      logger.error(`Failed to retrieve from IPFS (${cid}):`, error);
      throw error;
    }
  }

  getGatewayUrl(cid: string): string {
    return `${this.gateway}/${cid}`;
  }

  getAlternativeUrls(cid: string): string[] {
    return [
      `${this.gateway}/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
      `https://w3s.link/ipfs/${cid}`,
      `https://dweb.link/ipfs/${cid}`,
    ];
  }

  async unpin(cid: string): Promise<void> {
    if (!this.initialized) throw new Error('Pinata not initialized');

    try {
      if (this.pinata) {
        await this.pinata.unpin(cid);
      } else {
        await axios.delete(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
          headers: { Authorization: `Bearer ${config.pinata.jwt}` },
        });
      }
      logger.info(`🗑️ Unpinned from IPFS: ${cid}`);
    } catch (error) {
      logger.error(`Failed to unpin ${cid}:`, error);
      throw error;
    }
  }

  async exists(cid: string): Promise<boolean> {
    try {
      const response = await axios.head(this.getGatewayUrl(cid), { timeout: 10000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export const ipfsService = new IPFSService();
