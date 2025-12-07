import { Request, Response } from 'express';
import { ipfsService } from '../services/ipfs.service'; // ✅ Correct Import
import { logger } from '../utils/logger';

/**
 * Handles the IPFS upload for the project brief.
 * POST /api/projects/upload
 */
export const uploadProjectBrief = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  try {
    const fileBuffer = req.file.buffer;
    const filename = req.file.originalname;

    // ✅ Use the class instance method
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