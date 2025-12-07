import { Router, Request, Response } from 'express';
import multer from 'multer';
import { uploadProjectBrief } from '../controllers/project.controller'; // Import the controller
import { blockchainService } from '../services/blockchain.service';
import { ipfsService } from '../services/ipfs.service';
import { logger } from '../utils/logger';
import { Project, ProjectStatus } from '../models/Project'; // Ensure path matches your structure
import { registerPendingMetadata } from '../workers/projectEvent.worker'; // Uncomment if worker exists
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Configure Multer for memory storage (files are kept in RAM until uploaded to Pinata)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Limit file size to 5MB
});

/**
 * POST /api/projects/upload
 * Handles project brief file uploads (PDF/Doc)
 */
router.post('/upload', upload.single('file'), uploadProjectBrief);


/**
 * GET /api/projects
 * List all projects with pagination and filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status, client, freelancer, category } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    if (status !== undefined) query.status = parseInt(status as string);
    if (client) query.clientLower = (client as string).toLowerCase();
    if (freelancer) query.freelancerLower = (freelancer as string).toLowerCase();
    if (category) query.category = category;

    const [projects, total] = await Promise.all([
      Project.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Project.countDocuments(query),
    ]);

    res.json({
      success: true,
      projects,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Failed to list projects:', error);
    res.status(500).json({ success: false, error: 'Failed to list projects' });
  }
});

/**
 * GET /api/projects/:id
 * Get project details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const project = await Project.findOne({ projectId }).lean();
    
    if (project) {
      return res.json({ success: true, project, source: 'database' });
    }
    
    // Fallback if not in DB
    const onChainProject = await blockchainService.getProject(projectId);
    res.json({ success: true, project: onChainProject, source: 'blockchain' });
  } catch (error) {
    res.status(404).json({ success: false, error: 'Project not found' });
  }
});

/**
 * GET /api/projects/stats/:address
 * Get project statistics for a user
 */
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

    res.json({
      success: true,
      stats: {
        asClient: asClient, // Frontend can process the aggregation array directly
        asFreelancer: asFreelancer,
      },
    });
  } catch (error) {
    logger.error(`Failed to get stats for ${req.params.address}:`, error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

export default router;