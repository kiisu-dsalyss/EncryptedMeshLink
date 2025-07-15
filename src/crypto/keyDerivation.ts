/**
 * Key Derivation Functions
 * Handles cryptographic key derivation operations
 */

import { createHash, pbkdf2, randomBytes } from 'crypto';
import { promisify } from 'util';
import { CryptoConfig } from './types';

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
    throw new Error(`Discovery key derivation failed: ${error}`);
  }
}

export function generateRandomKey(length: number = 32): string {
  return randomBytes(length).toString('hex');
}
