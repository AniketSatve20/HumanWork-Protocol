import { ethers, Contract } from 'ethers';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { Project, ProjectStatus, MilestoneStatus } from '../models/Project.js';
import { addAmountStrings, normalizeAmountString } from '../utils/money.js';
import ProjectEscrowABI from '../abi/ProjectEscrow.json' with { type: 'json' };
import {
  consumePendingProjectMetadata,
  extractProjectCorrelationId,
  stripProjectCorrelationTag,
} from '../services/projectCorrelation.service.js';

export class ProjectEventListener {
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: Contract | null = null;
  private lastProcessedBlock = 0;
  private isProcessing = false;

  async start() {
    if (!config.contracts.projectEscrow) {
      logger.warn('⚠️ Project Listener skipped: Missing PROJECT_ESCROW_ADDRESS');
      return;
    }

    logger.info('🎧 Starting Project Event Listener...');
    try {
      const network = new ethers.Network("hedera-testnet", config.hedera.chainId);
      this.provider = new ethers.JsonRpcProvider(config.hedera.rpcUrl, network, {
        staticNetwork: network,
        batchMaxCount: 1,
      });
      this.contract = new ethers.Contract(config.contracts.projectEscrow, ProjectEscrowABI, this.provider);

      this.lastProcessedBlock = await this.provider.getBlockNumber();
      logger.info(`📍 Project Listener active from block: ${this.lastProcessedBlock}`);
      
      setInterval(() => this.poll(), 5000);
    } catch (error) {
      logger.error('❌ Failed to start project listener:', error);
    }
  }

  private async loadOnChainMilestones(projectId: number): Promise<Array<{
    index: number;
    rawDescription: string;
    description: string;
    amount: string;
  }>> {
    if (!this.contract) return [];

    let count = 0;
    try {
      const rawCount = await this.contract.getMilestoneCount(projectId);
      count = Number(rawCount ?? 0n);
    } catch {
      return [];
    }

    const milestones: Array<{
      index: number;
      rawDescription: string;
      description: string;
      amount: string;
    }> = [];

    for (let idx = 0; idx < count; idx += 1) {
      try {
        const milestone = await this.contract.getMilestone(projectId, idx);
        const rawDescription =
          typeof milestone?.description === 'string'
            ? milestone.description
            : String(milestone?.[0] ?? '');

        const amountValue = milestone?.amount ?? milestone?.[1] ?? 0n;
        const description = stripProjectCorrelationTag(rawDescription) || `Milestone ${idx + 1}`;

        milestones.push({
          index: idx,
          rawDescription,
          description,
          amount: normalizeAmountString(amountValue.toString(), `milestones[${idx}].amount`),
        });
      } catch (error) {
        logger.warn(`Failed to fetch milestone ${idx} for project #${projectId}:`, error);
      }
    }

    return milestones;
  }

