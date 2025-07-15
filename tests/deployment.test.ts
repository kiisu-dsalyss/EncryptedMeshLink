/**
 * Deployment System Tests
 * Test the A/B deployment functionality locally
 */

import { executeABDeployment } from '../src/deployment/abDeployment';
import { pullLatestCode } from '../src/deployment/gitPull';
import { runHealthCheck } from '../src/deployment/healthCheck';
import { UpdateScheduler } from '../src/deployment/updateScheduler';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Deployment System', () => {
  let testDir: string;
  let mockRepoPath: string;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'eml-deploy-test-'));
    mockRepoPath = path.join(testDir, 'mock-repo');
    
    // Create mock repository structure
    await fs.mkdir(mockRepoPath, { recursive: true });
    await createMockRepo(mockRepoPath);
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Git Pull Operations', () => {
    test('should detect when no changes are available', async () => {
      const result = await pullLatestCode(mockRepoPath);
      
      expect(result.success).toBe(true);
      expect(result.hasChanges).toBe(false);
    });

    test('should handle git pull errors gracefully', async () => {
      const nonExistentPath = path.join(testDir, 'nonexistent');
      const result = await pullLatestCode(nonExistentPath);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Health Check System', () => {
    test('should run health checks on valid project', async () => {
      // Use current project directory for health check test
      const result = await runHealthCheck(process.cwd());
      
      expect(result.healthy).toBe(true);
      expect(result.checks.tests).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail health checks on invalid project', async () => {
      const result = await runHealthCheck(mockRepoPath);
      
      expect(result.healthy).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Update Scheduler', () => {
    test('should create and start scheduler', () => {
      const scheduler = new UpdateScheduler({
        repoPath: mockRepoPath,
        branch: 'master',
        intervalHours: 1,
        enabled: true
      });

      expect(scheduler.isSchedulerActive()).toBe(false);
      
      scheduler.start();
      expect(scheduler.isSchedulerActive()).toBe(true);
      
      scheduler.stop();
      expect(scheduler.isSchedulerActive()).toBe(false);
    });

    test('should handle disabled scheduler', () => {
      const scheduler = new UpdateScheduler({
        repoPath: mockRepoPath,
        branch: 'master',
        intervalHours: 1,
        enabled: false
      });

      scheduler.start();
      expect(scheduler.isSchedulerActive()).toBe(false);
    });
  });

  describe('A/B Deployment', () => {
    test('should handle deployment with no changes', async () => {
      const result = await executeABDeployment(mockRepoPath);
      
      expect(result.success).toBe(true);
      expect(result.deployed).toBe(false);
    });
  });
});

/**
 * Create a mock git repository for testing
 */
async function createMockRepo(repoPath: string): Promise<void> {
  // Initialize git repo
  const { execPromise } = await import('../src/deployment/execPromise');
  
  try {
    await execPromise('git init', { cwd: repoPath });
    await execPromise('git config user.email "test@example.com"', { cwd: repoPath });
    await execPromise('git config user.name "Test User"', { cwd: repoPath });
    
    // Create basic files
    await fs.writeFile(path.join(repoPath, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      scripts: {
        test: 'echo "No tests"'
      }
    }, null, 2));
    
    await fs.writeFile(path.join(repoPath, 'README.md'), '# Test Project');
    
    // Initial commit
    await execPromise('git add .', { cwd: repoPath });
    await execPromise('git commit -m "Initial commit"', { cwd: repoPath });
  } catch (error) {
    console.log('Mock repo creation failed (expected in CI):', error);
  }
}
