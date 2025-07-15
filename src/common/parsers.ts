/**
 * Common Parser Utilities
 * Shared parsing and formatting functions
 */

/**
 * Safely parse an integer with fallback
 */
export function parseIntSafe(value: string | undefined, defaultValue: number, radix: number = 10): number {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  const parsed = parseInt(value, radix);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse target identifier (could be node ID or node name)
 */
export function parseTargetIdentifier(targetIdentifier: string): { isNumeric: boolean; value: number | string } {
  const numericValue = parseInt(targetIdentifier, 10);
  
  if (!isNaN(numericValue)) {
    return { isNumeric: true, value: numericValue };
  }
  
  return { isNumeric: false, value: targetIdentifier };
}

/**
 * Extract numeric ID from string (useful for peer processing)
 */
export function extractNumericId(input: string, fallbackRange: { min: number; max: number } = { min: 0, max: 999999 }): number {
  const numericPart = input.replace(/\D/g, '');
  const parsed = parseInt(numericPart, 10);
  
  if (!isNaN(parsed) && parsed > 0) {
    return parsed;
  }
  
  // Generate fallback ID within range
  return Math.floor(Math.random() * (fallbackRange.max - fallbackRange.min + 1)) + fallbackRange.min;
}

/**
 * Format baud rates list for error messages
 */
export function formatBaudRatesList(baudRates: number[]): string {
  return baudRates.join(', ');
}
