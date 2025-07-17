import { MeshDevice } from "@jsr/meshtastic__core";
import { TransportNodeSerial } from "./src/transport/index";
import { NodeManager } from "./src/nodeManager";
import { MessageParser } from "./src/messageParser";
import { ConfigCLI } from "./src/configCLI";
import { CryptoService } from "./src/crypto/index";
import { parseIntSafe } from "./src/common/parsers";
import { UpdateScheduler } from "./src/deployment/updateScheduler";
import { initializeBridge } from "./src/handlers/initializeBridge";
import { stopBridge } from "./src/handlers/stopBridge";
import { handleRelayMessage } from "./src/handlers/handleRelayMessage";
import { handleStatusRequest } from "./src/handlers/handleStatusRequest";
import { handleListNodesRequest } from "./src/handlers/handleListNodesRequest";
import { handleInstructionsRequest } from "./src/handlers/handleInstructionsRequest";
import { handleEchoMessage } from "./src/handlers/handleEchoMessage";
import { registerLocalNodes } from "./src/handlers/registerLocalNodes";
import { handlePeerDiscovered, handlePeerLost, handleDiscoveryError } from "./src/handlers/peerEvents";
import { integrateDelayedDelivery } from "./src/delayedDelivery";
import * as path from 'path';

// Global cleanup state
let globalDiscoveryClient: any = null;
let globalUpdateScheduler: UpdateScheduler | null = null;
let isShuttingDown = false;

/**
 * Comprehensive cleanup function for ALL exit scenarios
 */
async function globalCleanup(reason: string) {
  if (isShuttingDown) {
    console.log(`⚠️ Already shutting down, ignoring ${reason}`);
    return;
  }
  
  isShuttingDown = true;
  console.log(`\n🧹 Starting cleanup due to: ${reason}`);
  
  try {
    // Stop discovery client and all P2P connections
    if (globalDiscoveryClient) {
      console.log("🛑 Stopping discovery client and P2P connections...");
      await stopBridge(globalDiscoveryClient);
      console.log("✅ Bridge services stopped");
    }
    
    // Stop update scheduler
    if (globalUpdateScheduler) {
      console.log("🛑 Stopping update scheduler...");
      globalUpdateScheduler.stop();
      console.log("✅ Update scheduler stopped");
    }
    
    console.log("🧹 Global cleanup completed successfully");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  }
}

// Register comprehensive cleanup handlers for ALL possible exit scenarios
process.on('SIGINT', async () => {
  await globalCleanup('SIGINT (Ctrl+C)');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await globalCleanup('SIGTERM (kill command)');
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('💥 Uncaught Exception:', error);
  await globalCleanup('uncaughtException');
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('💥 Unhandled Promise Rejection at:', promise, 'reason:', reason);
  await globalCleanup('unhandledRejection');
  process.exit(1);
});

process.on('beforeExit', async () => {
  await globalCleanup('beforeExit');
});

process.on('exit', () => {
  if (!isShuttingDown) {
    console.log("🚪 Process exiting without cleanup - this shouldn't happen!");
  }
});

