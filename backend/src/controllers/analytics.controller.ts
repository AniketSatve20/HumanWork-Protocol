import { Request, Response } from 'express';
import { Project, ProjectStatus } from '../models/Project.js';
import { User } from '../models/User.js';
import { JobListing } from '../models/JobListing.js';
import { Application } from '../models/Application.js';
import { SkillSubmission, SubmissionStatus } from '../models/SkillSubmission.js';
import { Conversation, Message } from '../models/Message.js';
import { sendSuccess, sendBadRequest, sendServerError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

// ── helpers ──────────────────────────────────────────────────────────────────
function parsePeriod(period?: string): { $gte: Date } | null {
  if (!period) return null;
  const now = new Date();
  const map: Record<string, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '180d': 180,
    '1y': 365,
  };
  const days = map[period];
  if (!days) return null;
  return { $gte: new Date(now.getTime() - days * 86_400_000) };
}

type DateGrouping = 'day' | 'week' | 'month';
function dateGroupExpr(groupBy: DateGrouping) {
  const expr: Record<DateGrouping, object> = {
    day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
    week: { $dateToString: { format: '%Y-W%V', date: '$createdAt' } },
    month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
  };
  return expr[groupBy] || expr.month;
}

// ────────────────────────────────────────────────────────────────────────────
// 1. Job Funnel  (posted → applied → assigned → completed)
// ────────────────────────────────────────────────────────────────────────────
export const getJobFunnel = async (req: Request, res: Response) => {
  try {
    const dateFilter = parsePeriod(req.query.period as string);
    const match: Record<string, unknown> = {};
    if (dateFilter) match.createdAt = dateFilter;

    const [totalPosted, withApplications, assigned, closedJobs] = await Promise.all([
      JobListing.countDocuments(match),
      Application.distinct('jobId', dateFilter ? { createdAt: dateFilter } : {}).then((ids) => ids.length),
      JobListing.countDocuments({ ...match, status: 'assigned' }),
      JobListing.countDocuments({ ...match, status: 'closed' }),
    ]);

    const funnel = {
      posted: totalPosted,
      receivedApplications: withApplications,
      assigned,
      closed: closedJobs,
      applicationRate: totalPosted ? +((withApplications / totalPosted) * 100).toFixed(1) : 0,
      assignmentRate: withApplications ? +((assigned / withApplications) * 100).toFixed(1) : 0,
      completionRate: assigned ? +((closedJobs / assigned) * 100).toFixed(1) : 0,
    };

    sendSuccess(res, funnel);
  } catch (err) {
    logger.error('Job funnel analytics error', err);
    sendServerError(res, 'Failed to compute job funnel');
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 2. Revenue / Earnings analytics
// ────────────────────────────────────────────────────────────────────────────
export const getRevenueAnalytics = async (req: Request, res: Response) => {
  try {
    const groupBy = (req.query.groupBy as DateGrouping) || 'month';
    if (!['day', 'week', 'month'].includes(groupBy)) {
      return sendBadRequest(res, 'groupBy must be day | week | month');
    }

    const dateFilter = parsePeriod(req.query.period as string);
    const match: Record<string, unknown> = {};
    if (dateFilter) match.createdAt = dateFilter;

    // Revenue over time
    const revenueOverTime = await Project.aggregate([
      { $match: match },
      {
        $group: {
          _id: dateGroupExpr(groupBy),
          totalValue: { $sum: { $toDouble: '$totalAmount' } },
          totalPaid: { $sum: { $toDouble: '$amountPaid' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          period: '$_id',
          _id: 0,
          totalValue: { $round: ['$totalValue', 2] },
          totalPaid: { $round: ['$totalPaid', 2] },
          count: 1,
        },
      },
    ]);

    // Revenue by category
    const byCategory = await Project.aggregate([
      { $match: { ...match, category: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$category',
          totalValue: { $sum: { $toDouble: '$totalAmount' } },
          totalPaid: { $sum: { $toDouble: '$amountPaid' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalValue: -1 } },
      {
        $project: {
          category: '$_id',
          _id: 0,
          totalValue: { $round: ['$totalValue', 2] },
          totalPaid: { $round: ['$totalPaid', 2] },
          count: 1,
        },
      },
    ]);

    // Overall totals
    const totals = await Project.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $toDouble: '$totalAmount' } },
          totalPaid: { $sum: { $toDouble: '$amountPaid' } },
          avgProjectValue: { $avg: { $toDouble: '$totalAmount' } },
          projectCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          totalValue: { $round: ['$totalValue', 2] },
          totalPaid: { $round: ['$totalPaid', 2] },
          avgProjectValue: { $round: ['$avgProjectValue', 2] },
          projectCount: 1,
          escrowBalance: { $round: [{ $subtract: ['$totalValue', '$totalPaid'] }, 2] },
        },
      },
    ]);

    sendSuccess(res, {
      totals: totals[0] || { totalValue: 0, totalPaid: 0, avgProjectValue: 0, projectCount: 0, escrowBalance: 0 },
      revenueOverTime,
      byCategory,
    });
  } catch (err) {
    logger.error('Revenue analytics error', err);
    sendServerError(res, 'Failed to compute revenue analytics');
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 3. User Growth & Skill Demographics
// ────────────────────────────────────────────────────────────────────────────
export const getUserGrowth = async (req: Request, res: Response) => {
  try {
    const groupBy = (req.query.groupBy as DateGrouping) || 'month';
    const dateFilter = parsePeriod(req.query.period as string);
    const match: Record<string, unknown> = {};
    if (dateFilter) match.createdAt = dateFilter;

    // Registrations over time
    const registrations = await User.aggregate([
      { $match: match },
      {
        $group: {
          _id: dateGroupExpr(groupBy),
          newUsers: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { period: '$_id', _id: 0, newUsers: 1 } },
    ]);

    // Users by legitimacy level
    const byLevel = await User.aggregate([
      { $match: match },
      { $group: { _id: '$level', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      {
        $project: {
          level: '$_id',
          _id: 0,
          label: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 0] }, then: 'None' },
                { case: { $eq: ['$_id', 1] }, then: 'Basic' },
                { case: { $eq: ['$_id', 2] }, then: 'VerifiedHuman' },
              ],
              default: 'Unknown',
            },
          },
          count: 1,
        },
      },
    ]);

    // Top skills across the platform
    const topSkills = await User.aggregate([
      { $match: { skills: { $exists: true, $ne: [] } } },
      { $unwind: '$skills' },
      { $group: { _id: { $toLower: '$skills' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      { $project: { skill: '$_id', _id: 0, count: 1 } },
    ]);

    const totalUsers = await User.countDocuments(match);

    sendSuccess(res, { totalUsers, registrations, byLevel, topSkills });
  } catch (err) {
    logger.error('User growth analytics error', err);
    sendServerError(res, 'Failed to compute user growth analytics');
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 4. Skill Trial Analytics  (pass rates, grading dimensions, leaderboard)
// ────────────────────────────────────────────────────────────────────────────
export const getSkillAnalytics = async (req: Request, res: Response) => {
  try {
    const dateFilter = parsePeriod(req.query.period as string);
    const match: Record<string, unknown> = {};
    if (dateFilter) match.createdAt = dateFilter;

    // Pass / fail rates by test
    const passRatesByTest = await SkillSubmission.aggregate([
      { $match: { ...match, status: { $in: [SubmissionStatus.Graded, SubmissionStatus.Failed] } } },
      {
        $group: {
          _id: '$testId',
          testTitle: { $first: '$testTitle' },
          total: { $sum: 1 },
          passed: { $sum: { $cond: [{ $eq: ['$status', SubmissionStatus.Graded] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', SubmissionStatus.Failed] }, 1, 0] } },
          avgScore: { $avg: '$score' },
        },
      },
      { $sort: { total: -1 } },
      {
        $project: {
          testId: '$_id',
          _id: 0,
          testTitle: 1,
          total: 1,
          passed: 1,
          failed: 1,
          passRate: { $round: [{ $multiply: [{ $divide: ['$passed', '$total'] }, 100] }, 1] },
          avgScore: { $round: ['$avgScore', 1] },
        },
      },
    ]);

    // Average grading dimensions across all graded submissions
    const gradingDimensions = await SkillSubmission.aggregate([
      { $match: { ...match, 'gradingDetails': { $exists: true } } },
      {
        $group: {
          _id: null,
          avgCorrectness: { $avg: '$gradingDetails.correctness' },
          avgSecurity: { $avg: '$gradingDetails.security' },
          avgEfficiency: { $avg: '$gradingDetails.efficiency' },
          avgStyle: { $avg: '$gradingDetails.style' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          count: 1,
          avgCorrectness: { $round: ['$avgCorrectness', 1] },
          avgSecurity: { $round: ['$avgSecurity', 1] },
          avgEfficiency: { $round: ['$avgEfficiency', 1] },
          avgStyle: { $round: ['$avgStyle', 1] },
        },
      },
    ]);

    // Submission volume over time
    const submissionVolume = await SkillSubmission.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          submissions: { $sum: 1 },
          graded: { $sum: { $cond: [{ $in: ['$status', [SubmissionStatus.Graded, SubmissionStatus.Failed]] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $in: ['$status', [SubmissionStatus.Pending, SubmissionStatus.Grading]] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { period: '$_id', _id: 0, submissions: 1, graded: 1, pending: 1 } },
    ]);

    sendSuccess(res, {
      passRatesByTest,
      gradingDimensions: gradingDimensions[0] || null,
      submissionVolume,
    });
  } catch (err) {
    logger.error('Skill analytics error', err);
    sendServerError(res, 'Failed to compute skill analytics');
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 5. Top Freelancers  (by earnings, rating, completion)
// ────────────────────────────────────────────────────────────────────────────
export const getTopFreelancers = async (req: Request, res: Response) => {
  try {
    const sortBy = (req.query.sortBy as string) || 'earnings';
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      earnings: { totalEarnedNum: -1 },
      rating: { averageRating: -1 },
      projects: { completedProjects: -1 },
    };
    const sort = sortMap[sortBy] || sortMap.earnings;

    const topFreelancers = await User.aggregate([
      { $match: { totalProjects: { $gt: 0 } } },
      {
        $addFields: {
          totalEarnedNum: { $toDouble: { $ifNull: ['$totalEarned', '0'] } },
          completionRate: {
            $cond: [
              { $gt: ['$totalProjects', 0] },
              { $round: [{ $multiply: [{ $divide: ['$completedProjects', '$totalProjects'] }, 100] }, 1] },
              0,
            ],
          },
        },
      },
      { $sort: sort },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          walletAddress: 1,
          displayName: 1,
          avatarIpfsHash: 1,
          skills: 1,
          level: 1,
          totalProjects: 1,
          completedProjects: 1,
          totalEarned: 1,
          totalEarnedNum: 1,
          averageRating: 1,
          completionRate: 1,
        },
      },
    ]);

    sendSuccess(res, { sortBy, limit, freelancers: topFreelancers });
  } catch (err) {
    logger.error('Top freelancers error', err);
    sendServerError(res, 'Failed to compute top freelancers');
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 6. Project Milestone Analytics
// ────────────────────────────────────────────────────────────────────────────
export const getMilestoneAnalytics = async (req: Request, res: Response) => {
  try {
    const dateFilter = parsePeriod(req.query.period as string);
    const match: Record<string, unknown> = {};
    if (dateFilter) match.createdAt = dateFilter;

    // Milestone status distribution
    const milestoneDistribution = await Project.aggregate([
      { $match: match },
      { $unwind: '$milestones' },
      {
        $group: {
          _id: '$milestones.status',
          count: { $sum: 1 },
          totalAmount: { $sum: { $toDouble: '$milestones.amount' } },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          status: '$_id',
          _id: 0,
          label: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 0] }, then: 'Pending' },
                { case: { $eq: ['$_id', 1] }, then: 'Completed' },
                { case: { $eq: ['$_id', 2] }, then: 'Approved' },
                { case: { $eq: ['$_id', 3] }, then: 'Disputed' },
              ],
              default: 'Unknown',
            },
          },
          count: 1,
          totalAmount: { $round: ['$totalAmount', 2] },
        },
      },
    ]);

    // Average milestones per project
    const avgMilestones = await Project.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          avgMilestoneCount: { $avg: { $size: '$milestones' } },
          avgMilestoneValue: { $avg: { $avg: { $map: { input: '$milestones', as: 'm', in: { $toDouble: '$$m.amount' } } } } },
          totalProjects: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          avgMilestoneCount: { $round: ['$avgMilestoneCount', 1] },
          avgMilestoneValue: { $round: ['$avgMilestoneValue', 2] },
          totalProjects: 1,
        },
      },
    ]);

    // Project completion progress distribution
    const progressDistribution = await Project.aggregate([
      { $match: { ...match, status: ProjectStatus.Active } },
      {
        $addFields: {
          totalMilestones: { $size: '$milestones' },
          approvedMilestones: {
            $size: { $filter: { input: '$milestones', as: 'm', cond: { $eq: ['$$m.status', 2] } } },
          },
        },
      },
      {
        $addFields: {
          progressPct: {
            $cond: [
              { $gt: ['$totalMilestones', 0] },
              { $round: [{ $multiply: [{ $divide: ['$approvedMilestones', '$totalMilestones'] }, 100] }, 0] },
              0,
            ],
          },
        },
      },
      {
        $bucket: {
          groupBy: '$progressPct',
          boundaries: [0, 25, 50, 75, 100, 101],
          default: 'unknown',
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    sendSuccess(res, {
      milestoneDistribution,
      averages: avgMilestones[0] || { avgMilestoneCount: 0, avgMilestoneValue: 0, totalProjects: 0 },
      activeProjectProgress: progressDistribution,
    });
  } catch (err) {
    logger.error('Milestone analytics error', err);
    sendServerError(res, 'Failed to compute milestone analytics');
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 7. Platform Activity (messages, conversations, engagement)
// ────────────────────────────────────────────────────────────────────────────
export const getActivityAnalytics = async (req: Request, res: Response) => {
  try {
    const groupBy = (req.query.groupBy as DateGrouping) || 'month';
    const dateFilter = parsePeriod(req.query.period as string);
    const match: Record<string, unknown> = {};
    if (dateFilter) match.createdAt = dateFilter;

    // Messages over time
    const messageVolume = await Message.aggregate([
      { $match: match },
      {
        $group: {
          _id: dateGroupExpr(groupBy),
          messages: { $sum: 1 },
          uniqueSenders: { $addToSet: '$sender' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          period: '$_id',
          _id: 0,
          messages: 1,
          uniqueSenders: { $size: '$uniqueSenders' },
        },
      },
    ]);

    // Message type distribution
    const messageTypes = await Message.aggregate([
      { $match: match },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { type: '$_id', _id: 0, count: 1 } },
    ]);

    // Conversation summary
    const totalConversations = await Conversation.countDocuments(match);
    const totalMessages = await Message.countDocuments(match);

    sendSuccess(res, {
      totalConversations,
      totalMessages,
      messageVolume,
      messageTypes,
    });
  } catch (err) {
    logger.error('Activity analytics error', err);
    sendServerError(res, 'Failed to compute activity analytics');
  }
};

// ────────────────────────────────────────────────────────────────────────────
// 8. Category / Skill Demand  (which skills are most requested in jobs)
// ────────────────────────────────────────────────────────────────────────────
export const getSkillDemand = async (req: Request, res: Response) => {
  try {
    const dateFilter = parsePeriod(req.query.period as string);
    const match: Record<string, unknown> = {};
    if (dateFilter) match.createdAt = dateFilter;

    // Most requested skills in job listings
    const demandedSkills = await JobListing.aggregate([
      { $match: { ...match, skills: { $exists: true, $ne: [] } } },
      { $unwind: '$skills' },
      { $group: { _id: { $toLower: '$skills' }, jobCount: { $sum: 1 } } },
      { $sort: { jobCount: -1 } },
      { $limit: 20 },
      { $project: { skill: '$_id', _id: 0, jobCount: 1 } },
    ]);

    // Jobs by category
    const jobsByCategory = await JobListing.aggregate([
      { $match: { ...match, category: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$category',
          totalJobs: { $sum: 1 },
          avgBudget: { $avg: { $toDouble: '$budget' } },
          openJobs: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          assignedJobs: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
        },
      },
      { $sort: { totalJobs: -1 } },
      {
        $project: {
          category: '$_id',
          _id: 0,
          totalJobs: 1,
          avgBudget: { $round: ['$avgBudget', 2] },
          openJobs: 1,
          assignedJobs: 1,
        },
      },
    ]);

    // Skill supply vs demand (compare user skills vs job skills)
    const suppliedSkills = await User.aggregate([
      { $match: { skills: { $exists: true, $ne: [] } } },
      { $unwind: '$skills' },
      { $group: { _id: { $toLower: '$skills' }, freelancerCount: { $sum: 1 } } },
      { $sort: { freelancerCount: -1 } },
      { $limit: 30 },
    ]);

    // Merge supply & demand
    const supplyMap = new Map(suppliedSkills.map((s: { _id: string; freelancerCount: number }) => [s._id, s.freelancerCount]));
    const skillGap = demandedSkills.map((d: { skill: string; jobCount: number }) => ({
      skill: d.skill,
      demand: d.jobCount,
      supply: supplyMap.get(d.skill) || 0,
      gap: d.jobCount - (supplyMap.get(d.skill) || 0),
    }));

    sendSuccess(res, { demandedSkills, jobsByCategory, skillGap });
  } catch (err) {
    logger.error('Skill demand analytics error', err);
    sendServerError(res, 'Failed to compute skill demand analytics');
  }
};
