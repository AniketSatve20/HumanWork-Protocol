import { Request, Response } from 'express';
import { Project } from '../models/Project'; // Adjust path as necessary
import { SkillSubmission } from '../models/SkillSubmission'; // Assuming a model exists
import { logger } from '../utils/logger';

// Project Status Enum mapping for aggregation logic
const PROJECT_STATUS = {
    Active: 1,
    Disputed: 2,
    Completed: 3,
};

/**
 * Calculates high-level platform statistics using MongoDB aggregation pipelines.
 */
export const getPlatformStats = async (req: Request, res: Response) => {
    try {
        // --- 1. Total Value Locked (TVL) ---
        // TVL = sum of totalAmount for projects that are Active (1) or Disputed (2)
        const tvlPipeline = [
            { $match: { status: { $in: [PROJECT_STATUS.Active, PROJECT_STATUS.Disputed] } } },
            // Convert totalAmount string to Decimal128 or Number for summing
            { $group: { _id: null, totalValueLocked: { $sum: { $toDouble: '$totalAmount' } } } }
        ];

        // --- 2. Dispute Rate and Project Counts ---
        const projectStatsPipeline = [
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ];

        // --- 3. Average Freelancer Score ---
        // Assuming SkillSubmission has a 'score' field (0-100)
        const scorePipeline = [
            { $group: { _id: null, averageScore: { $avg: '$score' } } }
        ];

        const [tvlResult, projectCounts, scoreResult] = await Promise.all([
            Project.aggregate(tvlPipeline),
            Project.aggregate(projectStatsPipeline),
            SkillSubmission.aggregate(scorePipeline), // Will fail if SkillSubmission model doesn't exist
        ]);

        const totalProjects = projectCounts.reduce((sum, item) => sum + item.count, 0);
        const disputedProjects = projectCounts.find(p => p._id === PROJECT_STATUS.Disputed)?.count || 0;
        
        const disputeRate = totalProjects > 0 
            ? parseFloat(((disputedProjects / totalProjects) * 100).toFixed(2)) 
            : 0;

        const stats = {
            totalValueLocked: tvlResult[0]?.totalValueLocked.toFixed(2) || '0.00',
            totalProjects: totalProjects,
            disputeRate: `${disputeRate}%`,
            averageFreelancerScore: scoreResult[0]?.averageScore.toFixed(1) || 'N/A',
            projectCountsByStatus: projectCounts.reduce((acc, curr) => {
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