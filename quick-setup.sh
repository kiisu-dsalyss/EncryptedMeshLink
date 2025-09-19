#!/bin/bash

# EncryptedMeshLink Quick Setup - No Repository Clone Required
# Usage: curl -sSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/quick-setup.sh | bash

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 EncryptedMeshLink Quick Setup${NC}"
echo "================================="
echo ""
echo "⚡ Pulling pre-built Docker image directly"
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

# Create directories
EML_DIR="$HOME/encryptedmeshlink"
mkdir -p "$EML_DIR"/{config,data,logs}
cd "$EML_DIR"

# Check port availability and find alternatives if needed
echo "� Checking port availability..."
P2P_PORT=8447
WEB_PORT=3000

# Simple port check function
check_port() {
    local port=$1
    if command -v ss &> /dev/null; then
        ss -tuln | grep -q ":$port " && return 1 || return 0
    elif command -v netstat &> /dev/null; then
        netstat -tuln | grep -q ":$port " && return 1 || return 0
    else
        # Try to connect to the port briefly
        if timeout 1 bash -c "</dev/tcp/localhost/$port" 2>/dev/null; then
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

echo "�📥 Pulling Docker image: $IMAGE"
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
    echo "🗑️  Removing old container..."
    if ! docker ps &> /dev/null; then
        sudo docker rm eml-station
    else
        docker rm eml-station
    fi
fi

echo "🚀 Starting EncryptedMeshLink..."
if ! docker ps &> /dev/null; then
    sudo docker run -d \
        --name eml-station \
        --restart unless-stopped \
        -p $P2P_PORT:$P2P_PORT -p $WEB_PORT:3000 \
        --device /dev/ttyUSB0:/dev/ttyUSB0 \
        --device /dev/ttyACM0:/dev/ttyACM0 \
        --privileged \
        -e ENCRYPTEDMESHLINK_P2P_LISTEN_PORT=$P2P_PORT \
        -v "$EML_DIR/config:/app/config" \
        -v "$EML_DIR/data:/app/data" \
        -v "$EML_DIR/logs:/app/logs" \
        "$IMAGE"
else
    docker run -d \
        --name eml-station \
        --restart unless-stopped \
        -p $P2P_PORT:$P2P_PORT -p $WEB_PORT:3000 \
        --device /dev/ttyUSB0:/dev/ttyUSB0 \
        --device /dev/ttyACM0:/dev/ttyACM0 \
        --privileged \
        -e ENCRYPTEDMESHLINK_P2P_LISTEN_PORT=$P2P_PORT \
        -v "$EML_DIR/config:/app/config" \
        -v "$EML_DIR/data:/app/data" \
        -v "$EML_DIR/logs:/app/logs" \
        "$IMAGE"
fi

# Wait for container to start and check status
echo "⏳ Waiting for container to start..."
sleep 3

# Check if container started successfully
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "eml-station.*Up"; then
    echo -e "${GREEN}✅ EncryptedMeshLink container started successfully!${NC}"
else
    echo -e "${RED}❌ Container failed to start. Checking logs...${NC}"
    echo ""
    echo "📋 Recent container logs:"
    if ! docker ps &> /dev/null; then
        sudo docker logs eml-station --tail=20
    else
        docker logs eml-station --tail=20
    fi
    echo ""
    echo "🔧 Troubleshooting tips:"
    echo "   - Check if Meshtastic device is properly connected"
    echo "   - Verify USB device permissions: ls -la /dev/ttyUSB* /dev/ttyACM*"
    echo "   - Try restarting: docker restart eml-station"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ EncryptedMeshLink is running!${NC}"
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
    echo "📝 Note: Alternative ports were used due to conflicts"
    echo "   Your configuration has been automatically updated"
fi

echo ""
echo "📁 Files: $EML_DIR/"
echo "📊 Status: docker ps"
echo "📋 Logs: docker logs eml-station"
echo "🔄 Restart: docker restart eml-station"
echo "🛑 Stop: docker stop eml-station"
echo ""
echo "🎉 Happy meshing!"
