import { Router, Request, Response } from 'express';
import { escapeRegex, ensureString } from '../utils/sanitize.js';
import multer from 'multer';
import { uploadProjectBrief } from '../controllers/project.controller.js';
import { blockchainService } from '../services/blockchain.service.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';
import { Project } from '../models/Project.js';
import {
  sendSuccess, sendNotFound, sendServerError, buildPagination,
} from '../utils/apiResponse.js';

const router = Router();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// File upload requires authentication
router.post('/upload', authenticateToken, upload.single('file'), uploadProjectBrief);

router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status, client, freelancer, category, search } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const query: Record<string, unknown> = {};
    
    // Handle status - can be number (0-4) or string ('open', 'in_progress', etc.)
    if (status !== undefined && status !== '' && status !== 'undefined' && status !== 'null' && status !== 'NaN') {
      const statusMap: Record<string, number> = {
        'open': 0,
        'in_progress': 1,
        'completed': 2,
        'cancelled': 3,
        'disputed': 4,
        'all': -1, // Special case to return all
      };
      
      const statusStr = String(status).toLowerCase().trim();
      
      // Skip if it's 'all' or empty-ish
      if (statusStr === 'all' || statusStr === '' || statusStr === 'undefined' || statusStr === 'null') {
        // Don't filter by status
      } else if (statusMap[statusStr] !== undefined && statusMap[statusStr] >= 0) {
        query.status = statusMap[statusStr];
      } else {
        const statusNum = parseInt(statusStr, 10);
        if (!isNaN(statusNum) && statusNum >= 0 && statusNum <= 4) {
          query.status = statusNum;
        }
        // If invalid status, don't add to query (return all)
      }
    }
    
    const clientStr = ensureString(client);
    const freelancerStr = ensureString(freelancer);
    const categoryStr = ensureString(category);
    if (clientStr) query.clientLower = clientStr.toLowerCase();
    if (freelancerStr) query.freelancerLower = freelancerStr.toLowerCase();
    if (categoryStr) query.category = categoryStr;
    
    // Text search — escape regex metacharacters to prevent ReDoS / injection
    const searchStr = ensureString(search);
    if (searchStr) {
      const escaped = escapeRegex(searchStr);
      query.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [projects, total] = await Promise.all([
      Project.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Project.countDocuments(query),
    ]);

    sendSuccess(res, projects, buildPagination(pageNum, limitNum, total));
  } catch (error) {
    logger.error('Failed to list projects:', error);
    sendServerError(res, 'Failed to list projects');
  }
});

router.get('/stats/:address', async (req: Request, res: Response) => {
  try {
    const addressLower = req.params.address.toLowerCase();

    const [asClient, asFreelancer] = await Promise.all([
      Project.aggregate([
        { $match: { clientLower: addressLower } },
        { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: { $toDouble: '$totalAmount' } } } },
      ]),
      Project.aggregate([
        { $match: { freelancerLower: addressLower } },
        { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: { $toDouble: '$totalAmount' } }, amountEarned: { $sum: { $toDouble: '$amountPaid' } } } },
      ]),
    ]);

    sendSuccess(res, { asClient, asFreelancer });
  } catch (error) {
    logger.error(`Failed to get stats for ${req.params.address}:`, error);
    sendServerError(res, 'Failed to get stats');
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const project = await Project.findOne({ projectId }).lean();
    
    if (project) {
      sendSuccess(res, { ...project, source: 'database' });
      return;
    }
    
    const onChainProject = await blockchainService.getProject(projectId);
    sendSuccess(res, { ...onChainProject, source: 'blockchain' });
  } catch (error) {
    sendNotFound(res, 'Project not found');
  }
});

export default router;
