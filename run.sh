#!/bin/bash
set -e

echo "Building Docker container with mcp-proxy..."
docker build -t mcp-proxy-server:latest .

echo "Stopping any existing container..."
docker stop mcp-proxy-server || true
docker rm mcp-proxy-server || true

echo "Starting mcp-proxy server..."
# Check if .env file exists and use it
if [ -f ".env" ]; then
    echo "Using .env file for environment variables..."
    docker run -d --name mcp-proxy-server -p 5700:5700 -v "$(pwd)/data:/app/data" --env-file .env mcp-proxy-server:latest
else
    echo "No .env file found, using default environment..."
    docker run -d --name mcp-proxy-server -p 5700:5700 -v "$(pwd)/data:/app/data" mcp-proxy-server:latest
fi

echo "Waiting for server to start..."
sleep 5

echo "Testing server health..."
curl -s http://localhost:5700/status || echo "Status endpoint not available"

echo ""
echo "=== MCP Proxy Server is running ==="

# Dynamically list all endpoints from servers.json
node list-endpoints.js

echo ""
echo "VS Code configuration updated in .vscode/mcp.json"
echo "Container name: mcp-proxy-server"
echo ""
echo "To stop the server: docker stop mcp-proxy-server"
echo "To view logs: docker logs mcp-proxy-server"
