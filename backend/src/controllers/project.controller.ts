import { Request, Response } from 'express';
import { ipfsService } from '../services/ipfs.service.js';
import { logger } from '../utils/logger.js';
import { registerPendingProjectMetadata } from '../services/projectCorrelation.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

function parseArrayField<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export const uploadProjectBrief = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded.' });
    return;
  }

  try {
    const fileBuffer = req.file.buffer;
    const filename = req.file.originalname;

    const ipfsHash = await ipfsService.uploadFile(fileBuffer, filename);
    const gatewayUrl = ipfsService.getGatewayUrl(ipfsHash);

    // Register metadata so the project event worker can merge it
    // when the on-chain ProjectCreated event arrives
    const walletAddress = (req as AuthenticatedRequest).user?.walletAddress;
    let correlationId: string | undefined;
    let correlationTag: string | undefined;

    if (walletAddress) {
      const { title, description, category, skills, milestones } = req.body;
      const registered = await registerPendingProjectMetadata({
        clientAddress: walletAddress,
        correlationId: typeof req.body?.correlationId === 'string' ? req.body.correlationId : undefined,
        metadata: {
        ipfsHash,
        title: title || filename.replace(/\.[^.]+$/, ''),
        description: description || '',
        category: category || '',
          skills: parseArrayField<string>(skills),
          milestones: parseArrayField<{ description?: string; amount?: string }>(milestones),
        },
      });

      correlationId = registered.correlationId;
      correlationTag = registered.correlationTag;

      logger.info(`📎 Pending metadata registered for ${walletAddress} [correlationId=${correlationId}]`);
    }

    res.status(200).json({ 
      success: true,
      ipfsHash, 
      gatewayUrl,
      correlationId,
      correlationTag,
      message: 'Brief uploaded to IPFS successfully.' 
    });
  } catch (error: any) {
    logger.error('Controller Upload Error:', error);
    res.status(500).json({ success: false, message: 'Upload failed.' });
  }
};
