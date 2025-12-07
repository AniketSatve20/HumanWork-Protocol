import PinataSDK from '@pinata/sdk';
import FormData from 'form-data';
import axios from 'axios';
import { Readable } from 'stream';
import { logger } from '../../utils/logger';
import config from '../../config';

// ============ Types ============

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

// ============ Pinata Client ============

class FilecoinStorage {
  private pinata: PinataSDK | null = null;
  private readonly gateway: string;
  private initialized: boolean = false;

  constructor() {
    this.gateway = config.pinata.gateway || 'https://gateway.pinata.cloud/ipfs';
  }

  /**
   * Initialize Pinata SDK
   */
  private async init(): Promise<void> {
    if (this.initialized) return;

    if (config.pinata.apiKey && config.pinata.secretKey) {
      this.pinata = new PinataSDK(config.pinata.apiKey, config.pinata.secretKey);
      
      try {
        // Test authentication
        const result = await this.pinata.testAuthentication();
        logger.info('✅ Pinata authenticated:', result);
        this.initialized = true;
      } catch (error) {
        logger.error('❌ Pinata authentication failed:', error);
        throw new Error('Failed to authenticate with Pinata');
      }
    } else if (config.pinata.jwt) {
      // Use JWT authentication
      this.initialized = true;
      logger.info('✅ Pinata initialized with JWT');
    } else {
      logger.warn('⚠️ Pinata not configured - IPFS uploads will fail');
    }
  }

  /**
   * Upload JSON object to IPFS
   */
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
        // Use SDK
        result = await this.pinata.pinJSONToIPFS(data, pinataOptions);
      } else {
        // Use JWT direct API
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

  /**
   * Upload file buffer to IPFS
   */
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
      
      // Create readable stream from buffer
      const stream = Readable.from(buffer);
      formData.append('file', stream, {
        filename,
        contentType: mimeType,
      });

      // Add metadata
      const metadata: PinataMetadata = {
        name: options?.name || filename,
        keyvalues: options?.metadata,
      };
      formData.append('pinataMetadata', JSON.stringify(metadata));

      // Pin options
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

  /**
   * Upload multiple files in a directory
   */
  async uploadDirectory(
    files: Array<{ buffer: Buffer; filename: string; mimeType: string }>,
    directoryName: string
  ): Promise<string> {
    await this.init();

    if (!config.pinata.jwt) {
      throw new Error('Pinata JWT required for directory upload');
    }

    try {
      const formData = new FormData();

      for (const file of files) {
        const stream = Readable.from(file.buffer);
        formData.append('file', stream, {
          filename: `${directoryName}/${file.filename}`,
          contentType: file.mimeType,
        });
      }

      formData.append('pinataMetadata', JSON.stringify({ name: directoryName }));
      formData.append('pinataOptions', JSON.stringify({ cidVersion: 1, wrapWithDirectory: false }));

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
      logger.info(`📤 Uploaded directory to IPFS: ${result.IpfsHash} (${directoryName})`);
      return result.IpfsHash;
    } catch (error) {
      logger.error('Failed to upload directory to IPFS:', error);
      throw error;
    }
  }

  /**
   * Retrieve content from IPFS
   */
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

  /**
   * Get gateway URL for a CID
   */
  getGatewayUrl(cid: string): string {
    return `${this.gateway}/${cid}`;
  }

  /**
   * Get alternative gateway URLs
   */
  getAlternativeUrls(cid: string): string[] {
    return [
      `${this.gateway}/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
      `https://w3s.link/ipfs/${cid}`,
      `https://dweb.link/ipfs/${cid}`,
    ];
  }

  /**
   * Unpin content from Pinata
   */
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

  /**
   * List pinned files
   */
  async listPins(filters?: {
    status?: 'pinned' | 'unpinned' | 'all';
    pageLimit?: number;
    pageOffset?: number;
  }): Promise<any> {
    await this.init();

    if (!config.pinata.jwt && !this.pinata) {
      throw new Error('Pinata not configured');
    }

    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.pageLimit) params.append('pageLimit', filters.pageLimit.toString());
      if (filters?.pageOffset) params.append('pageOffset', filters.pageOffset.toString());

      const response = await axios.get(
        `https://api.pinata.cloud/data/pinList?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${config.pinata.jwt}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to list pins:', error);
      throw error;
    }
  }

  /**
   * Check if content exists
   */
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
