#!/bin/bash
set -e

# Create config directory if it doesn't exist
mkdir -p /app/config

# If no config file exists in the mounted config directory, copy the template
if [ ! -f "/app/config/encryptedmeshlink-config.json" ]; then
    echo "📋 No config found, creating default configuration..."
    
    if [ -f "/app/encryptedmeshlink-config.template.json" ]; then
        cp /app/encryptedmeshlink-config.template.json /app/config/encryptedmeshlink-config.json
        echo "✅ Default config created from template at /app/config/encryptedmeshlink-config.json"
    elif [ -f "/app/encryptedmeshlink-config.json" ]; then
        cp /app/encryptedmeshlink-config.json /app/config/encryptedmeshlink-config.json
        echo "✅ Default config created from source at /app/config/encryptedmeshlink-config.json"
    else
        echo "❌ No config template found - creating minimal config"
        cat > /app/config/encryptedmeshlink-config.json << 'EOF'
{
  "stationId": "auto-generated-001",
  "displayName": "EncryptedMeshLink Station",
  "keys": {
    "publicKey": "",
    "privateKey": ""
  },
  "discovery": {
    "serviceUrl": "https://your-domain.com/api/discovery.php",
    "checkInterval": 300,
    "timeout": 30
  },
  "p2p": {
    "listenPort": 8447,
    "maxConnections": 10,
    "connectionTimeout": 30
  },
  "mesh": {
    "autoDetect": true,
    "baudRate": 115200
  }
}
EOF
        echo "⚠️  Created minimal config - you'll need to configure RSA keys and discovery service"
    fi
    
    echo "🔧 You can customize this file and restart the container"
fi

# Check if RSA keys need to be generated
echo "🔐 Checking RSA keys..."
if [ -f "/app/config/encryptedmeshlink-config.json" ]; then
    # Check if keys are empty or missing
    PUBLIC_KEY=$(node -e "const config = require('/app/config/encryptedmeshlink-config.json'); console.log(config.keys?.publicKey || '');" 2>/dev/null || echo "")
    PRIVATE_KEY=$(node -e "const config = require('/app/config/encryptedmeshlink-config.json'); console.log(config.keys?.privateKey || '');" 2>/dev/null || echo "")
    
    if [ -z "$PUBLIC_KEY" ] || [ -z "$PRIVATE_KEY" ] || [ "$PUBLIC_KEY" = "" ] || [ "$PRIVATE_KEY" = "" ]; then
        echo "🔑 Generating RSA key pair for this station..."
        
        # Generate unique station ID
        STATION_ID="station-$(date +%s)-$((RANDOM % 900 + 100))"
        
        # Use the config CLI to generate keys
        cd /app
        npx tsx encryptedmeshlink.ts config init \
            --station-id="$STATION_ID" \
            --display-name="EncryptedMeshLink Docker Station" \
            --location="Docker Container" \
            --operator="auto-generated" \
            --config-path="/app/config/encryptedmeshlink-config.json"
        
        if [ $? -eq 0 ]; then
            echo "✅ RSA keys generated successfully!"
            echo "🆔 Station ID: $STATION_ID"
        else
            echo "❌ Failed to generate RSA keys - service may not work properly"
        fi
    else
        echo "✅ RSA keys already configured"
    fi
else
    echo "⚠️  Config file not found, skipping key generation"
fi

# Create symlink to config file in main directory for backward compatibility
if [ ! -f "/app/encryptedmeshlink-config.json" ]; then
    ln -sf /app/config/encryptedmeshlink-config.json /app/encryptedmeshlink-config.json
fi

# Create data and logs directories
mkdir -p /app/data /app/logs

echo "🚀 Starting EncryptedMeshLink..."
exec "$@"
