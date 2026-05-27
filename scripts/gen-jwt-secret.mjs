#!/usr/bin/env node
/**
 * Generate a cryptographically strong JWT_SECRET.
 *
 * Usage:
 *   node scripts/gen-jwt-secret.mjs            # 48 random bytes → base64 (~64 chars)
 *   node scripts/gen-jwt-secret.mjs 32         # custom byte count
 *   node scripts/gen-jwt-secret.mjs 48 hex     # hex output instead of base64
 *
 * Paste the output into the Railway dashboard's JWT_SECRET variable.
 * Never commit a real secret to the repo.
 */
import { randomBytes } from 'node:crypto';

const bytes = parseInt(process.argv[2] ?? '48', 10);
const encoding = process.argv[3] ?? 'base64';

if (!Number.isFinite(bytes) || bytes < 16) {
  console.error('Refusing to generate < 16 bytes — too weak for JWT signing.');
  process.exit(1);
}
if (!['base64', 'base64url', 'hex'].includes(encoding)) {
  console.error(`Unknown encoding "${encoding}". Use base64, base64url, or hex.`);
  process.exit(1);
}

const secret = randomBytes(bytes).toString(encoding);
console.log(secret);
