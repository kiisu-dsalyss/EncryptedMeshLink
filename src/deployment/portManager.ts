/**
 * Port Manager
 * Handles network port availability checking and fallback logic for deployment
 */

import { createServer } from 'net';

export interface PortConfig {
  p2pPort: number;
  webPort: number;
}

export interface PortCheckResult {
  port: number;
  available: boolean;
  service?: string;
}

/**
 * Check if a specific port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    
    server.on('error', () => resolve(false));
  });
}

/**
 * Find the next available port starting from a given port
 */
export async function findAvailablePort(startPort: number, maxTries: number = 10): Promise<number> {
  for (let port = startPort; port < startPort + maxTries; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found in range ${startPort}-${startPort + maxTries - 1}`);
}

/**
 * Check multiple ports and return their availability status
 */
export async function checkPorts(ports: number[]): Promise<PortCheckResult[]> {
  const results: PortCheckResult[] = [];
  
  for (const port of ports) {
    const available = await isPortAvailable(port);
    results.push({
      port,
      available,
      service: available ? undefined : 'Unknown service'
    });
  }
  
  return results;
}

/**
 * Find available ports for P2P and web interfaces with fallback logic
 */
export async function findDeploymentPorts(
  preferredP2P: number = 8447,
  preferredWeb: number = 3000
): Promise<PortConfig> {
  console.log('🔍 Checking port availability...');
  
  // Check preferred ports first
  const portChecks = await checkPorts([preferredP2P, preferredWeb]);
  
  let p2pPort = preferredP2P;
  let webPort = preferredWeb;
  
  // Find P2P port
  if (!portChecks[0].available) {
    console.log(`⚠️  Preferred P2P port ${preferredP2P} is in use, finding alternative...`);
    try {
      p2pPort = await findAvailablePort(preferredP2P + 1, 20);
      console.log(`✅ Found available P2P port: ${p2pPort}`);
    } catch (error) {
      // Try a different range
      p2pPort = await findAvailablePort(8450, 50);
      console.log(`✅ Found available P2P port: ${p2pPort}`);
    }
  } else {
    console.log(`✅ P2P port ${preferredP2P} is available`);
  }
  
  // Find Web port
  if (!portChecks[1].available) {
    console.log(`⚠️  Preferred web port ${preferredWeb} is in use, finding alternative...`);
    try {
      webPort = await findAvailablePort(preferredWeb + 1, 20);
      console.log(`✅ Found available web port: ${webPort}`);
    } catch (error) {
      // Try a different range
      webPort = await findAvailablePort(3010, 50);
      console.log(`✅ Found available web port: ${webPort}`);
    }
  } else {
    console.log(`✅ Web port ${preferredWeb} is available`);
  }
  
  return { p2pPort, webPort };
}

/**
 * Get commonly used ports by services for conflict detection
 */
export function getCommonServicePorts(): { [port: number]: string } {
  return {
    80: 'HTTP',
    443: 'HTTPS',
    22: 'SSH',
    21: 'FTP',
    25: 'SMTP',
    53: 'DNS',
    110: 'POP3',
    143: 'IMAP',
    993: 'IMAPS',
    995: 'POP3S',
    3000: 'Development server',
    3306: 'MySQL',
    5432: 'PostgreSQL',
    6379: 'Redis',
    8080: 'HTTP Proxy',
    8443: 'HTTPS Proxy',
    8447: 'EncryptedMeshLink P2P'
  };
}

/**
 * Display port status information
 */
export function displayPortInfo(config: PortConfig): void {
  console.log('\n🌐 Network Configuration:');
  console.log('========================');
  console.log(`📡 P2P Communication: Port ${config.p2pPort}`);
  console.log(`🌍 Web Interface: Port ${config.webPort}`);
  
  if (config.p2pPort !== 8447 || config.webPort !== 3000) {
    console.log('\n📝 Note: Using alternative ports due to conflicts');
    console.log('   Your configuration has been automatically updated');
  }
}