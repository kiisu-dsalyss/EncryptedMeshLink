/**
 * Mock Station Test Runner
 * 
 * Demonstrates end-to-end testing with mock stations simulating remote peers.
 * This script shows how to set up mock stations and test P2P messaging scenarios.
 */

import { MockStation, MockStationConfig } from './mockStation.js';
import { BridgeMessage, MessageType } from '../bridge/protocol.js';

// Configuration for mock stations
const MOCK_STATION_CONFIGS: MockStationConfig[] = [
    {
        stationId: 'test-station-alpha',
        stationName: 'Alpha Test Station',
        listenPort: 8801,
        responsePattern: 'echo',
        nodes: [
            {
                nodeId: 1001,
                nodeName: 'Alpha Node 1',
                autoRespond: true,
                responseDelay: 500
            },
            {
                nodeId: 1002,
                nodeName: 'Alpha Node 2',
                autoRespond: true,
                responseDelay: 1000,
                responseMessage: 'Greetings from Alpha Node 2! Message: {originalMessage}'
            }
        ]
    },
    {
        stationId: 'test-station-bravo',
        stationName: 'Bravo Test Station',
        listenPort: 8802,
        responsePattern: 'ack',
        nodes: [
            {
                nodeId: 2001,
                nodeName: 'Bravo Node 1',
                autoRespond: true,
                responseDelay: 750
            },
            {
                nodeId: 2002,
                nodeName: 'Bravo Node 2',
                autoRespond: false,
                responseDelay: 0
            },
            {
                nodeId: 2003,
                nodeName: 'Bravo Node 3',
                autoRespond: true,
                responseDelay: 300,
                responseMessage: 'Quick response from {nodeName}!'
            }
        ]
    }
];

export class MockStationTestRunner {
    private mockStations: Map<string, MockStation> = new Map();
    private testResults: Array<{ test: string; passed: boolean; message: string }> = [];

    constructor() {
        this.setupMockStations();
    }

    private setupMockStations(): void {
        for (const config of MOCK_STATION_CONFIGS) {
            const mockStation = new MockStation(config);
            this.mockStations.set(config.stationId, mockStation);
            
            // Set up event listeners for testing
            mockStation.on('messageReceived', (message: BridgeMessage) => {
                console.log(`📨 [${config.stationId}] Received: ${message.payload.type} from ${message.routing.fromStation}`);
            });

            mockStation.on('responseSent', (response: BridgeMessage, original: BridgeMessage) => {
                console.log(`📤 [${config.stationId}] Sent response to ${response.routing.toStation}`);
            });

            mockStation.on('started', () => {
                console.log(`✅ [${config.stationId}] Mock station started`);
            });

            mockStation.on('stopped', () => {
                console.log(`⏹️  [${config.stationId}] Mock station stopped`);
            });
        }
    }

    public async startAllStations(): Promise<void> {
        console.log('🚀 Starting all mock stations...\n');
        
        for (const [stationId, station] of this.mockStations) {
            try {
                await station.start();
                this.recordTestResult(`Start ${stationId}`, true, 'Started successfully');
            } catch (error) {
                this.recordTestResult(`Start ${stationId}`, false, `Failed: ${error}`);
            }
        }

        console.log('\n📊 Station startup summary:');
        this.printStats();
    }

    public async stopAllStations(): Promise<void> {
        console.log('\n⏹️  Stopping all mock stations...\n');
        
        for (const [stationId, station] of this.mockStations) {
            try {
                await station.stop();
                this.recordTestResult(`Stop ${stationId}`, true, 'Stopped successfully');
            } catch (error) {
                this.recordTestResult(`Stop ${stationId}`, false, `Failed: ${error}`);
            }
        }
    }

