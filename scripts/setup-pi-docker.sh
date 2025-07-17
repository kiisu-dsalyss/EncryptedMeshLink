#!/bin/bash

# EncryptedMeshLink Pi Docker Build & Test Script
# Run this on your Raspberry Pi to build and test the Docker container

set -e

echo "🥧 EncryptedMeshLink Raspberry Pi Docker Setup"
echo "=============================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first:"
    echo "   curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "   sudo sh get-docker.sh"
    echo "   sudo usermod -aG docker $USER"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose."
    exit 1
fi

# Detect architecture
ARCH=$(uname -m)
echo "🔍 Detected architecture: $ARCH"

if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
    echo "✅ ARM64 architecture detected - compatible with Pi Docker setup"
elif [[ "$ARCH" == "armv7l" ]]; then
    echo "✅ ARMv7 architecture detected - compatible with Pi Docker setup"
else
    echo "⚠️  Unexpected architecture: $ARCH (expected ARM64 or ARMv7)"
    echo "   Continuing anyway..."
fi

# Check for required files
echo "📋 Checking required files..."
if [[ ! -f "Dockerfile.pi" ]]; then
    echo "❌ Dockerfile.pi not found in current directory"
    exit 1
fi

if [[ ! -f "docker-compose.pi.yml" ]]; then
    echo "❌ docker-compose.pi.yml not found in current directory"
    exit 1
fi

if [[ ! -f "package.json" ]]; then
    echo "❌ package.json not found in current directory"
    exit 1
fi

echo "✅ All required files found"

# Create necessary directories
echo "📁 Creating required directories..."
mkdir -p config data logs

# Check for USB devices (Meshtastic)
echo "🔌 Checking for USB devices..."
if ls /dev/ttyUSB* 1> /dev/null 2>&1; then
    echo "✅ Found USB devices: $(ls /dev/ttyUSB*)"
elif ls /dev/ttyACM* 1> /dev/null 2>&1; then
    echo "✅ Found ACM devices: $(ls /dev/ttyACM*)"
else
    echo "⚠️  No Meshtastic USB devices found (/dev/ttyUSB* or /dev/ttyACM*)"
    echo "   Make sure your Meshtastic device is connected"
fi

# Build the Docker image
echo "🔨 Building Docker image for Raspberry Pi..."
echo "   This may take several minutes on a Pi..."

# Use docker compose if available, otherwise docker-compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    DOCKER_COMPOSE_CMD="docker-compose"
fi

echo "📦 Using: $DOCKER_COMPOSE_CMD"

# Build the image
$DOCKER_COMPOSE_CMD -f docker-compose.pi.yml build

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
else
    echo "❌ Docker build failed!"
    exit 1
fi

# Test the container (dry run)
echo "🧪 Testing container startup..."
echo "   Starting container in test mode..."

# Start the container
$DOCKER_COMPOSE_CMD -f docker-compose.pi.yml up -d

if [ $? -eq 0 ]; then
    echo "✅ Container started successfully!"
    
    # Wait a moment for startup
    echo "⏳ Waiting for container to initialize..."
    sleep 10
    
    # Check container status
    echo "📊 Container status:"
    $DOCKER_COMPOSE_CMD -f docker-compose.pi.yml ps
    
    # Show logs
    echo "📋 Recent container logs:"
    $DOCKER_COMPOSE_CMD -f docker-compose.pi.yml logs --tail=20
    
    echo ""
    echo "🎉 Docker setup appears to be working!"
    echo ""
    echo "📋 Useful commands:"
    echo "   View logs:    $DOCKER_COMPOSE_CMD -f docker-compose.pi.yml logs -f"
    echo "   Stop:         $DOCKER_COMPOSE_CMD -f docker-compose.pi.yml down"
    echo "   Restart:      $DOCKER_COMPOSE_CMD -f docker-compose.pi.yml restart"
    echo "   Shell access: $DOCKER_COMPOSE_CMD -f docker-compose.pi.yml exec encryptedmeshlink-pi sh"
    echo ""
    echo "🔧 The container is now running! Check the logs to see if it's working properly."
    echo ""
    
else
    echo "❌ Container failed to start!"
    echo "📋 Checking logs for errors..."
    $DOCKER_COMPOSE_CMD -f docker-compose.pi.yml logs
    exit 1
fi
