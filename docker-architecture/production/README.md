# Production Deployment for Raspberry Pi

This directory contains production deployment configurations for Raspberry Pi stations.

## Overview

Production deployment uses single containers per Pi with optimized configurations for:

- ARM64 architecture (Raspberry Pi 4/5)
- Limited resources (4GB RAM typical)
- Real USB Meshtastic device integration
- Persistent data storage
- Automatic startup and recovery
- Remote monitoring capabilities

## Pi Station Setup

### Hardware Requirements

**Recommended Raspberry Pi Configuration:**
- Raspberry Pi 4 Model B (4GB RAM minimum)
- 32GB+ MicroSD card (Class 10 or better)
- USB 3.0 for Meshtastic device connection
- Ethernet connection (WiFi backup)
- Case with adequate cooling

**Meshtastic Device:**
- Heltec WiFi LoRa 32 V3
- LILYGO T-Beam
- RAK WisBlock Core + LoRa module
- Connected via USB cable

### Base Pi Image

Start with Raspberry Pi OS Lite (64-bit):

```bash
# Download and flash Pi OS Lite
# Enable SSH and configure networking
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y
```

## Production Container

### docker-compose.prod.yml

```yaml
version: '3.8'

services:
  mesh-station:
    build:
      context: .
      dockerfile: docker-architecture/production/Dockerfile.prod
      target: production
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - STATION_ID=${STATION_ID}
      - STATION_NAME=${STATION_NAME}
      - DISCOVERY_SERVER=${DISCOVERY_SERVER}
      - LOCAL_PORT=8080
      - POLL_INTERVAL_MS=${POLL_INTERVAL_MS:-30000}
      - NETWORK_TIMEOUT_MS=${NETWORK_TIMEOUT_MS:-60000}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - HEALTH_CHECK_INTERVAL=${HEALTH_CHECK_INTERVAL:-60000}
    volumes:
      - mesh_config:/app/config
      - mesh_keys:/app/keys
      - mesh_data:/app/data
      - mesh_logs:/app/logs
      - /var/run/docker.sock:/var/run/docker.sock:ro  # For container health monitoring
    devices:
      - "/dev/ttyUSB0:/dev/ttyUSB0"  # Meshtastic device
    ports:
      - "8080:8080"
    networks:
      - mesh-network
    healthcheck:
      test: ["CMD", "node", "/app/healthcheck.js"]
      interval: 60s
      timeout: 30s
      retries: 3
      start_period: 120s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
        reservations:
          memory: 256M
          cpus: '0.5'

  # Optional: Log aggregator for remote monitoring
  log-collector:
    image: fluent/fluent-bit:latest
    restart: unless-stopped
    volumes:
      - mesh_logs:/var/log/mesh:ro
      - ./fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf:ro
    depends_on:
      - mesh-station
    networks:
      - mesh-network
    profiles:
      - monitoring

volumes:
  mesh_config:
    driver: local
  mesh_keys:
    driver: local
  mesh_data:
    driver: local
  mesh_logs:
    driver: local

networks:
  mesh-network:
    driver: bridge
```

### Environment Configuration

Create `.env` file for each Pi:

```bash
# Station Identity
STATION_ID=pi-mobile-van-001
STATION_NAME=Mobile Van Alpha
DISCOVERY_SERVER=https://yourdomain.com/discovery.php

# Network Configuration
POLL_INTERVAL_MS=30000
NETWORK_TIMEOUT_MS=60000
HEALTH_CHECK_INTERVAL=60000

# Logging
LOG_LEVEL=info

# Hardware Configuration
USB_DEVICE=/dev/ttyUSB0
```

## Production Dockerfile

### Multi-stage Build

```dockerfile
# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY config/ ./config/

# Build application (if needed)
RUN npm run build || echo "No build step defined"

# Production stage
FROM node:24-alpine AS production

# Install production system dependencies
RUN apk add --no-cache \
    curl \
    sqlite \
    udev \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/src ./src
COPY --from=builder /app/config ./config

# Copy production-specific files
COPY docker-architecture/production/healthcheck.js ./
COPY docker-architecture/production/startup.sh ./

# Create necessary directories
RUN mkdir -p keys data logs config

# Create non-root user
RUN addgroup -g 1001 -S mesher && \
    adduser -S mesher -u 1001 -G mesher

# Set up USB device permissions
RUN addgroup mesher dialout

# Set ownership
RUN chown -R mesher:mesher /app

# Switch to non-root user
USER mesher

# Health check
HEALTHCHECK --interval=60s --timeout=30s --start-period=120s --retries=3 \
    CMD node /app/healthcheck.js

EXPOSE 8080

CMD ["node", "src/station.js"]
```

## Deployment Scripts

### deploy.sh

