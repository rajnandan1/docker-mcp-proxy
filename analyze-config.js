#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const CONFIG_FILE = "./servers.json";
const MCPS_DIR = "./mcps";

console.log("Analyzing MCP server configuration for Docker build...");

try {
    // Read the configuration
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));

    const localServers = [];
    const buildCommands = [];

    // Analyze each server
    for (const [serverName, serverConfig] of Object.entries(
        config.mcpServers
    )) {
        // Check if this is a local server (command points to /app/mcps/)
        const isLocal =
            serverConfig.args &&
            serverConfig.args.some((arg) => arg.includes("/app/mcps/"));

        if (isLocal) {
            // Extract the local server path
            const mcpFilePath = serverConfig.args.find((arg) =>
                arg.includes("/app/mcps/")
            );
            const relativePath = mcpFilePath.replace("/app/", "");

            // Extract the server directory (everything up to the last two path components for the main server dir)
            // e.g., "mcps/weather/build/index.js" -> "mcps/weather"
            // e.g., "mcps/cashfree-mcp/src/index.js" -> "mcps/cashfree-mcp"
            const pathParts = relativePath.split("/");
            let serverDir;

            if (pathParts.length >= 3 && pathParts[0] === "mcps") {
                // Take mcps/[server-name] (first two parts)
                serverDir = pathParts.slice(0, 2).join("/");
            } else {
                // Fallback: just use the directory part
                serverDir = path.dirname(relativePath);
            }

            localServers.push({
                name: serverName,
                path: serverDir,
                localPath: `./${serverDir}`,
                filePath: relativePath,
                config: serverConfig,
            });

            console.log(
                `Found local server: ${serverName} at ${serverDir} (file: ${relativePath})`
            );
        }

        // Collect pre-build commands (different from pre:run commands)
        if (serverConfig["pre:build"]) {
            buildCommands.push({
                server: serverName,
                commands: serverConfig["pre:build"],
            });
        }
    }

    // Generate Docker copy instructions
    const copyInstructions = [];
    const buildInstructions = [];

    for (const server of localServers) {
        const serverDir = server.localPath;

        // Check if server directory exists
        if (fs.existsSync(serverDir)) {
            console.log(`Generating copy instructions for ${server.name}...`);

            // Copy package.json if exists
            if (fs.existsSync(path.join(serverDir, "package.json"))) {
                copyInstructions.push(
                    `COPY ${serverDir}/package.json /app/${server.path}/package.json`
                );
            }

            // Copy package-lock.json if exists
            if (fs.existsSync(path.join(serverDir, "package-lock.json"))) {
                copyInstructions.push(
                    `COPY ${serverDir}/package-lock.json /app/${server.path}/package-lock.json`
                );
            }

            // Copy tsconfig.json if exists
            if (fs.existsSync(path.join(serverDir, "tsconfig.json"))) {
                copyInstructions.push(
                    `COPY ${serverDir}/tsconfig.json /app/${server.path}/tsconfig.json`
                );
            }

            // Copy src directory if exists
            if (fs.existsSync(path.join(serverDir, "src"))) {
                copyInstructions.push(
                    `COPY ${serverDir}/src/ /app/${server.path}/src/`
                );
            }

            // Copy any other files (excluding node_modules and build directories)
            const files = fs.readdirSync(serverDir);
            for (const file of files) {
                const filePath = path.join(serverDir, file);
                const stat = fs.statSync(filePath);

                if (
                    stat.isFile() &&
                    ![
                        "package.json",
                        "package-lock.json",
                        "tsconfig.json",
                    ].includes(file) &&
                    !file.startsWith(".")
                ) {
                    copyInstructions.push(
                        `COPY ${serverDir}/${file} /app/${server.path}/${file}`
                    );
                }
            }

            // Generate build instructions if package.json exists
            if (fs.existsSync(path.join(serverDir, "package.json"))) {
                buildInstructions.push(`# Build ${server.name}`);
                buildInstructions.push(`WORKDIR /app/${server.path}`);
                buildInstructions.push(`RUN npm ci`);

                // Check if there's a build script
                const packageJson = JSON.parse(
                    fs.readFileSync(
                        path.join(serverDir, "package.json"),
                        "utf8"
                    )
                );
                if (packageJson.scripts && packageJson.scripts.build) {
                    buildInstructions.push(`RUN npm run build`);
                    buildInstructions.push(
                        `RUN ls -la /app/${server.path}/build/ || echo "No build directory found"`
                    );
                }
                buildInstructions.push("");
            }
        } else {
            console.warn(
                `Warning: Local server directory ${serverDir} does not exist`
            );
        }
    }

    // Output the results
    const output = {
        localServers,
        copyInstructions,
        buildInstructions,
        buildCommands,
    };

    // Write to a file that Docker can use
    fs.writeFileSync(
        "./docker-build-info.json",
        JSON.stringify(output, null, 2)
    );

    console.log(`\nFound ${localServers.length} local server(s)`);
    console.log(`Generated ${copyInstructions.length} copy instruction(s)`);
    console.log(`Generated ${buildInstructions.length} build instruction(s)`);
    console.log("Build info written to docker-build-info.json");
} catch (error) {
    console.error("Error analyzing configuration:", error.message);
    process.exit(1);
}
