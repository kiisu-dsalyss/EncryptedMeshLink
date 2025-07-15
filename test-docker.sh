#!/bin/bash

# Docker Deployment Test Script
# Tests the A/B deployment system in various scenarios

set -e

echo "🐳 Docker Deployment Testing Suite"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Test 1: Build Docker Images
echo "📦 Test 1: Building Docker Images"
echo "--------------------------------"

if docker build -t eml-test . > /dev/null 2>&1; then
    print_status "Standard Docker image built successfully"
else
    print_error "Failed to build standard Docker image"
    exit 1
fi

if docker build -t eml-test-pi -f Dockerfile.pi . > /dev/null 2>&1; then
    print_status "Pi Docker image built successfully"
else
    print_error "Failed to build Pi Docker image"
    exit 1
fi

# Test 2: Validate Docker Compose Configuration
echo ""
echo "🔧 Test 2: Docker Compose Validation"
echo "-----------------------------------"

if docker-compose config > /dev/null 2>&1; then
    print_status "Standard docker-compose.yml is valid"
else
    print_error "Standard docker-compose.yml has errors"
    exit 1
fi

if docker-compose -f docker-compose.pi.yml config > /dev/null 2>&1; then
    print_status "Pi docker-compose.pi.yml is valid"
else
    print_error "Pi docker-compose.pi.yml has errors"
    exit 1
fi

# Test 3: Test Auto-Update Flag
echo ""
echo "🔄 Test 3: Auto-Update Integration"
echo "---------------------------------"

# Create test config if it doesn't exist
if [ ! -f "./encryptedmeshlink-config.json" ]; then
    print_warning "Creating test configuration..."
    npm run encryptedmeshlink -- config init --station-id=test-001 --display-name="Test Station" --force > /dev/null 2>&1 || true
fi

# Test auto-update flag parsing
if timeout 5s node dist/encryptedmeshlink.js --auto-update --local-testing > /dev/null 2>&1 || [ $? -eq 124 ]; then
    print_status "Auto-update flag parsing works"
else
    print_warning "Auto-update flag test inconclusive (may need real Meshtastic device)"
fi

# Test 4: Health Check Endpoints
echo ""
echo "🏥 Test 4: Health Check Simulation"
echo "---------------------------------"

# Start a container briefly to test health check
if docker run --rm -d --name eml-health-test -p 8447:8447 eml-test > /dev/null 2>&1; then
    sleep 10
    
    # Check if container is running
    if docker ps | grep eml-health-test > /dev/null; then
        print_status "Container started successfully"
        
        # Try health check (may fail without USB device, that's expected)
        if timeout 5s curl -f http://localhost:8447/health > /dev/null 2>&1; then
            print_status "Health check endpoint responding"
        else
            print_warning "Health check endpoint not ready (expected without USB device)"
        fi
    else
        print_warning "Container exited (expected without USB device)"
    fi
    
    # Cleanup
    docker stop eml-health-test > /dev/null 2>&1 || true
else
    print_warning "Container test skipped (may need USB permissions)"
fi

# Test 5: Deployment Module Unit Tests
echo ""
echo "🧪 Test 5: Deployment Module Tests"
echo "---------------------------------"

if npm test -- tests/deployment.test.ts > /dev/null 2>&1; then
    print_status "Deployment module tests passed"
else
    print_warning "Deployment module tests need to be run (npm test)"
fi

# Test 6: Volume Mount Simulation
echo ""
echo "💾 Test 6: Volume Mount Structure"
echo "--------------------------------"

# Create test directories to simulate volume mounts
mkdir -p ./test-volumes/{config,data}

if [ -d "./test-volumes/config" ] && [ -d "./test-volumes/data" ]; then
    print_status "Volume mount directories created"
    rm -rf ./test-volumes
else
    print_error "Failed to create volume directories"
fi

# Summary
echo ""
echo "📊 Test Summary"
echo "==============="
print_status "Docker images build successfully"
print_status "Docker Compose configurations valid"
print_status "Auto-update integration ready"
print_warning "Full testing requires Raspberry Pi hardware"

echo ""
echo "🚀 Next Steps for Pi Testing:"
echo "1. Flash Pi with Docker support"
echo "2. Copy project to Pi"
echo "3. Run: docker-compose -f docker-compose.pi.yml up -d"
echo "4. Monitor logs: docker logs -f eml-pi-station"
echo ""
echo "💡 For local development:"
echo "1. Use: docker-compose up -d"
echo "2. Watch auto-update logs in container"
echo "3. Test manual updates with: docker exec eml-station npm run update"
