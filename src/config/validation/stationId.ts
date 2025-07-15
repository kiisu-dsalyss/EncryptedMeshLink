/**
 * Station ID Validation
 * Validates station identifier format and constraints
 */

import { ConfigValidationError } from './types';

export function validateStationId(stationId: any): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!stationId) {
    errors.push({ field: 'stationId', message: 'Station ID is required' });
    return errors;
  }

  if (typeof stationId !== 'string') {
    errors.push({ field: 'stationId', message: 'Station ID must be a string' });
    return errors;
  }

  // Station ID format: 3-20 characters, alphanumeric + dash
  const stationIdRegex = /^[a-zA-Z0-9-]{3,20}$/;
  if (!stationIdRegex.test(stationId)) {
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
