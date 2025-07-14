# PHASE 2: Meshtastic Internet Bridge System

## Overview
Develop a secure peer-to-peer bridge system allowing Meshtastic devices at different physical locations to communicate via internet, with encrypted discovery and direct P2P message delivery.

## Architecture Summary
- **Discovery**: PHP service on Dreamhost for encrypted peer discovery
- **Messages**: Direct P2P encrypted communication between stations
- **Security**: AES encrypted contact in encryptedmeshlink config validate
encryptedmeshlink config generate-keys
encryptedmeshlink config show

# Diagnostic commands
encryptedmeshlink diagnostic network
encryptedmeshlink diagnostic crypto
encryptedmeshlink diagnostic discovery encrypted messages
- **Queue**: Local SQLite for offline message storage

---

## Epic 1: Core Infrastructure

### MIB-001: Encrypted Discovery Service (PHP)
**Type**: Backend Development  
**Priority**: P0 - Critical  
**Estimate**: 3 days  

**Description**: Create PHP-based discovery service that stores encrypted station contact information without seeing actual IP addresses.

**Acceptance Criteria**:
- [ ] PHP service accepts encrypted station registrations
- [ ] Returns list of other active stations (encrypted)
- [ ] SQLite database for station storage
- [ ] Auto-cleanup of stale entries (>5 min offline)
- [ ] RESTful API with proper error handling
- [ ] Single file deployment for easy hosting

**Technical Requirements**:
- PHP 7.4+ compatible
- SQLite3 database
- AES-256 encryption support
- JSON API endpoints
- CORS headers for cross-origin requests

**API Endpoints**:
```
POST /discovery.php - Register station
GET /discovery.php?peers=true - Get active peers
DELETE /discovery.php?station_id=X - Unregister
GET /discovery.php?health=true - Health check
```

**Database Schema**:
```sql
CREATE TABLE stations (
  station_id TEXT PRIMARY KEY,
  encrypted_contact_info TEXT NOT NULL,
  public_key TEXT NOT NULL,
  last_seen INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
```

---

### MIB-002: Station Configuration System
**Type**: Configuration Management  
**Priority**: P0 - Critical  
**Estimate**: 2 days  

**Description**: Configuration system for stations with secure key management and network isolation.

**Acceptance Criteria**:
- [ ] JSON configuration file format
- [ ] RSA key pair generation and storage
- [ ] Discovery key derivation from master secret
- [ ] Station ID validation and uniqueness
- [ ] Configuration validation and error handling
- [ ] Environment variable override support

**Configuration Format**:
```json
{
  "stationId": "mobile-van-001",
  "stationName": "John's Mobile Van",
  "discoveryServer": "https://yourdomain.com/discovery.php",
  "discoveryKey": "derived-from-master-secret",
  "rsaKeyPath": "./keys/station.pem",
  "localPort": 8080,
  "networkTimeoutMs": 30000,
  "messageRetentionDays": 30,
  "pollIntervalMs": 30000
}
```

**Key Management**:
- RSA-2048 key pair generation
- PEM format key storage
- Discovery key derivation (PBKDF2)
- Secure key rotation support

---

### MIB-003: Cryptography Module
**Type**: Security Implementation  
**Priority**: P0 - Critical  
**Estimate**: 3 days  

**Description**: Encryption/decryption module for contact info discovery and message security.

**Acceptance Criteria**:
- [ ] AES-256-GCM for contact info encryption
- [ ] RSA-2048 for message encryption
- [ ] Key derivation functions (PBKDF2)
- [ ] Secure random number generation
- [ ] Encryption/decryption error handling
- [ ] Performance optimization for large messages

**Technical Implementation**:
```typescript
interface CryptoService {
  // Contact info encryption (symmetric)
  encryptContactInfo(data: ContactInfo, discoveryKey: string): Promise<string>;
  decryptContactInfo(encrypted: string, discoveryKey: string): Promise<ContactInfo>;
  
  // Message encryption (asymmetric)
  encryptMessage(message: string, recipientPublicKey: string): Promise<string>;
  decryptMessage(encrypted: string, privateKey: string): Promise<string>;
  
  // Key management
  generateRSAKeyPair(): Promise<{ publicKey: string; privateKey: string }>;
  deriveDiscoveryKey(masterSecret: string, networkName: string): string;
}
```

**Dependencies**:
- Node.js crypto module
- node-forge for RSA operations
- crypto-js for AES operations

---

## Epic 2: Network Communication

### MIB-004: Discovery Client
**Type**: Network Communication  
**Priority**: P0 - Critical  
**Estimate**: 4 days  

**Description**: Client for encrypted discovery service communication and peer management.

