#!/usr/bin/env tsx

/**
 * Standalone Mock Station Server
 * Runs a mock station that your real EncryptedMeshLink service can connect to
 * Registers with discovery service like a real remote station
 */

// Enable local testing mode for IP detection
process.env.EML_LOCAL_TESTING = 'true';

import { MockStation } from './mockStation';
import { DiscoveryClientModular } from '../discovery/index';
import { StationConfig } from '../config/types';
import { KeyManager } from '../config/keyManager';
import { BridgeClient, createP2PBridgeClient } from '../bridge/client';
import { NodeRegistryManager } from '../nodeRegistry/manager';
import { CryptoService } from '../crypto/index';

// Configuration for a realistic remote station
const MOCK_STATION_CONFIG = {
    stationId: 'remote-test-station',
    stationName: 'Remote Test Station',
    listenPort: 8900,
    responsePattern: 'echo' as const,
    // Gateway node - represents the "Meshtastic device" of this mock station
    gatewayNode: {
        nodeId: 3000,
        nodeName: 'rGateway',
        shortName: 'RGW',
        hwModel: 'HELTEC_V3',
        role: 'CLIENT'
    },
    // Mesh nodes behind the gateway
    nodes: [
        {
            nodeId: 3001,
            nodeName: 'rAlpha',
            autoRespond: true,
            responseDelay: 800,
            responseMessage: 'Hello from {nodeName}! You said: {originalMessage}'
        },
        {
            nodeId: 3002,
            nodeName: 'rBeta',
            autoRespond: true,
            responseDelay: 1200,
            responseMessage: 'Beta node received: {originalMessage}'
        },
        {
            nodeId: 3003,
            nodeName: 'rGamma',
            autoRespond: true,
            responseDelay: 500,
            responseMessage: 'Quick response from Gamma: {originalMessage}'
        }
    ]
};

// Create a station config for discovery service registration
async function createMockStationConfig(): Promise<StationConfig> {
    const keyPair = await KeyManager.generateKeyPair();
    
    return {
        stationId: MOCK_STATION_CONFIG.stationId,
        displayName: MOCK_STATION_CONFIG.stationName,
        location: 'Test Environment',
        operator: 'Mock Station System',
        keys: {
            publicKey: keyPair.publicKey,
            privateKey: keyPair.privateKey
        },
        discovery: {
            serviceUrl: 'https://definitelynotamoose.com/api/discovery.php',
            checkInterval: 300,
            timeout: 30
        },
        p2p: {
            listenPort: MOCK_STATION_CONFIG.listenPort,
            maxConnections: 10,
            connectionTimeout: 30
        },
        mesh: {
            autoDetect: false,
            devicePath: '/dev/null', // Mock stations don't use mesh interface
            baudRate: 115200
        },
        metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: '1.0.0'
        }
    };
}

class MockStationServer {
    private mockStation: MockStation;
    private discoveryClient: DiscoveryClientModular | null = null;
    private bridgeClient: BridgeClient | null = null;
    private nodeRegistry: NodeRegistryManager | null = null;
    private cryptoService: CryptoService | null = null;
    private stationConfig: StationConfig | null = null;
    private isRunning: boolean = false;
    private processedMessageIds: Set<string> = new Set();