  private async poll() {
    if (this.isProcessing || !this.contract || !this.provider) return;
    this.isProcessing = true;
    try {
      const currentBlock = await this.provider.getBlockNumber();
      if (currentBlock <= this.lastProcessedBlock) {
        this.isProcessing = false;
        return;
      }

      const blockRange = { from: this.lastProcessedBlock + 1, to: currentBlock };

      // Listen for multiple event types in parallel
      const [createdEvents, assignedEvents, milestoneCompletedEvents, milestoneApprovedEvents, cancelledEvents, disputeCreatedEvents, disputeResolvedEvents] = await Promise.all([
        this.contract.queryFilter('ProjectCreated', blockRange.from, blockRange.to),
        this.contract.queryFilter('FreelancerAssigned', blockRange.from, blockRange.to).catch(() => []),
        this.contract.queryFilter('MilestoneCompleted', blockRange.from, blockRange.to).catch(() => []),
        this.contract.queryFilter('MilestoneApproved', blockRange.from, blockRange.to).catch(() => []),
        this.contract.queryFilter('ProjectCancelled', blockRange.from, blockRange.to).catch(() => []),
        this.contract.queryFilter('DisputeCreated', blockRange.from, blockRange.to).catch(() => []),
        this.contract.queryFilter('DisputeResolved', blockRange.from, blockRange.to).catch(() => []),
      ]);

      // ── Handle ProjectCreated ──────────────────────────────────────────
      for (const event of createdEvents) {
        if (!('args' in event)) continue;
        try {
          const [projectId, client, freelancer, totalAmount] = event.args;
          const pid = Number(projectId);

          // Don't duplicate
          const exists = await Project.findOne({ projectId: pid });
          if (exists) continue;

          // Resolve metadata through a durable UUID correlation marker, not wallet address.
          const onChainMilestones = await this.loadOnChainMilestones(pid);
          const correlationId =
            onChainMilestones
              .map((milestone) => extractProjectCorrelationId(milestone.rawDescription))
              .find((id): id is string => Boolean(id)) ?? null;

          const metadata = correlationId
            ? await consumePendingProjectMetadata({
                correlationId,
                clientAddress: client,
                projectId: pid,
              })
            : null;

          if (correlationId && !metadata) {
            logger.warn(`No pending metadata found for correlationId=${correlationId} project #${pid}`);
          }

          if (!correlationId) {
            logger.warn(`No correlation marker found in project #${pid} milestones; using on-chain defaults`);
          }

          const metadataMilestones = Array.isArray(metadata?.milestones) ? metadata.milestones : [];
          const resolvedMilestones =
            metadataMilestones.length > 0
              ? metadataMilestones.map((m, i) => ({
                  index: i,
                  description: m.description || `Milestone ${i + 1}`,
                  amount: normalizeAmountString(m.amount || '0', `milestones[${i}].amount`),
                  status: MilestoneStatus.Pending,
                }))
              : onChainMilestones.map((m) => ({
                  index: m.index,
                  description: m.description,
                  amount: m.amount,
                  status: MilestoneStatus.Pending,
                }));

          const project = new Project({
            projectId: pid,
            client,
            freelancer: freelancer || '',
            totalAmount: normalizeAmountString(totalAmount.toString(), 'totalAmount'),
            amountPaid: '0',
            status: ProjectStatus.Open,
            milestones: resolvedMilestones,
            isEnterpriseProject: false,
            title: metadata?.title || `Project #${pid}`,
            briefDescription: metadata?.description || '',
            fullDescriptionIpfsHash: metadata?.ipfsHash || '',
            category: metadata?.category || '',
            skills: metadata?.skills || [],
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
          });

          await project.save();
          logger.info(`✨ Project #${pid} persisted to DB — Client: ${client}, Amount: ${totalAmount}`);
        } catch (err) {
          logger.error('Failed to persist ProjectCreated event:', err);
        }
      }

      // ── Handle FreelancerAssigned ──────────────────────────────────────
      for (const event of assignedEvents) {
        if (!('args' in event)) continue;
        try {
          const [projectId, freelancer] = event.args;
          const pid = Number(projectId);

          await Project.updateOne(
            { projectId: pid },
            { $set: { freelancer, freelancerLower: freelancer.toLowerCase(), status: ProjectStatus.Active } },
          );
          logger.info(`👤 Freelancer assigned to project #${pid}: ${freelancer}`);
        } catch (err) {
          logger.error('Failed to update FreelancerAssigned:', err);
        }
      }

      // ── Handle MilestoneCompleted ──────────────────────────────────────
      for (const event of milestoneCompletedEvents) {
        if (!('args' in event)) continue;
        try {
          const [projectId, milestoneIndex] = event.args;
          const pid = Number(projectId);
          const mi = Number(milestoneIndex);

          await Project.updateOne(
            { projectId: pid, 'milestones.index': mi },
            { $set: { [`milestones.$.status`]: MilestoneStatus.Completed, [`milestones.$.completionTime`]: new Date() } },
          );
          logger.info(`✅ Milestone ${mi} completed for project #${pid}`);
        } catch (err) {
          logger.error('Failed to update MilestoneCompleted:', err);
        }
      }

      // ── Handle MilestoneApproved ───────────────────────────────────────
      for (const event of milestoneApprovedEvents) {
        if (!('args' in event)) continue;
        try {
          const [projectId, milestoneIndex, amount] = event.args;
          const pid = Number(projectId);
          const mi = Number(milestoneIndex);

          await Project.updateOne(
            { projectId: pid, 'milestones.index': mi },
            { $set: { [`milestones.$.status`]: MilestoneStatus.Approved } },
          );

          const project = await Project.findOne({ projectId: pid });
          if (project) {
            // Update amountPaid using BigInt-safe string arithmetic.
            const amountDelta = normalizeAmountString(amount?.toString() || '0', 'amountPaidDelta');
            if (amountDelta !== '0') {
              project.amountPaid = addAmountStrings(project.amountPaid, amountDelta);
            }

            // Check if all milestones are approved → mark project complete
            const allApproved = project.milestones.every(m => m.status === MilestoneStatus.Approved);
            if (allApproved) {
              project.status = ProjectStatus.Completed;
              logger.info(`🎉 Project #${pid} completed — all milestones approved`);
            }

            await project.save();
          }

          logger.info(`✅ Milestone ${mi} approved for project #${pid} — paid: ${amount}`);
        } catch (err) {
          logger.error('Failed to update MilestoneApproved:', err);
        }
      }

      // ── Handle ProjectCancelled ────────────────────────────────────────
      for (const event of cancelledEvents) {
        if (!('args' in event)) continue;
        try {
          const [projectId, cancelledBy, reason] = event.args;
          const pid = Number(projectId);

          await Project.updateOne(
            { projectId: pid },
            { $set: { status: ProjectStatus.Cancelled } },
          );
          logger.info(`❌ Project #${pid} cancelled by ${cancelledBy}: ${reason}`);
        } catch (err) {
          logger.error('Failed to update ProjectCancelled:', err);
        }
      }

      // ── Handle DisputeCreated ──────────────────────────────────────────
      for (const event of disputeCreatedEvents) {
        if (!('args' in event)) continue;
        try {
          const [projectId, milestoneIndex, disputeId] = event.args;
          const pid = Number(projectId);
          const mi = Number(milestoneIndex);

          await Project.updateOne(
            { projectId: pid, 'milestones.index': mi },
            { $set: { [`milestones.$.status`]: MilestoneStatus.Disputed } },
          );
          logger.info(`⚠️ Dispute #${disputeId} created for project #${pid}, milestone ${mi}`);
        } catch (err) {
          logger.error('Failed to update DisputeCreated:', err);
        }
      }

      // ── Handle DisputeResolved ─────────────────────────────────────────
      for (const event of disputeResolvedEvents) {
        if (!('args' in event)) continue;
        try {
          const [projectId, milestoneIndex, outcome] = event.args;
          const pid = Number(projectId);
          const mi = Number(milestoneIndex);
          const outcomeNum = Number(outcome);

          // outcome: 0=Pending, 1=AcceptAISplit, 2=ClientWins, 3=FreelancerWins
          const newStatus = outcomeNum === 2 
            ? MilestoneStatus.Pending   // Client wins — reset milestone
            : MilestoneStatus.Approved; // Freelancer wins or AI split — approve

          await Project.updateOne(
            { projectId: pid, 'milestones.index': mi },
            { $set: { [`milestones.$.status`]: newStatus } },
          );
          logger.info(`⚖️ Dispute resolved for project #${pid}, milestone ${mi} — outcome: ${outcomeNum}`);
        } catch (err) {
          logger.error('Failed to update DisputeResolved:', err);
        }
      }

      this.lastProcessedBlock = currentBlock;
    } catch (e) {
      logger.error('Project polling error', e);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const projectEventListener = new ProjectEventListener();
