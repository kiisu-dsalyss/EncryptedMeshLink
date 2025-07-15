/**
 * Common Error Utilities
 * Standardized error handling and creation
 */

/**
 * Create a standardized error for validation failures
 */
export function createValidationError(field: string, message: string, value?: any): Error {
  const error = new Error(`Validation failed for ${field}: ${message}${value !== undefined ? ` (value: ${value})` : ''}`);
  error.name = 'ValidationError';
  return error;
}

/**
 * Create a standardized error for configuration issues
 */
export function createConfigurationError(message: string, details?: any): Error {
  const error = new Error(`Configuration error: ${message}${details ? ` - ${JSON.stringify(details)}` : ''}`);
  error.name = 'ConfigurationError';
  return error;
}

/**
 * Create a standardized error for network/connection issues
 */
export function createNetworkError(message: string, cause?: Error): Error {
  const error = new Error(`Network error: ${message}${cause ? ` - ${cause.message}` : ''}`);
  error.name = 'NetworkError';
  return error;
}

/**
 * Create a standardized error for encryption/crypto issues
 */
export function createCryptoError(operation: string, cause?: Error): Error {
  const error = new Error(`${operation} failed${cause ? `: ${cause.message}` : ''}`);
  error.name = 'CryptoError';
  return error;
}

/**
 * Create a standardized error for device/hardware issues
 */
export function createDeviceError(message: string, details?: any): Error {
  const error = new Error(`Device error: ${message}${details ? ` - ${JSON.stringify(details)}` : ''}`);
  error.name = 'DeviceError';
  return error;
}
