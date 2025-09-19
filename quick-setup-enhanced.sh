#!/bin/bash

# EncryptedMeshLink Enhanced Quick Setup - No Repository Clone Required
# Usage: curl -sSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/quick-setup-enhanced.sh | bash

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 EncryptedMeshLink Enhanced Quick Setup${NC}"
echo "=========================================="
echo ""
echo "⚡ Enhanced with automatic port conflict resolution"
echo "📦 No repository clone required"
echo ""

# Detect platform
ARCH=$(uname -m)
if [[ "$ARCH" =~ ^(aarch64|arm64|armv7l)$ ]]; then
    IMAGE="ghcr.io/kiisu-dsalyss/encryptedmeshlink:pi-latest"
    echo "🥧 Raspberry Pi detected"
else
    IMAGE="ghcr.io/kiisu-dsalyss/encryptedmeshlink:latest"
    echo "🐧 Linux x86_64 detected"
fi

# Install Docker if needed
if ! command -v docker &> /dev/null; then
    echo "📦 Installing Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    sudo systemctl enable docker
    sudo systemctl start docker
fi

# Check if Node.js is available for port checking
NODE_AVAILABLE=false
if command -v node &> /dev/null; then
    NODE_AVAILABLE=true
    echo "✅ Node.js detected - enabling smart port management"
else
    echo "ℹ️  Node.js not found - using basic port checking"
fi

# Create directories
EML_DIR="$HOME/encryptedmeshlink"
mkdir -p "$EML_DIR"/{config,data,logs}
cd "$EML_DIR"

# Download port setup script
echo "📥 Downloading port management script..."
curl -fsSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/scripts/setup-ports.js -o setup-ports.js

# Initialize ports
P2P_PORT=8447
WEB_PORT=3000

if [ "$NODE_AVAILABLE" = true ]; then
    echo "🔍 Checking port availability with smart detection..."
    
    # Run the port setup script and capture output
    PORT_OUTPUT=$(node setup-ports.js 2>&1)
    echo "$PORT_OUTPUT"
    
    # Extract ports from the output
    if echo "$PORT_OUTPUT" | grep -q "EXPORT_P2P_PORT="; then
        P2P_PORT=$(echo "$PORT_OUTPUT" | grep "EXPORT_P2P_PORT=" | cut -d'=' -f2)
        WEB_PORT=$(echo "$PORT_OUTPUT" | grep "EXPORT_WEB_PORT=" | cut -d'=' -f2)
        echo -e "${GREEN}✅ Port configuration completed successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Port script had issues, using fallback method${NC}"
        NODE_AVAILABLE=false
    fi
fi

# Fallback port checking if Node.js failed or unavailable
if [ "$NODE_AVAILABLE" = false ]; then
    echo "🔍 Using basic port availability checking..."
    
    # Simple port check using netstat/ss
    check_port() {
        local port=$1
        if command -v ss &> /dev/null; then
            ss -tuln | grep -q ":$port " && return 1 || return 0
        elif command -v netstat &> /dev/null; then
            netstat -tuln | grep -q ":$port " && return 1 || return 0
        else
            # Last resort: try to bind to the port
            if timeout 2 bash -c "</dev/tcp/localhost/$port" 2>/dev/null; then
                return 1  # Port is in use
            else
                return 0  # Port is available
            fi
        fi
    }
    
    # Check P2P port
    if ! check_port $P2P_PORT; then
        echo "⚠️  Port $P2P_PORT is in use, trying alternatives..."
        for alt_port in 8448 8449 8450 8451 8452; do
            if check_port $alt_port; then
                P2P_PORT=$alt_port
                echo "✅ Using alternative P2P port: $P2P_PORT"
                break
            fi
        done
    else
        echo "✅ P2P port $P2P_PORT is available"
    fi
    
    # Check Web port
    if ! check_port $WEB_PORT; then
        echo "⚠️  Port $WEB_PORT is in use, trying alternatives..."
        for alt_port in 3001 3002 3003 3004 3005; do
            if check_port $alt_port; then
                WEB_PORT=$alt_port
                echo "✅ Using alternative web port: $WEB_PORT"
                break
            fi
        done
    else
        echo "✅ Web port $WEB_PORT is available"
    fi
    
    # Create docker-compose.yml manually
    cat > docker-compose.yml << EOF
version: '3.8'

