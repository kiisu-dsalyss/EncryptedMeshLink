#!/bin/bash

# EncryptedMeshLink Pi Quick Installer
# Simple one-command install without system complications
# Usage: curl -sSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/quick-install-pi.sh | bash

set -e

REPO_URL="https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master"
INSTALLER_URL="$REPO_URL/install-pi-simple.sh"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🍓 EncryptedMeshLink Quick Installer${NC}"
echo "======================================"
echo ""
echo -e "${YELLOW}⚡ This installer avoids system upgrades to prevent interactive prompts${NC}"
echo "   Perfect for headless Pi installations via SSH!"
echo ""

# Download and run the simple installer
curl -sSL "$INSTALLER_URL" | bash "$@"

echo ""
echo -e "${GREEN}🎉 Quick install complete!${NC}"
echo ""
echo "� Your application should now be running!"
echo ""
echo "🔧 Quick commands:"
echo "   cd ~/EncryptedMeshLink"
echo "   ./scripts/pi-control.sh status     # Check if running"
echo "   ./scripts/pi-control.sh logs       # View logs"
echo "   ./scripts/pi-control.sh restart    # Restart if needed"
echo ""
echo "💡 Pro tip: If you want system updates later, run:"
echo "   sudo apt update && sudo apt upgrade"
