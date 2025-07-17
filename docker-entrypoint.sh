#!/bin/bash
set -e

# Create config directory if it doesn't exist
mkdir -p /app/config

# If no config file exists in the mounted config directory, copy the template
if [ ! -f "/app/config/encryptedmeshlink-config.json" ]; then
    echo "📋 No config found, creating default configuration..."
    cp /app/encryptedmeshlink-config.template.json /app/config/encryptedmeshlink-config.json
    echo "✅ Default config created at /app/config/encryptedmeshlink-config.json"
    echo "🔧 You can customize this file and restart the container"
fi

# Create symlink to config file in main directory for backward compatibility
if [ ! -f "/app/encryptedmeshlink-config.json" ]; then
    ln -sf /app/config/encryptedmeshlink-config.json /app/encryptedmeshlink-config.json
fi

# Create data and logs directories
mkdir -p /app/data /app/logs

echo "🚀 Starting EncryptedMeshLink..."
exec "$@"
