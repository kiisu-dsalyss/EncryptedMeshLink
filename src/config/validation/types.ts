/**
 * Validation Types
 * Common types for configuration validation
 */

export interface ConfigValidationError {
  field: string;
  message: string;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
}