```bash
#!/bin/bash

set -e

PI_HOST=${1:-"pi@raspberrypi.local"}
STATION_ID=${2:-"default-station"}

echo "Deploying to $PI_HOST with station ID: $STATION_ID"

# Copy deployment files to Pi
echo "Copying files to Pi..."
scp -r docker-architecture/production/* $PI_HOST:~/mesh-station/
scp docker-compose.prod.yml $PI_HOST:~/mesh-station/
scp .env.template $PI_HOST:~/mesh-station/.env

# SSH into Pi and deploy
ssh $PI_HOST << EOF
cd ~/mesh-station

# Update environment file
sed -i "s/STATION_ID=.*/STATION_ID=$STATION_ID/" .env

# Pull latest images and deploy
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Show status
docker-compose -f docker-compose.prod.yml ps
EOF

echo "Deployment complete!"
```

### update.sh

```bash
#!/bin/bash

set -e

PI_HOST=${1:-"pi@raspberrypi.local"}

echo "Updating mesh station on $PI_HOST"

ssh $PI_HOST << EOF
cd ~/mesh-station

# Backup current data
docker-compose -f docker-compose.prod.yml exec mesh-station node -e "
  const fs = require('fs');
  const backup = {
    timestamp: new Date().toISOString(),
    config: fs.existsSync('/app/config') ? 'exists' : 'missing',
    keys: fs.existsSync('/app/keys') ? 'exists' : 'missing',
    data: fs.existsSync('/app/data') ? 'exists' : 'missing'
  };
  console.log('Backup status:', JSON.stringify(backup, null, 2));
"

# Pull latest image
docker-compose -f docker-compose.prod.yml pull

# Restart with new image
docker-compose -f docker-compose.prod.yml up -d

# Wait for health check
echo "Waiting for service to be healthy..."
timeout 180 docker-compose -f docker-compose.prod.yml exec mesh-station node healthcheck.js

echo "Update complete and service is healthy"
EOF
```

## Monitoring and Maintenance

### Health Monitoring

```bash
# Check service health
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs --tail=50 mesh-station

# Check container resources
docker stats mesher_mesh-station_1
```

### Remote Monitoring Setup

Create `monitoring-setup.sh`:

```bash
#!/bin/bash

# Install monitoring agent
curl -sSL https://agent.logs.betterstack.com/setup.sh | bash

# Configure log forwarding
sudo tee /etc/vector/vector.toml << EOF
[sources.docker_logs]
type = "docker_logs"

[sinks.remote_logs]
type = "http"
inputs = ["docker_logs"]
uri = "https://in.logs.betterstack.com/"
encoding.codec = "json"
headers.Authorization = "Bearer YOUR_TOKEN"
EOF

# Start monitoring
sudo systemctl enable vector
sudo systemctl start vector
```

### Backup Strategy

Create `backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/home/pi/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup Docker volumes
docker run --rm -v mesher_mesh_config:/source -v $BACKUP_DIR:/backup alpine tar czf /backup/config_$DATE.tar.gz -C /source .
docker run --rm -v mesher_mesh_keys:/source -v $BACKUP_DIR:/backup alpine tar czf /backup/keys_$DATE.tar.gz -C /source .
docker run --rm -v mesher_mesh_data:/source -v $BACKUP_DIR:/backup alpine tar czf /backup/data_$DATE.tar.gz -C /source .

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

## Security Hardening

### Pi Security

```bash
# Disable default pi user (create new user first)
sudo deluser pi

# Configure firewall
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 8080/tcp

# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable wifi
sudo systemctl disable avahi-daemon

# Update SSH configuration
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### Container Security

- Non-root user execution
- Read-only root filesystem where possible
- Minimal base image (Alpine Linux)
- Resource limits enforced
- No privileged containers
- Secure volume permissions

### Network Security

- Container network isolation
- Firewall rules for necessary ports only
- VPN tunneling for remote access
- SSL/TLS for all external communications

## Troubleshooting

### Common Issues

**USB Device Not Found:**
```bash
# Check USB devices
lsusb
ls -la /dev/ttyUSB*

# Check container device mapping
docker-compose -f docker-compose.prod.yml exec mesh-station ls -la /dev/
```

**Memory Issues:**
```bash
# Check memory usage
free -h
docker stats

# Adjust container memory limits in docker-compose.prod.yml
```

**Network Connectivity:**
```bash
# Test discovery server connection
docker-compose -f docker-compose.prod.yml exec mesh-station curl -I $DISCOVERY_SERVER

# Check container networking
docker network ls
docker network inspect mesher_mesh-network
```

### Log Analysis

```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs mesh-station | grep ERROR

# System logs
journalctl -u docker.service -f

# Container resource logs
docker exec mesher_mesh-station_1 cat /proc/meminfo
```

## Performance Optimization

### Pi Optimization

```bash
# Increase swap for build operations
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=100/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# GPU memory split (reduce for headless)
sudo raspi-config nonint do_memory_split 16

# Overclock (with adequate cooling)
sudo raspi-config nonint do_overclock Pi4
```

### Container Optimization

- Use multi-stage builds to reduce image size
- Implement proper health checks
- Configure resource limits
- Use volume mounts for persistent data
- Implement graceful shutdown handling
