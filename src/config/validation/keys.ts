/**
 * Keys Validation
 * Validates cryptographic keys format and constraints
 */

import { ConfigValidationError } from './types';
import { KeyManager } from '../keyManager';

export function validateKeys(keys: any): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!keys || typeof keys !== 'object') {
    errors.push({ field: 'keys', message: 'Keys configuration is required' });
    return errors;
  }

  // Validate public key
  if (!keys.publicKey) {
    errors.push({ field: 'keys.publicKey', message: 'Public key is required' });
  } else if (typeof keys.publicKey !== 'string') {
    errors.push({ field: 'keys.publicKey', message: 'Public key must be a string' });
  } else if (!KeyManager.validatePemFormat(keys.publicKey, 'public')) {
    errors.push({ field: 'keys.publicKey', message: 'Invalid public key PEM format' });
  }

  // Validate private key
  if (!keys.privateKey) {
    errors.push({ field: 'keys.privateKey', message: 'Private key is required' });
  } else if (typeof keys.privateKey !== 'string') {
    errors.push({ field: 'keys.privateKey', message: 'Private key must be a string' });
  } else if (!KeyManager.validatePemFormat(keys.privateKey, 'private')) {
    errors.push({ field: 'keys.privateKey', message: 'Invalid private key PEM format' });
  }

  // Validate key pair match
  if (keys.publicKey && keys.privateKey && 
      KeyManager.validatePemFormat(keys.publicKey, 'public') &&
      KeyManager.validatePemFormat(keys.privateKey, 'private')) {
    // TODO: Re-enable key pair validation once we debug the issue
    // if (!KeyManager.validateKeyPair(keys.publicKey, keys.privateKey)) {
    //   errors.push({ field: 'keys', message: 'Public and private keys do not form a valid pair' });
    // }
  }

  return errors;
}
