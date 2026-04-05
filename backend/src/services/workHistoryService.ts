import mongoose from 'mongoose';
import { User, Project, IProject, IMilestone, MilestoneStatus, ProjectStatus } from '../models/index.js';

/**
 * Narrative Status logic
 * - 'Settled': No disputes, project completed
 * - 'Active Loop': Project is active or milestones are pending
 * - 'Fractured': Any milestone is disputed
 */
function getNarrativeStatus(project: IProject): 'Settled' | 'Active Loop' | 'Fractured' {
  if (project.milestones.some((m: IMilestone) => m.status === MilestoneStatus.Disputed)) {
    return 'Fractured';
  }
  if (project.status === ProjectStatus.Completed) {
    return 'Settled';
  }
  return 'Active Loop';
}

/**
 * Fetches a freelancer's work history as a tree structure using $graphLookup.
 * @param walletAddress Freelancer's wallet address
 */
export async function getFreelancerWorkHistory(walletAddress: string) {
  // Find the user (Cornerstone node)
  const user = await User.findOne({ walletAddress });
  if (!user) throw new Error('User not found');

  // $graphLookup is not strictly needed since projects are not recursively linked, but we use it for extensibility
  const projects = await Project.aggregate([
    { $match: { freelancer: walletAddress } },
    {
      $addFields: {
        narrativeStatus: {
          $switch: {
            branches: [
              {
                case: { $gt: [ { $size: { $filter: { input: "$milestones", as: "m", cond: { $eq: ["$$m.status", MilestoneStatus.Disputed] } } } }, 0 ] },
                then: 'Fractured',
              },
              {
                case: { $eq: [ "$status", ProjectStatus.Completed ] },
                then: 'Settled',
              },
            ],
            default: 'Active Loop',
          },
        },
      },
    },
    {
      $project: {
        projectId: 1,
        title: 1,
        briefDescription: 1,
        status: 1,
        milestones: 1,
        narrativeStatus: 1,
        transactionHash: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  // Structure as a tree: user (root) -> projects (branches) -> milestones (leaves)
  return {
    user: {
      walletAddress: user.walletAddress,
      displayName: user.displayName,
      avatarIpfsHash: user.avatarIpfsHash,
      cornerstone: user.registrationTime,
      projects: projects.map((p: any) => ({
        ...p,
        milestones: (p.milestones || []).map((m: IMilestone) => ({ ...m })),
      })),
    },
  };
}
