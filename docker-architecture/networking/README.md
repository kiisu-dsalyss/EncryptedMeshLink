# Networking Architecture

This document outlines the networking strategies for the Meshtastic Internet Bridge system.

## Network Architecture Overview

The system operates with multiple network layers:

1. **Meshtastic Radio Layer** - LoRa mesh communication
2. **Local Network Layer** - Pi station local networking  
3. **Internet Layer** - WAN connectivity between stations
4. **Discovery Layer** - Encrypted peer discovery service
5. **P2P Layer** - Direct encrypted station-to-station communication

## Network Topology

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Station A     │    │   Discovery     │    │   Station B     │
│  (Mobile Van)   │    │    Service      │    │ (Base Station)  │
│                 │    │  (Dreamhost)    │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │   Mesh      │ │    │ │     PHP     │ │    │ │   Mesh      │ │
│ │  Container  │ │    │ │   Service   │ │    │ │  Container  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│       │         │    │                 │    │       │         │
│ ┌─────────────┐ │    └─────────────────┘    │ ┌─────────────┐ │
│ │ Raspberry   │ │           │                │ │ Raspberry   │ │
│ │     Pi      │◄────────────┼────────────────┤ │     Pi      │ │
│ └─────────────┘ │           │                │ └─────────────┘ │
│       │         │    ┌─────────────────┐    │       │         │
│ ┌─────────────┐ │    │  Internet/WAN   │    │ ┌─────────────┐ │
│ │ Meshtastic  │ │    │                 │    │ │ Meshtastic  │ │
│ │   Device    │ │    └─────────────────┘    │ │   Device    │ │
│ └─────────────┘ │                           │ └─────────────┘ │
└─────────────────┘                           └─────────────────┘
```

## Network Layers

### 1. Meshtastic Radio Layer (LoRa)

**Frequency**: 915MHz (North America) / 868MHz (Europe)
**Range**: 2-20km depending on terrain and conditions
**Protocol**: Meshtastic protocol over LoRa
**Topology**: Mesh network with automatic routing

```
Meshtastic Device ──USB──► Pi Container
                          │
                          ▼
                    TransportNodeSerial
                          │
                          ▼
                    Message Processing
```

### 2. Local Network Layer (Pi)

**Docker Network**: Bridge network for container communication
**Container Ports**: 8080 (station interface)
**USB Mapping**: `/dev/ttyUSB0` → container device access
**Local Storage**: Docker volumes for persistence

```yaml
networks:
  mesh-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### 3. Internet Layer (WAN)

**Connectivity Options**:
- Primary: Ethernet (wired)
- Backup: WiFi
- Fallback: Cellular (4G/5G with USB modem)

**Network Requirements**:
- Outbound HTTPS (443) for discovery service
- Inbound TCP (custom ports) for P2P connections
- NAT traversal capability
- Dynamic DNS support (optional)

### 4. Discovery Layer

**Service Location**: Dreamhost shared hosting
**Protocol**: HTTPS with encrypted payloads
**Authentication**: Station ID + timestamp signatures
**Data Format**: JSON with AES-256-GCM encryption

#### Discovery Service API

```php
// POST /discovery.php
{
  "action": "register",
  "station_id": "mobile-van-001",
  "encrypted_contact": "AES_ENCRYPTED_CONTACT_INFO",
  "signature": "RSA_SIGNATURE",
  "timestamp": 1640995200
}

// Response
{
  "status": "success",
  "peers": [
    {
      "station_id": "base-station-001", 
      "encrypted_contact": "AES_ENCRYPTED_CONTACT_INFO",
      "last_seen": 1640995150
    }
  ]
}
```

#### Contact Information Format

```json
{
  "ip": "203.0.113.45",
  "port": 9001,
  "public_key": "RSA_PUBLIC_KEY_PEM",
  "capabilities": ["relay", "store-forward"],
  "location": {
    "lat": 40.7128,
    "lon": -74.0060,
    "accuracy": "city"
  }
}
```

### 5. P2P Layer (Direct Communication)

**Protocol**: Custom TCP with TLS-like handshake
**Encryption**: RSA key exchange + AES-256-GCM messages
**NAT Traversal**: UPnP + STUN/TURN fallback
**Connection Management**: Persistent connections with heartbeat

#### P2P Handshake Protocol

```
Station A                           Station B
    │                                   │
    │ ──── TCP Connection ─────────────► │
    │                                   │
    │ ──── RSA Public Key ─────────────► │
    │ ◄─── RSA Public Key ──────────── │
    │                                   │
    │ ──── AES Key (RSA Encrypted) ───► │
    │ ◄─── ACK (AES Encrypted) ─────── │
    │                                   │
    │ ◄──── Encrypted Messages ──────► │
```

## Network Configuration

### Development Environment

**Docker Compose Network**:
```yaml
networks:
  mesh-dev-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
    driver_opts:
      com.docker.network.bridge.name: mesh-dev-br
```

**Port Allocation**:
- Discovery Service: 8080
- Station A: 8081  
- Station B: 8082
- Simulator: 8083
- Dev Tools: 8084

### Production Environment

**Pi Network Configuration**:
```bash
# Static IP configuration (optional)
sudo tee -a /etc/dhcpcd.conf << EOF
interface eth0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 8.8.4.4
EOF
```

**Container Network**:
```yaml
networks:
  mesh-network:
    driver: bridge
    enable_ipv6: false
    ipam:
      config:
        - subnet: 172.30.0.0/16
```

