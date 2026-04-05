import type { SkillCategory, SkillDifficulty } from '@/types';

export function inferCategory(title: string): SkillCategory {
  const t = title.toLowerCase();
  if (t.includes('solidity') || t.includes('smart contract') || t.includes('evm') || t.includes('web3')) return 'smart-contracts';
  if (t.includes('react') || t.includes('frontend') || t.includes('css') || t.includes('html') || t.includes('ui')) return 'frontend';
  if (t.includes('node') || t.includes('backend') || t.includes('api') || t.includes('express') || t.includes('database')) return 'backend';
  if (t.includes('design') || t.includes('figma') || t.includes('ux')) return 'design';
  if (t.includes('devops') || t.includes('docker') || t.includes('ci/cd') || t.includes('kubernetes')) return 'devops';
  if (t.includes('data') || t.includes('ml') || t.includes('machine learning') || t.includes('python')) return 'data-science';
  if (t.includes('mobile') || t.includes('ios') || t.includes('android') || t.includes('flutter') || t.includes('react native')) return 'mobile';
  if (t.includes('security') || t.includes('audit') || t.includes('penetration') || t.includes('vulnerability')) return 'security';
  return 'backend';
}

export function inferDifficulty(title: string, fee: string): SkillDifficulty {
  const t = title.toLowerCase();
  if (t.includes('expert') || t.includes('advanced audit') || t.includes('master')) return 'expert';
  if (t.includes('advanced') || t.includes('senior')) return 'advanced';
  if (t.includes('intermediate') || t.includes('mid')) return 'intermediate';
  if (t.includes('beginner') || t.includes('basic') || t.includes('intro')) return 'beginner';

  const feeNum = parseFloat(fee);
  if (feeNum >= 50) return 'expert';
  if (feeNum >= 20) return 'advanced';
  if (feeNum >= 5) return 'intermediate';
  return 'beginner';
}
