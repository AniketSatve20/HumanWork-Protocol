import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';
import { SecureUser } from '../models/SecureUser.js';
import { ipfsService } from '../services/ipfs.service.js';
import { blockchainService } from '../services/blockchain.service.js';
import { encrypt } from '../utils/encryption.js';
import {
  sendSuccess, sendBadRequest, sendUnauthorized, sendForbidden,
  sendNotFound, sendServerError,
} from '../utils/apiResponse.js';

const router = Router();

// Multer config for document uploads (max 5MB images/PDFs)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and PDF files are allowed'));
    }
  },
});

// All routes require auth
router.use(authenticateToken);

// ── GET /api/kyc/status — Current KYC status ─────────────────────────────────
router.get('/status', async (req: Request, res: Response) => {
  try {
    const walletAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!walletAddress) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const addressLower = walletAddress.toLowerCase();

    // Check on-chain status
    let isVerifiedOnChain = false;
    try {
      const profile = await blockchainService.getUserProfile(walletAddress);
      isVerifiedOnChain = profile.isVerifiedHuman;
    } catch {
      // Not registered on-chain yet
    }

    // Check off-chain status
    const secureUser = await SecureUser.findOne({ walletAddress: walletAddress.toLowerCase() });

    const documents = secureUser?.kycDocuments?.map(doc => ({
      type: doc.type,
      status: doc.verificationStatus,
      verifiedAt: doc.verifiedAt,
    })) || [];

    const status = isVerifiedOnChain
      ? 'verified'
      : secureUser?.isKycVerified
        ? 'approved_pending_onchain'   // Admin approved, needs on-chain tx
        : documents.some(d => d.status === 'pending')
          ? 'pending_review'            // Documents submitted, waiting for admin
          : documents.some(d => d.status === 'rejected')
            ? 'rejected'
            : 'not_started';

    sendSuccess(res, {
        status,
        isVerifiedOnChain,
        isAdminApproved: secureUser?.isKycVerified || false,
        documents,
        legalName: secureUser?.legalName ? '••••' : null,
        submittedAt: secureUser?.createdAt,
    });
  } catch (error) {
    logger.error('Failed to get KYC status:', error);
    sendServerError(res, 'Failed to get KYC status');
  }
});

// ── POST /api/kyc/submit — Submit KYC documents ──────────────────────────────
router.post('/submit', upload.single('document'), async (req: Request, res: Response) => {
  try {
    const walletAddress = (req as AuthenticatedRequest).user?.walletAddress;
    if (!walletAddress) {
      sendUnauthorized(res);
      return;
    }

    const addressLower = walletAddress.toLowerCase();
    const { legalName, documentType, documentNumber } = req.body;

    if (!legalName || !documentType || !documentNumber) {
      sendBadRequest(res, 'Legal name, document type, and document number are required');
      return;
    }

    if (typeof legalName !== 'string' || typeof documentType !== 'string' || typeof documentNumber !== 'string') {
      sendBadRequest(res, 'KYC fields must be valid strings');
      return;
    }

    const safeLegalName = legalName.trim();
    const safeDocumentType = documentType.trim();
    const safeDocumentNumber = documentNumber.trim();

    if (!safeLegalName || !safeDocumentType || !safeDocumentNumber) {
      sendBadRequest(res, 'KYC fields cannot be empty');
      return;
    }

    const validDocTypes = ['passport', 'national_id', 'drivers_license'];
    if (!validDocTypes.includes(safeDocumentType)) {
      sendBadRequest(res, 'Invalid document type. Must be: passport, national_id, or drivers_license');
      return;
    }

    // Upload document image to IPFS if provided
    let documentIpfsHash: string | undefined;
    if (req.file) {
      try {
        documentIpfsHash = await ipfsService.uploadFile(
          req.file.buffer,
          `kyc_${addressLower}_${safeDocumentType}_${Date.now()}`
        );
      } catch {
        logger.warn('IPFS upload failed for KYC doc. Storing without file.');
      }
    }

    // Upsert SecureUser record
    let secureUser = await SecureUser.findOne({ walletAddress: addressLower });

    if (!secureUser) {
      secureUser = new SecureUser({
        walletAddress: addressLower,
        publicAlias: walletAddress,
        legalName: safeLegalName,
        consentGiven: true,
        consentDate: new Date(),
      });
    } else {
      secureUser.legalName = safeLegalName;
    }

    // Add document record with IPFS hash if available
    secureUser.kycDocuments = [{
      type: safeDocumentType,
      documentNumber: encrypt(safeDocumentNumber),
      ipfsHash: documentIpfsHash,
      verificationStatus: 'pending',
    }];

    secureUser.isKycVerified = false;
    await secureUser.save();

    logger.info(`📋 KYC submission received from ${addressLower} (${safeDocumentType})`);

    sendSuccess(res, {
        status: 'pending_review',
        message: 'Documents submitted successfully. Review takes 24-48 hours.',
    });
  } catch (error) {
    logger.error('Failed to submit KYC:', error);
    sendServerError(res, 'Failed to submit KYC documents');
  }
});

