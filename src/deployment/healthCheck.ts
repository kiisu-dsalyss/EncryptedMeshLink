/**
 * Health Check System
 * Validates system health before and after updates
 */

import { execPromise } from './execPromise';
import { logInfo, logError, logWarning } from '../common';

export interface HealthCheckResult {
  healthy: boolean;
  checks: {
    tests: boolean;
    services: boolean;
    connectivity: boolean;
  };
  errors: string[];
}

/**
 * Run comprehensive health checks on the system
 */
export async function runHealthCheck(repoPath: string): Promise<HealthCheckResult> {
  const result: HealthCheckResult = {
    healthy: false,
    checks: {
      tests: false,
      services: false,
      connectivity: false
    },
    errors: []
  };

  try {
    logInfo('Health Check', 'Starting comprehensive system health check');

    // Check 1: Run all tests
    result.checks.tests = await checkTests(repoPath);
    if (!result.checks.tests) {
      result.errors.push('Test suite failed');
    }

    // Check 2: Verify services are responsive
    result.checks.services = await checkServices(repoPath);
    if (!result.checks.services) {
      result.errors.push('Core services not responding');
    }

    // Check 3: Test network connectivity
    result.checks.connectivity = await checkConnectivity();
    if (!result.checks.connectivity) {
      result.errors.push('Network connectivity issues');
    }

    result.healthy = result.checks.tests && result.checks.services && result.checks.connectivity;

    if (result.healthy) {
      logInfo('Health Check', 'All health checks passed ✅');
    } else {
      logWarning('Health Check', `Failed checks: ${result.errors.join(', ')}`);
    }

    return result;
  } catch (error) {
    logError('Health Check', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return result;
  }
}

/**
 * Run the test suite and verify all tests pass
 */
async function checkTests(repoPath: string): Promise<boolean> {
  try {
    logInfo('Health Check', 'Running test suite...');
    await execPromise('npm test', { cwd: repoPath, timeout: 120000 }); // 2 minute timeout
    logInfo('Health Check', 'All tests passed ✅');
    return true;
  } catch (error) {
    logError('Health Check', 'Test suite failed', error);
    return false;
  }
}

/**
 * Check if core services are running and responsive
 */
async function checkServices(repoPath: string): Promise<boolean> {
  try {
    logInfo('Health Check', 'Checking core services...');
    
    // Try to import and verify core modules can load
    await execPromise('node -e "require(\'./src/config/manager.js\')"', { cwd: repoPath });
    await execPromise('node -e "require(\'./src/crypto/index.js\')"', { cwd: repoPath });
    
    logInfo('Health Check', 'Core services responsive ✅');
    return true;
  } catch (error) {
    logError('Health Check', 'Core services check failed', error);
    return false;
  }
}

/**
 * Test basic network connectivity
 */
async function checkConnectivity(): Promise<boolean> {
  try {
    logInfo('Health Check', 'Testing network connectivity...');
    
    // Simple connectivity test - ping a reliable service
    await execPromise('ping -c 1 8.8.8.8', { timeout: 10000 });
    
    logInfo('Health Check', 'Network connectivity verified ✅');
    return true;
  } catch (error) {
    logError('Health Check', 'Network connectivity failed', error);
    return false;
  }
}
