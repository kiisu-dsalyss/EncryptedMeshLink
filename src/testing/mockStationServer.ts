#!/usr/bin/env tsx

/**
 * Standalone Mock Station Server
 * Runs a mock station that your real EncryptedMeshLink service can connect to
 * Registers with discovery service like a real remote station
 */

// Enable local testing mode for IP detection
process.env.EML_LOCAL_TESTING = 'true';

import { MockStation } from './mockStation';
import { DiscoveryClient } from '../discoveryClient';
import { StationConfig } from '../config/types';
import { KeyManager } from '../config/keyManager';
import { BridgeClient, createP2PBridgeClient } from '../bridge/client';
import { NodeRegistryManager } from '../nodeRegistry/manager';
import { CryptoService } from '../crypto';

// Configuration for a realistic remote station
const MOCK_STATION_CONFIG = {
    stationId: 'remote-test-station',
    stationName: 'Remote Test Station',
    listenPort: 8900,
    responsePattern: 'echo' as const,
    nodes: [
        {
            nodeId: 3001,
            nodeName: 'Remote Alpha',
            autoRespond: true,
            responseDelay: 800,
            responseMessage: 'Hello from {nodeName}! You said: {originalMessage}'
        },
        {
            nodeId: 3002,
            nodeName: 'Remote Beta',
            autoRespond: true,
            responseDelay: 1200,
            responseMessage: 'Beta node received: {originalMessage}'
        },
        {
            nodeId: 3003,
            nodeName: 'Remote Gamma',
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
    private discoveryClient: DiscoveryClient | null = null;
    private bridgeClient: BridgeClient | null = null;
    private nodeRegistry: NodeRegistryManager | null = null;
    private cryptoService: CryptoService | null = null;
    private stationConfig: StationConfig | null = null;
    private isRunning: boolean = false;

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
        console.log(`Nodes Available:`);
        
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
            this.discoveryClient = new DiscoveryClient(this.stationConfig);
            await this.discoveryClient.start();

            // Initialize bridge client for P2P communication
            console.log('🌉 Initializing bridge client...');
            this.bridgeClient = createP2PBridgeClient(
                this.stationConfig.stationId,
                this.cryptoService,
                this.discoveryClient,
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
                console.log(`📋 Received node list request from ${fromStation}, sending ${MOCK_STATION_CONFIG.nodes.length} mock nodes...`);
                
                // Send our mock nodes as a node discovery message
                const mockNodes = MOCK_STATION_CONFIG.nodes.map(node => ({
                    nodeId: node.nodeId,
                    name: node.nodeName,
                    lastSeen: Date.now(),
                    signal: -50 // Mock signal strength
                }));

                if (this.bridgeClient) {
                    await this.bridgeClient.sendNodeDiscovery(fromStation, mockNodes);
                }
                
                console.log(`📤 Sent ${mockNodes.length} mock nodes to ${fromStation}`);
            });

            // Register mock nodes with the registry
            console.log('📋 Registering mock nodes...');
            for (const node of MOCK_STATION_CONFIG.nodes) {
                this.nodeRegistry.registerLocalNode(
                    node.nodeId.toString(),
                    {
                        nodeName: node.nodeName,
                        type: 'mock',
                        autoRespond: node.autoRespond,
                        description: `Mock node: ${node.nodeName}`,
                        responseDelay: node.responseDelay,
                        responseMessage: node.responseMessage
                    }
                );
            }

            console.log('\n� Mock station is ready and registered with discovery service!');
            console.log('\n📋 Your main EncryptedMeshLink service should now discover this station');
            console.log('📋 Remote nodes available for messaging:');
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