services:
  encryptedmeshlink:
    image: $IMAGE
    container_name: eml-station
    restart: unless-stopped
    
    environment:
      - NODE_ENV=production
      - ENCRYPTEDMESHLINK_AUTO_UPDATE=false
      - EML_LOCAL_TESTING=false
      - ENCRYPTEDMESHLINK_P2P_LISTEN_PORT=$P2P_PORT
    
    volumes:
      - ./config:/app/config
      - ./data:/app/data
      - ./logs:/app/logs
    
    ports:
      - "$P2P_PORT:$P2P_PORT"
      - "$WEB_PORT:3000"
    
    devices:
      - /dev/ttyUSB0:/dev/ttyUSB0
      - /dev/ttyACM0:/dev/ttyACM0
    
    privileged: true
    
    healthcheck:
      test: ["CMD", "npx", "tsx", "encryptedmeshlink.ts", "--health-check"]
      interval: 60s
      timeout: 30s
      retries: 2
      start_period: 30s
    
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
EOF

    # Create initial config
    mkdir -p config
    cat > config/encryptedmeshlink-config.json << EOF
{
  "stationId": "mesh-station-$(openssl rand -hex 3)",
  "displayName": "Pi Mesh Station",
  "keys": {
    "publicKey": "",
    "privateKey": ""
  },
  "discovery": {
    "serviceUrl": "https://definitelynotamoose.com/api/discovery.php",
    "checkInterval": 300,
    "timeout": 30
  },
  "p2p": {
    "listenPort": $P2P_PORT,
    "maxConnections": 10,
    "connectionTimeout": 30
  },
  "mesh": {
    "autoDetect": true,
    "baudRate": 115200
  },
  "metadata": {
    "createdAt": "$(date -Iseconds)",
    "updatedAt": "$(date -Iseconds)",
    "version": "1.0.0"
  }
}
EOF
    
    # Save port info
    cat > port-config.json << EOF
{
  "p2pPort": $P2P_PORT,
  "webPort": $WEB_PORT,
  "createdAt": "$(date -Iseconds)",
  "defaultPorts": $([ "$P2P_PORT" = "8447" ] && [ "$WEB_PORT" = "3000" ] && echo "true" || echo "false")
}
EOF
fi

echo "📥 Pulling Docker image: $IMAGE"
if ! docker ps &> /dev/null; then
    sudo docker pull "$IMAGE"
else
    docker pull "$IMAGE"
fi

# Check if container already exists and handle it
if docker ps -a --format '{{.Names}}' | grep -q "^eml-station$"; then
    echo "🔄 Existing EncryptedMeshLink container found"
    if docker ps --format '{{.Names}}' | grep -q "^eml-station$"; then
        echo "🛑 Stopping running container..."
        if ! docker ps &> /dev/null; then
            sudo docker stop eml-station
        else
            docker stop eml-station
        fi
    fi
    echo "�️  Removing old container..."
    if ! docker ps &> /dev/null; then
        sudo docker rm eml-station
    else
        docker rm eml-station
    fi
fi

echo "�🚀 Starting EncryptedMeshLink..."
if ! docker ps &> /dev/null; then
    sudo docker compose up -d
else
    docker compose up -d
fi

# Wait for startup and check status
echo "⏳ Waiting for service to start..."
sleep 5

# Check if container is running
if docker ps --format "table {{.Names}}" | grep -q "eml-station"; then
    echo -e "${GREEN}✅ EncryptedMeshLink is running successfully!${NC}"
else
    echo -e "${RED}❌ Container failed to start. Checking logs...${NC}"
    docker logs eml-station --tail=20 2>/dev/null || echo "No logs available yet"
    echo ""
    echo "🔧 Troubleshooting tips:"
    echo "   - Check if Meshtastic device is properly connected"
    echo "   - Verify USB device permissions: ls -la /dev/ttyUSB* /dev/ttyACM*"
    echo "   - Try manual restart: docker restart eml-station"
fi

echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "=================="
echo ""
echo "🌐 Network Configuration:"
echo "   📡 P2P Communication: Port $P2P_PORT"
echo "   🌍 Web Interface: Port $WEB_PORT"

# Show access information
if command -v hostname &> /dev/null; then
    LOCAL_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "your-pi-ip")
    if [ -n "$LOCAL_IP" ] && [ "$LOCAL_IP" != "your-pi-ip" ]; then
        echo "   🔗 Access web interface: http://$LOCAL_IP:$WEB_PORT"
    fi
fi

if [ "$P2P_PORT" != "8447" ] || [ "$WEB_PORT" != "3000" ]; then
    echo ""
    echo -e "${YELLOW}📝 Note: Alternative ports were used due to conflicts${NC}"
    echo "   Default ports were already in use on your system"
    echo "   Your configuration has been automatically updated"
fi

echo ""
echo "📋 Useful commands:"
echo "   📊 Status: docker ps"
echo "   📋 Logs: docker logs -f eml-station"
echo "   🔄 Restart: docker restart eml-station"
echo "   🛑 Stop: docker stop eml-station"
echo "   📂 Config: $EML_DIR/config/"
echo ""
echo "🎉 Happy meshing!"

# Cleanup
rm -f setup-ports.js 2>/dev/null || true