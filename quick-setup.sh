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

echo "📥 Pulling Docker image: $IMAGE"
if ! docker ps &> /dev/null; then
    sudo docker pull "$IMAGE"
else
    docker pull "$IMAGE"
fi

echo "🚀 Starting EncryptedMeshLink..."
if ! docker ps &> /dev/null; then
    sudo docker run -d \
        --name eml-station \
        --restart unless-stopped \
        -p 8447:8447 -p 3000:3000 \
        --device /dev/ttyUSB0:/dev/ttyUSB0 \
        --device /dev/ttyACM0:/dev/ttyACM0 \
        --privileged \
        -v "$EML_DIR/config:/app/config" \
        -v "$EML_DIR/data:/app/data" \
        -v "$EML_DIR/logs:/app/logs" \
        "$IMAGE"
else
    docker run -d \
        --name eml-station \
        --restart unless-stopped \
        -p 8447:8447 -p 3000:3000 \
        --device /dev/ttyUSB0:/dev/ttyUSB0 \
        --device /dev/ttyACM0:/dev/ttyACM0 \
        --privileged \
        -v "$EML_DIR/config:/app/config" \
        -v "$EML_DIR/data:/app/data" \
        -v "$EML_DIR/logs:/app/logs" \
        "$IMAGE"
fi

echo ""
echo -e "${GREEN}✅ EncryptedMeshLink is running!${NC}"
echo ""
echo "📁 Files: $EML_DIR/"
echo "📊 Status: docker ps"
echo "📋 Logs: docker logs eml-station"
echo "🔄 Restart: docker restart eml-station"
echo "🛑 Stop: docker stop eml-station"
echo ""
echo "🎉 Happy meshing!"
