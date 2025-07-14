# Multi-Station Mesh Development Environment

This development environment simulates multiple Meshtastic stations with internet bridge capabilities using Docker containers.

## Quick Start

```bash
# Start the core development environment
docker-compose -f docker-compose.dev.yml up -d

# Start with development tools
docker-compose -f docker-compose.dev.yml --profile tools up -d

# Start with debugging tools
docker-compose -f docker-compose.dev.yml --profile debug up -d

# View logs from all services
docker-compose -f docker-compose.dev.yml logs -f

# Stop all services
docker-compose -f docker-compose.dev.yml down
```

## Services Overview

### Discovery Service (PHP)
- **Purpose**: Simulates the Dreamhost PHP discovery service
- **Port**: 8080
- **Health Check**: http://localhost:8080/discovery.php?health=true
- **Features**: 
  - Station registration and discovery
  - Encrypted contact information exchange
  - Debug mode for development

### Station A (Mobile Van Simulation)
- **Purpose**: Simulates a mobile van station
- **Port**: 8081
- **Features**:
  - Connects to discovery service
  - Encrypts/decrypts messages
  - Manages local message queue
  - Simulates mobile connectivity patterns

### Station B (Base Station Simulation)
- **Purpose**: Simulates a fixed base station
- **Port**: 8082
- **Features**:
  - Stable connectivity simulation
  - Message relay capabilities
  - Base station specific configurations

### Meshtastic Device Simulator
- **Purpose**: Simulates actual Meshtastic radio devices
- **Port**: 8083 (Web interface)
- **Features**:
  - Multiple node simulation
  - Message generation and routing
  - Network topology simulation
  - Node mobility patterns

### Development Tools (Optional Profile)
- **Purpose**: Development dashboard and utilities
- **Port**: 8084
- **Features**:
  - Real-time message monitoring
  - Network status dashboard
  - Configuration management UI
  - Log aggregation

### Network Monitor (Debug Profile)
- **Purpose**: Network debugging and analysis
- **Features**:
  - Traffic analysis tools
  - Network condition simulation
  - Connection testing utilities

## Development Workflow

### 1. Start the Environment
```bash
# Basic development setup
docker-compose -f docker-compose.dev.yml up -d discovery station-a station-b

# Wait for services to be healthy
docker-compose -f docker-compose.dev.yml ps
```

### 2. Test Station Communication
```bash
# Check station A logs
docker-compose -f docker-compose.dev.yml logs -f station-a

# Check station B logs
docker-compose -f docker-compose.dev.yml logs -f station-b

# Check discovery service logs
docker-compose -f docker-compose.dev.yml logs -f discovery
```

### 3. Send Test Messages
```bash
# Connect to station A container
docker-compose -f docker-compose.dev.yml exec station-a /bin/bash

# Send a test message
node -e "require('./src/testMessage.js').sendMessage('Hello from Station A')"
```

### 4. Monitor Network Activity
```bash
# Start with debug tools
docker-compose -f docker-compose.dev.yml --profile debug up -d network-monitor

# Access network monitor
docker-compose -f docker-compose.dev.yml exec network-monitor /bin/bash
```

## Configuration

### Environment Variables

Each station supports these environment variables:

- `STATION_ID`: Unique identifier for the station
- `STATION_NAME`: Human-readable station name
- `DISCOVERY_SERVER`: URL of the discovery service
- `LOCAL_PORT`: Port for the station's web interface
- `POLL_INTERVAL_MS`: How often to poll the discovery service
- `NETWORK_TIMEOUT_MS`: Network operation timeout
- `DEBUG`: Enable debug logging

### Volume Mounts

- `config/`: Station configuration files
- `keys/`: RSA key pairs and certificates
- `data/`: SQLite databases and message queues
- `logs/`: Application logs
- `src/`: Source code (read-only in development)

## Testing Scenarios

### Scenario 1: Basic Message Relay
1. Start stations A and B
2. Send message from A to discovery service
3. Verify B receives and processes the message
4. Check message encryption/decryption

### Scenario 2: Network Interruption
1. Start all services
2. Establish communication between stations
3. Temporarily stop discovery service
4. Verify local queuing behavior
5. Restart discovery service
6. Verify message delivery resumes

### Scenario 3: Mobile Station Simulation
1. Configure station A with mobile patterns
2. Simulate intermittent connectivity
3. Test message queuing and retry logic
4. Verify data integrity during connectivity gaps

## Debugging

### View Service Status
```bash
# Check health of all services
docker-compose -f docker-compose.dev.yml ps

# View specific service logs
docker-compose -f docker-compose.dev.yml logs discovery
docker-compose -f docker-compose.dev.yml logs station-a
```

### Access Service Containers
```bash
# Connect to station container
docker-compose -f docker-compose.dev.yml exec station-a /bin/bash

# Connect to discovery service
docker-compose -f docker-compose.dev.yml exec discovery /bin/bash
```

### Network Debugging
```bash
# Check network connectivity
docker-compose -f docker-compose.dev.yml exec station-a ping discovery

# View network information
docker network inspect mesher_mesh-dev-network
```

## Data Persistence

All important data is stored in Docker volumes:
- Station configurations persist between restarts
- RSA keys are generated once and reused
- Message queues maintain state
- Logs are retained for analysis

### Reset Environment
```bash
# Stop all services
docker-compose -f docker-compose.dev.yml down

# Remove all volumes (complete reset)
docker-compose -f docker-compose.dev.yml down -v

# Remove specific volume
docker volume rm mesher_station_a_data
```

## Performance Monitoring

### Resource Usage
```bash
# Monitor container resource usage
docker stats

# View specific service resources
docker-compose -f docker-compose.dev.yml exec station-a top
```

### Message Throughput
- Monitor logs for message processing times
- Use development dashboard (port 8084) for real-time metrics
- Check SQLite databases for queue depths

## Security Testing

### Encryption Verification
1. Enable debug logging on all services
2. Send messages between stations
3. Monitor logs to verify:
   - RSA key exchange
   - AES message encryption
   - Contact info encryption

### Discovery Service Security
1. Test with invalid station IDs
2. Verify encrypted contact information
3. Test discovery service rate limiting
4. Verify no sensitive data in logs

## Integration with Physical Hardware

To test with actual Meshtastic devices:

1. Connect USB device to host
2. Map device to container:
   ```yaml
   devices:
     - "/dev/ttyUSB0:/dev/ttyUSB0"
   ```
3. Configure station to use real transport
4. Test hybrid virtual/physical setup
