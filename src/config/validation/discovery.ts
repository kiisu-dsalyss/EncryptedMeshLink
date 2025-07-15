/**
 * Discovery Configuration Validation
 * Validates discovery service configuration
 */

import { ConfigValidationError } from './types';

export function validateDiscovery(discovery: any): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];

  if (!discovery || typeof discovery !== 'object') {
    errors.push({ field: 'discovery', message: 'Discovery configuration is required' });
    return errors;
  }

  // Service URL validation
  if (!discovery.serviceUrl) {
    errors.push({ field: 'discovery.serviceUrl', message: 'Discovery service URL is required' });
  } else if (typeof discovery.serviceUrl !== 'string') {
    errors.push({ field: 'discovery.serviceUrl', message: 'Service URL must be a string' });
  } else {
    try {
      new URL(discovery.serviceUrl);
    } catch {
      errors.push({ field: 'discovery.serviceUrl', message: 'Invalid URL format' });
    }
  }

  // Check interval validation
  if (discovery.checkInterval === undefined || discovery.checkInterval === null) {
    errors.push({ field: 'discovery.checkInterval', message: 'Check interval is required' });
  } else if (!Number.isInteger(discovery.checkInterval) || discovery.checkInterval < 30 || discovery.checkInterval > 3600) {
    errors.push({
      field: 'discovery.checkInterval',
      message: 'Check interval must be an integer between 30 and 3600 seconds'
    });
  }

  // Timeout validation
  if (discovery.timeout === undefined || discovery.timeout === null) {
    errors.push({ field: 'discovery.timeout', message: 'Timeout is required' });
  } else if (!Number.isInteger(discovery.timeout) || discovery.timeout < 5 || discovery.timeout > 60) {
    errors.push({
      field: 'discovery.timeout',
      message: 'Timeout must be an integer between 5 and 60 seconds'
    });
  }

  return errors;
}
