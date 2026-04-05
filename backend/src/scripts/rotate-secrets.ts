#!/usr/bin/env tsx
/**
 * rotate-secrets.ts
 *
 * Generates cryptographically secure 32-byte values for JWT_SECRET and
 * ENCRYPTION_KEY.  Output is formatted so it can be pasted directly into a
 * production .env file.
 *
 * Usage:
 *   npx tsx src/scripts/rotate-secrets.ts            # print to stdout
 *   npx tsx src/scripts/rotate-secrets.ts >> .env     # append to .env
 */

import { randomBytes } from 'node:crypto';

function generate(label: string): string {
  const value = randomBytes(32).toString('hex');      // 64 hex chars = 32 bytes
  return `${label}=${value}`;
}

console.log('# ── Rotated secrets (' + new Date().toISOString() + ') ──');
console.log(generate('JWT_SECRET'));
console.log(generate('ENCRYPTION_KEY'));
