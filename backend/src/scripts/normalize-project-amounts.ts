import { connectDatabase, disconnectDatabase } from '../database.js';
import { Project } from '../models/Project.js';
import { normalizeAmountString } from '../utils/money.js';
import { logger } from '../utils/logger.js';

async function normalizeProjectAmounts() {
  await connectDatabase();

  let scanned = 0;
  let updated = 0;
  let failed = 0;

  try {
    const cursor = Project.find({}).cursor();

    for await (const project of cursor) {
      scanned += 1;

      try {
        let dirty = false;

        const normalizedTotal = normalizeAmountString(project.totalAmount, 'totalAmount');
        if (normalizedTotal !== project.totalAmount) {
          project.totalAmount = normalizedTotal;
          dirty = true;
        }

        const normalizedPaid = normalizeAmountString(project.amountPaid, 'amountPaid');
        if (normalizedPaid !== project.amountPaid) {
          project.amountPaid = normalizedPaid;
          dirty = true;
        }

        if (Array.isArray(project.milestones)) {
          project.milestones.forEach((milestone, idx) => {
            const normalizedMilestoneAmount = normalizeAmountString(milestone.amount, `milestones[${idx}].amount`);
            if (normalizedMilestoneAmount !== milestone.amount) {
              milestone.amount = normalizedMilestoneAmount;
              dirty = true;
            }
          });
        }

        if (dirty) {
          await project.save();
          updated += 1;
        }
      } catch (error) {
        failed += 1;
        logger.error(`Failed to normalize project #${project.projectId}:`, error);
      }
    }

    logger.info(`Normalization complete. scanned=${scanned}, updated=${updated}, failed=${failed}`);
  } finally {
    await disconnectDatabase();
  }
}

normalizeProjectAmounts()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Project amount normalization failed:', error);
    process.exit(1);
  });
