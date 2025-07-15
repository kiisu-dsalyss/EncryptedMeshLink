/**
 * Auto-Update Scheduler
 * Manages hourly update checks with A/B deployment
 */

import { executeABDeployment } from './abDeployment';
import { logInfo, logError, getCurrentTimestamp } from '../common';

export interface UpdateSchedulerConfig {
  repoPath: string;
  branch: string;
  intervalHours: number;
  enabled: boolean;
}

export class UpdateScheduler {
  private config: UpdateSchedulerConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(config: UpdateSchedulerConfig) {
    this.config = config;
  }

  /**
   * Start the automatic update scheduler
   */
  start(): void {
    if (!this.config.enabled) {
      logInfo('Update Scheduler', 'Auto-updates disabled');
      return;
    }

    if (this.intervalId) {
      logInfo('Update Scheduler', 'Scheduler already running');
      return;
    }

    const intervalMs = this.config.intervalHours * 60 * 60 * 1000;
    
    logInfo('Update Scheduler', `Starting auto-update scheduler (every ${this.config.intervalHours}h)`);
    
    // Run initial check after startup delay
    setTimeout(() => this.performUpdate(), 30000); // 30 second delay
    
    // Schedule recurring updates
    this.intervalId = setInterval(() => this.performUpdate(), intervalMs);
  }

  /**
   * Stop the automatic update scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logInfo('Update Scheduler', 'Auto-update scheduler stopped');
    }
  }

  /**
   * Perform a single update check and deployment
   */
  private async performUpdate(): Promise<void> {
    if (this.isRunning) {
      logInfo('Update Scheduler', 'Update already in progress, skipping');
      return;
    }

    this.isRunning = true;
    
    try {
      logInfo('Update Scheduler', 'Checking for updates...');
      
      const result = await executeABDeployment(this.config.repoPath, this.config.branch);
      
      if (result.success && result.deployed) {
        logInfo('Update Scheduler', `Successfully deployed new version ${result.version?.slice(0, 7)} ✅`);
      } else if (result.success && !result.deployed) {
        logInfo('Update Scheduler', 'No updates available');
      } else {
        logError('Update Scheduler', `Update failed: ${result.error}`);
      }
    } catch (error) {
      logError('Update Scheduler', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check if scheduler is currently running
   */
  isSchedulerActive(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Check if an update is currently in progress
   */
  isUpdateInProgress(): boolean {
    return this.isRunning;
  }
}
