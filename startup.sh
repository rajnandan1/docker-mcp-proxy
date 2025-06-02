#!/bin/sh

set -e

echo "=== MCP Proxy Container Startup ==="

# Ensure data directory exists with proper permissions
echo "Step 0: Setting up data directory..."
mkdir -p /app/data
chmod 755 /app/data
echo "Data directory ready at /app/data"

# Process the configuration and execute pre:run commands
echo "Step 1: Processing configuration and executing pre:run commands..."
node /app/process-config.js

# Verify the clean configuration exists
if [ ! -f "/app/servers-clean.json" ]; then
    echo "Error: Clean configuration file not created"
    exit 1
fi

echo "Step 2: Starting mcp-proxy with clean configuration..."

# Print the contents of the clean configuration for debugging servers-clean.json
echo "Contents of servers-clean.json:"
cat /app/servers-clean.json

# Start mcp-proxy with the clean configuration
exec mcp-proxy --port 5700 --host 0.0.0.0 --allow-origin "*" --named-server-config /app/servers-clean.json --pass-environment
