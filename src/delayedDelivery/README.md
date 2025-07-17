# Delayed Message Delivery System

A modular system for automatically queuing and delivering messages to offline mesh nodes.

## 🎯 Features

- **Smart Queuing**: Messages to offline nodes are automatically queued for later delivery
- **Online Detection**: Monitors node status changes (offline → online) using `lastSeen` timestamps  
- **Automatic Delivery**: Background process retries queued messages when targets come online
- **User Feedback**: Informs senders when messages are queued vs. immediately delivered
- **Configurable**: TTL, retry intervals, and max attempts are all configurable
- **Sender Notifications**: Notifies senders of successful delayed delivery or permanent failures

## 🏗️ Architecture

Following the established "one function per file" pattern:

```
src/delayedDelivery/
├── types.ts                    # Type definitions
├── sendMessage.ts              # Try immediate delivery, queue if offline
├── processQueuedMessages.ts    # Background processing of queued messages
├── startDeliverySystem.ts      # Start the delivery timer
├── stopDeliverySystem.ts       # Stop the delivery timer
├── getDeliveryStats.ts         # Get system statistics
├── getQueuedMessagesForNode.ts # Get queued messages for a node
├── createDefaultConfig.ts      # Default configuration
├── integrateDelayedDelivery.ts # Integration helper
├── example.ts                  # Usage example
└── index.ts                    # Main exports
```

## 🚀 Usage

### Basic Integration

```typescript
import { 
  sendMessage, 
  startDeliverySystem, 
  createDefaultConfig 
} from './delayedDelivery';

// Create configuration
const config = createDefaultConfig({
  maxQueueTime: 48,        // Keep messages for 48 hours
  deliveryRetryInterval: 60, // Check every minute
  maxDeliveryAttempts: 5   // Try 5 times before giving up
});

// Start background delivery system
const deliveryTimer = await startDeliverySystem(
  device, knownNodes, messageQueue, config
);

// Send message (will queue if offline)
const result = await sendMessage(
  device, knownNodes, messageQueue, config,
  fromNodeId, targetNodeId, "Hello!", MessagePriority.NORMAL
);

if (result.delivered) {
  console.log("✅ Delivered immediately");
} else if (result.queued) {
  console.log("📬 Queued for delayed delivery");
} else {
  console.log("❌ Failed:", result.reason);
}
```

### Integration with Relay Handler

```typescript
// In your relay handler
const matchResult = findBestNodeMatch(knownNodes, targetIdentifier);

if (matchResult) {
  const { nodeId } = matchResult;
  
  // Use delayed delivery instead of direct sending
  const result = await sendMessage(
    device, knownNodes, messageQueue, config,
    packet.from, nodeId, message
  );
  
  // Send confirmation to sender
  await device.sendText(result.reason, packet.from);
}
```

## ⚙️ Configuration

```typescript
interface DelayedDeliveryConfig {
  maxQueueTime: number;         // Hours to keep messages (default: 24)
  deliveryRetryInterval: number; // Seconds between checks (default: 30)
  maxDeliveryAttempts: number;   // Max attempts before giving up (default: 10)
}
```

## 🔄 How It Works

1. **Message Sending**: When a message is sent via `sendMessage()`:
   - Check if target node is online (using `lastSeen` timestamp)
   - If online: try immediate delivery
   - If offline or delivery fails: queue message

2. **Background Processing**: `processQueuedMessages()` runs periodically:
   - Retrieves pending messages from queue
   - Checks if target nodes are now online
   - Attempts delivery to online nodes
   - Notifies senders of success/failure

3. **User Feedback**: 
   - Immediate confirmation when messages are delivered or queued
   - Notification when queued messages are successfully delivered
   - Warning when messages permanently fail after max attempts

## 📊 Statistics

```typescript
const stats = getDeliveryStats(messageQueue, config, isActive);
console.log(stats);
// {
//   active: true,
//   queueStats: { pending: 5, delivered: 23, failed: 2 },
//   config: { maxQueueTime: 24, ... }
// }
```

## 🧪 Testing

```bash
npm test tests/delayedDelivery.test.ts
```

Tests cover:
- Configuration creation and overrides
- Immediate delivery to online nodes
- Queuing for offline nodes
- Background processing of queued messages
- Error handling and edge cases

## 🔗 Dependencies

- **Message Queue System** (`src/messageQueue`): SQLite-based persistence
- **Node Matching** (`src/relayHandler/nodeMatching`): Online status detection
- **Meshtastic Core**: Device communication

## 💡 Benefits

- **Reliability**: Messages aren't lost when nodes are temporarily offline
- **User Experience**: Clear feedback about message status
- **Mesh Network Resilience**: Handles the reality of intermittent connectivity
- **Scalable**: Uses existing message queue infrastructure
- **Configurable**: Adapts to different network conditions and requirements