async function main() {
  // Check for command line flags
  const args = process.argv.slice(2);
  
  if (args.includes('--local-testing')) {
    process.env.EML_LOCAL_TESTING = 'true';
    console.log("🏠 Local testing mode enabled");
  }

  // Initialize auto-update scheduler if enabled
  if (args.includes('--auto-update') || process.env.ENCRYPTEDMESHLINK_AUTO_UPDATE === 'true') {
    globalUpdateScheduler = new UpdateScheduler({
      repoPath: process.cwd(),
      branch: process.env.ENCRYPTEDMESHLINK_UPDATE_BRANCH || 'master',
      intervalHours: parseInt(process.env.ENCRYPTEDMESHLINK_UPDATE_INTERVAL_HOURS || '1'),
      enabled: true
    });
    
    globalUpdateScheduler.start();
    console.log("🔄 Auto-update scheduler started");
  }

  console.log("🔍 Looking for Meshtastic device...");
  
  try {
    // Load station configuration
    const fs = await import('fs/promises');
    const configData = await fs.readFile('./encryptedmeshlink-config.json', 'utf-8');
    const config = JSON.parse(configData);
    
    console.log(`🏗️ Loaded configuration for station: ${config.stationId}`);
    
    // Initialize crypto service for P2P messaging
    const crypto = new CryptoService(config);
    console.log("🔐 Crypto service initialized for P2P messaging");
    
    // Create transport and device
    const transport = await TransportNodeSerial.create();
    const device = new MeshDevice(transport);
    let myNodeNum: number | undefined;
    // Create node manager
    const nodeManager = new NodeManager();
    const knownNodes = nodeManager.getKnownNodes();
    const remoteNodes = new Map();
    const cryptoService = new CryptoService();
    let bridgeInitialized = false;

    console.log("🚀 Connected to device, setting up event listeners...");
    console.log("🌉 Initializing EncryptedMeshLink station...");

    // Set up all event listeners BEFORE configuring
    device.events.onMyNodeInfo.subscribe(async (nodeInfo) => {
      try {
        myNodeNum = nodeInfo.myNodeNum;
        console.log(`📱 Station node number: ${myNodeNum}`);
        
        // Initialize bridge services for internet connectivity
        try {
          globalDiscoveryClient = await initializeBridge(
            config,
            (peer) => handlePeerDiscovered(remoteNodes, peer),
            (stationId) => handlePeerLost(remoteNodes, stationId),
            (error) => handleDiscoveryError(error)
          );
          bridgeInitialized = true;
          console.log("🌉 Internet bridge services started successfully");
          
          // Register any existing local nodes with the registry
          await registerLocalNodes(device, knownNodes, config);
        } catch (bridgeError) {
          console.warn("⚠️ Bridge initialization failed, running in local-only mode:", bridgeError);
          // Continue without bridge - local functionality still works
        }
      } catch (error) {
        console.error("❌ Failed to process node info:", error);
      }
    });

    device.events.onDeviceStatus.subscribe((status) => {
      try {
        console.log(`📊 Device status changed: ${status}`);
        if (status === 7) { // DeviceConfigured
          console.log("✅ Device configured successfully!");
          
          // Show available nodes after configuration
          setTimeout(() => {
            nodeManager.showAvailableNodes(myNodeNum);
          }, 3000);
        }
      } catch (error) {
        console.error("❌ Failed to process device status:", error);
      }
    });

    // Listen for node info packets to build node list
    device.events.onNodeInfoPacket.subscribe((nodeInfo) => {
      try {
        nodeManager.addNode(nodeInfo);
      } catch (error) {
        console.warn('⚠️ Failed to process node info packet:', error instanceof Error ? error.message : 'Unknown error');
      }
    });

    // Listen for text messages and handle relay commands
    device.events.onMessagePacket.subscribe(async (packet) => {
      try {
        console.log(`📨 Received message from ${packet.from}: "${packet.data}"`);
        console.log(`🔍 DEBUG: myNodeNum=${myNodeNum}, packet.from=${packet.from}, bridgeInitialized=${bridgeInitialized}`);
        
        // TEMPORARILY DISABLED: Check if it's not from ourselves to avoid infinite loops
        // We'll process all messages for debugging
        const parsedMessage = MessageParser.parseMessage(packet.data);
        console.log(`🔍 DEBUG: Parsed message type: ${parsedMessage.type}, raw data: "${packet.data}"`);
        
        switch (parsedMessage.type) {
          case 'relay':
            // Relay requires bridge to be initialized
            if (bridgeInitialized && parsedMessage.targetIdentifier && parsedMessage.message) {
              await handleRelayMessage(device, knownNodes, remoteNodes, myNodeNum, globalDiscoveryClient, cryptoService, packet, parsedMessage.targetIdentifier, parsedMessage.message);
            } else if (!bridgeInitialized) {
              await device.sendText("❌ Bridge not initialized - relay unavailable", packet.from);
            }
            break;
          case 'status':
            await handleStatusRequest(device, knownNodes, remoteNodes, myNodeNum, globalDiscoveryClient, packet);
            break;
          case 'nodes':
            await handleListNodesRequest(device, knownNodes, remoteNodes, myNodeNum, packet);
            break;
          case 'instructions':
            await handleInstructionsRequest(device, myNodeNum, packet);
            break;
          case 'echo':
            await handleEchoMessage(device, myNodeNum, packet);
            break;
        }
      } catch (error) {
        console.error('❌ Failed to process message packet:', error instanceof Error ? error.message : 'Unknown error');
        // Continue processing other messages instead of crashing
      }
    });

    // Debug: Listen to ALL mesh packets
    device.events.onMeshPacket.subscribe((packet) => {
      try {
        console.log(`🔍 DEBUG: Received mesh packet from ${packet.from} to ${packet.to}`);
      } catch (error) {
        console.warn('⚠️ Failed to process mesh packet:', error instanceof Error ? error.message : 'Unknown error');
      }
    });

    console.log("⚙️ Starting device configuration...");
    
    // Configure the device with timeout handling
    try {
      await device.configure();
      console.log("👂 Device configured, now listening for messages...");
      
      // Initialize delayed delivery system
      const delayedDelivery = integrateDelayedDelivery(device, nodeManager, {
        maxRetries: 3,
        retryInterval: 30000, // 30 seconds
        maxQueueSize: 500,
        deliveryTimeout: 15000 // 15 seconds
      });
      
      console.log("📨 Delayed delivery system initialized");
      
    } catch (configError) {
      // Handle PKI timeout and other config errors gracefully
      if (configError && typeof configError === 'object' && 'error' in configError) {
        console.log(`⚠️ Configuration timeout (error ${configError.error}), but device is likely working. Continuing...`);
      } else {
        console.error("❌ Configuration failed:", configError);
        throw configError; // Re-throw if it's a real failure
      }
    }

    // Give some time for initial configuration
    setTimeout(async () => {
      console.log("🔗 EncryptedMeshLink station ready! Send a message to test bridging!");
      
      // Fallback: Initialize bridge if onMyNodeInfo hasn't fired yet
      if (!bridgeInitialized) {
        console.log("🔄 Node info not received, initializing bridge with fallback...");
        
        try {
          globalDiscoveryClient = await initializeBridge(
            config,
            (peer) => handlePeerDiscovered(remoteNodes, peer),
            (stationId) => handlePeerLost(remoteNodes, stationId),
            (error) => handleDiscoveryError(error)
          );
          bridgeInitialized = true;
          console.log("🌉 Internet bridge services started successfully (fallback mode)");
          await registerLocalNodes(device, knownNodes, config);
        } catch (bridgeError) {
          console.warn("⚠️ Fallback bridge initialization failed, running in local-only mode:", bridgeError);
        }
      }
    }, 2000);

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      
      if (bridgeInitialized && globalDiscoveryClient) {
        try {
          await stopBridge(globalDiscoveryClient);
        } catch (error) {
          console.warn("⚠️ Error during bridge shutdown:", error);
        }
      }
      
      console.log("👋 EncryptedMeshLink stopped");
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Send a heartbeat every 2 minutes to keep connection alive while respecting rate limits
    setInterval(async () => {
      try {
        await device.heartbeat();
        console.log("💓 Heartbeat sent");
      } catch (error) {
        // Handle heartbeat timeouts gracefully
        if (error && typeof error === 'object' && 'error' in error) {
          console.log(`⚠️ Heartbeat timeout (error ${error.error}), connection likely still active`);
        } else {
          console.error("💔 Heartbeat failed:", error);
        }
      }
    }, 120000);

    // Keep the program running
    console.log("🔗 EncryptedMeshLink station is running. Send a message to test bridging!");

  } catch (error) {
    // Handle different types of errors gracefully
    if (error && typeof error === 'object' && 'error' in error) {
      console.log(`⚠️ PKI/Config timeout error (${error.error}), but EncryptedMeshLink functionality should work. Restarting...`);
      // Don't exit, just log and let the process restart
      setTimeout(() => {
        console.log("🔄 Attempting to restart EncryptedMeshLink...");
        main().catch(console.error);
      }, 3000);
    } else {
      console.error("❌ Critical error starting EncryptedMeshLink:", error);
      process.exit(1);
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log("\n👋 Shutting down EncryptedMeshLink...");
  process.exit(0);
});

// CLI Command Processing
async function handleCLICommands() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // No arguments, run main application
    return false;
  }

  const command = args[0];
  
  // Allow flags to pass through to main application
  if (command.startsWith('--')) {
    return false;
  }
  
  const cli = new ConfigCLI();

  switch (command) {
    case 'config':
      if (args.length === 1) {
        await cli.showConfig();
        return true;
      }
      
      const subCommand = args[1];
      switch (subCommand) {
        case 'init':
          const stationId = args.find(arg => arg.startsWith('--station-id='))?.split('=')[1];
          const displayName = args.find(arg => arg.startsWith('--display-name='))?.split('=')[1];
          const location = args.find(arg => arg.startsWith('--location='))?.split('=')[1];
          const operator = args.find(arg => arg.startsWith('--operator='))?.split('=')[1];
          const discoveryUrl = args.find(arg => arg.startsWith('--discovery-url='))?.split('=')[1];
          const force = args.includes('--force');

          if (!stationId || !displayName) {
            console.error('❌ Missing required arguments: --station-id and --display-name');
            console.log('\nUsage: npm run encryptedmeshlink config init --station-id=my-station --display-name="My Station" [--location="City, State"] [--operator="callsign"] [--discovery-url="https://..."] [--force]');
            process.exit(1);
          }

          await cli.initConfig({ stationId, displayName, location, operator, discoveryUrl, force });
          return true;

        case 'show':
          await cli.showConfig();
          return true;

        case 'validate':
          await cli.validateConfig();
          return true;

        case 'regen-keys':
          const keySize = args.find(arg => arg.startsWith('--key-size='))?.split('=')[1];
          await cli.regenerateKeys(keySize ? parseIntSafe(keySize, 2048) : 2048);
          return true;

        case 'set':
          const field = args[2];
          const value = args[3];
          if (!field || !value) {
            console.error('❌ Usage: npm run encryptedmeshlink config set <field> <value>');
            console.log('Example: npm run encryptedmeshlink config set displayName "New Station Name"');
            process.exit(1);
          }
          await cli.updateConfigField(field, value);
          return true;

        default:
          console.error(`❌ Unknown config subcommand: ${subCommand}`);
          console.log('\nAvailable commands:');
          console.log('  config init     - Initialize new station configuration');
          console.log('  config show     - Show current configuration');
          console.log('  config validate - Validate configuration');
          console.log('  config regen-keys - Regenerate RSA key pair');
          console.log('  config set      - Update configuration field');
          process.exit(1);
      }
      break;

    case 'help':
    case '--help':
    case '-h':
      console.log('EncryptedMeshLink - Meshtastic Internet Bridge');
      console.log('==============================================');
      console.log('\nUsage:');
      console.log('  npm run encryptedmeshlink                    - Start EncryptedMeshLink relay');
      console.log('  npm run encryptedmeshlink --local-testing    - Start with local testing mode');
      console.log('  npm run encryptedmeshlink config init ...    - Initialize station configuration');
      console.log('  npm run encryptedmeshlink config show        - Show current configuration');
      console.log('  npm run encryptedmeshlink config validate    - Validate configuration');
      console.log('  npm run encryptedmeshlink config regen-keys  - Regenerate RSA keys');
      console.log('  npm run encryptedmeshlink config set <field> <value> - Update config field');
      console.log('\nPhase 1 Features (Available Now):');
      console.log('  ✅ Local message relay via @{identifier}');
      console.log('  ✅ USB auto-detection for Meshtastic devices');
      console.log('  ✅ Node management and human-readable names');
      console.log('  ✅ Command processing (instructions, nodes, status, @messages)');
      console.log('\nPhase 2 Features (MIB-002 Configuration Ready):');
      console.log('  🚧 Station configuration system');
      console.log('  🚧 RSA key management');
      console.log('  🚧 Internet bridge discovery');
      console.log('  🚧 Encrypted P2P communication');
      return true;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Use "npm run encryptedmeshlink help" for available commands');
      process.exit(1);
  }

  return false;
}

if (require.main === module) {
  handleCLICommands().then(handled => {
    if (!handled) {
      main().catch(console.error);
    }
  }).catch(console.error);
}

export { TransportNodeSerial, main };
