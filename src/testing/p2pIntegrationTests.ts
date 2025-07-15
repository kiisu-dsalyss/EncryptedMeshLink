/**
 * End-to-End P2P Integration Test
 * 
 * Tests the complete P2P messaging flow using mock stations to simulate remote peers.
 * This demonstrates real-world scenarios for bridge communication testing.
 */

import { MockStation, MockStationConfig } from './mockStation.js';
import { BridgeMessage, MessageType, createBridgeMessage, MessagePriority } from '../bridge/protocol.js';
import { BridgeClient } from '../bridge/client.js';
import { CryptoService } from '../crypto.js';
import { StationConfig } from '../config/types.js';

export interface TestScenario {
    name: string;
    description: string;
    timeout: number;
    execute: (context: TestContext) => Promise<TestResult>;
}

export interface TestContext {
    mockStations: Map<string, MockStation>;
    bridgeClient?: BridgeClient;
    cryptoService: CryptoService;
}

export interface TestResult {
    passed: boolean;
    message: string;
    details?: any;
}

export class P2PIntegrationTester {
    private mockStations: Map<string, MockStation> = new Map();
    private cryptoService: CryptoService;
    private testResults: Array<{ scenario: string; result: TestResult }> = [];

    constructor() {
        this.cryptoService = new CryptoService();
    }

    public async setupMockStations(): Promise<void> {
        const configs: MockStationConfig[] = [
            {
                stationId: 'remote-station-1',
                stationName: 'Remote Station 1',
                listenPort: 8901,
                responsePattern: 'echo',
                nodes: [
                    {
                        nodeId: 3001,
                        nodeName: 'Remote Node Alpha',
                        autoRespond: true,
                        responseDelay: 500
                    },
                    {
                        nodeId: 3002,
                        nodeName: 'Remote Node Beta', 
                        autoRespond: true,
                        responseDelay: 1200,
                        responseMessage: 'Echo from {nodeName}: {originalMessage}'
                    }
                ]
            },
            {
                stationId: 'remote-station-2',
                stationName: 'Remote Station 2',
                listenPort: 8902,
                responsePattern: 'ack',
                nodes: [
                    {
                        nodeId: 4001,
                        nodeName: 'Gateway Node',
                        autoRespond: true,
                        responseDelay: 300
                    },
                    {
                        nodeId: 4002,
                        nodeName: 'Relay Node',
                        autoRespond: false,
                        responseDelay: 0
                    }
                ]
            }
        ];

        console.log('🏗️  Setting up mock stations for P2P integration testing...');

        for (const config of configs) {
            const mockStation = new MockStation(config);
            this.mockStations.set(config.stationId, mockStation);

            // Enhanced event monitoring for integration testing
            mockStation.on('messageReceived', (message: BridgeMessage) => {
                console.log(`📨 [MOCK ${config.stationId}] Received ${message.payload.type} from ${message.routing.fromStation}:${message.routing.fromNode}`);
            });

            mockStation.on('responseSent', (response: BridgeMessage, original: BridgeMessage) => {
                console.log(`📤 [MOCK ${config.stationId}] Response sent to ${response.routing.toStation}:${response.routing.toNode}`);
            });

            await mockStation.start();
        }

        console.log(`✅ Started ${this.mockStations.size} mock stations`);
    }

    public async teardownMockStations(): Promise<void> {
        console.log('🧹 Tearing down mock stations...');
        
        for (const [stationId, station] of this.mockStations) {
            await station.stop();
        }
        
        this.mockStations.clear();
        console.log('✅ All mock stations stopped');
    }

    public async runIntegrationTests(): Promise<void> {
        const scenarios: TestScenario[] = [
            {
                name: 'Basic Message Round Trip',
                description: 'Send message to mock station and receive auto-response',
                timeout: 5000,
                execute: this.testBasicRoundTrip.bind(this)
            },
            {
                name: 'Multi-Node Communication',
                description: 'Test messaging with multiple nodes on remote station',
                timeout: 8000,
                execute: this.testMultiNodeCommunication.bind(this)
            },
            {
                name: 'Command Protocol Compliance',
                description: 'Verify command message handling',
                timeout: 3000,
                execute: this.testCommandProtocol.bind(this)
            },
            {
                name: 'Error Handling',
                description: 'Test error responses for invalid scenarios',
                timeout: 3000,
                execute: this.testErrorHandling.bind(this)
            },
            {
                name: 'Concurrent Messaging',
                description: 'Multiple simultaneous messages to different stations',
                timeout: 10000,
                execute: this.testConcurrentMessaging.bind(this)
            },
            {
                name: 'Node Discovery',
                description: 'Discover nodes on remote stations',
                timeout: 5000,
                execute: this.testNodeDiscovery.bind(this)
            }
        ];

        console.log('\n🚀 Running P2P Integration Test Scenarios...\n');

        for (const scenario of scenarios) {
            console.log(`🎯 Executing: ${scenario.name}`);
            console.log(`   ${scenario.description}`);

            try {
                const context: TestContext = {
                    mockStations: this.mockStations,
                    cryptoService: this.cryptoService
                };

                const startTime = Date.now();
                const result = await Promise.race([
                    scenario.execute(context),
                    this.timeoutPromise(scenario.timeout)
                ]);
                const duration = Date.now() - startTime;

                this.testResults.push({ scenario: scenario.name, result });

                const status = result.passed ? '✅ PASS' : '❌ FAIL';
                console.log(`   ${status} (${duration}ms) - ${result.message}`);
                
                if (result.details) {
                    console.log(`   Details:`, result.details);
                }

            } catch (error) {
                const result: TestResult = {
                    passed: false,
                    message: `Test execution failed: ${error}`,
                    details: { error: error.toString() }
                };

                this.testResults.push({ scenario: scenario.name, result });
                console.log(`   ❌ FAIL - Test execution failed: ${error}`);
            }

            console.log('');
        }
    }