**Acceptance Criteria**:
- [ ] Encrypted station registration
- [ ] Periodic peer discovery polling
- [ ] Contact info encryption/decryption
- [ ] Network error handling and retry logic
- [ ] Offline mode graceful degradation
- [ ] Connection health monitoring

**Technical Implementation**:
```typescript
class DiscoveryClient {
  async registerStation(): Promise<void>;
  async discoverPeers(): Promise<StationInfo[]>;
  async updateContactInfo(info: ContactInfo): Promise<void>;
  async unregister(): Promise<void>;
  
  // Event-driven peer updates
  onPeerDiscovered: (peer: StationInfo) => void;
  onPeerLost: (stationId: string) => void;
}
```

**Features**:
- Exponential backoff retry logic
- Network change detection
- Peer caching and diff detection
- Health check monitoring

---

### MIB-005: P2P Connection Manager
**Type**: Network Communication  
**Priority**: P0 - Critical  
**Estimate**: 5 days  

**Description**: Direct peer-to-peer connection establishment with NAT traversal and fallback mechanisms.

**Acceptance Criteria**:
- [ ] Direct TCP/WebSocket connection attempts
- [ ] NAT hole punching coordination
- [ ] WebRTC data channel fallback
- [ ] Connection health monitoring
- [ ] Automatic reconnection logic
- [ ] Connection quality metrics

**Connection Strategy**:
1. Direct connection attempt (if public IPs)
2. Coordinated NAT hole punching
3. WebRTC data channel (STUN/TURN)
4. Connection quality assessment
5. Automatic failover between methods

**Technical Implementation**:
```typescript
class P2PConnectionManager {
  async connectToPeer(peer: StationInfo): Promise<P2PConnection>;
  async handleIncomingConnection(socket: WebSocket): Promise<void>;
  
  // Connection management
  getActiveConnections(): P2PConnection[];
  closeConnection(stationId: string): Promise<void>;
  
  // Events
  onConnectionEstablished: (connection: P2PConnection) => void;
  onConnectionLost: (stationId: string) => void;
  onMessageReceived: (message: BridgeMessage) => void;
}
```

**NAT Traversal**:
- STUN server integration
- ICE candidate exchange
- Fallback TURN server support

---

### MIB-006: Message Queue System
**Type**: Data Persistence  
**Priority**: P1 - High  
**Estimate**: 3 days  

**Description**: Local SQLite-based message queue for offline message storage and delivery.

**Acceptance Criteria**:
- [ ] SQLite database for message persistence
- [ ] Message priority and TTL handling
- [ ] Retry logic with exponential backoff
- [ ] Queue size limits and cleanup
- [ ] Message deduplication
- [ ] Delivery confirmation tracking

**Database Schema**:
```sql
CREATE TABLE message_queue (
  id TEXT PRIMARY KEY,
  target_station_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  encrypted_message TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_retry_at INTEGER,
  ttl_expires_at INTEGER NOT NULL,
  delivery_status TEXT DEFAULT 'pending'
);

CREATE INDEX idx_target_station ON message_queue(target_station_id);
CREATE INDEX idx_ttl_expires ON message_queue(ttl_expires_at);
CREATE INDEX idx_delivery_status ON message_queue(delivery_status);
```

**Queue Operations**:
```typescript
class MessageQueue {
  async enqueue(message: BridgeMessage): Promise<void>;
  async dequeue(targetStationId: string): Promise<BridgeMessage[]>;
  async markDelivered(messageId: string): Promise<void>;
  async retryFailed(): Promise<BridgeMessage[]>;
  async cleanup(): Promise<void>; // Remove expired messages
}
```

---

## Epic 3: Bridge Integration

### MIB-007: Enhanced Relay Handler
**Type**: Core Logic Enhancement  
**Priority**: P0 - Critical  
**Estimate**: 4 days  

**Description**: Extend existing relay handler to support local vs remote node routing with bridge integration.

**Acceptance Criteria**:
- [ ] Local node check before remote routing
- [ ] Integration with bridge system for remote nodes
- [ ] Message queuing for offline stations
- [ ] Delivery confirmation handling
- [ ] Error handling and user feedback
- [ ] Backward compatibility with current relay

**Message Flow Logic**:
```typescript
async handleRelayMessage(packet: any, targetIdentifier: string, message: string) {
  // 1. Check local nodes first
  const localNode = await this.findLocalNode(targetIdentifier);
  if (localNode) {
    return await this.relayToLocalNode(localNode, message, packet.from);
  }
  
  // 2. Check remote nodes via bridge
  const remoteStation = await this.findRemoteNodeStation(targetIdentifier);
  if (remoteStation) {
    return await this.bridgeMessage(remoteStation, targetIdentifier, message, packet.from);
  }
  
  // 3. Queue for future delivery
  await this.queueMessage(targetIdentifier, message, packet.from);
}
```

