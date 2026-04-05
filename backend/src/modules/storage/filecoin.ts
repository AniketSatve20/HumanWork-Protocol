import PinataSDK from '@pinata/sdk';
import FormData from 'form-data';
import axios from 'axios';
import { Readable } from 'stream';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

interface PinataMetadata {
  name?: string;
  keyvalues?: Record<string, string>;
}

interface UploadOptions {
  name?: string;
  metadata?: Record<string, string>;
}

class FilecoinStorage {
  private pinata: any = null;
  private readonly gateway: string;
  private initialized: boolean = false;

  constructor() {
    this.gateway = config.pinata.gateway || 'https://gateway.pinata.cloud/ipfs';
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    if (config.pinata.apiKey && config.pinata.secretKey) {
      this.pinata = new (PinataSDK as any)(config.pinata.apiKey, config.pinata.secretKey);
      
      try {
        const result = await this.pinata.testAuthentication();
        logger.info('✅ Pinata authenticated:', result);
        this.initialized = true;
      } catch (error) {
        logger.error('❌ Pinata authentication failed:', error);
        throw new Error('Failed to authenticate with Pinata');
      }
    } else if (config.pinata.jwt) {
      this.initialized = true;
      logger.info('✅ Pinata initialized with JWT');
    } else {
      logger.warn('⚠️ Pinata not configured - IPFS uploads will fail');
    }
  }

  async uploadJSON(data: object, options?: UploadOptions): Promise<string> {
    await this.init();

    if (!this.pinata && !config.pinata.jwt) {
      throw new Error('Pinata not configured');
    }

    const pinataOptions: any = {
      pinataMetadata: {
        name: options?.name || `json-${Date.now()}.json`,
        keyvalues: options?.metadata,
      },
      pinataOptions: {
        cidVersion: 1,
      },
    };

    try {
      let result: PinataResponse;

      if (this.pinata) {
        result = await this.pinata.pinJSONToIPFS(data, pinataOptions);
      } else {
        const response = await axios.post(
          'https://api.pinata.cloud/pinning/pinJSONToIPFS',
          {
            pinataContent: data,
            pinataMetadata: pinataOptions.pinataMetadata,
            pinataOptions: pinataOptions.pinataOptions,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.pinata.jwt}`,
            },
          }
        );
        result = response.data;
      }

      logger.info(`📤 Uploaded JSON to IPFS: ${result.IpfsHash}`);
      return result.IpfsHash;
    } catch (error) {
      logger.error('Failed to upload JSON to IPFS:', error);
      throw error;
    }
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    options?: UploadOptions
  ): Promise<string> {
    await this.init();

    if (!config.pinata.jwt && !this.pinata) {
      throw new Error('Pinata not configured');
    }

    try {
      const formData = new FormData();
      const stream = Readable.from(buffer);
      formData.append('file', stream, {
        filename,
        contentType: mimeType,
      });

      const metadata: PinataMetadata = {
        name: options?.name || filename,
        keyvalues: options?.metadata,
      };
      formData.append('pinataMetadata', JSON.stringify(metadata));
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

      const result: PinataResponse = response.data;
      logger.info(`📤 Uploaded file to IPFS: ${result.IpfsHash} (${filename})`);
      return result.IpfsHash;
    } catch (error) {
      logger.error('Failed to upload file to IPFS:', error);
      throw error;
    }
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
    await this.init();

    if (!config.pinata.jwt && !this.pinata) {
      throw new Error('Pinata not configured');
    }

    try {
      if (this.pinata) {
        await this.pinata.unpin(cid);
      } else {
        await axios.delete(`https://api.pinata.cloud/pinning/unpin/${cid}`, {
          headers: {
            Authorization: `Bearer ${config.pinata.jwt}`,
          },
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

export const filecoinStorage = new FilecoinStorage();
export default filecoinStorage;
