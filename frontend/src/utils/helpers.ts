import { ethers } from 'ethers';

/**
 * Format address for display (0x1234...5678)
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format USDC amount (6 decimals)
 */
export function formatUSDC(amount: string | number | bigint): string {
  const value = typeof amount === 'string' ? BigInt(amount) : BigInt(amount);
  const formatted = ethers.formatUnits(value, 6);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(formatted));
}

/**
 * Parse USDC amount to smallest unit
 */
export function parseUSDC(amount: string | number): bigint {
  return ethers.parseUnits(amount.toString(), 6);
}

/**
 * Format date relative to now
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: then.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Generate avatar URL from address
 */
export function generateAvatar(address: string): string {
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${address}&backgroundColor=0070e0`;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

/**
 * Class name utility
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get milestone status label
 */
export function getMilestoneStatusLabel(status: number): string {
  const labels = ['Pending', 'Completed', 'Approved', 'Disputed'];
  return labels[status] || 'Unknown';
}

/**
 * Get milestone status color
 */
export function getMilestoneStatusColor(status: number): string {
  const colors = [
    'bg-surface-100 text-surface-600', // Pending
    'bg-warning-400/20 text-warning-600', // Completed
    'bg-success-400/20 text-success-600', // Approved
    'bg-error-400/20 text-error-600', // Disputed
  ];
  return colors[status] || colors[0];
}

/**
 * Calculate project progress
 */
export function calculateProgress(milestones: { status: number }[]): number {
  if (!milestones.length) return 0;
  const approved = milestones.filter((m) => m.status === 2).length;
  return Math.round((approved / milestones.length) * 100);
}