    public async runBasicMessageTests(): Promise<void> {
        console.log('\n🧪 Running basic message tests...\n');

        const alphaStation = this.mockStations.get('test-station-alpha');
        const bravoStation = this.mockStations.get('test-station-bravo');

        if (!alphaStation || !bravoStation) {
            this.recordTestResult('Basic Message Test', false, 'Missing required stations');
            return;
        }

        // Test 1: User message with auto-response
        try {
            const testMessage = alphaStation.createTestMessage(
                'test-station-bravo',
                2001,
                'Hello from Alpha to Bravo Node 1!'
            );

            const response = await bravoStation.handleIncomingMessage(testMessage);
            
            if (response && response.payload.type === MessageType.USER_MESSAGE) {
                this.recordTestResult('User Message Test', true, 'Auto-response received');
            } else {
                this.recordTestResult('User Message Test', false, 'No auto-response received');
            }
        } catch (error) {
            this.recordTestResult('User Message Test', false, `Error: ${error}`);
        }

        // Test 2: Command message (ping)
        try {
            const pingMessage = {
                ...alphaStation.createTestMessage('test-station-bravo', 0, ''),
                payload: {
                    type: MessageType.COMMAND,
                    data: JSON.stringify({ command: 'ping' }),
                    encrypted: false
                }
            } as BridgeMessage;

            const response = await bravoStation.handleIncomingMessage(pingMessage);
            
            if (response && response.payload.type === MessageType.COMMAND) {
                const responseData = JSON.parse(response.payload.data);
                if (responseData.command === 'ping' && responseData.result === 'pong') {
                    this.recordTestResult('Ping Command Test', true, 'Pong response received');
                } else {
                    this.recordTestResult('Ping Command Test', false, 'Invalid pong response');
                }
            } else {
                this.recordTestResult('Ping Command Test', false, 'No ping response received');
            }
        } catch (error) {
            this.recordTestResult('Ping Command Test', false, `Error: ${error}`);
        }

        // Test 3: Node list command
        try {
            const nodeListMessage = {
                ...alphaStation.createTestMessage('test-station-bravo', 0, ''),
                payload: {
                    type: MessageType.COMMAND,
                    data: JSON.stringify({ command: 'nodes' }),
                    encrypted: false
                }
            } as BridgeMessage;

            const response = await bravoStation.handleIncomingMessage(nodeListMessage);
            
            if (response && response.payload.type === MessageType.COMMAND) {
                const responseData = JSON.parse(response.payload.data);
                if (responseData.command === 'nodes' && responseData.result?.nodes) {
                    const nodeCount = responseData.result.nodes.length;
                    this.recordTestResult('Node List Test', true, `Received ${nodeCount} nodes`);
                } else {
                    this.recordTestResult('Node List Test', false, 'Invalid node list response');
                }
            } else {
                this.recordTestResult('Node List Test', false, 'No node list response received');
            }
        } catch (error) {
            this.recordTestResult('Node List Test', false, `Error: ${error}`);
        }

        // Test 4: Message to non-existent node
        try {
            const invalidMessage = alphaStation.createTestMessage(
                'test-station-bravo',
                9999, // Non-existent node
                'Message to invalid node'
            );

            const response = await bravoStation.handleIncomingMessage(invalidMessage);
            
            if (response && response.payload.type === MessageType.ERROR) {
                this.recordTestResult('Invalid Node Test', true, 'Error response received');
            } else {
                this.recordTestResult('Invalid Node Test', false, 'No error response for invalid node');
            }
        } catch (error) {
            this.recordTestResult('Invalid Node Test', false, `Error: ${error}`);
        }
    }

    public async runNodeManagementTests(): Promise<void> {
        console.log('\n🔧 Running node management tests...\n');

        const alphaStation = this.mockStations.get('test-station-alpha');
        
        if (!alphaStation) {
            this.recordTestResult('Node Management Test', false, 'Missing alpha station');
            return;
        }

        try {
            // Test adding a node
            const initialNodeCount = alphaStation.getNodes().length;
            
            alphaStation.addNode({
                nodeId: 1003,
                nodeName: 'Dynamic Node',
                autoRespond: true,
                responseDelay: 200
            });

            const newNodeCount = alphaStation.getNodes().length;
            
            if (newNodeCount === initialNodeCount + 1) {
                this.recordTestResult('Add Node Test', true, 'Node added successfully');
            } else {
                this.recordTestResult('Add Node Test', false, 'Node count mismatch');
            }

            // Test removing a node
            alphaStation.removeNode(1003);
            const finalNodeCount = alphaStation.getNodes().length;
            
            if (finalNodeCount === initialNodeCount) {
                this.recordTestResult('Remove Node Test', true, 'Node removed successfully');
            } else {
                this.recordTestResult('Remove Node Test', false, 'Node removal failed');
            }

            // Test custom response
            alphaStation.setNodeResponse(1001, 'Custom test response: {originalMessage}');
            this.recordTestResult('Custom Response Test', true, 'Custom response set');

        } catch (error) {
            this.recordTestResult('Node Management Test', false, `Error: ${error}`);
        }
    }

    public printStats(): void {
        for (const [stationId, station] of this.mockStations) {
            const stats = station.getStats();
            console.log(`📊 [${stationId}]:`, {
                running: stats.isRunning,
                messages: stats.messageCount,
                nodes: stats.nodeCount,
                peers: stats.connectedPeers
            });
        }
    }

    public printTestResults(): void {
        console.log('\n📋 Test Results Summary:');
        console.log('=' .repeat(60));
        
        let passed = 0;
        let total = 0;
        
        for (const result of this.testResults) {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} | ${result.test.padEnd(25)} | ${result.message}`);
            
            if (result.passed) passed++;
            total++;
        }
        
        console.log('=' .repeat(60));
        console.log(`📊 Summary: ${passed}/${total} tests passed (${((passed/total)*100).toFixed(1)}%)`);
        
        if (passed === total) {
            console.log('🎉 All tests passed!');
        } else {
            console.log('⚠️  Some tests failed - check the results above');
        }
    }

    private recordTestResult(test: string, passed: boolean, message: string): void {
        this.testResults.push({ test, passed, message });
    }

    public getTestResults(): Array<{ test: string; passed: boolean; message: string }> {
        return [...this.testResults];
    }
}

// Example usage and CLI runner
export async function runMockStationTests(): Promise<void> {
    console.log('🎭 EncryptedMeshLink Mock Station Test Runner');
    console.log('=' .repeat(60));

    const testRunner = new MockStationTestRunner();

    try {
        // Start all stations
        await testRunner.startAllStations();
        
        // Wait a moment for stations to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Run tests
        await testRunner.runBasicMessageTests();
        await testRunner.runNodeManagementTests();

        // Print final results
        testRunner.printTestResults();

        // Stop all stations
        await testRunner.stopAllStations();

    } catch (error) {
        console.error('❌ Test runner failed:', error);
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMockStationTests().catch(console.error);
}
