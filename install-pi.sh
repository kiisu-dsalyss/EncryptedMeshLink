#!/bin/bash

# EncryptedMeshLink Pi Auto-Update Installer
# Complete setup with automatic updates and robust monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_BRANCH="master"
DEFAULT_UPDATE_INTERVAL="1" # hours
INSTALL_DIR="$HOME/EncryptedMeshLink"
SERVICE_NAME="encryptedmeshlink"

echo -e "${BLUE}🍓 EncryptedMeshLink Pi Auto-Update Installer${NC}"
echo "=================================================="
echo ""

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root (no sudo)"
    exit 1
fi

# Check architecture
ARCH=$(uname -m)
case $ARCH in
    aarch64|arm64)
        print_status "ARM64 architecture detected"
        ;;
    armv7l)
        print_status "ARMv7 architecture detected"
        ;;
    *)
        print_error "Unsupported architecture: $ARCH"
        echo "   This script is for Raspberry Pi (ARM) devices only"
        exit 1
        ;;
esac

# Parse command line arguments
BRANCH="$DEFAULT_BRANCH"
UPDATE_INTERVAL="$DEFAULT_UPDATE_INTERVAL"
ENABLE_AUTO_UPDATE=true
INSTALL_MONITORING=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --branch)
            BRANCH="$2"
            shift 2
            ;;
        --update-interval)
            UPDATE_INTERVAL="$2"
            shift 2
            ;;
        --no-auto-update)
            ENABLE_AUTO_UPDATE=false
            shift
            ;;
        --no-monitoring)
            INSTALL_MONITORING=false
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --branch BRANCH           Git branch to track (default: master)"
            echo "  --update-interval HOURS   Update check interval in hours (default: 1)"
            echo "  --no-auto-update          Disable automatic updates"
            echo "  --no-monitoring           Skip watchdog installation"
            echo "  --help, -h                Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Standard install with auto-updates"
            echo "  $0 --branch develop --update-interval 2  # Development branch, 2-hour updates"
            echo "  $0 --no-auto-update                  # Manual updates only"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo "📋 Installation Configuration:"
echo "   Branch: $BRANCH"
echo "   Update Interval: $UPDATE_INTERVAL hour(s)"
echo "   Auto-Updates: $([ "$ENABLE_AUTO_UPDATE" = true ] && echo "Enabled" || echo "Disabled")"
echo "   Monitoring: $([ "$INSTALL_MONITORING" = true ] && echo "Enabled" || echo "Disabled")"
echo ""

# Update system
print_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_status "System updated"

# Install essential packages
print_info "Installing essential packages..."
sudo apt install -y git curl wget htop ncdu tree jq
print_status "Essential packages installed"

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    print_info "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm -f get-docker.sh
    print_status "Docker installed"
else
    print_status "Docker already installed"
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    print_info "Installing Docker Compose..."
    sudo apt install -y docker-compose
    print_status "Docker Compose installed"
else
    print_status "Docker Compose already installed"
fi

# Clone or update repository
if [ -d "$INSTALL_DIR" ]; then
    print_info "Updating existing repository..."
    cd "$INSTALL_DIR"
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
    print_status "Repository updated to latest $BRANCH"
else
    print_info "Cloning repository..."
    git clone https://github.com/kiisu-dsalyss/EncryptedMeshLink.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    git checkout "$BRANCH"
    print_status "Repository cloned"
fi

# Create environment configuration
print_info "Setting up environment configuration..."
cat > "$INSTALL_DIR/.env.pi" << EOF
# EncryptedMeshLink Pi Configuration
NODE_ENV=production
ENCRYPTEDMESHLINK_AUTO_UPDATE=$ENABLE_AUTO_UPDATE
ENCRYPTEDMESHLINK_UPDATE_INTERVAL_HOURS=$UPDATE_INTERVAL
ENCRYPTEDMESHLINK_UPDATE_BRANCH=$BRANCH
EML_LOCAL_TESTING=false

# Pi-specific optimizations
ENCRYPTEDMESHLINK_LOG_LEVEL=info
ENCRYPTEDMESHLINK_MAX_LOG_SIZE=50MB
ENCRYPTEDMESHLINK_MAX_LOG_FILES=5
EOF
print_status "Environment configuration created"

# Create systemd service for auto-start
if [ "$INSTALL_MONITORING" = true ]; then
    print_info "Creating systemd service..."
    sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null << EOF
[Unit]
Description=EncryptedMeshLink Station
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=$USER
Group=docker
WorkingDirectory=$INSTALL_DIR
Environment=COMPOSE_FILE=docker-compose.pi.yml
ExecStartPre=-/usr/bin/docker-compose -f docker-compose.pi.yml down
ExecStart=/usr/bin/docker-compose -f docker-compose.pi.yml up --remove-orphans
ExecStop=/usr/bin/docker-compose -f docker-compose.pi.yml down
Restart=always
RestartSec=10

# Resource limits
MemoryLimit=1G
TasksMax=100

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable $SERVICE_NAME
    print_status "Systemd service created and enabled"
fi

# Create update monitoring script
if [ "$ENABLE_AUTO_UPDATE" = true ]; then
    print_info "Setting up update monitoring..."
    
    # Create update log directory
    mkdir -p "$INSTALL_DIR/logs/updates"
    
    # Create update status script
    cat > "$INSTALL_DIR/scripts/check-update-status.sh" << 'EOF'
