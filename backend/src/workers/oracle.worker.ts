import { ethers, Contract } from 'ethers';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { aiService } from '../services/ai.service.js';
import { blockchainService } from '../services/blockchain.service.js';
import { ipfsService } from '../services/ipfs.service.js';
import { SkillSubmission, SubmissionStatus } from '../models/SkillSubmission.js';
import { SecureUser } from '../models/SecureUser.js';
import AIOracleABI from '../abi/AIOracle.json' with { type: 'json' };

enum JobType {
  GST_VERIFICATION = 0,
  SKILL_GRADING = 1,
  DISPUTE_RESOLUTION = 2 
}

const GST_NUMBER_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;

export class OracleWorker {
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Wallet | null = null;
  private oracleContract: Contract | null = null;
  private isProcessing = false;
  private lastProcessedBlock = 0;

  async start() {
    if (!config.contracts.aiOracle || !config.oracle.privateKey) {
      logger.warn('⚠️ AI Worker skipped: Missing AI_ORACLE_ADDRESS or ORACLE_PRIVATE_KEY');
      return; 
    }

    logger.info('🤖 Starting AI Oracle Worker...');

    try {
      const network = new ethers.Network("hedera-testnet", config.hedera.chainId);
      this.provider = new ethers.JsonRpcProvider(config.hedera.rpcUrl, network, {
        staticNetwork: network,
        batchMaxCount: 1,
      });
      this.signer = new ethers.Wallet(config.oracle.privateKey, this.provider);
      this.oracleContract = new ethers.Contract(config.contracts.aiOracle, AIOracleABI, this.signer);

      this.lastProcessedBlock = await this.provider.getBlockNumber();
      logger.info(`📍 AI Listening from block: ${this.lastProcessedBlock}`);
      
      setInterval(() => this.pollForEvents(), 10000);

    } catch (error) {
      logger.error('❌ Failed to start AI worker:', error);
    }
  }

  private async reconcileSubmissionRecord(
    onChainSubmissionId: number,
    chainSubmission: {
      testId: number;
      applicant: string;
      submissionHash: string;
    }
  ): Promise<void> {
    const applicantLower = chainSubmission.applicant.toLowerCase();
    const now = new Date();

    const existingByOnChainId = await SkillSubmission.findOne({ submissionId: onChainSubmissionId });
    if (existingByOnChainId) {
      await SkillSubmission.updateOne(
        { _id: existingByOnChainId._id },
        {
          $set: {
            testId: chainSubmission.testId,
            applicant: chainSubmission.applicant,
            applicantLower,
            submissionIpfsHash: chainSubmission.submissionHash,
            status: SubmissionStatus.Grading,
            gradingStartedAt: existingByOnChainId.gradingStartedAt || now,
          },
        }
      );
      return;
    }

    if (chainSubmission.submissionHash) {
      const pendingPlaceholder = await SkillSubmission.findOne({
        submissionIpfsHash: chainSubmission.submissionHash,
        applicantLower,
        testId: chainSubmission.testId,
        status: { $in: [SubmissionStatus.Pending, SubmissionStatus.Grading] },
      }).sort({ createdAt: -1 });

      if (pendingPlaceholder) {
        try {
          await SkillSubmission.updateOne(
            { _id: pendingPlaceholder._id },
            {
              $set: {
                submissionId: onChainSubmissionId,
                testId: chainSubmission.testId,
                applicant: chainSubmission.applicant,
                applicantLower,
                submissionIpfsHash: chainSubmission.submissionHash,
                status: SubmissionStatus.Grading,
                gradingStartedAt: pendingPlaceholder.gradingStartedAt || now,
              },
            }
          );
          return;
        } catch (error: any) {
          if (error?.code !== 11000) {
            throw error;
          }

          logger.warn(
            `Duplicate key while reconciling placeholder to on-chain submission #${onChainSubmissionId}; falling back to canonical record`
          );
        }
      }
    }

    await SkillSubmission.findOneAndUpdate(
      { submissionId: onChainSubmissionId },
      {
        $setOnInsert: {
          submissionId: onChainSubmissionId,
          testId: chainSubmission.testId,
          applicant: chainSubmission.applicant,
          applicantLower,
          submissionIpfsHash: chainSubmission.submissionHash,
          status: SubmissionStatus.Grading,
          gradingStartedAt: now,
          transactionHash: '',
          blockNumber: 0,
        },
      },
      { upsert: true, new: true }
    );
  }

