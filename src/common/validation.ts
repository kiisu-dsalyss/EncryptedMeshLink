/**
 * Common Validation Utilities
 * Shared validation functions used throughout the application
 */

import { VALIDATION_RANGES, PORT_RANGES } from './constants';

/**
 * Validate that a number is an integer within a specified range
 */
export function validateIntegerRange(
  value: any,
  min: number,
  max: number,
  fieldName: string
): { isValid: boolean; error?: string } {
  if (value === undefined || value === null) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (!Number.isInteger(value)) {
    return { isValid: false, error: `${fieldName} must be an integer` };
  }

  if (value < min || value > max) {
    return { isValid: false, error: `${fieldName} must be between ${min} and ${max}` };
  }

  return { isValid: true };
}

/**
 * Validate port number
 */
export function validatePort(port: any, fieldName: string = 'Port'): { isValid: boolean; error?: string } {
  return validateIntegerRange(port, PORT_RANGES.MIN_USER_PORT, PORT_RANGES.MAX_PORT, fieldName);
}

/**
 * Validate discovery timeout
 */
export function validateDiscoveryTimeout(timeout: any): { isValid: boolean; error?: string } {
  const range = VALIDATION_RANGES.DISCOVERY_TIMEOUT;
  return validateIntegerRange(timeout, range.min, range.max, 'Timeout must be an integer between 5 and 300 seconds');
}

/**
 * Validate discovery check interval
 */
export function validateDiscoveryCheckInterval(interval: any): { isValid: boolean; error?: string } {
  const range = VALIDATION_RANGES.DISCOVERY_CHECK_INTERVAL;
  return validateIntegerRange(interval, range.min, range.max, 'Check interval must be an integer between 30 and 3600 seconds');
}

/**
 * Validate P2P max connections
 */
export function validateP2PMaxConnections(connections: any): { isValid: boolean; error?: string } {
  const range = VALIDATION_RANGES.P2P_MAX_CONNECTIONS;
  return validateIntegerRange(connections, range.min, range.max, 'Max connections must be an integer between 1 and 100');
}

/**
 * Validate P2P connection timeout
 */
export function validateP2PConnectionTimeout(timeout: any): { isValid: boolean; error?: string } {
  const range = VALIDATION_RANGES.P2P_CONNECTION_TIMEOUT;
  return validateIntegerRange(timeout, range.min, range.max, 'Connection timeout must be an integer between 5 and 300 seconds');
}

/**
 * Validate URL format
 */
export function validateUrl(url: any, fieldName: string = 'URL'): { isValid: boolean; error?: string } {
  if (!url) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (typeof url !== 'string') {
    return { isValid: false, error: `${fieldName} must be a string` };
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: `Invalid ${fieldName} format` };
  }
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: any,
  min: number,
  max: number,
  fieldName: string
): { isValid: boolean; error?: string } {
  if (!value) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (typeof value !== 'string') {
    return { isValid: false, error: `${fieldName} must be a string` };
  }

  if (value.length < min || value.length > max) {
    return { isValid: false, error: `${fieldName} must be ${min}-${max} characters` };
  }

  return { isValid: true };
}

/**
 * Validate timestamp format
 */
export function validateTimestamp(timestamp: any, fieldName: string): { isValid: boolean; error?: string } {
  if (!timestamp) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (typeof timestamp !== 'string') {
    return { isValid: false, error: `${fieldName} must be a string` };
  }

  if (isNaN(Date.parse(timestamp))) {
    return { isValid: false, error: `Invalid ${fieldName} format` };
  }

  return { isValid: true };
}