    constructor() {
        this.mockStation = new MockStation(MOCK_STATION_CONFIG);
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.mockStation.on('messageReceived', (message) => {
            console.log(`📨 [${MOCK_STATION_CONFIG.stationId}] Received ${message.payload.type} from ${message.routing.fromStation}:${message.routing.fromNode}`);
            if (message.payload.type === 'user_message') {
                const data = JSON.parse(message.payload.data);
                console.log(`   Message: "${data.text}"`);
                console.log(`   Target Node: ${message.routing.toNode}`);
            }
        });

        this.mockStation.on('responseSent', (response, original) => {
            const responseData = JSON.parse(response.payload.data);
            console.log(`📤 [${MOCK_STATION_CONFIG.stationId}] Sent response: "${responseData.text}"`);
        });

        this.mockStation.on('started', () => {
            console.log(`✅ Mock station server started successfully`);
            this.isRunning = true;
        });

        this.mockStation.on('stopped', () => {
            console.log(`⏹️  Mock station server stopped`);
            this.isRunning = false;
        });

        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down mock station server...');
            await this.stop();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('\n🛑 Shutting down mock station server...');
            await this.stop();
            process.exit(0);
        });
    }

    public async start(): Promise<void> {
        if (this.isRunning) {
            console.log('Mock station server is already running');
            return;
        }

        console.log('🎭 Starting Mock Station Server');
        console.log('=' .repeat(50));
        console.log(`Station ID: ${MOCK_STATION_CONFIG.stationId}`);
        console.log(`Station Name: ${MOCK_STATION_CONFIG.stationName}`);
        console.log(`Listen Port: ${MOCK_STATION_CONFIG.listenPort}`);
        console.log(`Gateway Node: ${MOCK_STATION_CONFIG.gatewayNode.nodeName} (ID: ${MOCK_STATION_CONFIG.gatewayNode.nodeId})`);
        console.log(`Mesh Nodes Available:`);
        
        for (const node of MOCK_STATION_CONFIG.nodes) {
            console.log(`  - ${node.nodeName} (ID: ${node.nodeId}) - Auto-respond: ${node.autoRespond ? 'Yes' : 'No'}`);
        }
        
        console.log('=' .repeat(50));

        try {
            // Create station configuration with keys
            console.log('🔑 Generating RSA key pair for mock station...');
            this.stationConfig = await createMockStationConfig();
            
            // Initialize crypto service
            this.cryptoService = new CryptoService();
            
            // Start the mock station
            await this.mockStation.start();

            // Initialize and start discovery client
            console.log('🌍 Registering with discovery service...');
            this.discoveryClient = new DiscoveryClientModular(this.stationConfig);
            await this.discoveryClient.start();

            // Initialize bridge client for P2P communication
            console.log('🌉 Initializing bridge client...');
            this.bridgeClient = createP2PBridgeClient(
                this.stationConfig.stationId,
                this.cryptoService,
                this.discoveryClient || undefined,
                {
                    pollingInterval: 30000,
                    autoStart: false,
                    localPort: MOCK_STATION_CONFIG.listenPort,
                    connectionTimeout: 10000
                }
            );

            // Initialize node registry
            console.log('📋 Initializing node registry...');
            this.nodeRegistry = new NodeRegistryManager(
                this.stationConfig.stationId,
                this.bridgeClient,
                {
                    syncIntervalMs: 30000,
                    nodeTtlSeconds: 300,
                    maxNodesPerStation: 100,
                    cleanupIntervalMs: 60000,
                    conflictResolutionStrategy: 'latest'
                }
            );

            // Start bridge services
            this.bridgeClient.start();
            this.nodeRegistry.start();

            // Set up node list request handler
            this.bridgeClient.on('nodeListRequest', async (fromStation: string) => {
                console.log(`📋 Received node list request from ${fromStation}, sending gateway + ${MOCK_STATION_CONFIG.nodes.length} mesh nodes...`);
                
                // Include gateway node + mesh nodes in the discovery
                const allNodes = [
                    // Gateway node (acts like the "Meshtastic device")
                    {
                        nodeId: MOCK_STATION_CONFIG.gatewayNode.nodeId,
                        name: MOCK_STATION_CONFIG.gatewayNode.nodeName,
                        lastSeen: Date.now(),
                        signal: -30, // Stronger signal for gateway
                        hwModel: MOCK_STATION_CONFIG.gatewayNode.hwModel,
                        role: MOCK_STATION_CONFIG.gatewayNode.role
                    },
                    // Mesh nodes behind the gateway
                    ...MOCK_STATION_CONFIG.nodes.map(node => ({
                        nodeId: node.nodeId,
                        name: node.nodeName,
                        lastSeen: Date.now(),
                        signal: -50 // Mock signal strength for mesh nodes
                    }))
                ];

                if (this.bridgeClient) {
                    await this.bridgeClient.sendNodeDiscovery(fromStation, allNodes);
                }
                
                console.log(`📤 Sent gateway node + ${MOCK_STATION_CONFIG.nodes.length} mesh nodes to ${fromStation}`);
            });

            // Set up user message handler for relay messages
            // Using destructuring to avoid parameter order issues
            this.bridgeClient.on('userMessage', async ({ fromStation, fromNode, toNode, message }: {
                fromStation: string;
                fromNode: number;
                toNode: number;
                message: string;
            }) => {
                // Generate a unique key for this message
                const messageKey = `${fromStation}-${fromNode}-${toNode}-${message}`;
                
                // Check for duplicate message
                if (this.processedMessageIds.has(messageKey)) {
                    console.log(`🔄 Ignoring duplicate message: ${messageKey}`);
                    return;
                }
                
                // Mark message as processed
                this.processedMessageIds.add(messageKey);
                
                // Clean up old message IDs (keep only last 100)
                if (this.processedMessageIds.size > 100) {
                    const messagesToDelete = Array.from(this.processedMessageIds).slice(0, 50);
                    messagesToDelete.forEach(id => this.processedMessageIds.delete(id));
                }
                
                console.log(`📨 Received relay message from ${fromStation}:${fromNode} to ${toNode}: "${message}"`);
                
                // Convert toNode number to node name
                const targetNodeInfo = MOCK_STATION_CONFIG.nodes.find(node => node.nodeId === toNode) ||
                    (MOCK_STATION_CONFIG.gatewayNode.nodeId === toNode ? MOCK_STATION_CONFIG.gatewayNode : null);
                
                if (!targetNodeInfo) {
                    console.log(`❌ Target node ${toNode} not found on station ${MOCK_STATION_CONFIG.stationId}`);
                    return;
                }
                
                const targetNodeName = targetNodeInfo.nodeName;
                
                console.log(`✅ Found target node ${targetNodeName} (ID: ${toNode}), delivering message...`);
                
                // Check if this node auto-responds (only mesh nodes auto-respond)
                const meshNode = MOCK_STATION_CONFIG.nodes.find(node => node.nodeId === toNode);
                const shouldAutoRespond = meshNode?.autoRespond || false;
                
                if (shouldAutoRespond) {
                    const response = `Auto-reply from ${targetNodeName}: Got your message "${message}"`;
                    console.log(`🤖 ${targetNodeName} auto-responding: "${response}"`);
                    
                    // Send response back through bridge
                    // Parameters: targetStation, fromNode, toNode, message
                    // fromStation = where to send response, toNode = who is responding, fromNode = original sender
                    if (this.bridgeClient) {
                        console.log(`🔧 DEBUG: About to call sendUserMessage with parameters:`);
                        console.log(`   targetStation: "${fromStation}"`);
                        console.log(`   fromNode: ${toNode}`);
                        console.log(`   toNode: ${fromNode}`);
                        console.log(`   message: "${response}"`);
                        console.log(`🔧 DEBUG: Calling bridgeClient.sendUserMessage now...`);
                        try {
                            await this.bridgeClient.sendUserMessage(fromStation, toNode, fromNode, response);
                            console.log(`✅ DEBUG: sendUserMessage completed successfully`);
                        } catch (error) {
                            console.error(`❌ DEBUG: sendUserMessage failed:`, error);
                        }
                    }
                } else {
                    console.log(`📝 ${targetNodeName} received message but does not auto-respond`);
                }
            });

            // Register gateway node first (represents the "Meshtastic device")
            console.log('📋 Registering gateway node...');
            this.nodeRegistry.registerLocalNode(
                MOCK_STATION_CONFIG.gatewayNode.nodeId.toString(),
                {
                    nodeName: MOCK_STATION_CONFIG.gatewayNode.nodeName,
                    type: 'gateway',
                    autoRespond: false, // Gateway doesn't auto-respond to messages
                    description: `Mock gateway node: ${MOCK_STATION_CONFIG.gatewayNode.nodeName}`,
                    hwModel: MOCK_STATION_CONFIG.gatewayNode.hwModel,
                    role: MOCK_STATION_CONFIG.gatewayNode.role
                }
            );

            // Register mesh nodes behind the gateway
            console.log('📋 Registering mesh nodes...');
            for (const node of MOCK_STATION_CONFIG.nodes) {
                this.nodeRegistry.registerLocalNode(
                    node.nodeId.toString(),
                    {
                        nodeName: node.nodeName,
                        type: 'mesh',
                        autoRespond: node.autoRespond,
                        description: `Mock mesh node: ${node.nodeName}`,
                        responseDelay: node.responseDelay,
                        responseMessage: node.responseMessage
                    }
                );
            }

            console.log('\n� Mock station is ready and registered with discovery service!');
            console.log('\n📋 Your main EncryptedMeshLink service should now discover this station');
            console.log('📋 Gateway node available:');
            console.log(`   - ${MOCK_STATION_CONFIG.stationId}:${MOCK_STATION_CONFIG.gatewayNode.nodeId} (${MOCK_STATION_CONFIG.gatewayNode.nodeName})`);
            console.log('📋 Mesh nodes available for messaging:');
            for (const node of MOCK_STATION_CONFIG.nodes) {
                console.log(`   - ${MOCK_STATION_CONFIG.stationId}:${node.nodeId} (${node.nodeName})`);
            }
            console.log('\n⏹️  Press Ctrl+C to stop the mock station');
            console.log('');

            // Keep the process alive
            await this.keepAlive();
        } catch (error) {
            console.error('❌ Failed to start mock station server:', error);
            await this.stop();
            throw error;
        }
    }

    /**
     * Find a node by name in our mock station
     */
    private findNodeByName(nodeName: string): any | null {
        // Check gateway node
        if (MOCK_STATION_CONFIG.gatewayNode.nodeName.toLowerCase() === nodeName.toLowerCase()) {
            return {
                nodeId: MOCK_STATION_CONFIG.gatewayNode.nodeId.toString(),
                nodeName: MOCK_STATION_CONFIG.gatewayNode.nodeName,
                autoRespond: false // Gateway doesn't auto-respond
            };
        }

        // Check mesh nodes
        const meshNode = MOCK_STATION_CONFIG.nodes.find(node => 
            node.nodeName.toLowerCase() === nodeName.toLowerCase()
        );
        
        if (meshNode) {
            return {
                nodeId: meshNode.nodeId.toString(),
                nodeName: meshNode.nodeName,
                autoRespond: meshNode.autoRespond
            };
        }

        return null;
    }

    public async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        console.log('🛑 Stopping node registry...');
        if (this.nodeRegistry) {
            this.nodeRegistry.stop();
            this.nodeRegistry = null;
        }

        console.log('🛑 Stopping bridge client...');
        if (this.bridgeClient) {
            await this.bridgeClient.stop();
            this.bridgeClient = null;
        }

        console.log('🛑 Stopping discovery client...');
        if (this.discoveryClient) {
            await this.discoveryClient.stop();
            this.discoveryClient = null;
        }

        console.log('🛑 Stopping mock station...');
        await this.mockStation.stop();
        
        this.stationConfig = null;
        this.cryptoService = null;
    }

    private async keepAlive(): Promise<void> {
        // Print periodic status updates
        const statusInterval = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(statusInterval);
                return;
            }

            const stats = this.mockStation.getStats();
            const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
            console.log(`[${timestamp}] 📊 Status: ${stats.messageCount} messages processed, ${stats.nodeCount} nodes active`);
        }, 30000); // Every 30 seconds

        // Keep process alive
        return new Promise(() => {
            // This promise never resolves, keeping the process alive
        });
    }

    public getStats(): any {
        return this.mockStation.getStats();
    }
}

// Start the mock station server
const server = new MockStationServer();
server.start().catch(console.error);
