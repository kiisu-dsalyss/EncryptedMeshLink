/**
 * Key Derivation Functions
 * Handles cryptographic key derivation operations
 */

import { createHash, pbkdf2, randomBytes } from 'crypto';
import { promisify } from 'util';
import { CryptoConfig } from './types';
import { createCryptoError } from '../common/errors';

const pbkdf2Async = promisify(pbkdf2);

export async function deriveDiscoveryKey(
  masterSecret: string, 
  networkName: string,
  config: Required<CryptoConfig>,
  iterations?: number
): Promise<string> {
  try {
    const salt = createHash('sha256').update(networkName).digest();
    const keyLength = 32; // 256 bits

    const derivedKey = await pbkdf2Async(
      masterSecret, 
      salt, 
      iterations || config.keyDerivationIterations, 
      keyLength, 
      'sha256'
    );

    return derivedKey.toString('hex');
  } catch (error) {
    throw createCryptoError('Discovery key derivation', error as Error);
  }
}

export function generateRandomKey(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

export function generateMessageId(): string {
  const timestamp = Date.now().toString(36); // Base 36 timestamp
  const random = randomBytes(8).toString('hex'); // 16 hex chars
  return `${timestamp}-${random}`;
}
