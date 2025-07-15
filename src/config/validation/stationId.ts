/**
 * Station ID Validation
 * Validates station identifier format and constraints
 */

import { ConfigValidationError } from './types';
import { VALIDATION_PATTERNS, VALIDATION_RANGES } from '../../common/constants';
import { validateStringLength } from '../../common/validation';

export function validateStationId(stationId: any): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!stationId) {
    errors.push({ field: 'stationId', message: 'Station ID is required' });
    return errors;
  }

  const lengthValidation = validateStringLength(
    stationId, 
    VALIDATION_RANGES.STATION_ID_LENGTH.min, 
    VALIDATION_RANGES.STATION_ID_LENGTH.max, 
    'Station ID'
  );
  
  if (!lengthValidation.isValid) {
    errors.push({ field: 'stationId', message: lengthValidation.error! });
    return errors;
  }

  // Station ID format: 3-20 characters, alphanumeric + dash
  if (!VALIDATION_PATTERNS.STATION_ID.test(stationId)) {
    errors.push({
      field: 'stationId',
      message: 'Station ID must be 3-20 characters, alphanumeric and dash only'
    });
  }

  // Cannot start or end with dash
  if (stationId.startsWith('-') || stationId.endsWith('-')) {
    errors.push({
      field: 'stationId',
      message: 'Station ID cannot start or end with dash'
    });
  }

  return errors;
}
