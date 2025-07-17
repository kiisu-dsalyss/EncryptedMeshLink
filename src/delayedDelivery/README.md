# Delayed Message Delivery System

A store-and-forward messaging system for Meshtastic mesh networks that automatically queues messages for offline nodes and delivers them when the nodes come back online.

## Overview

The Delayed Message Delivery System provides reliable message delivery in mesh networks where nodes may frequently go offline due to power constraints, mobility, or environmental factors. It implements a smart queuing mechanism that:

- **Automatic Detection**: Detects when target nodes are offline
- **Smart Queuing**: Queues messages for delivery when nodes come back online
- **Priority System**: Supports message prioritization (higher numbers = higher priority)
- **Retry Logic**: Configurable retry attempts with exponential backoff
- **TTL Support**: Time-to-live for messages to prevent indefinite storage
- **Statistics**: Comprehensive delivery statistics and monitoring

## Architecture

The system follows a modular one-function-per-file architecture:

```
src/delayedDelivery/
├── types.ts                    # Type definitions
├── queueManager.ts             # In-memory queue management
├── sendMessage.ts              # Core message sending with queuing
├── processQueuedMessages.ts    # Background processing
├── startDeliverySystem.ts      # System initialization
├── stopDeliverySystem.ts       # System shutdown
├── getDeliveryStats.ts         # Statistics retrieval
├── getQueuedMessagesForNode.ts # Node-specific queue queries
├── createDefaultConfig.ts      # Default configuration
├── integrateDelayedDelivery.ts # Integration with mesh system
└── example.ts                  # Usage examples
```

## Quick Start

```typescript
import { integrateDelayedDelivery } from './src/delayedDelivery';

// Set up delayed delivery
const delayedDelivery = integrateDelayedDelivery(device, nodeManager, {
  maxRetries: 3,
  retryInterval: 30000, // 30 seconds
  maxQueueSize: 1000,
  deliveryTimeout: 10000 // 10 seconds
});

// Send a message with automatic delayed delivery
const result = await delayedDelivery.sendMessageWithDelayedDelivery(
  targetNodeId,
  "Hello! This will be delivered when you come online.",
  {
    priority: 2,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    retries: 3
  }
);

if (result.queued) {
  console.log(`Message queued for offline node (ID: ${result.messageId})`);
} else if (result.success) {
  console.log("Message delivered immediately");
}
```

## Configuration

### DelayedDeliveryConfig

```typescript
interface DelayedDeliveryConfig {
  maxRetries: number;        // Maximum retry attempts (default: 3)
  retryInterval: number;     // Time between retries in ms (default: 30000)
  maxQueueSize: number;      // Maximum messages in queue (default: 1000)
  deliveryTimeout: number;   // Timeout per delivery attempt (default: 10000)
  persistencePath?: string;  // Path for SQLite persistence (future)
}
```

### SendMessageOptions

```typescript
interface SendMessageOptions {
  priority?: number;    // Message priority (higher = more important)
  retries?: number;     // Override max retries for this message
  ttl?: number;         // Time to live in milliseconds
  forceQueue?: boolean; // Force queuing even if node appears online
}
```

## Key Features

### 1. Smart Online Detection

The system determines if a node is online by checking if it was seen within the last 5 minutes:

```typescript
const isNodeOnline = (nodeId: number): boolean => {
  const recentThreshold = Date.now() - (5 * 60 * 1000);
  const node = nodeManager.getKnownNodes().get(nodeId);
  return node && node.lastSeen && node.lastSeen.getTime() > recentThreshold;
};
```

### 2. Priority-Based Queue

Messages are automatically sorted by priority within each node's queue:

```typescript
await sendMessageWithDelayedDelivery(nodeId, "High priority alert", {
  priority: 10  // Will be delivered before lower priority messages
});
```

### 3. Automatic Retry Logic

Failed deliveries are automatically retried with configurable intervals:

- Initial attempt when message is queued
- Retry attempts at configured intervals
- Exponential backoff for repeated failures
- Automatic failure after max retries exceeded

### 4. TTL (Time To Live)

Messages automatically expire after their TTL to prevent storage bloat:

```typescript
await sendMessageWithDelayedDelivery(nodeId, "Time-sensitive message", {
  ttl: 60 * 60 * 1000  // Expires after 1 hour
});
```

## API Reference

### Core Functions

#### `sendMessage(targetNodeId, message, isNodeOnline, directSend, options?)`
- Attempts direct delivery if node is online, otherwise queues the message
- Returns `DelayedDeliveryResult` with success status and message ID

#### `processQueuedMessages(config, isNodeOnline, directSend)`
- Processes all queued messages ready for retry
- Cleans up expired messages
- Called automatically by the delivery system

#### `startDeliverySystem(isNodeOnline, directSend, config?)`
- Starts the background processing system
- Returns the final configuration used

#### `stopDeliverySystem()`
- Stops background processing
- Preserves queued messages

### Utility Functions

#### `getDeliveryStats()`
- Returns comprehensive delivery statistics
- Includes queue sizes per node

#### `getQueuedMessagesForNode(nodeId)`
- Returns all queued messages for a specific node
- Sorted by priority

### Integration Function

#### `integrateDelayedDelivery(device, nodeManager, config?)`
Returns an object with:
- `sendMessageWithDelayedDelivery()` - Enhanced send function
- `isNodeOnline()` - Node status checker
- `sendDirectly()` - Bypass delayed delivery
- `config` - Final configuration

## Statistics and Monitoring

The system provides comprehensive statistics:

```typescript
const stats = getDeliveryStats();
console.log({
  totalQueued: stats.totalQueued,       // Total messages ever queued
  totalDelivered: stats.totalDelivered, // Successfully delivered
  totalFailed: stats.totalFailed,       // Permanently failed
  totalExpired: stats.totalExpired,     // Expired due to TTL
  currentQueueSize: stats.currentQueueSize, // Currently queued
  nodeQueues: stats.nodeQueues          // Per-node queue sizes
});
```

## Error Handling

The system includes comprehensive error handling:

- **Network Errors**: Caught and retried according to configuration
- **Timeout Errors**: Delivery attempts timeout after configured duration
- **Queue Overflow**: Messages rejected if queue exceeds max size
- **Expired Messages**: Automatically cleaned up during processing

## Performance Considerations

- **Memory Usage**: In-memory queue scales with message count
- **Processing Interval**: Default 30-second intervals balance responsiveness and efficiency
- **Delivery Timeout**: 10-second default prevents hanging on slow connections
- **Queue Size Limits**: 1000 message default prevents memory exhaustion

## Future Enhancements

1. **SQLite Persistence**: Survive application restarts
2. **Encryption**: End-to-end encryption for queued messages
3. **Compression**: Reduce storage requirements for large messages
4. **Advanced Routing**: Multi-hop delivery through intermediate nodes
5. **Delivery Receipts**: Confirmation of successful delivery
6. **Web Dashboard**: Real-time monitoring interface

## Example Use Cases

1. **Emergency Communications**: High-priority alerts delivered when rescuers come online
2. **IoT Sensor Data**: Store sensor readings for later collection
3. **Chat Messages**: Personal messages delivered when recipients return
4. **System Notifications**: Administrative messages for network operators
5. **Firmware Updates**: Delivery notifications for over-the-air updates

## Contributing

When adding features:
1. Follow the one-function-per-file architecture
2. Add comprehensive error handling
3. Include TypeScript types
4. Update this README
5. Add unit tests

## Testing

```bash
npm test # Run all tests including delayed delivery tests
```

See `tests/` directory for comprehensive test coverage.