**Bridge Integration**:
- Remote node lookup across stations
- Message encryption for bridge transport
- Delivery status tracking
- Queue management integration

---

### MIB-008: Bridge Message Protocol
**Type**: Protocol Design  
**Priority**: P0 - Critical  
**Estimate**: 2 days  

**Description**: Define message format and protocol for inter-station communication.

**Acceptance Criteria**:
- [ ] JSON message format specification
- [ ] Message type definitions
- [ ] Versioning and compatibility
- [ ] Error response handling
- [ ] Message compression support
- [ ] Protocol documentation

**Message Format**:
```typescript
interface BridgeMessage {
  id: string;                    // UUID for tracking
  version: string;               // Protocol version
  type: 'relay' | 'ack' | 'heartbeat' | 'error';
  timestamp: number;             // Unix timestamp
  ttl: number;                   // Expiration timestamp
  
  // Routing info
  fromStation: string;           // Source station ID
  toStation: string;             // Target station ID
  targetNodeId: string;          // Meshtastic node ID
  
  // Payload (encrypted)
  encryptedPayload: string;      // RSA encrypted message
  
  // Metadata
  hops: string[];               // Routing path
  priority: number;             // 0-10 priority
  requiresAck: boolean;         // Delivery confirmation
}
```

**Protocol Operations**:
- Message relay request
- Delivery acknowledgment
- Node availability query
- Heartbeat/keepalive
- Error reporting

---

### MIB-009: Node Registry Bridge
**Type**: Integration Component  
**Priority**: P1 - High  
**Estimate**: 3 days  

**Description**: Cross-station node registry for tracking which nodes are available at which stations.

**Acceptance Criteria**:
- [ ] Shared node registry between stations
- [ ] Periodic node list synchronization
- [ ] Node availability tracking
- [ ] Station-to-node mapping
- [ ] Registry cache management
- [ ] Conflict resolution for duplicate nodes

**Registry Operations**:
```typescript
class NodeRegistryBridge {
  // Local operations
  async registerLocalNode(nodeInfo: NodeInfo): Promise<void>;
  async removeLocalNode(nodeId: string): Promise<void>;
  
  // Remote operations
  async queryRemoteNode(nodeId: string): Promise<StationInfo | null>;
  async syncNodeRegistry(remoteStation: string): Promise<void>;
  
  // Registry management
  async getNodeLocation(nodeId: string): Promise<'local' | 'remote' | 'unknown'>;
  async getAllRemoteNodes(): Promise<Map<string, NodeInfo>>;
}
```

**Synchronization**:
- Periodic registry sync between stations
- Delta updates for efficiency
- Conflict resolution strategies
- Cache invalidation logic

---

## Epic 4: User Interface & Monitoring

### MIB-010: Bridge Status Dashboard
**Type**: Web Interface  
**Priority**: P2 - Medium  
**Estimate**: 3 days  

**Description**: Web-based dashboard for monitoring bridge status, connections, and message queues.

**Acceptance Criteria**:
- [ ] Real-time connection status display
- [ ] Message queue visualization
- [ ] Peer discovery status
- [ ] Error log viewing
- [ ] Performance metrics
- [ ] Configuration management interface

**Dashboard Features**:
- Station connectivity map
- Message throughput graphs
- Queue depth monitoring
- Error rate tracking
- Network latency metrics
- Remote node availability

---

### MIB-011: Enhanced VoidBridge CLI
**Type**: Command Line Interface  
**Priority**: P2 - Medium  
**Estimate**: 2 days  

**Description**: Enhanced command-line interface with bridge-specific commands and status reporting.

**Acceptance Criteria**:
- [ ] Bridge status commands
- [ ] Queue management commands
- [ ] Peer discovery tools
- [ ] Message tracing capabilities
- [ ] Configuration validation
- [ ] Interactive troubleshooting

**CLI Commands**:
```bash
# Bridge operations
voidbridge bridge status
voidbridge bridge peers
voidbridge bridge queue [station-id]
voidbridge bridge connect <station-id>
voidbridge bridge trace <message-id>

# Configuration
mesher config validate
mesher config generate-keys
mesher config show

# Diagnostics
mesher diagnostic network
mesher diagnostic crypto
mesher diagnostic discovery
```

---

## Epic 5: Testing & Deployment

### MIB-012: Integration Test Suite
**Type**: Quality Assurance  
**Priority**: P1 - High  
**Estimate**: 4 days  

**Description**: Comprehensive test suite for bridge functionality including multi-station scenarios.

**Acceptance Criteria**:
- [ ] Unit tests for all modules
- [ ] Integration tests for P2P communication
- [ ] Multi-station test scenarios
- [ ] Network failure simulation
- [ ] Performance benchmarking
- [ ] Security penetration testing

