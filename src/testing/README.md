# EncryptedMeshLink Testing Module

Comprehensive testing utilities for end-to-end P2P communication testing in EncryptedMeshLink.

## Overview

This testing module provides mock stations that simulate remote Meshtastic bridge stations, enabling comprehensive testing of the P2P messaging system without requiring actual hardware or network setup.

## Features

### 🎭 Mock Station System
- **Simulated Remote Stations**: Complete mock stations with configurable nodes
- **Automated Responses**: Configurable auto-response patterns (echo, ack, custom)
- **Bridge Protocol Compliance**: Full adherence to EncryptedMeshLink bridge message protocol
- **Event-Driven Architecture**: Real-time monitoring of message flow and station events

### 🧪 Integration Testing
- **End-to-End Scenarios**: Complete P2P message flow testing
- **Multi-Station Communication**: Test complex multi-hop scenarios
- **Protocol Validation**: Verify bridge message protocol compliance
- **Error Simulation**: Test error handling and edge cases

### 📊 Test Analytics
- **Comprehensive Reporting**: Detailed test results with pass/fail status
- **Performance Metrics**: Message timing and throughput analysis
- **Node Management**: Dynamic node addition/removal testing
- **Connection Monitoring**: P2P connection status tracking

## Quick Start

### Basic Mock Station

```typescript
import { MockStation } from './testing/index.js';

const mockStation = new MockStation({
    stationId: 'test-station',
    stationName: 'Test Station',
    listenPort: 8800,
    responsePattern: 'echo',
    nodes: [
        {
            nodeId: 1001,
            nodeName: 'Test Node 1',
            autoRespond: true,
            responseDelay: 500
        }
    ]
});

await mockStation.start();
```

### Running All Tests

```bash
# Run complete test suite
npm run test:e2e

# Or programmatically
import { runAllTests } from './testing/index.js';
await runAllTests();
```

### Custom Test Scenarios

```typescript
import { P2PIntegrationTester } from './testing/index.js';

const tester = new P2PIntegrationTester();
await tester.setupMockStations();
await tester.runIntegrationTests();
tester.printResults();
```

## Mock Station Configuration

### Station Configuration
```typescript
interface MockStationConfig {
    stationId: string;           // Unique station identifier
    stationName: string;         // Human-readable station name
    listenPort: number;          // Port for P2P connections
    responsePattern: 'echo' | 'ack' | 'custom';  // Auto-response behavior
    nodes: MockNodeConfig[];     // Simulated nodes on this station
}
```

### Node Configuration
```typescript
interface MockNodeConfig {
    nodeId: number;              // Unique node identifier (Meshtastic node number)
    nodeName: string;            // Human-readable node name
    autoRespond: boolean;        // Whether to auto-respond to messages
    responseDelay: number;       // Delay before sending auto-response (ms)
    responseMessage?: string;    // Custom response template
}
```

## Response Patterns

### Echo Pattern
```typescript
responsePattern: 'echo'
// Echoes back the original message with prefix
// Example: "Echo from NodeName: Hello World"
```

### Acknowledgment Pattern  
```typescript
responsePattern: 'ack'
// Sends acknowledgment of message receipt
// Example: "ACK from NodeName - Message received"
```

### Custom Pattern
```typescript
responsePattern: 'custom'
responseMessage: 'Custom response from {nodeName}: {originalMessage}'
// Uses template with placeholders:
// {nodeName} - replaced with node name
// {nodeId} - replaced with node ID
// {originalMessage} - replaced with received message text
```

## Integration Test Scenarios

### 1. Basic Message Round Trip
Tests fundamental message sending and auto-response functionality.

```typescript
// Send message to mock station
const message = createTestMessage('local', 'remote', 1234, 5001, 'Hello!');
const response = await mockStation.handleIncomingMessage(message);
// Verify echo response received
```

### 2. Multi-Node Communication
Validates messaging across multiple nodes on the same station.

```typescript
// Send messages to different nodes
for (const node of mockStation.getNodes()) {
    const message = createNodeMessage(node.nodeId, 'Test message');
    const response = await mockStation.handleIncomingMessage(message);
    // Verify each node responds appropriately
}
```

### 3. Command Protocol Testing
Ensures bridge commands work correctly.

