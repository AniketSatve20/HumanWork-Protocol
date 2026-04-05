import { Request, Response } from 'express';
import { Project, ProjectStatus } from '../models/Project.js';
import { SkillSubmission } from '../models/SkillSubmission.js';
import { JobListing } from '../models/JobListing.js';
import { logger } from '../utils/logger.js';
import { sendSuccess, sendServerError } from '../utils/apiResponse.js';

export const getPlatformStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    // TVL = sum of totalAmount for Open + Active projects (funds locked in escrow)
    const tvlPipeline = [
      { $match: { status: { $in: [ProjectStatus.Open, ProjectStatus.Active] } } },
      { $group: { _id: null, totalValueLocked: { $sum: { $toDouble: '$totalAmount' } } } }
    ];

    const projectStatsPipeline = [
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ];

    const scorePipeline = [
      { $match: { score: { $exists: true } } },
      { $group: { _id: null, averageScore: { $avg: '$score' } } }
    ];

    const [tvlResult, projectCounts, scoreResult, totalJobs] = await Promise.all([
      Project.aggregate(tvlPipeline),
      Project.aggregate(projectStatsPipeline),
      SkillSubmission.aggregate(scorePipeline),
      JobListing.countDocuments(),
    ]);

    const totalProjects = projectCounts.reduce((sum: number, item: any) => sum + item.count, 0);
    
    const cancelledProjects = projectCounts.find((p: any) => p._id === ProjectStatus.Cancelled)?.count || 0;
    const completedProjects = projectCounts.find((p: any) => p._id === ProjectStatus.Completed)?.count || 0;
    const activeProjects = projectCounts.find((p: any) => p._id === ProjectStatus.Active)?.count || 0;
    const openProjects = projectCounts.find((p: any) => p._id === ProjectStatus.Open)?.count || 0;

    // Count projects with disputed milestones for accurate dispute rate
    let disputedProjects = 0;
    try {
      disputedProjects = await Project.countDocuments({ 'milestones.status': 3 }); // MilestoneStatus.Disputed = 3
    } catch {
      // Fall back to 0 if query fails
    }

    const disputeRate = totalProjects > 0 
      ? parseFloat(((disputedProjects / totalProjects) * 100).toFixed(2)) 
      : 0;

    const stats = {
      totalValueLocked: tvlResult[0]?.totalValueLocked?.toFixed(2) || '0.00',
      totalProjects,
      totalJobs,
      openProjects,
      activeProjects,
      completedProjects,
      cancelledProjects,
      disputeRate: `${disputeRate}%`,
      averageFreelancerScore: scoreResult[0]?.averageScore?.toFixed(1) || 'N/A',
      projectCountsByStatus: {
        open: openProjects,
        active: activeProjects,
        completed: completedProjects,
        cancelled: cancelledProjects,
      },
    };

    sendSuccess(res, stats);

  } catch (error) {
    logger.error('Error calculating platform statistics:', error);
    sendServerError(res, 'Failed to calculate platform statistics');
  }
};
