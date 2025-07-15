/**
 * Message Authentication Functions
 * Handles HMAC signatures and message integrity checking
 */

import { createHash } from 'crypto';

export function createHMACSignature(message: string, key: string): string {
  return createHash('sha256')
    .update(message + key)
    .digest('hex');
}

export function verifyHMACSignature(message: string, signature: string, key: string): boolean {
  const expectedSignature = createHMACSignature(message, key);
  return signature === expectedSignature;
}

export function createMessageHash(message: string): string {
  return createHash('sha256').update(message).digest('hex');
}

export function validateMessageFreshness(timestamp: number, maxAge: number = 5 * 60 * 1000): boolean {
  const now = Date.now();
  const age = now - timestamp;
  return age >= 0 && age <= maxAge;
}
