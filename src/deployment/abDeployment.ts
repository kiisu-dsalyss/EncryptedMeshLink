/**
 * A/B Deployment Manager
 * Handles safe deployment with rollback capability
 */

import { pullLatestCode } from './gitPull';
import { runHealthCheck } from './healthCheck';
import { execPromise } from './execPromise';
import { logInfo, logError, logWarning, getCurrentTimestamp } from '../common';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface DeploymentResult {
  success: boolean;
  deployed: boolean;
  version?: string;
  rollbackAvailable: boolean;
  error?: string;
}

export interface DeploymentPaths {
  current: string;    // Currently running version (A)
  staging: string;    // New version being tested (B)
  backup: string;     // Previous version backup
}

/**
 * Execute A/B deployment with automatic rollback on failure
 */
export async function executeABDeployment(basePath: string, branch: string = 'master'): Promise<DeploymentResult> {
  const paths = getDeploymentPaths(basePath);
  
  try {
    logInfo('A/B Deployment', 'Starting safe deployment process');

    // Step 1: Pull latest code to staging area
    const pullResult = await pullLatestCode(paths.staging, branch);
    if (!pullResult.success) {
      return {
        success: false,
        deployed: false,
        rollbackAvailable: false,
        error: `Git pull failed: ${pullResult.error}`
      };
    }

    if (!pullResult.hasChanges) {
      logInfo('A/B Deployment', 'No changes to deploy');
      return {
        success: true,
        deployed: false,
        rollbackAvailable: await backupExists(paths.backup)
      };
    }

    // Step 2: Install dependencies in staging
    logInfo('A/B Deployment', 'Installing dependencies in staging area');
    await execPromise('npm ci', { cwd: paths.staging });

    // Step 3: Run health checks on staging version
    logInfo('A/B Deployment', 'Running health checks on new version');
    const healthResult = await runHealthCheck(paths.staging);
    
    if (!healthResult.healthy) {
      logWarning('A/B Deployment', `Health checks failed: ${healthResult.errors.join(', ')}`);
      return {
        success: false,
        deployed: false,
        rollbackAvailable: await backupExists(paths.backup),
        error: `Health checks failed: ${healthResult.errors.join(', ')}`
      };
    }

    // Step 4: Create backup of current version
    await createBackup(paths.current, paths.backup);

    // Step 5: Switch to new version (atomic operation)
    await switchVersions(paths.current, paths.staging);

    logInfo('A/B Deployment', `Successfully deployed version ${pullResult.newCommit?.slice(0, 7)} ✅`);

    return {
      success: true,
      deployed: true,
      version: pullResult.newCommit,
      rollbackAvailable: true
    };

  } catch (error) {
    logError('A/B Deployment', error);
    
    // Attempt automatic rollback if we have a backup
    if (await backupExists(paths.backup)) {
      logWarning('A/B Deployment', 'Attempting automatic rollback');
      await rollbackToPrevious(paths.current, paths.backup);
    }

    return {
      success: false,
      deployed: false,
      rollbackAvailable: await backupExists(paths.backup),
      error: error instanceof Error ? error.message : 'Unknown deployment error'
    };
  }
}

/**
 * Get deployment paths for A/B system
 */
function getDeploymentPaths(basePath: string): DeploymentPaths {
  return {
    current: path.join(basePath, 'current'),
    staging: path.join(basePath, 'staging'),
    backup: path.join(basePath, 'backup')
  };
}

/**
 * Create backup of current version
 */
async function createBackup(currentPath: string, backupPath: string): Promise<void> {
  logInfo('A/B Deployment', 'Creating backup of current version');
  
  // Remove old backup if exists
  try {
    await fs.rm(backupPath, { recursive: true, force: true });
  } catch {
    // Ignore if backup doesn't exist
  }

  // Copy current to backup
  await execPromise(`cp -r "${currentPath}" "${backupPath}"`);
}

/**
 * Atomically switch versions
 */
async function switchVersions(currentPath: string, stagingPath: string): Promise<void> {
  logInfo('A/B Deployment', 'Switching to new version');
  
  const tempPath = `${currentPath}.temp.${getCurrentTimestamp()}`;
  
  // Move current to temp location
  await execPromise(`mv "${currentPath}" "${tempPath}"`);
  
  try {
    // Move staging to current
    await execPromise(`mv "${stagingPath}" "${currentPath}"`);
    
    // Remove old version
    await fs.rm(tempPath, { recursive: true, force: true });
  } catch (error) {
    // Rollback on failure
    await execPromise(`mv "${tempPath}" "${currentPath}"`);
    throw error;
  }
}

/**
 * Rollback to previous version
 */
async function rollbackToPrevious(currentPath: string, backupPath: string): Promise<void> {
  logWarning('A/B Deployment', 'Rolling back to previous version');
  
  // Remove failed current version
  await fs.rm(currentPath, { recursive: true, force: true });
  
  // Restore from backup
  await execPromise(`mv "${backupPath}" "${currentPath}"`);
  
  logInfo('A/B Deployment', 'Rollback completed');
}

/**
 * Check if backup exists
 */
async function backupExists(backupPath: string): Promise<boolean> {
  try {
    await fs.access(backupPath);
    return true;
  } catch {
    return false;
  }
}
