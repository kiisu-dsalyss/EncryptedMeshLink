/**
 * Common String Utilities
 * Standardized functions for string operations and formatting
 */

/**
 * Safely truncate a string with ellipsis
 */
export function truncateString(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Extract numeric characters from a string
 */
export function extractNumericString(input: string): string {
  return input.replace(/\D/g, '');
}

/**
 * Convert value to string safely
 */
export function toStringSafe(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * Convert to base64 string
 */
export function toBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Convert to hex string
 */
export function toHex(buffer: Buffer): string {
  return buffer.toString('hex');
}

/**
 * Get last N characters of a string (useful for IDs)
 */
export function getLastChars(str: string, count: number): string {
  return str.slice(-count);
}

/**
 * Replace multiple placeholders in a template string
 */
export function replacePlaceholders(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  }
  return result;
}