    private async testBasicRoundTrip(context: TestContext): Promise<TestResult> {
        const remoteStation = context.mockStations.get('remote-station-1');
        if (!remoteStation) {
            return { passed: false, message: 'Remote station not available' };
        }

        // Create a test message
        const testMessage = createBridgeMessage(
            'local-station',
            'remote-station-1',
            1234,
            3001,
            MessageType.USER_MESSAGE,
            JSON.stringify({
                text: 'Hello from integration test!',
                fromNodeName: 'Test Node'
            })
        );

        // Send to mock station and get response
        const response = await remoteStation.handleIncomingMessage(testMessage);

        if (!response) {
            return { passed: false, message: 'No response received' };
        }

        if (response.payload.type !== MessageType.USER_MESSAGE) {
            return { passed: false, message: 'Invalid response type' };
        }

        const responseData = JSON.parse(response.payload.data);
        const isEcho = responseData.text.includes('Hello from integration test!');

        return {
            passed: isEcho,
            message: isEcho ? 'Round trip successful' : 'Response content mismatch',
            details: { responseText: responseData.text }
        };
    }

    private async testMultiNodeCommunication(context: TestContext): Promise<TestResult> {
        const remoteStation = context.mockStations.get('remote-station-1');
        if (!remoteStation) {
            return { passed: false, message: 'Remote station not available' };
        }

        const nodes = remoteStation.getNodes();
        const responses: any[] = [];

        // Send messages to all nodes
        for (const node of nodes) {
            const testMessage = createBridgeMessage(
                'local-station',
                'remote-station-1',
                1234,
                node.nodeId,
                MessageType.USER_MESSAGE,
                JSON.stringify({
                    text: `Message for ${node.nodeName}`,
                    fromNodeName: 'Test Node'
                })
            );

            const response = await remoteStation.handleIncomingMessage(testMessage);
            if (response) {
                responses.push({
                    nodeId: node.nodeId,
                    nodeName: node.nodeName,
                    received: true,
                    responseType: response.payload.type
                });
            } else {
                responses.push({
                    nodeId: node.nodeId,
                    nodeName: node.nodeName,
                    received: false
                });
            }
        }

        const successful = responses.filter(r => r.received).length;
        const expected = nodes.filter(n => n.autoRespond).length;

        return {
            passed: successful === expected,
            message: `${successful}/${expected} nodes responded`,
            details: { responses }
        };
    }

    private async testCommandProtocol(context: TestContext): Promise<TestResult> {
        const remoteStation = context.mockStations.get('remote-station-2');
        if (!remoteStation) {
            return { passed: false, message: 'Remote station not available' };
        }

        const commands = ['ping', 'status', 'nodes'];
        const results: any[] = [];

        for (const command of commands) {
            const commandMessage = createBridgeMessage(
                'local-station',
                'remote-station-2',
                1234,
                0,
                MessageType.COMMAND,
                JSON.stringify({ command })
            );

            const response = await remoteStation.handleIncomingMessage(commandMessage);
            
            if (response && response.payload.type === MessageType.COMMAND) {
                const responseData = JSON.parse(response.payload.data);
                results.push({
                    command,
                    success: responseData.command === command,
                    hasResult: !!responseData.result
                });
            } else {
                results.push({
                    command,
                    success: false,
                    hasResult: false
                });
            }
        }

        const successful = results.filter(r => r.success).length;
        
        return {
            passed: successful === commands.length,
            message: `${successful}/${commands.length} commands succeeded`,
            details: { results }
        };
    }

    private async testErrorHandling(context: TestContext): Promise<TestResult> {
        const remoteStation = context.mockStations.get('remote-station-1');
        if (!remoteStation) {
            return { passed: false, message: 'Remote station not available' };
        }

        // Test message to non-existent node
        const invalidMessage = createBridgeMessage(
            'local-station',
            'remote-station-1',
            1234,
            9999, // Non-existent node
            MessageType.USER_MESSAGE,
            JSON.stringify({
                text: 'Message to invalid node',
                fromNodeName: 'Test Node'
            })
        );

        const response = await remoteStation.handleIncomingMessage(invalidMessage);

        if (!response) {
            return { passed: false, message: 'No error response received' };
        }

        if (response.payload.type !== MessageType.ERROR) {
            return { passed: false, message: 'Expected error response' };
        }

        const errorData = JSON.parse(response.payload.data);
        const hasError = errorData.error && errorData.error.includes('not found');

        return {
            passed: hasError,
            message: hasError ? 'Error handling working' : 'Invalid error response',
            details: { errorData }
        };
    }

