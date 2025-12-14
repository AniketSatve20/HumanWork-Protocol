import { Request, Response } from 'express';
import { ipfsService } from '../services/ipfs.service.js';
import { logger } from '../utils/logger.js';

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

    res.status(200).json({ 
      success: true,
      ipfsHash, 
      gatewayUrl,
      message: 'Brief uploaded to IPFS successfully.' 
    });
  } catch (error: any) {
    logger.error('Controller Upload Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Upload failed.' });
  }
};