```typescript
// Test ping command
const pingMessage = createCommandMessage('ping');
const pongResponse = await mockStation.handleIncomingMessage(pingMessage);

// Test node discovery
const nodesMessage = createCommandMessage('nodes');
const nodeListResponse = await mockStation.handleIncomingMessage(nodesMessage);
```

### 4. Error Handling
Validates proper error responses for invalid scenarios.

```typescript
// Message to non-existent node
const invalidMessage = createTestMessage('local', 'remote', 1234, 9999, 'Hello');
const errorResponse = await mockStation.handleIncomingMessage(invalidMessage);
// Should receive ERROR message type
```

### 5. Concurrent Messaging
Tests system behavior under simultaneous message load.

```typescript
// Send multiple messages simultaneously
const promises = [
    mockStation1.handleIncomingMessage(message1),
    mockStation1.handleIncomingMessage(message2),
    mockStation2.handleIncomingMessage(message3)
];
const responses = await Promise.all(promises);
```

## Test Configuration Presets

### Basic Two-Station Setup
```typescript
import { TEST_CONFIGS } from './testing/index.js';

const config = TEST_CONFIGS.BASIC_TWO_STATION;
// Pre-configured Alpha and Bravo stations with test nodes
```

### Multi-Station Mesh
```typescript
const config = TEST_CONFIGS.MULTI_STATION_MESH;
// Hub station with multiple edge stations for complex scenarios
```

## Event Monitoring

Mock stations emit events for comprehensive testing:

```typescript
mockStation.on('messageReceived', (message) => {
    console.log('Received:', message.payload.type);
});

mockStation.on('responseSent', (response, original) => {
    console.log('Response sent to:', response.routing.toStation);
});

mockStation.on('peerConnected', (peerInfo) => {
    console.log('Peer connected:', peerInfo.stationId);
});
```

## Test Results Analysis

### Test Result Format
```typescript
interface TestResult {
    passed: boolean;        // Test success status
    message: string;        // Summary message
    details?: any;          // Additional test data
}
```

### Performance Metrics
- Message round-trip time
- Response delay accuracy
- Concurrent message handling
- Error response timing

## Best Practices

### 1. Station Isolation
- Use unique station IDs for each test
- Different ports for concurrent testing
- Clean shutdown between test runs

### 2. Response Timing
- Set realistic response delays (300-1000ms)
- Account for async operations in tests
- Use timeouts for hanging tests

### 3. Error Testing
- Test both valid and invalid scenarios
- Verify error message content
- Check error response timing

### 4. Resource Management
- Always stop mock stations after tests
- Clean up event listeners
- Reset test state between runs

## Integration with Main System

The mock stations are designed to integrate seamlessly with the actual P2P bridge system:

```typescript
// Mock station handles messages from real bridge client
const bridgeClient = new BridgeClient(cryptoService);
const message = await bridgeClient.sendMessage(targetStation, targetNode, text);
const response = await mockStation.handleIncomingMessage(message);
```

## CLI Commands

```bash
# Run mock station tests only
npm run test:mock

# Run P2P integration tests only  
npm run test:p2p

# Run complete end-to-end test suite
npm run test:e2e

# Start interactive test console
npm run test:console
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure unique ports for each mock station
2. **Async Timing**: Use proper await/Promise handling for message flows
3. **Resource Cleanup**: Always stop mock stations to prevent memory leaks
4. **Message Format**: Ensure messages follow bridge protocol specification

### Debug Mode
```typescript
// Enable detailed logging
const mockStation = new MockStation(config);
mockStation.on('messageReceived', console.log);
mockStation.on('responseSent', console.log);
```

## Contributing

When adding new test scenarios:

1. Follow the existing `TestScenario` interface
2. Include proper timeout handling
3. Provide detailed result messages
4. Add scenario descriptions
5. Update this documentation

## Future Enhancements

- [ ] Network latency simulation
- [ ] Message loss simulation  
- [ ] Bandwidth limiting
- [ ] Multi-hop routing tests
- [ ] NAT traversal simulation
- [ ] Discovery service integration
- [ ] Performance benchmarking suite
- [ ] Visual test reporting
- [ ] Automated regression testing
- [ ] Hardware-in-the-loop testing

This testing module is essential for validating the P2P messaging system before deploying to actual Raspberry Pi hardware and Meshtastic devices.
