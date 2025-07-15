/**
 * Test Utilities
 * Helper functions for test isolation and resource management
 */

import { createServer } from 'net';

/**
 * Find an available port for testing
 */
export async function findAvailablePort(startPort: number = 8000): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    
    server.listen(0, () => {
      const port = (server.address() as any)?.port;
      server.close(() => {
        if (port) {
          resolve(port);
        } else {
          reject(new Error('Could not find available port'));
        }
      });
    });
    
    server.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Create a test-specific configuration with unique ports
 */
export async function createTestConfig(baseConfig: any): Promise<any> {
  const port = await findAvailablePort();
  return {
    ...baseConfig,
    localPort: port,
    port: port
  };
}