**Test Scenarios**:
- Two-station basic communication
- NAT traversal scenarios
- Network interruption recovery
- Message queue overflow handling
- Encryption/decryption validation
- Discovery service failure handling

---

### MIB-013: Deployment Documentation
**Type**: Documentation  
**Priority**: P1 - High  
**Estimate**: 2 days  

**Description**: Complete deployment and setup documentation for end users.

**Acceptance Criteria**:
- [ ] PHP discovery service setup guide
- [ ] Raspberry Pi installation instructions
- [ ] Configuration template and examples
- [ ] Troubleshooting guide
- [ ] Security best practices
- [ ] Network configuration requirements

**Documentation Sections**:
1. System Requirements
2. Discovery Service Deployment
3. Station Configuration
4. Network Setup and Port Forwarding
5. Security Configuration
6. Monitoring and Maintenance
7. Troubleshooting Common Issues

---

### MIB-014: Release Packaging
**Type**: Build & Deploy  
**Priority**: P1 - High  
**Estimate**: 2 days  

**Description**: Package system for easy deployment on Raspberry Pi with automated setup.

**Acceptance Criteria**:
- [ ] Automated installer script
- [ ] Docker container option
- [ ] Systemd service configuration
- [ ] Log rotation setup
- [ ] Update mechanism
- [ ] Backup/restore functionality

**Deployment Options**:
- Native Node.js installation
- Docker container deployment
- Snap package (Ubuntu)
- Automated Pi image builder

---

### MIB-015: Docker Development Environment
**Type**: Development Infrastructure  
**Priority**: P0 - Critical  
**Estimate**: 2 days  

**Description**: Create Docker-based development environment for multi-station testing and simulation.

**Acceptance Criteria**:
- [ ] Multi-container development setup with docker-compose
- [ ] Simulated network conditions and failure scenarios
- [ ] Easy station configuration and key management
- [ ] Development scripts and automation tooling
- [ ] CI/CD integration and automated testing
- [ ] Mock Meshtastic device simulator

**Technical Implementation**:
- Docker Compose for orchestration
- Separate containers for each station
- Shared discovery service container
- Network simulation capabilities
- Volume management for persistence
- Development-specific environment variables

**Development Features**:
- Hot reload for code changes
- Integrated logging and monitoring
- Network partitioning simulation
- Load testing capabilities
- Configuration validation tools

---

### MIB-016: Production Containerization
**Type**: Deployment Infrastructure  
**Priority**: P1 - High  
**Estimate**: 2 days  

**Description**: Production-ready containers optimized for Raspberry Pi deployment with hardware integration.

**Acceptance Criteria**:
- [ ] Optimized multi-arch container images (ARM64/AMD64)
- [ ] USB device access for Meshtastic hardware
- [ ] Volume management for data persistence
- [ ] Health checks and monitoring integration
- [ ] Update/rollback mechanisms
- [ ] Security hardening and non-root execution

**Production Features**:
- Automatic restart policies
- Resource limits and monitoring
- Log rotation and management
- Backup and restore functionality
- Network host mode for P2P connections
- Systemd integration for Pi deployment

---

## Technical Dependencies

### External Libraries
- **Crypto**: node-forge, crypto-js
- **Networking**: ws, simple-peer (WebRTC)
- **Database**: better-sqlite3
- **HTTP**: node-fetch, express
- **Utilities**: uuid, lodash

### Infrastructure Requirements
- **PHP Hosting**: Dreamhost or compatible
- **STUN/TURN**: Free public servers or self-hosted
- **Network**: Port forwarding capability
- **Hardware**: Raspberry Pi 3B+ or higher

### Security Considerations
- RSA key strength (2048-bit minimum)
- AES encryption mode (GCM preferred)
- Key rotation procedures
- Discovery key distribution
- Network isolation strategies

---

## Risk Assessment

### High Risk Items
- **NAT Traversal Complexity**: P2P connections may fail in complex network scenarios
- **Discovery Service Reliability**: Single point of failure for peer discovery
- **Key Management**: Secure distribution of discovery keys

### Medium Risk Items
- **Performance**: Message throughput under high load
- **Compatibility**: Various Raspberry Pi configurations
- **Network Changes**: Dynamic IP handling

### Mitigation Strategies
- Comprehensive fallback mechanisms for connections
- Multiple discovery service options
- Thorough testing in various network environments
- Clear documentation and setup validation tools

---

## Success Metrics
- **Connectivity**: >95% successful peer discovery
- **Latency**: <5 second message delivery (when online)
- **Reliability**: <1% message loss rate
- **Usability**: Setup time <30 minutes for technical users
- **Security**: Zero plaintext IP exposure on discovery service