#!/bin/bash

# Update Status Checker for EncryptedMeshLink Pi

INSTALL_DIR="$HOME/EncryptedMeshLink"
LOG_FILE="$INSTALL_DIR/logs/updates/update-status.log"

echo "🔍 EncryptedMeshLink Update Status - $(date)"
echo "=================================================="

# Check if container is running
if docker ps | grep -q "eml-pi-station"; then
    echo "✅ Service Status: Running"
    
    # Get current commit
    CURRENT_COMMIT=$(cd "$INSTALL_DIR" && git rev-parse HEAD | cut -c1-7)
    echo "📍 Current Version: $CURRENT_COMMIT"
    
    # Check last update
    if [ -f "$LOG_FILE" ]; then
        LAST_UPDATE=$(tail -1 "$LOG_FILE" | grep "SUCCESS" | tail -1)
        if [ -n "$LAST_UPDATE" ]; then
            echo "🕒 Last Update: $LAST_UPDATE"
        else
            echo "🕒 Last Update: No successful updates logged"
        fi
    else
        echo "🕒 Last Update: No update log found"
    fi
    
    # Check for available updates
    cd "$INSTALL_DIR"
    git fetch origin >/dev/null 2>&1
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/$(git branch --show-current))
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        echo "✅ Update Status: Up to date"
    else
        BEHIND=$(git rev-list --count HEAD..origin/$(git branch --show-current))
        echo "🔄 Update Status: $BEHIND commit(s) behind"
    fi
    
    # Show container health
    HEALTH=$(docker inspect eml-pi-station --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
    echo "💓 Health Status: $HEALTH"
    
else
    echo "❌ Service Status: Not Running"
fi

echo ""
echo "📋 Quick Commands:"
echo "   View logs:    docker logs eml-pi-station -f"
echo "   Restart:      sudo systemctl restart encryptedmeshlink"
echo "   Force update: cd $INSTALL_DIR && git pull && docker-compose -f docker-compose.pi.yml up --build -d"
echo ""
EOF

    chmod +x "$INSTALL_DIR/scripts/check-update-status.sh"
    
    # Create convenient alias
    if ! grep -q "eml-status" ~/.bashrc; then
        echo "alias eml-status='$INSTALL_DIR/scripts/check-update-status.sh'" >> ~/.bashrc
        print_status "Added 'eml-status' command alias"
    fi
fi

# Check for USB devices
print_info "Checking for Meshtastic devices..."
if ls /dev/ttyUSB* /dev/ttyACM* 1> /dev/null 2>&1; then
    print_status "USB devices found:"
    ls -la /dev/ttyUSB* /dev/ttyACM* 2>/dev/null | head -5
else
    print_warning "No USB devices found - make sure your Meshtastic device is connected"
    echo "   You can still deploy and add devices later"
fi

# Build and deploy with Pi-optimized configuration
print_info "Building and deploying EncryptedMeshLink with Pi optimizations..."
docker-compose -f docker-compose.pi.yml down 2>/dev/null || true
# Also stop any regular compose service that might be running
docker-compose down 2>/dev/null || true
docker-compose -f docker-compose.pi.yml up --build -d

# Wait for startup
print_info "Waiting for service to start..."
sleep 15

# Check deployment status
print_info "Checking deployment status..."
if docker ps | grep -q "eml-pi-station"; then
    print_status "Container is running"
    
    # Wait a bit more for full initialization
    sleep 10
    
    # Check health
    HEALTH=$(docker inspect eml-pi-station --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
    if [ "$HEALTH" = "healthy" ]; then
        print_status "Service is healthy"
    else
        print_warning "Service health: $HEALTH (may still be starting up)"
    fi
else
    print_error "Container failed to start"
    echo "Check logs with: docker-compose -f docker-compose.pi.yml logs"
fi

# Start systemd service if enabled
if [ "$INSTALL_MONITORING" = true ] && systemctl is-enabled $SERVICE_NAME >/dev/null 2>&1; then
    print_info "Starting systemd service..."
    sudo systemctl start $SERVICE_NAME
    print_status "Systemd service started"
fi

echo ""
echo -e "${GREEN}🎉 Installation Complete!${NC}"
echo ""
echo "📍 Next Steps:"
echo "   • Monitor logs: docker logs eml-pi-station -f"
echo "   • Check status: $INSTALL_DIR/scripts/check-update-status.sh"
if [ "$INSTALL_MONITORING" = true ]; then
    echo "   • Service control: sudo systemctl {start|stop|restart|status} $SERVICE_NAME"
fi
echo "   • Web interface: http://$(hostname -I | awk '{print $1}'):3000"
if [ "$ENABLE_AUTO_UPDATE" = true ]; then
    echo "   • Auto-updates: Every $UPDATE_INTERVAL hour(s) from $BRANCH branch"
fi
echo ""
echo "🔧 Useful Commands:"
echo "   • eml-status           # Quick status check (restart shell first)"
echo "   • docker logs eml-pi-station -f  # View live logs"
echo "   • cd $INSTALL_DIR && git pull     # Manual update"
echo ""

# Check if reboot needed (for docker group)
if ! docker ps &> /dev/null; then
    print_warning "Reboot required to activate Docker group membership"
    echo "   Run: sudo reboot"
    echo "   Then check status with: eml-status"
fi

print_status "Installation completed successfully!"
