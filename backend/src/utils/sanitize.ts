/**
 * Input sanitization utilities — prevents NoSQL injection, XSS, and ReDoS.
 */

/**
 * Escape regex metacharacters in user input before using in $regex queries.
 * Prevents ReDoS and regex injection (SAST-003, SAST-004, SAST-005).
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strip HTML tags and script content from user-supplied text.
 * Prevents stored XSS (SAST-009, SAST-010, SAST-022, SAST-023).
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    // Remove script/style blocks entirely
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Remove all HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities to plain text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    // Then re-escape the dangerous ones for safe storage
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Sanitize a plain string field (display names, bios, etc.)
 * Limits length and strips dangerous characters.
 */
export function sanitizeTextField(input: unknown, maxLength = 500): string {
  if (!input || typeof input !== 'string') return '';
  return sanitizeHtml(input).substring(0, maxLength);
}

/**
 * Sanitize a URL — ensures it starts with http(s) and is well-formed.
 */
export function sanitizeUrl(input: unknown): string {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

/**
 * Enforce that a value is a plain string (not an object/array).
 * Prevents NoSQL operator injection via query params like ?status[$gt]=.
 * (SAST-016)
 */
export function ensureString(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val !== 'string') return undefined;
  return val;
}

/**
 * Validate an Ethereum/Hedera wallet address format.
 */
export function isValidAddress(address: unknown): address is string {
  if (typeof address !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
