# EncryptedMeshLink Architecture

## 🚨 CRITICAL ARCHITECTURE PRINCIPLE

**THE DISCOVERY SERVICE IS ONLY FOR PEER DISCOVERY - NO MESSAGES GO THROUGH IT!**

This is fundamental to the architecture and must never be violated.

## Correct Architecture

### Discovery Service (PHP)
- **Purpose**: Find other stations only
- **Endpoints**: 
  - `POST /discovery.php` - Register station
  - `GET /discovery.php?peers=true` - Get peer list
  - `DELETE /discovery.php?station_id=X` - Unregister
  - `GET /discovery.php?health=true` - Health check
- **Does NOT handle**: Messages, message relay, message storage
- **Location**: Your web hosting (shared hosting compatible)

### Direct P2P Messaging (To Be Implemented in MIB-010)
- **Purpose**: Station-to-station message delivery
- **Method**: Direct TCP/WebSocket connections between stations
- **Process**:
  1. Station A uses discovery service to find Station B's contact info
  2. Station A establishes direct connection to Station B
  3. Station A sends message directly to Station B
  4. No messages go through discovery service

## Current Status

### ✅ Working
- Discovery service for peer finding
- Local mesh relay within each station
- Node Registry for cross-station node tracking
- Enhanced command structure ("status" vs "nodes")

### 🚨 Incorrectly Implemented (Fixed with warnings)
- ~~Bridge transport trying to poll discovery service for messages~~ → DISABLED
- ~~Bridge transport trying to send messages through discovery service~~ → DISABLED

### 🚧 To Be Implemented (MIB-010)
- Direct P2P connections between stations
- Message relay over P2P connections
- NAT traversal for home networks
- Connection pooling and management

## Architecture Violations to Avoid

### ❌ NEVER DO THIS:
```typescript
// WRONG: Using discovery service for messages
fetch(`${discoveryUrl}?messages=${stationId}`) // BAD!
fetch(`${discoveryUrl}?relay=true`, { method: 'POST' }) // BAD!
```

### ✅ CORRECT APPROACH:
```typescript
// 1. Use discovery service to find peers
const peers = await discoveryClient.getPeers();

// 2. Establish direct P2P connection 
const connection = await p2pClient.connect(targetStation);

// 3. Send message directly
await connection.sendMessage(message);
```

## Component Responsibilities

### Discovery Client (`src/discoveryClient.ts`)
- ✅ Register this station with discovery service
- ✅ Fetch list of peer stations
- ✅ Maintain heartbeat registration
- ❌ NEVER send/receive user messages

### Bridge Transport (`src/bridge/transport.ts`)
- 🚧 Establish direct P2P connections (MIB-010)
- 🚧 Send messages over P2P connections (MIB-010)
- 🚧 Handle connection failures and retry logic (MIB-010)
- ❌ NEVER use discovery service for message relay

### Enhanced Relay Handler (`src/enhancedRelayHandler.ts`)
- ✅ Route messages within local mesh
- ✅ Integrate with Node Registry for cross-station visibility
- ✅ Handle "status" and "nodes" commands
- 🚧 Route messages to remote stations via P2P (MIB-010)

### Node Registry (`src/nodeRegistry/`)
- ✅ Track nodes across stations
- ✅ Store node metadata and availability
- ✅ Provide cross-station node visibility
- ✅ Handle node synchronization between stations

## Message Flow

### Local Messages (Working)
```
Meshtastic Device → Enhanced Relay Handler → Local Meshtastic Device
```

### Remote Messages (Future - MIB-010)
```
Meshtastic Device → Enhanced Relay Handler → P2P Connection → Remote Station → Remote Device
```

### Discovery (Working)
```
Station A → Discovery Service ← Station B
         (find peer info only)
```

## Key Files

- `discovery-service/discovery.php` - Peer discovery only
- `src/discoveryClient.ts` - Registration and peer lookup
- `src/bridge/transport.ts` - P2P transport (placeholder, warnings added)
- `src/bridge/client.ts` - P2P client interface (disabled polling)
- `src/enhancedRelayHandler.ts` - Main message routing logic
- `src/nodeRegistry/` - Cross-station node tracking

## Development Guidelines

1. **Always remember**: Discovery service = peer discovery only
2. **Before implementing messaging**: Think "is this going P2P or through discovery?"
3. **If it's through discovery**: You're doing it wrong
4. **Test architecture**: Can the discovery service be offline and messages still work between connected stations? If no, architecture is wrong.

## Next Steps (MIB-010)

1. Implement WebSocket/TCP P2P connections
2. Connection establishment and handshake
3. NAT traversal for home networks
4. Message encryption over P2P channels
5. Connection pooling and management
6. Failover and retry logic

**Remember: Discovery finds peers, P2P delivers messages. Never mix these!**
