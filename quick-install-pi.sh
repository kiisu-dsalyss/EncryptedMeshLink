#!/bin/bash

# EncryptedMeshLink Pi Quick Installer
# One-command install with auto-updates
# Usage: curl -sSL https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master/quick-install-pi.sh | bash

set -e

REPO_URL="https://raw.githubusercontent.com/kiisu-dsalyss/EncryptedMeshLink/master"
INSTALLER_URL="$REPO_URL/install-pi.sh"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🍓 EncryptedMeshLink Quick Installer${NC}"
echo "Downloading and running full installer..."
echo ""

# Download and run the full installer
curl -sSL "$INSTALLER_URL" | bash "$@"

echo ""
echo -e "${GREEN}🎉 Quick install complete!${NC}"
echo ""
echo "💡 Pro tip: The full installer is now available at:"
echo "   ~/EncryptedMeshLink/install-pi.sh"
echo ""
echo "🔧 Management commands:"
echo "   ~/EncryptedMeshLink/scripts/pi-manager.sh status"
echo "   ~/EncryptedMeshLink/scripts/pi-manager.sh update"
echo "   ~/EncryptedMeshLink/scripts/pi-manager.sh logs --follow"