  private decodeRequestedGstHash(encodedData: string | null | undefined): string | null {
    if (!encodedData || encodedData === '0x') {
      return null;
    }

    try {
      const [gstHash] = ethers.AbiCoder.defaultAbiCoder().decode(['bytes32'], encodedData);
      return String(gstHash).toLowerCase();
    } catch (error) {
      logger.warn('Failed to decode GST hash from oracle job payload:', error);
      return null;
    }
  }

  private normalizeGstNumber(rawTaxId: string): string {
    return rawTaxId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private buildGstHashCandidates(rawTaxId: string): string[] {
    const trimmed = rawTaxId.trim();
    const upperTrimmed = trimmed.toUpperCase();
    const normalized = this.normalizeGstNumber(trimmed);
    const variants = Array.from(new Set([trimmed, upperTrimmed, normalized])).filter((value) => value.length > 0);
    return variants.map((value) => ethers.keccak256(ethers.toUtf8Bytes(value)).toLowerCase());
  }

  private async verifyWithExternalGstApi(gstNumber: string): Promise<boolean | null> {
    const endpoint = process.env.GST_VERIFICATION_API_URL?.trim();
    if (!endpoint) {
      return null;
    }

    const timeoutRaw = process.env.GST_VERIFICATION_API_TIMEOUT_MS;
    const parsedTimeout = timeoutRaw ? Number(timeoutRaw) : 8000;
    const timeoutMs = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 8000;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const apiKey = process.env.GST_VERIFICATION_API_KEY?.trim();
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ gstNumber }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      const payload = (await response.json().catch(() => null)) as any;

      if (!response.ok) {
        logger.warn(`GST external API rejected verification (status=${response.status})`);
        return false;
      }

      const externalVerdict =
        typeof payload?.isValid === 'boolean'
          ? payload.isValid
          : typeof payload?.valid === 'boolean'
            ? payload.valid
            : typeof payload?.verified === 'boolean'
              ? payload.verified
              : typeof payload?.data?.isValid === 'boolean'
                ? payload.data.isValid
                : typeof payload?.data?.valid === 'boolean'
                  ? payload.data.valid
                  : null;

      if (externalVerdict === null) {
        logger.warn('GST external API response did not include a recognized boolean verdict');
        return false;
      }

      return externalVerdict;
    } catch (error) {
      logger.warn('GST external API verification failed:', error);
      return false;
    }
  }

  private async evaluateGstVerification(
    agencyId: number,
    requestedGstHash: string | null
  ): Promise<{ isVerified: boolean; reason: string }> {
    const agency = await blockchainService.getAgency(agencyId);
    const owner = String(agency?.owner || '').toLowerCase();
    const onChainGstHash = String(agency?.gstNumberHash || '').toLowerCase();

    if (!owner || owner === ethers.ZeroAddress.toLowerCase()) {
      return { isVerified: false, reason: 'Agency owner is missing' };
    }

    if (!agency?.isActive) {
      return { isVerified: false, reason: 'Agency is inactive' };
    }

    if (!/^0x[0-9a-f]{64}$/.test(onChainGstHash) || onChainGstHash === ethers.ZeroHash.toLowerCase()) {
      return { isVerified: false, reason: 'On-chain GST hash is invalid' };
    }

    if (requestedGstHash && requestedGstHash !== onChainGstHash) {
      return { isVerified: false, reason: 'Job payload GST hash mismatch' };
    }

    const secureUser = await SecureUser.findOne({ walletAddressLower: owner }).select('+taxId');
    if (!secureUser) {
      return { isVerified: false, reason: 'No KYC profile linked to agency owner' };
    }

    if (!secureUser.isKycVerified) {
      return { isVerified: false, reason: 'Agency owner KYC is not verified' };
    }

    const taxId = typeof secureUser.taxId === 'string' ? secureUser.taxId : '';
    if (!taxId || taxId === '[DELETED]') {
      return { isVerified: false, reason: 'Owner tax ID is missing' };
    }

    const normalizedGst = this.normalizeGstNumber(taxId);
    if (!GST_NUMBER_REGEX.test(normalizedGst)) {
      return { isVerified: false, reason: 'Owner tax ID does not match GST format' };
    }

    const gstHashCandidates = this.buildGstHashCandidates(taxId);
    if (!gstHashCandidates.includes(onChainGstHash)) {
      return { isVerified: false, reason: 'Owner tax ID hash does not match on-chain GST hash' };
    }

    const externalVerdict = await this.verifyWithExternalGstApi(normalizedGst);
    if (externalVerdict === false) {
      return { isVerified: false, reason: 'External GST verification failed' };
    }

    if (externalVerdict === true) {
      return { isVerified: true, reason: 'On-chain hash + external GST validation passed' };
    }

    return { isVerified: true, reason: 'On-chain hash + GST format validation passed' };
  }

  private async pollForEvents() {
    if (this.isProcessing || !this.oracleContract || !this.provider) return;
    this.isProcessing = true;

    try {
      const currentBlock = await this.provider.getBlockNumber();
      if (currentBlock <= this.lastProcessedBlock) {
        this.isProcessing = false;
        return;
      }

      const events = await this.oracleContract.queryFilter('JobRequested', this.lastProcessedBlock + 1, currentBlock);
      
      for (const event of events) {
        if ('args' in event) {
          const [jobId, jobType, referenceId, _requestHash, requestData] = event.args;
          const jt = Number(jobType);
          logger.info(`🔔 New Job #${jobId} Type: ${jt} RefId: ${referenceId}`);
          
          try {
            if (jt === JobType.SKILL_GRADING) {
              await this.handleSkillGrading(Number(jobId), Number(referenceId));
            } else if (jt === JobType.DISPUTE_RESOLUTION) {
              await this.handleDisputeResolution(Number(jobId), Number(referenceId));
            } else if (jt === JobType.GST_VERIFICATION) {
              const requestedGstHash =
                typeof requestData === 'string' ? this.decodeRequestedGstHash(requestData) : null;
              await this.handleGstVerification(Number(jobId), Number(referenceId), requestedGstHash);
            } else {
              logger.warn(`⚠️ Unhandled job type ${jt} for job #${jobId}`);
            }
          } catch (jobError) {
            logger.error(`❌ Failed to process job #${jobId}:`, jobError);
          }
        }
      }
      this.lastProcessedBlock = currentBlock;
    } catch (error) {
      logger.error('AI Polling Error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Fetch IPFS content for a given hash. Falls back to an error message.
   */
  private async fetchIPFSContent(ipfsHash: string): Promise<string> {
    try {
      const url = ipfsService.getGatewayUrl(ipfsHash);
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      logger.warn(`Failed to fetch IPFS content (${ipfsHash}):`, error);
      return `[IPFS content unavailable: ${ipfsHash}]`;
    }
  }

  private async handleSkillGrading(jobId: number, submissionId: number) {
    try {
      logger.info(`📝 Grading submission #${submissionId}...`);

      // Fetch actual submission data from chain + IPFS
      const submission = await blockchainService.getSubmission(submissionId);
      const test = await blockchainService.getSkillTest(submission.testId);

      // Reconcile placeholder pending document (temporary local ID) with the
      // canonical on-chain submission ID before grading updates.
      await this.reconcileSubmissionRecord(submissionId, {
        testId: submission.testId,
        applicant: submission.applicant,
        submissionHash: submission.submissionHash,
      });
      
      // Fetch the actual submission content from IPFS
      let submissionContent = submission.submissionHash;
      if (submission.submissionHash) {
        submissionContent = await this.fetchIPFSContent(submission.submissionHash);
      }

      // Fetch test details from IPFS if available
      let testContent = test.description;
      if (test.ipfsHash) {
        testContent = await this.fetchIPFSContent(test.ipfsHash);
      }

      const result = await aiService.gradeSubmission({
        question: `${test.title}: ${testContent}`,
        answer: submissionContent,
        expectedCriteria: `Standard professional criteria for: ${test.title}`,
      });

      let txHash = '';
      let blockNumber = 0;

      if (this.oracleContract && this.signer) {
        const tx = await this.oracleContract.fulfillSkillGrade(
          jobId,
          submissionId,
          await this.signer.getAddress(),
          result.score,
          result.report
        );
        const receipt = await tx.wait();
        txHash = receipt?.hash || tx.hash;
        blockNumber = receipt?.blockNumber || 0;
        logger.info(`✅ Grading fulfilled for job #${jobId} — Score: ${result.score}`);
      }

      // Persist grading result to MongoDB
      await SkillSubmission.findOneAndUpdate(
        { submissionId },
        {
          $set: {
            submissionId,
            testId: submission.testId,
            applicant: submission.applicant,
            applicantLower: submission.applicant.toLowerCase(),
            submissionIpfsHash: submission.submissionHash,
            status: SubmissionStatus.Graded,
            score: result.score,
            aiReport: result.report,
            testTitle: test.title,
            testDescription: test.description,
            gradingCompletedAt: new Date(),
            aiModelUsed: 'huggingface-default',
            transactionHash: txHash,
            blockNumber,
          },
          $setOnInsert: {
            gradingStartedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      logger.info(`💾 Grading result persisted to DB for submission #${submissionId}`);
    } catch (error) {
      logger.error(`Failed to grade submission #${submissionId}:`, error);
      
      // Mark as failed in DB
      await SkillSubmission.findOneAndUpdate(
        { submissionId },
        { $set: { status: SubmissionStatus.Failed } }
      ).catch(() => {});
    }
  }

  private async handleDisputeResolution(jobId: number, disputeId: number) {
    try {
      logger.info(`⚖️ Analyzing dispute #${disputeId}...`);

      // Fetch real dispute data from the DisputeJury contract
      const dispute = await blockchainService.getDispute(disputeId);
      
      // Fetch the project to get milestone details
      let projectTitle = `Project #${dispute.projectId}`;
      let milestoneDesc = `Milestone #${dispute.milestoneIndex}`;
      let clientEvidence = 'No evidence submitted by client';
      let freelancerEvidence = 'No evidence submitted by freelancer';

      try {
        const project = await blockchainService.getProject(dispute.projectId);
        projectTitle = `Project #${dispute.projectId}`;
        const milestone = project.milestones[dispute.milestoneIndex];
        if (milestone) {
          milestoneDesc = milestone.description || milestoneDesc;
        }
      } catch (err) {
        logger.warn(`Could not fetch project details for dispute #${disputeId}:`, err);
      }

      // Check if we have any stored evidence in MongoDB (from the projects collection)
      try {
        const { Project: ProjectModel } = await import('../models/Project.js');
        const dbProject = await ProjectModel.findOne({ projectId: dispute.projectId }).lean();
        if (dbProject) {
          projectTitle = dbProject.title || projectTitle;
          const ms = dbProject.milestones?.[dispute.milestoneIndex];
          if (ms) {
            milestoneDesc = ms.description || milestoneDesc;
            if (ms.deliverableIpfsHash) {
              freelancerEvidence = await this.fetchIPFSContent(ms.deliverableIpfsHash);
            }
          }
          if (dbProject.fullDescriptionIpfsHash) {
            clientEvidence = await this.fetchIPFSContent(dbProject.fullDescriptionIpfsHash);
          }
        }
      } catch (err) {
        logger.warn(`Could not fetch DB project for dispute #${disputeId}:`, err);
      }

      // Use AI service to analyze the dispute with real data
      const result = await aiService.analyzeDispute({
        projectTitle,
        milestoneDescription: milestoneDesc,
        disputeReason: `Dispute over milestone ${dispute.milestoneIndex} — Amount: ${dispute.amount}`,
        clientEvidence,
        freelancerEvidence,
      });

      logger.info(`⚖️ Dispute #${disputeId} analyzed: Freelancer ${result.recommendedSplit.freelancer}% / Client ${result.recommendedSplit.client}%`);

      // Submit AI report on-chain via DisputeJury.setAiReport()
      if (blockchainService.disputeJury) {
        try {
          const tx = await blockchainService.setAiReport(
            disputeId,
            result.report,
            result.recommendedSplit.freelancer // % to freelancer (0-100)
          );
          const receipt = await tx.wait();
          logger.info(`✅ AI report submitted on-chain for dispute #${disputeId} — tx: ${receipt?.hash || tx.hash}`);
        } catch (txErr) {
          logger.error(`Failed to submit AI report on-chain for dispute #${disputeId}:`, txErr);
        }
      } else {
        logger.warn(`⚠️ DisputeJury contract not available — AI report for dispute #${disputeId} not submitted`);
      }

      // Store dispute analysis in MongoDB for reference
      try {
        const { Project: ProjectModel } = await import('../models/Project.js');
        await ProjectModel.updateOne(
          { projectId: dispute.projectId },
          {
            $set: {
              [`milestones.${dispute.milestoneIndex}.disputeReport`]: result.report,
              [`milestones.${dispute.milestoneIndex}.disputeRecommendedSplit`]: result.recommendedSplit,
            },
          }
        );
      } catch {
        // Non-critical — DB storage is supplemental
      }
    } catch (error) {
      logger.error(`Failed to analyze dispute #${disputeId}:`, error);
    }
  }

  private async handleGstVerification(jobId: number, referenceId: number, requestedGstHash: string | null) {
    try {
      const agencyId = referenceId;
      logger.info(`🔍 GST Verification for agency #${agencyId} (job #${jobId})...`);

      if (!this.oracleContract || !this.signer || !this.provider) {
        logger.warn(`⚠️ Cannot fulfill GST job #${jobId}: oracle contract or signer/provider unavailable`);
        return;
      }

      const verification = await this.evaluateGstVerification(agencyId, requestedGstHash);
      const isVerified = verification.isVerified;

      logger.info(
        `🧾 GST verification decision for agency #${agencyId} (job #${jobId}): ${isVerified} (${verification.reason})`
      );

      try {
        const nonce = await this.signer.getNonce('pending');
        const feeData = await this.provider.getFeeData();

        const txOverrides: ethers.TransactionRequest = {
          nonce,
          gasLimit: 350000n,
        };

        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          txOverrides.maxFeePerGas = feeData.maxFeePerGas;
          txOverrides.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        } else if (feeData.gasPrice) {
          txOverrides.gasPrice = feeData.gasPrice;
        }

        const tx = await this.oracleContract.fulfillGstVerification(
          jobId,
          agencyId,
          isVerified,
          txOverrides
        );

        const receipt = await tx.wait();
        if (!receipt || receipt.status !== 1) {
          throw new Error(`GST verification tx reverted for job #${jobId}`);
        }

        logger.info(
          `✅ GST Verification fulfilled on-chain for job #${jobId}, agency #${agencyId} — tx: ${receipt.hash}`
        );
      } catch (txErr) {
        logger.error(`Failed to fulfill GST verification on-chain for job #${jobId}, agency #${agencyId}:`, txErr);
      }
    } catch (error) {
      logger.error(`Failed to handle GST verification #${referenceId}:`, error);
    }
  }
}

export const oracleWorker = new OracleWorker();