**Firewall Rules**:
```bash
# Allow container communication
sudo ufw allow in on docker0

# Allow station interface
sudo ufw allow 8080/tcp

# Allow P2P ports range
sudo ufw allow 9000:9100/tcp
```

## NAT Traversal

### UPnP Port Mapping

```javascript
const upnp = require('nat-upnp');
const client = upnp.createClient();

// Map external port to container
client.portMapping({
  public: 9001,
  private: 8080,
  ttl: 3600
}, (err) => {
  if (err) console.log('UPnP mapping failed:', err);
  else console.log('UPnP port mapped: 9001 -> 8080');
});
```

### STUN Server Discovery

```javascript
const stun = require('stun');

async function getExternalAddress() {
  const server = { host: 'stun.l.google.com', port: 19302 };
  const response = await stun.request(server);
  return response.getXorAddress();
}
```

### Connection Strategies

1. **Direct Connection** - Try direct IP:port
2. **UPnP Mapped** - Use UPnP mapped external port  
3. **STUN Hole Punching** - Simultaneous TCP connect
4. **Relay Fallback** - Use discovery service as relay

## Security Considerations

### Network Security

**Encryption**:
- Discovery: HTTPS + AES-256-GCM payload encryption
- P2P: RSA-2048 key exchange + AES-256-GCM messages
- Storage: AES-256-CBC for local data at rest

**Authentication**:
- Station identity verification via RSA signatures
- Message authentication with HMAC-SHA256
- Timestamp validation to prevent replay attacks

**Network Isolation**:
- Container network isolation
- Firewall rules restricting access
- No direct container-to-internet exposure

### Attack Mitigation

**DDoS Protection**:
- Rate limiting on discovery service
- Connection throttling per IP
- Automatic blacklisting of malicious IPs

**Man-in-the-Middle Prevention**:
- RSA public key fingerprint verification
- Certificate pinning for discovery service
- Perfect forward secrecy with ephemeral keys

## Monitoring and Diagnostics

### Network Health Monitoring

```javascript
// Connection health check
async function checkNetworkHealth() {
  const checks = {
    internet: await pingHost('8.8.8.8'),
    discovery: await httpCheck(DISCOVERY_SERVER),
    peers: await checkPeerConnections(),
    meshtastic: await checkMeshtasticDevice()
  };
  
  return checks;
}
```

### Network Diagnostics

**Connection Testing**:
```bash
# Test discovery service connectivity
curl -I https://yourdomain.com/discovery.php

# Test P2P port accessibility  
nc -zv peer-ip 9001

# Check container networking
docker exec mesh-station ping discovery-service
```

**Bandwidth Monitoring**:
```bash
# Monitor container network usage
docker stats --format "table {{.Container}}\t{{.NetIO}}"

# Pi network usage
sudo iftop -i eth0
```

## Performance Optimization

### Network Tuning

**TCP Settings**:
```bash
# Optimize TCP for long-distance connections
echo 'net.core.rmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_window_scaling = 1' >> /etc/sysctl.conf
```

**Container Network Performance**:
```yaml
# Use host networking for production (if needed)
network_mode: host

# Or optimize bridge networking
sysctls:
  - net.core.somaxconn=65535
  - net.ipv4.tcp_max_syn_backlog=65535
```

### Bandwidth Management

**Quality of Service (QoS)**:
- Priority: Meshtastic traffic > P2P traffic > Discovery polls
- Rate limiting: Discovery service polls (max 1/minute)
- Burst handling: Queue management for message bursts

**Compression**:
- JSON message compression with gzip
- Image/file compression before transmission
- Protocol buffer optimization for repeated data

## Troubleshooting

### Common Network Issues

**Discovery Service Unreachable**:
```bash
# Check DNS resolution
nslookup yourdomain.com

# Check HTTPS connectivity
curl -v https://yourdomain.com/discovery.php

# Check from container
docker exec mesh-station curl -I https://yourdomain.com/discovery.php
```

**P2P Connection Failures**:
```bash
# Check port accessibility
nc -zv peer-ip 9001

# Check UPnP status
upnpc -l

# Test from container
docker exec mesh-station nc -zv peer-ip 9001
```

**Container Networking Issues**:
```bash
# Inspect Docker network
docker network inspect mesher_mesh-network

# Check container connectivity
docker exec mesh-station ping 172.30.0.1

# Check iptables rules
sudo iptables -L DOCKER-USER
```

### Network Debugging Tools

**Packet Capture**:
```bash
# Capture container traffic
sudo tcpdump -i docker0 host container-ip

# Capture P2P traffic
sudo tcpdump -i eth0 port 9001

# Analyze with Wireshark
sudo tcpdump -i any -w capture.pcap
```

**Performance Analysis**:
```bash
# Network latency testing
ping -c 10 peer-ip

# Bandwidth testing
iperf3 -c peer-ip -p 9001

# Connection tracking
ss -tuln | grep 8080
```

## Scalability Considerations

### Large Network Support

**Discovery Service Scaling**:
- Database indexing for station lookups
- CDN deployment for global access
- Load balancing with multiple PHP instances

**P2P Network Scaling**:
- DHT-based peer discovery for >100 stations
- Regional discovery service clustering
- Mesh overlay network optimization

**Bandwidth Optimization**:
- Message compression and deduplication
- Store-and-forward optimization
- Regional message routing preferences
