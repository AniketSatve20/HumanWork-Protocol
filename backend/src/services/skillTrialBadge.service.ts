import { ethers } from 'ethers';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { blockchainService } from './blockchain.service.js';
import SkillTrialABI from '../abi/SkillTrial.json' with { type: 'json' };

// Helper to mint badge on SkillTrial contract
export async function mintSkillTrialBadge({
  applicant,
  testId,
  submissionIpfsHash,
  narrativeSummaryIpfsHash,
}: {
  applicant: string;
  testId: number;
  submissionIpfsHash: string;
  narrativeSummaryIpfsHash: string;
}): Promise<{ tokenId: number; txHash: string }> {
  if (!config.contracts.skillTrial || !config.oracle.privateKey) {
    throw new Error('SkillTrial contract address or oracle private key missing');
  }
  const provider = blockchainService.getProvider();
  const wallet = new ethers.Wallet(config.oracle.privateKey, provider);
  const contract = new ethers.Contract(
    config.contracts.skillTrial,
    SkillTrialABI,
    wallet
  );
  // Assume mintBadge(address applicant, uint256 testId, string submissionIpfsHash, string narrativeSummaryIpfsHash)
  const tx = await contract.mintBadge(applicant, testId, submissionIpfsHash, narrativeSummaryIpfsHash);
  const receipt = await tx.wait();
  const tokenId = receipt?.events?.find((e: any) => e.event === 'BadgeMinted')?.args?.tokenId?.toNumber() || 0;
  logger.info(`🏅 Minted SkillTrial badge for ${applicant} (tokenId: ${tokenId})`);
  return { tokenId, txHash: receipt.transactionHash };
}
