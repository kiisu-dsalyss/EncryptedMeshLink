#!/bin/bash

# EncryptedMeshLink Quick Deploy for Raspberry Pi
# One-command deployment using pre-built Docker images

set -e

echo "🥧 EncryptedMeshLink Quick Deploy for Raspberry Pi"
echo "================================================="
echo ""

# Check if running on supported architecture
ARCH=$(uname -m)
case $ARCH in
    aarch64|arm64)
        echo "✅ ARM64 architecture detected"
        ;;
    armv7l)
        echo "✅ ARMv7 architecture detected"
        ;;
    *)
        echo "❌ Unsupported architecture: $ARCH"
        echo "   This script is for Raspberry Pi (ARM) devices only"
        exit 1
        ;;
esac

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm -f get-docker.sh
    
    echo "✅ Docker installed successfully!"
    echo "🔄 Activating Docker group membership..."
    
    # Try to activate docker group without logout
    if groups | grep -q docker; then
        echo "✅ Docker group already active"
    else
        echo "🔧 Activating docker group with newgrp..."
        # Re-exec this script in a new shell with docker group active
        exec sg docker "$0 $*"
    fi
fi

# Test Docker access
if ! docker info &> /dev/null; then
    echo "🔧 Docker installed but needs group activation. Trying to fix..."
    if ! groups | grep -q docker; then
        echo "⚠️  Docker group not active. You may need to:"
        echo "   1. Log out and log back in, OR"
        echo "   2. Run: newgrp docker"
        echo "   3. Then re-run this script"
        echo ""
        echo "🔄 Attempting to continue with 'sg docker' wrapper..."
        # Try to run docker commands through sg docker
        DOCKER_CMD="sg docker -c"
    else
        DOCKER_CMD=""
    fi
else
    DOCKER_CMD=""
fi
# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! eval "${DOCKER_CMD} docker compose version" &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    sudo apt update
    sudo apt install -y docker-compose-plugin
fi

# Determine compose command
if eval "${DOCKER_CMD} docker compose version" &> /dev/null; then
    COMPOSE_CMD="${DOCKER_CMD} docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="${DOCKER_CMD} docker-compose"
fi

# Create project directory
PROJECT_DIR="$HOME/encryptedmeshlink"
echo "📁 Setting up project directory: $PROJECT_DIR"

mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# Create directory structure
mkdir -p config data logs

# Download docker-compose file for Pi
echo "📥 Downloading Pi configuration..."
curl -fsSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/docker-compose.pi.yml -o docker-compose.yml

# Create updated compose file that uses pre-built image
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  encryptedmeshlink-pi:
    image: ghcr.io/kiisu-dsalyss/encryptedmeshlink:pi-latest
    container_name: eml-pi-station
    restart: unless-stopped
    
    environment:
      - NODE_ENV=production
      - ENCRYPTEDMESHLINK_AUTO_UPDATE=false  # Using Docker images instead
      - EML_LOCAL_TESTING=false
    
    volumes:
      - ./config:/app/config
      - ./data:/app/data
      - ./logs:/app/logs
    
    ports:
      - "8447:8447"  # P2P communication
      - "3000:3000"  # Web interface (optional)
    
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

# Check for USB devices
echo "🔌 Checking for Meshtastic devices..."
if ls /dev/ttyUSB* 1> /dev/null 2>&1; then
    echo "✅ Found USB devices: $(ls /dev/ttyUSB*)"
elif ls /dev/ttyACM* 1> /dev/null 2>&1; then
    echo "✅ Found ACM devices: $(ls /dev/ttyACM*)"
else
    echo "⚠️  No Meshtastic devices found. Make sure your device is connected."
    echo "   The container will start anyway and auto-detect when you connect a device."
fi

# Pull the latest image
echo "📦 Pulling latest EncryptedMeshLink image..."
echo "   (This is much faster than building - just downloading ~100MB)"
if [ -n "$DOCKER_CMD" ]; then
    eval "$DOCKER_CMD 'docker pull ghcr.io/kiisu-dsalyss/encryptedmeshlink:pi-latest'"
else
    docker pull ghcr.io/kiisu-dsalyss/encryptedmeshlink:pi-latest
fi

# Start the service
echo "🚀 Starting EncryptedMeshLink..."
$COMPOSE_CMD up -d

# Wait for startup
echo "⏳ Waiting for service to initialize..."
sleep 10

# Show status
echo ""
echo "📊 Service Status:"
$COMPOSE_CMD ps

echo ""
echo "📋 Recent logs:"
$COMPOSE_CMD logs --tail=10

echo ""
echo "🎉 EncryptedMeshLink is now running!"
echo ""
echo "📋 Useful commands:"
echo "   View logs:        cd $PROJECT_DIR && $COMPOSE_CMD logs -f"
echo "   Stop service:     cd $PROJECT_DIR && $COMPOSE_CMD down"
echo "   Restart service:  cd $PROJECT_DIR && $COMPOSE_CMD restart"
if [ -n "$DOCKER_CMD" ]; then
    echo "   Update image:     cd $PROJECT_DIR && $DOCKER_CMD 'docker pull ghcr.io/kiisu-dsalyss/encryptedmeshlink:pi-latest' && $COMPOSE_CMD up -d"
else
    echo "   Update image:     cd $PROJECT_DIR && docker pull ghcr.io/kiisu-dsalyss/encryptedmeshlink:pi-latest && $COMPOSE_CMD up -d"
fi
echo "   Service status:   cd $PROJECT_DIR && $COMPOSE_CMD ps"
echo ""
echo "🌐 If you have a web interface enabled, visit: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "📖 For configuration help, check the logs or visit the GitHub repository."
