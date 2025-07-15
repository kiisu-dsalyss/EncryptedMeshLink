/**
 * Git Pull Operation
 * Handles fetching latest code from repository
 */

import { execPromise } from './execPromise';
import { logInfo, logError } from '../common';

export interface GitPullResult {
  success: boolean;
  hasChanges: boolean;
  newCommit?: string;
  error?: string;
}

/**
 * Pull latest code from git repository
 */
export async function pullLatestCode(repoPath: string, branch: string = 'master'): Promise<GitPullResult> {
  try {
    logInfo('Git Pull', `Fetching latest changes from ${branch}`);
    
    // Get current commit hash
    const currentCommit = await execPromise('git rev-parse HEAD', { cwd: repoPath });
    
    // Fetch latest changes
    await execPromise(`git fetch origin ${branch}`, { cwd: repoPath });
    
    // Get latest remote commit
    const remoteCommit = await execPromise(`git rev-parse origin/${branch}`, { cwd: repoPath });
    
    const hasChanges = currentCommit.trim() !== remoteCommit.trim();
    
    if (!hasChanges) {
      logInfo('Git Pull', 'No new changes available');
      return { success: true, hasChanges: false };
    }
    
    // Pull the changes
    await execPromise(`git pull origin ${branch}`, { cwd: repoPath });
    
    logInfo('Git Pull', `Successfully pulled changes: ${currentCommit.slice(0, 7)} → ${remoteCommit.slice(0, 7)}`);
    
    return {
      success: true,
      hasChanges: true,
      newCommit: remoteCommit.trim()
    };
  } catch (error) {
    logError('Git Pull', error);
    return {
      success: false,
      hasChanges: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