// ── POST /api/kyc/admin/approve/:address — Admin approves KYC ────────────────
// In production: add admin-only middleware. For now: the oracle wallet acts as admin.
router.post('/admin/approve/:address', async (req: Request, res: Response) => {
  try {
    const adminAddress = (req as AuthenticatedRequest).user?.walletAddress?.toLowerCase();
    const targetAddress = req.params.address.toLowerCase();

    // Simple admin check: only the oracle wallet can approve KYC
    const oracleAddress = process.env.ORACLE_ADDRESS?.toLowerCase();
    if (!oracleAddress || adminAddress !== oracleAddress) {
      sendForbidden(res, 'Only admin can approve KYC');
      return;
    }

    const secureUser = await SecureUser.findOne({ walletAddress: targetAddress });
    if (!secureUser) {
      sendNotFound(res, 'User KYC record not found');
      return;
    }

    // Mark all documents as verified
    secureUser.kycDocuments.forEach(doc => {
      doc.verificationStatus = 'verified';
      doc.verifiedAt = new Date();
    });
    secureUser.isKycVerified = true;
    await secureUser.save();

    logger.info(`✅ KYC approved for ${targetAddress} by admin ${adminAddress}`);

    sendSuccess(res, {
        status: 'approved_pending_onchain',
        message: 'KYC approved. User can now verify on-chain.',
    });
  } catch (error) {
    logger.error('Failed to approve KYC:', error);
    sendServerError(res, 'Failed to approve KYC');
  }
});

// ── POST /api/kyc/admin/reject/:address — Admin rejects KYC ──────────────────
router.post('/admin/reject/:address', async (req: Request, res: Response) => {
  try {
    const adminAddress = (req as AuthenticatedRequest).user?.walletAddress?.toLowerCase();
    const targetAddress = req.params.address.toLowerCase();
    const { reason } = req.body;

    const oracleAddress = process.env.ORACLE_ADDRESS?.toLowerCase();
    if (!oracleAddress || adminAddress !== oracleAddress) {
      sendForbidden(res, 'Only admin can reject KYC');
      return;
    }

    const secureUser = await SecureUser.findOne({ walletAddress: targetAddress });
    if (!secureUser) {
      sendNotFound(res, 'User KYC record not found');
      return;
    }

    secureUser.kycDocuments.forEach(doc => {
      doc.verificationStatus = 'rejected';
    });
    secureUser.isKycVerified = false;
    await secureUser.save();

    logger.info(`❌ KYC rejected for ${targetAddress}: ${reason || 'No reason'}`);

    sendSuccess(res, {
        status: 'rejected',
        message: reason || 'KYC verification rejected.',
    });
  } catch (error) {
    logger.error('Failed to reject KYC:', error);
    sendServerError(res, 'Failed to reject KYC');
  }
});

// ── GET /api/kyc/admin/pending — List all pending KYC submissions ─────────────
router.get('/admin/pending', async (req: Request, res: Response) => {
  try {
    const adminAddress = (req as AuthenticatedRequest).user?.walletAddress?.toLowerCase();
    const oracleAddress = process.env.ORACLE_ADDRESS?.toLowerCase();
    if (!oracleAddress || adminAddress !== oracleAddress) {
      sendForbidden(res, 'Admin access required');
      return;
    }

    const pendingUsers = await SecureUser.find({
      isKycVerified: false,
      'kycDocuments.verificationStatus': 'pending',
    }).select('walletAddress publicAlias kycDocuments createdAt').lean();

    sendSuccess(res, pendingUsers.map(u => ({
        address: u.walletAddress,
        alias: u.publicAlias,
        documentType: u.kycDocuments[0]?.type,
        submittedAt: u.createdAt,
    })));
  } catch (error) {
    logger.error('Failed to list pending KYC:', error);
    sendServerError(res, 'Failed to list pending KYC');
  }
});

export default router;
