/**
 * Display Name Validation
 * Validates station display name format and constraints
 */

import { ConfigValidationError } from './types';

export function validateDisplayName(displayName: any): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!displayName) {
    errors.push({ field: 'displayName', message: 'Display name is required' });
    return errors;
  }

  if (typeof displayName !== 'string') {
    errors.push({ field: 'displayName', message: 'Display name must be a string' });
    return errors;
  }

  if (displayName.length < 1 || displayName.length > 100) {
    errors.push({
      field: 'displayName',
      message: 'Display name must be 1-100 characters'
    });
  }

  return errors;
}
