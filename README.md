# MCP Proxy Server

This Docker container uses the official [mcp-proxy](https://github.com/sparfenyuk/mcp-proxy) to expose multiple MCP (Model Context Protocol) servers over HTTP Server-Sent Events (SSE).

## Currently Available Servers

This system dynamically discovers and builds MCP servers based on your `servers.json` configuration:

The system automatically detects local servers in the `mcps/` directory and builds them during Docker container startup.

## Setup and Usage

### 1. Create Data Directory

Create a local data directory for the filesystem MCP server. This will be used to write files if you are using a MCP that writes to a file.

```bash
# Create the data directory for persistent file storage
mkdir -p data

# The data directory will be mounted as a volume in the Docker container
# Files created by the filesystem MCP will persist here
```

### 2. Environment Configuration

Create a `.env.` if your MCP server needs environment variables. For example the Exa server, you'll need an API key from [exa.ai](https://exa.ai):

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your actual EXA API key If you are using exa mcp
# EXA_API_KEY=your-actual-exa-api-key-here
```

### 3. Build and Run

```bash
# Build and run the container (automatically uses .env file if present)
# The run.sh script automatically mounts the data/ directory as a volume
./run.sh

# Or manually:
docker build -t mcp-proxy-server:latest .

# With .env file and data volume:
docker run -d --name mcp-proxy-server -p 5700:5700 -v "$(pwd)/data:/app/data" --env-file .env mcp-proxy-server:latest

# Without .env file (exa server won't work):
docker run -d --name mcp-proxy-server -p 5700:5700 -v "$(pwd)/data:/app/data" mcp-proxy-server:latest
```

**Note**: The `-v "$(pwd)/data:/app/data"` volume mount is essential for the filesystem MCP server to access your local `data/` directory.

### 4. Test the Setup

```bash
# Run the test script
./test.sh

# Or manually test endpoints:
curl http://localhost:5700/status
curl -H "Accept: text/event-stream" http://localhost:5700/servers/sequential-thinking/sse
curl -H "Accept: text/event-stream" http://localhost:5700/servers/exa/sse
curl -H "Accept: text/event-stream" http://localhost:5700/servers/weather/sse
curl -H "Accept: text/event-stream" http://localhost:5700/servers/filesystem/sse
```

### 5. Integration

#### VS Code Integration

The `.vscode/mcp.json` file is configured to connect to all proxy endpoints:

```json
{
    "servers": {
        "sequential-thinking": {
            "url": "http://localhost:5700/servers/sequential-thinking/sse"
        },
        "exa": {
            "url": "http://localhost:5700/servers/exa/sse"
        },
        "filesystem": {
            "url": "http://localhost:5700/servers/filesystem/sse"
        }
    }
}
```

## Available Endpoints

-   **Status**: `http://localhost:5700/status` - Shows server status and configuration
-   **Sequential Thinking**: `http://localhost:5700/servers/sequential-thinking/sse`
-   **Exa**: `http://localhost:5700/servers/exa/sse`
-   **Weather**: `http://localhost:5700/servers/wather/sse` - Sample Weather MCP
-   **Filesystem**: `http://localhost:5700/servers/filesystem/sse` - File operations in the `data/` directory

## Data Directory & Filesystem MCP

The filesystem MCP server provides file management capabilities with access to your local `data/` directory:

### Features

-   **File Operations**: Create, read, update, and delete files
-   **Directory Management**: Create directories and navigate file structures
-   **Persistent Storage**: Files persist on your host machine via Docker volume mount
-   **Secure Access**: Limited to the `data/` directory for security

### Usage Examples

```bash
# The data/ directory is mounted as a volume in the Docker container
# Files created by the filesystem MCP will appear in your local data/ folder
ls data/

# Example files created by the filesystem MCP server:
# data/my_file.txt
# data/documents/report.md
# data/configs/settings.json
```

### File Path

Use `/app` to refer to items in the folder.

### File Access

-   **Container Path**: `/app/data` (where the filesystem MCP has access)
-   **Host Path**: `./data` (your local project directory)
-   **Volume Mount**: `-v "$(pwd)/data:/app/data"`

## Configuration

The server configuration is defined in `servers.json`:

```json
{
    "mcpServers": {
        "sequential-thinking": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
            "transportType": "stdio"
        },
        "exa": {
            "command": "npx",
            "args": ["-y", "exa-mcp-server"],
            "env": {
                "EXA_API_KEY": "${EXA_API_KEY}"
            },
            "transportType": "stdio"
        },
        "weather": {
            "command": "node",
            "args": ["/app/mcps/weather/build/index.js"],
            "transportType": "stdio",
            "requirements": [
                {
                    "name": "node",
                    "version": ">=20.0.0"
                }
            ],
            "pre:run": [
                {
                    "command": "npm",
                    "args": ["run", "build"],
                    "cwd": "/app/mcps/weather"
                }
            ]
        },
        "filesystem": {
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-filesystem",
                "/app/data"
            ],
            "transportType": "stdio"
        }
    }
}
```

## Custom Configuration Fields

This setup supports additional custom fields in `servers.json` that are processed during container startup before being passed to the official mcp-proxy:

### `requirements` Field

Defines runtime requirements that are validated before the server starts:

```json
"requirements": [
    {
        "name": "node",
        "version": ">=20.0.0"
    }
]
```

-   **`name`**: The name of the required runtime (currently supports "node")
-   **`version`**: Version constraint using semantic versioning (e.g., ">=20.0.0", "^18.0.0")

### `pre:run` Field

Defines commands that must be executed before the MCP server starts. This is useful for building from source, installing dependencies, or other setup tasks:

```json
"pre:run": [
    {
        "command": "npm",
        "args": ["run", "build"],
        "cwd": "/app/mcps/weather"
    }
]
```

-   **`command`**: The command to execute (e.g., "npm", "node", "python")
-   **`args`**: Array of command arguments (e.g., ["run", "build"])
-   **`cwd`**: Working directory for the command execution (optional)

### Processing Flow

During container startup:

1. **Configuration Processing**: `process-config.js` reads `servers.json`
2. **Requirements Validation**: Checks that all requirements are met
3. **Pre-run Commands**: Executes all `pre:run` commands in sequence
4. **Clean Configuration**: Generates `servers-clean.json` without custom fields
5. **MCP Proxy Start**: Starts mcp-proxy with the clean configuration

This allows you to build MCP servers from source code during container startup while still using the official mcp-proxy package.

## Adding New MCP Servers

The system is completely dynamic - you only need to configure `servers.json` to add new MCP servers. The Docker build process automatically discovers and handles local servers.

### Adding an External MCP Server

For npm packages or public MCP servers:

```json
{
    "mcpServers": {
        "your-server-name": {
            "command": "npx",
            "args": ["-y", "your-mcp-package"],
            "transportType": "stdio",
            "env": {
                "API_KEY": "${YOUR_API_KEY}"
            }
        }
    }
}
```

### Adding a Local MCP Server

1. **Create your server directory**:

    ```bash
    mkdir -p mcps/your-server-name
    cd mcps/your-server-name
    ```

2. **Add your server files**:

    - `package.json` (if Node.js)
    - `src/` directory with source code
    - `tsconfig.json` (if TypeScript)

3. **Configure in servers.json**:

    ```json
    {
        "mcpServers": {
            "your-server": {
                "command": "node",
                "args": ["/app/mcps/your-server-name/build/index.js"],
                "transportType": "stdio",
                "requirements": [
                    {
                        "name": "node",
                        "version": ">=18.0.0"
                    }
                ],
                "pre:run": [
                    {
                        "command": "npm",
                        "args": ["ci"],
                        "cwd": "/app/mcps/your-server-name"
                    },
                    {
                        "command": "npm",
                        "args": ["run", "build"],
                        "cwd": "/app/mcps/your-server-name"
                    }
                ]
            }
        }
    }
    ```

4. **Rebuild and run**:
    ```bash
    ./run.sh
    ```

The system will automatically:

-   Copy your server files during Docker build
-   Install dependencies (`npm ci`)
-   Build from source (`npm run build`)
-   Start your server alongside others

### Environment Variables

This setup uses environment variables to configure API keys and other sensitive information:

1. **Copy the environment template**:

    ```bash
    cp .env.example .env
    ```

2. **Edit the .env file** with your actual values:

    ```bash
    # Get your EXA API key from https://exa.ai/
    EXA_API_KEY=your_actual_exa_api_key_here
    ```

3. **API Key Requirements**:
    - **Exa**: Required for web search functionality. Get your free API key from [exa.ai](https://exa.ai/)
    - **Sequential Thinking**: No API key required
    - **Weather**: No API key required
    - **Cashfree**: Optional - configure payment API keys if using payment features
    - **Filesystem**: No API key required - uses local file system access

**⚠️ Important**: Never commit your actual .env file to version control. The .env.example file serves as a template.

## Troubleshooting

-   Check container logs: `docker logs mcp-proxy-server`
-   Verify container is running: `docker ps | grep mcp-proxy`
-   Test status endpoint: `curl http://localhost:5700/status`
-   Restart container: `docker restart mcp-proxy-server`

## Architecture

This setup uses the official mcp-proxy Docker image as a base and:

1. Installs Node.js and npm for running MCP servers
2. Copies the pre-built weather server
3. Configures mcp-proxy with named servers
4. Exposes all servers over HTTP SSE endpoints on port 5700

## Success Verification

When working correctly, you should see:

1. **Status endpoint** returns JSON with server information:

    ```json
    {
        "api_last_activity": "2025-06-01T16:01:29.513516+00:00",
        "server_instances": {
            "sequential-thinking": "configured",
            "exa": "configured",
            "weather": "configured",
            "cashfree": "configured",
            "filesystem": "configured"
        }
    }
    ```

2. **SSE endpoints** return session information:

    ```
    event: endpoint
    data: /servers/sequential-thinking/messages/?session_id=...

    event: endpoint
    data: /servers/exa/messages/?session_id=...

    event: endpoint
    data: /servers/weather/messages/?session_id=...

    event: endpoint
    data: /servers/cashfree/messages/?session_id=...

    event: endpoint
    data: /servers/filesystem/messages/?session_id=...
    ```

3. **Container logs** show successful server startup:
    ```
    [I] Setting up named server 'sequential-thinking': npx -y @modelcontextprotocol/server-sequential-thinking
    Sequential Thinking MCP Server running on stdio
    [I] Setting up named server 'exa': npx -y exa-mcp-server
    Exa MCP Server running on stdio
    [I] Setting up named server 'weather': node /app/mcps/weather/build/index.js
    Weather MCP Server running on stdio
    [I] Setting up named server 'cashfree': node /app/mcps/cashfree/src/index.js
    Cashfree MCP Server running on stdio
    [I] Setting up named server 'filesystem': npx -y @modelcontextprotocol/server-filesystem /app/data
    Filesystem MCP Server running on stdio
    ```

## Dynamic System Benefits

This implementation provides several key advantages:

### ✅ **Completely Dynamic**

-   **No hardcoded servers**: Simply add entries to `servers.json`
-   **Automatic discovery**: System finds and builds local servers in `mcps/`
-   **Zero Docker changes**: Add new servers without modifying Dockerfile

### ✅ **Flexible Build Process**

-   **TypeScript support**: Automatically builds from `.ts` source
-   **Dependency management**: Runs `npm ci` for each local server
-   **Custom commands**: Use `pre:run` for any build requirements
-   **Requirements validation**: Ensures runtime compatibility

### ✅ **Official mcp-proxy Integration**

-   **Standards compliant**: Uses official mcp-proxy package
-   **SSE endpoints**: Industry-standard Server-Sent Events
-   **Production ready**: Built on proven mcp-proxy foundation

### ✅ **Developer Experience**

-   **Single configuration**: Everything in `servers.json`
-   **Environment variables**: Secure API key management via `.env`
-   **VS Code integration**: Auto-configured endpoints
-   **Easy testing**: Built-in test script

### Example: Adding a New Server

1. **Create local server**:

    ```bash
    mkdir -p mcps/my-server
    # Add your package.json, src/, etc.
    ```

2. **Add to servers.json**:

    ```json
    "my-server": {
        "command": "node",
        "args": ["/app/mcps/my-server/build/index.js"],
        "transportType": "stdio",
        "pre:run": [
            {"command": "npm", "args": ["ci"], "cwd": "/app/mcps/my-server"},
            {"command": "npm", "args": ["run", "build"], "cwd": "/app/mcps/my-server"}
        ]
    }
    ```

3. **Rebuild**:
    ```bash
    ./run.sh
    ```

Your server is now available at `http://localhost:5700/servers/my-server/sse`!

## Quick Reference

### Essential Commands

```bash
# Setup
mkdir -p data                    # Create data directory
cp .env.example .env            # Copy environment template
./run.sh                        # Build and run everything

# Management
docker logs mcp-proxy-server   # View logs
docker stop mcp-proxy-server   # Stop container
docker restart mcp-proxy-server # Restart container
./test.sh                      # Test all endpoints

# Development
docker logs -f mcp-proxy-server # Follow logs in real-time
```

### Server URLs (for VS Code integration)

-   **Sequential Thinking**: `http://localhost:5700/servers/sequential-thinking/sse`
-   **Exa Search**: `http://localhost:5700/servers/exa/sse`
-   **Weather**: `http://localhost:5700/servers/weather/sse`
-   **Cashfree Payments**: `http://localhost:5700/servers/cashfree/sse`
-   **Filesystem**: `http://localhost:5700/servers/filesystem/sse`
-   **Status**: `http://localhost:5700/status`

### File Locations

-   **Configuration**: `servers.json`
-   **VS Code MCP Config**: `.vscode/mcp.json`
-   **Environment**: `.env` (from `.env.example`)
-   **Data Directory**: `data/` (mounted to `/app/data` in container)
-   **Local Servers**: `mcps/*/` directories

### Common Issues

-   **Exa not working**: Check `EXA_API_KEY` in `.env`
-   **File operations failing**: Ensure `data/` directory exists
-   **Server not starting**: Check `docker logs mcp-proxy-server`
-   **Port 5700 in use**: Stop existing container with `docker stop mcp-proxy-server`

The setup is now complete and ready for VS Code integration!
