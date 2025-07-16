/**
 * Testing Module - EncryptedMeshLink
 * 
 * Comprehensive testing utilities for end-to-end P2P communication testing.
 * Provides mock stations, test runners, and integration testing capabilities.
 */

export { MockStation, MockStationConfig, MockNodeConfig, MockPeerInfo } from './mockStation.js';
export { MockStationTestRunner, runMockStationTests } from './testRunner.js';
export { 
    P2PIntegrationTester, 
    runP2PIntegrationTests,
    TestScenario,
    TestContext,
    TestResult
} from './p2pIntegrationTests.js';

/**
 * Quick start function to run all tests
 */
export async function runAllTests(): Promise<void> {
    console.log('🎭 Starting EncryptedMeshLink Test Suite\n');
    
    // Run mock station tests
    console.log('📋 Phase 1: Mock Station Tests');
    const { runMockStationTests } = await import('./testRunner.js');
    await runMockStationTests();
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Run P2P integration tests
    console.log('🔗 Phase 2: P2P Integration Tests');
    const { runP2PIntegrationTests } = await import('./p2pIntegrationTests.js');
    await runP2PIntegrationTests();
    
    console.log('\n🎉 Test suite completed!');
}

/**
 * Create a basic mock station for simple testing
 */
export function createBasicMockStation(stationId: string, port: number = 8800) {
    const { MockStation } = require('./mockStation.js');
    
    return new MockStation({
        stationId,
        stationName: `Mock Station ${stationId}`,
        listenPort: port,
        responsePattern: 'echo',
        nodes: [
            {
                nodeId: 1001,
                nodeName: 'Test Node 1',
                autoRespond: true,
                responseDelay: 500
            },
            {
                nodeId: 1002,
                nodeName: 'Test Node 2',
                autoRespond: true,
                responseDelay: 1000
            }
        ]
    });
}

/**
 * Utility to create test messages
 */
export function createTestMessage(
    fromStation: string, 
    toStation: string, 
    fromNode: number, 
    toNode: number, 
    text: string
) {
    const { createBridgeMessage, MessageType } = require('../bridge/protocol.js');
    
    return createBridgeMessage(
        fromStation,
        toStation,
        fromNode,
        toNode,
        MessageType.USER_MESSAGE,
        JSON.stringify({
            text,
            fromNodeName: `Node ${fromNode}`
        })
    );
}

/**
 * Test configuration presets
 */
export const TEST_CONFIGS = {
    BASIC_TWO_STATION: {
        station1: {
            stationId: 'test-alpha',
            stationName: 'Alpha Station',
            listenPort: 8801,
            responsePattern: 'echo' as const,
            nodes: [
                { nodeId: 1001, nodeName: 'Alpha Node 1', autoRespond: true, responseDelay: 500 },
                { nodeId: 1002, nodeName: 'Alpha Node 2', autoRespond: true, responseDelay: 800 }
            ]
        },
        station2: {
            stationId: 'test-bravo',
            stationName: 'Bravo Station',
            listenPort: 8802,
            responsePattern: 'ack' as const,
            nodes: [
                { nodeId: 2001, nodeName: 'Bravo Node 1', autoRespond: true, responseDelay: 300 },
                { nodeId: 2002, nodeName: 'Bravo Node 2', autoRespond: false, responseDelay: 0 }
            ]
        }
    },
    
    MULTI_STATION_MESH: {
        stations: [
            {
                stationId: 'hub-station',
                stationName: 'Hub Station',
                listenPort: 8811,
                responsePattern: 'echo' as const,
                nodes: [
                    { nodeId: 5001, nodeName: 'Hub Gateway', autoRespond: true, responseDelay: 200 },
                    { nodeId: 5002, nodeName: 'Hub Relay', autoRespond: true, responseDelay: 400 }
                ]
            },
            {
                stationId: 'edge-station-1',
                stationName: 'Edge Station 1',
                listenPort: 8812,
                responsePattern: 'ack' as const,
                nodes: [
                    { nodeId: 6001, nodeName: 'Edge Node A', autoRespond: true, responseDelay: 600 }
                ]
            },
            {
                stationId: 'edge-station-2',
                stationName: 'Edge Station 2',
                listenPort: 8813,
                responsePattern: 'custom' as const,
                nodes: [
                    { nodeId: 7001, nodeName: 'Edge Node B', autoRespond: true, responseDelay: 750 },
                    { nodeId: 7002, nodeName: 'Edge Node C', autoRespond: true, responseDelay: 500 }
                ]
            }
        ]
    }
};

// CLI runner if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(console.error);
}
