/**
 * Startup Port Manager
 * Handles port conflicts during application startup and provides fallback ports
 */

import { isPortAvailable, findAvailablePort, displayPortInfo, type PortConfig } from './portManager';
import { StationConfigManager } from '../config/manager';
import { envConfig } from '../config/env';
import { logInfo, logWarning, logError } from '../common/logging';

export interface StartupPortResult {
  config: PortConfig;
  configUpdated: boolean;
  warnings: string[];
}

/**
 * Check and resolve port conflicts during application startup
 */
export async function resolveStartupPorts(): Promise<StartupPortResult> {
  const warnings: string[] = [];
  let configUpdated = false;
  
  logInfo('Startup', 'Checking port availability...');
  
  // Get current configuration
  const envConfigValues = envConfig.getConfig();
  const preferredP2P = envConfigValues.p2p.listenPort;
  
  // Default web port (this might be configurable in the future)
  const preferredWeb = 3000;
  
  let p2pPort = preferredP2P;
  let webPort = preferredWeb;
  
  // Check P2P port
  if (!(await isPortAvailable(preferredP2P))) {
    logWarning('Startup', `P2P port ${preferredP2P} is already in use`);
    warnings.push(`Preferred P2P port ${preferredP2P} was already in use`);
    
    try {
      p2pPort = await findAvailablePort(preferredP2P + 1, 20);
      logInfo('Startup', `Found alternative P2P port: ${p2pPort}`);
      configUpdated = true;
    } catch (error) {
      // Try a completely different range
      try {
        p2pPort = await findAvailablePort(8450, 50);
        logInfo('Startup', `Found alternative P2P port in backup range: ${p2pPort}`);
        configUpdated = true;
      } catch (fallbackError) {
        logError('Startup', 'Could not find any available P2P ports', fallbackError);
        throw new Error('No available P2P ports found. Please free up some ports or specify a different port range.');
      }
    }
  } else {
    logInfo('Startup', `P2P port ${preferredP2P} is available`);
  }
  
  // Check web port (if web interface is enabled)
  if (!(await isPortAvailable(preferredWeb))) {
    logWarning('Startup', `Web port ${preferredWeb} is already in use`);
    warnings.push(`Preferred web port ${preferredWeb} was already in use`);
    
    try {
      webPort = await findAvailablePort(preferredWeb + 1, 20);
      logInfo('Startup', `Found alternative web port: ${webPort}`);
    } catch (error) {
      // Try a different range
      try {
        webPort = await findAvailablePort(3010, 50);
        logInfo('Startup', `Found alternative web port in backup range: ${webPort}`);
      } catch (fallbackError) {
        logWarning('Startup', 'Could not find available web port, web interface may not be available');
        warnings.push('Web interface may not be available due to port conflicts');
        // Don't fail startup for web port issues
      }
    }
  } else {
    logInfo('Startup', `Web port ${preferredWeb} is available`);
  }
  
  const config: PortConfig = { p2pPort, webPort };
  
  // Update environment configuration if needed
  if (configUpdated && p2pPort !== preferredP2P) {
    try {
      // Update the environment configuration
      process.env.ENCRYPTEDMESHLINK_P2P_LISTEN_PORT = p2pPort.toString();
      logInfo('Startup', `Updated P2P listen port configuration to ${p2pPort}`);
    } catch (error) {
      logWarning('Startup', 'Could not update port configuration', error);
    }
  }
  
  // Display port information
  displayPortInfo(config);
  
  if (warnings.length > 0) {
    logWarning('Startup', 'Port configuration warnings:', warnings);
  }
  
  return {
    config,
    configUpdated,
    warnings
  };
}

/**
 * Update configuration files with new port settings
 * This updates any persistent configuration files to reflect port changes
 */
export async function updateConfigWithPorts(config: PortConfig): Promise<void> {
  try {
    const configManager = new StationConfigManager();
    const currentConfig = await configManager.loadConfig();
    
    if (currentConfig && currentConfig.p2p.listenPort !== config.p2pPort) {
      currentConfig.p2p.listenPort = config.p2pPort;
      currentConfig.metadata.updatedAt = new Date().toISOString();
      
      await configManager.saveConfig(currentConfig);
      logInfo('Startup', `Updated configuration file with P2P port ${config.p2pPort}`);
    }
  } catch (error) {
    logWarning('Startup', 'Could not update configuration file with new ports', error);
  }
}

/**
 * Get port information for external services (like Docker)
 */
export function getPortEnvironment(config: PortConfig): { [key: string]: string } {
  return {
    ENCRYPTEDMESHLINK_P2P_LISTEN_PORT: config.p2pPort.toString(),
    ENCRYPTEDMESHLINK_WEB_PORT: config.webPort.toString(),
    P2P_PORT: config.p2pPort.toString(),
    WEB_PORT: config.webPort.toString()
  };
}