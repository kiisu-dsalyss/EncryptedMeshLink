/**
 * Promise-based Command Execution
 * Wrapper for executing shell commands with proper error handling
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ExecOptions {
  cwd?: string;
  timeout?: number;
  env?: NodeJS.ProcessEnv;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/**
 * Execute a shell command and return a promise
 */
export async function execPromise(command: string, options: ExecOptions = {}): Promise<string> {
  const result = await execAsync(command, {
    timeout: options.timeout || 30000,
    cwd: options.cwd,
    env: { ...process.env, ...options.env }
  });
  
  return result.stdout.trim();
}
