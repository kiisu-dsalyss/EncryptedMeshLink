/**
 * Common Logging Utilities
 * Standardized logging functions for consistent error handling and debugging
 */

export function logError(context: string, error: Error | unknown, details?: any): void {
  console.error(`❌ ${context}:`, error);
  if (details) {
    console.error('Error details:', JSON.stringify(details, null, 2));
  }
}

export function logWarning(context: string, message: string, details?: any): void {
  console.warn(`⚠️ ${context}: ${message}`);
  if (details) {
    console.warn('Warning details:', JSON.stringify(details, null, 2));
  }
}

export function logInfo(context: string, message: string, details?: any): void {
  console.log(`ℹ️ ${context}: ${message}`);
  if (details) {
    console.log('Info details:', JSON.stringify(details, null, 2));
  }
}

export function logSuccess(context: string, message: string, details?: any): void {
  console.log(`✅ ${context}: ${message}`);
  if (details) {
    console.log('Success details:', JSON.stringify(details, null, 2));
  }
}

export function logDebug(context: string, message: string, details?: any): void {
  if (process.env.DEBUG || process.env.EML_DEBUG) {
    console.log(`🔍 ${context}: ${message}`);
    if (details) {
      console.log('Debug details:', JSON.stringify(details, null, 2));
    }
  }
}
