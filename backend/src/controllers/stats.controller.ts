import { Request, Response } from 'express';
import { Project } from '../models/Project.js';
import { SkillSubmission } from '../models/SkillSubmission.js';
import { logger } from '../utils/logger.js';

const PROJECT_STATUS = {
  Active: 0,
  Completed: 1,
  Cancelled: 2,
};

export const getPlatformStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tvlPipeline = [
      { $match: { status: { $in: [PROJECT_STATUS.Active] } } },
      { $group: { _id: null, totalValueLocked: { $sum: { $toDouble: '$totalAmount' } } } }
    ];

    const projectStatsPipeline = [
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ];

    const scorePipeline = [
      { $match: { score: { $exists: true } } },
      { $group: { _id: null, averageScore: { $avg: '$score' } } }
    ];

    const [tvlResult, projectCounts, scoreResult] = await Promise.all([
      Project.aggregate(tvlPipeline),
      Project.aggregate(projectStatsPipeline),
      SkillSubmission.aggregate(scorePipeline),
    ]);

    const totalProjects = projectCounts.reduce((sum, item) => sum + item.count, 0);
    const disputedProjects = projectCounts.find(p => p._id === 2)?.count || 0; // Disputed status
    
    const disputeRate = totalProjects > 0 
      ? parseFloat(((disputedProjects / totalProjects) * 100).toFixed(2)) 
      : 0;

    const stats = {
      totalValueLocked: tvlResult[0]?.totalValueLocked?.toFixed(2) || '0.00',
      totalProjects: totalProjects,
      disputeRate: `${disputeRate}%`,
      averageFreelancerScore: scoreResult[0]?.averageScore?.toFixed(1) || 'N/A',
      projectCountsByStatus: projectCounts.reduce((acc: any, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
    };

    res.json({ success: true, data: stats });

  } catch (error) {
    logger.error('Error calculating platform statistics:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate platform statistics.' });
  }
};
