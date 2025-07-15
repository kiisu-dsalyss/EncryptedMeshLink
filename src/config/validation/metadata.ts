/**
 * Metadata Validation
 * Validates configuration metadata
 */

import { ConfigValidationError } from './types';
import { validateTimestamp } from '../../common/validation';

export function validateMetadata(metadata: any): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!metadata || typeof metadata !== 'object') {
    errors.push({ field: 'metadata', message: 'Metadata is required' });
    return errors;
  }

  // Created at validation
  const createdValidation = validateTimestamp(metadata.createdAt, 'Created timestamp');
  if (!createdValidation.isValid) {
    errors.push({ field: 'metadata.createdAt', message: createdValidation.error! });
  }

  // Updated at validation
  const updatedValidation = validateTimestamp(metadata.updatedAt, 'Updated timestamp');
  if (!updatedValidation.isValid) {
    errors.push({ field: 'metadata.updatedAt', message: updatedValidation.error! });
  }

  // Version validation
  if (!metadata.version) {
    errors.push({ field: 'metadata.version', message: 'Version is required' });
  } else if (typeof metadata.version !== 'string') {
    errors.push({ field: 'metadata.version', message: 'Version must be a string' });
  }

  return errors;
}
