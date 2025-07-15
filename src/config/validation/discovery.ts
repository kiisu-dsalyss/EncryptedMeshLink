/**
 * Discovery Configuration Validation
 * Validates discovery service configuration
 */

import { ConfigValidationError } from './types';
import { validateUrl, validateDiscoveryTimeout, validateDiscoveryCheckInterval } from '../../common/validation';

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
    const urlValidation = validateUrl(discovery.serviceUrl, 'Service URL');
    if (!urlValidation.isValid) {
      errors.push({ field: 'discovery.serviceUrl', message: urlValidation.error! });
    }
  }

  // Check interval validation
  if (discovery.checkInterval === undefined || discovery.checkInterval === null) {
    errors.push({ field: 'discovery.checkInterval', message: 'Check interval is required' });
  } else {
    const intervalValidation = validateDiscoveryCheckInterval(discovery.checkInterval);
    if (!intervalValidation.isValid) {
      errors.push({
        field: 'discovery.checkInterval',
        message: intervalValidation.error!
      });
    }
  }

  // Timeout validation
  if (discovery.timeout === undefined || discovery.timeout === null) {
    errors.push({ field: 'discovery.timeout', message: 'Timeout is required' });
  } else {
    const timeoutValidation = validateDiscoveryTimeout(discovery.timeout);
    if (!timeoutValidation.isValid) {
      errors.push({
        field: 'discovery.timeout',
        message: timeoutValidation.error!
      });
    }
  }

  return errors;
}
