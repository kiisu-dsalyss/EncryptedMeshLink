/**
 * Display Name Validation
 * Validates station display name format and constraints
 */

import { ConfigValidationError } from './types';
import { VALIDATION_RANGES } from '../../common/constants';
import { validateStringLength } from '../../common/validation';

export function validateDisplayName(displayName: any): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  const lengthValidation = validateStringLength(
    displayName,
    VALIDATION_RANGES.DISPLAY_NAME_LENGTH.min,
    VALIDATION_RANGES.DISPLAY_NAME_LENGTH.max,
    'Display name'
  );

  if (!lengthValidation.isValid) {
    errors.push({ field: 'displayName', message: lengthValidation.error! });
  }

  return errors;
}
