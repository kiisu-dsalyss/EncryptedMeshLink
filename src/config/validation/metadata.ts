/**
 * Metadata Validation
 * Validates configuration metadata
 */

import { ConfigValidationError } from './types';

export function validateMetadata(metadata: any): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!metadata || typeof metadata !== 'object') {
    errors.push({ field: 'metadata', message: 'Metadata is required' });
    return errors;
  }

  // Created at validation
  if (!metadata.createdAt) {
    errors.push({ field: 'metadata.createdAt', message: 'Created timestamp is required' });
  } else if (typeof metadata.createdAt !== 'string') {
    errors.push({ field: 'metadata.createdAt', message: 'Created timestamp must be a string' });
  } else if (isNaN(Date.parse(metadata.createdAt))) {
    errors.push({ field: 'metadata.createdAt', message: 'Invalid created timestamp format' });
  }

  // Updated at validation
  if (!metadata.updatedAt) {
    errors.push({ field: 'metadata.updatedAt', message: 'Updated timestamp is required' });
  } else if (typeof metadata.updatedAt !== 'string') {
    errors.push({ field: 'metadata.updatedAt', message: 'Updated timestamp must be a string' });
  } else if (isNaN(Date.parse(metadata.updatedAt))) {
    errors.push({ field: 'metadata.updatedAt', message: 'Invalid updated timestamp format' });
  }

  // Version validation
  if (!metadata.version) {
    errors.push({ field: 'metadata.version', message: 'Version is required' });
  } else if (typeof metadata.version !== 'string') {
    errors.push({ field: 'metadata.version', message: 'Version must be a string' });
  }

  return errors;
}
