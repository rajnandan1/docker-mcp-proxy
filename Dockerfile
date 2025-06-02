# Use the official mcp-proxy image as base
FROM ghcr.io/sparfenyuk/mcp-proxy:latest

# Install Node.js and npm for processing custom config and building local servers
USER root
RUN apk add --no-cache nodejs npm

# Copy configuration analysis and build scripts
COPY analyze-config.js /tmp/analyze-config.js
COPY build-local-servers.js /tmp/build-local-servers.js
COPY servers.json /tmp/servers.json
COPY mcps/ /tmp/mcps/

# Run the analysis to determine what needs to be built
WORKDIR /tmp
RUN node analyze-config.js

# Copy configuration files and scripts to app directory
COPY servers.json /app/servers.json
COPY process-config.js /app/process-config.js
COPY startup.sh /app/startup.sh
COPY .env* /app/

# Make scripts executable
RUN chmod +x /app/startup.sh

# Copy all local MCP servers to app directory
COPY mcps/ /app/mcps/

# Copy the build script and run it
COPY build-local-servers.js /app/build-local-servers.js
RUN node /app/build-local-servers.js

# Clean up temporary and build files
RUN rm -rf /tmp/analyze-config.js /tmp/build-local-servers.js /tmp/servers.json /tmp/mcps/ /tmp/docker-build-info.json /app/build-local-servers.js

# Set the working directory back to /app
WORKDIR /app

# Expose the port
EXPOSE 5700

# Use our custom startup script as entrypoint
ENTRYPOINT ["/app/startup.sh"]