    private async testConcurrentMessaging(context: TestContext): Promise<TestResult> {
        const station1 = context.mockStations.get('remote-station-1');
        const station2 = context.mockStations.get('remote-station-2');
        
        if (!station1 || !station2) {
            return { passed: false, message: 'Required stations not available' };
        }

        // Create multiple concurrent messages
        const messagePromises = [
            // Messages to station 1
            station1.handleIncomingMessage(createBridgeMessage(
                'local-station', 'remote-station-1', 1234, 3001, MessageType.USER_MESSAGE,
                JSON.stringify({ text: 'Concurrent message 1', fromNodeName: 'Test Node' })
            )),
            station1.handleIncomingMessage(createBridgeMessage(
                'local-station', 'remote-station-1', 1234, 3002, MessageType.USER_MESSAGE,
                JSON.stringify({ text: 'Concurrent message 2', fromNodeName: 'Test Node' })
            )),
            // Messages to station 2
            station2.handleIncomingMessage(createBridgeMessage(
                'local-station', 'remote-station-2', 1234, 4001, MessageType.USER_MESSAGE,
                JSON.stringify({ text: 'Concurrent message 3', fromNodeName: 'Test Node' })
            )),
            // Command messages
            station1.handleIncomingMessage(createBridgeMessage(
                'local-station', 'remote-station-1', 1234, 0, MessageType.COMMAND,
                JSON.stringify({ command: 'ping' })
            )),
            station2.handleIncomingMessage(createBridgeMessage(
                'local-station', 'remote-station-2', 1234, 0, MessageType.COMMAND,
                JSON.stringify({ command: 'status' })
            ))
        ];

        const responses = await Promise.all(messagePromises);
        const successful = responses.filter(r => r !== null).length;

        return {
            passed: successful >= 4, // At least 4 out of 5 should succeed
            message: `${successful}/5 concurrent messages handled`,
            details: { 
                responseTypes: responses.map(r => r?.payload.type || 'null'),
                expectedResponses: 4 // Station 2 node 4002 doesn't auto-respond
            }
        };
    }

    private async testNodeDiscovery(context: TestContext): Promise<TestResult> {
        const remoteStation = context.mockStations.get('remote-station-1');
        if (!remoteStation) {
            return { passed: false, message: 'Remote station not available' };
        }

        const nodeListMessage = createBridgeMessage(
            'local-station',
            'remote-station-1',
            1234,
            0,
            MessageType.COMMAND,
            JSON.stringify({ command: 'nodes' })
        );

        const response = await remoteStation.handleIncomingMessage(nodeListMessage);

        if (!response || response.payload.type !== MessageType.COMMAND) {
            return { passed: false, message: 'No command response received' };
        }

        const responseData = JSON.parse(response.payload.data);
        const nodes = responseData.result?.nodes;

        if (!Array.isArray(nodes)) {
            return { passed: false, message: 'Invalid node list response' };
        }

        const expectedNodes = remoteStation.getNodes().length;
        const receivedNodes = nodes.length;

        return {
            passed: receivedNodes === expectedNodes,
            message: `Discovered ${receivedNodes}/${expectedNodes} nodes`,
            details: { 
                discoveredNodes: nodes.map((n: any) => ({ id: n.nodeId, name: n.nodeName }))
            }
        };
    }

    private timeoutPromise(ms: number): Promise<TestResult> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Test timed out after ${ms}ms`));
            }, ms);
        });
    }

    public printResults(): void {
        console.log('\n📋 P2P Integration Test Results');
        console.log('=' .repeat(70));

        let passed = 0;
        let total = 0;

        for (const test of this.testResults) {
            const status = test.result.passed ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} | ${test.scenario.padEnd(35)} | ${test.result.message}`);
            
            if (test.result.passed) passed++;
            total++;
        }

        console.log('=' .repeat(70));
        console.log(`📊 Summary: ${passed}/${total} tests passed (${((passed/total)*100).toFixed(1)}%)`);
        
        if (passed === total) {
            console.log('🎉 All P2P integration tests passed!');
        } else {
            console.log('⚠️  Some integration tests failed - check the results above');
        }
    }

    public getResults(): Array<{ scenario: string; result: TestResult }> {
        return [...this.testResults];
    }
}

// CLI runner for integration tests
export async function runP2PIntegrationTests(): Promise<void> {
    console.log('🔗 EncryptedMeshLink P2P Integration Test Suite');
    console.log('=' .repeat(70));

    const tester = new P2PIntegrationTester();

    try {
        await tester.setupMockStations();
        await tester.runIntegrationTests();
        tester.printResults();
        await tester.teardownMockStations();
        
        console.log('\n✅ Integration test suite completed');
        
    } catch (error) {
        console.error('❌ Integration test suite failed:', error);
        await tester.teardownMockStations();
    }
}

// Run integration tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runP2PIntegrationTests().catch(console.error);
}
