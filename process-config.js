#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const CONFIG_FILE = "/app/servers.json";
const CLEAN_CONFIG_FILE = "/app/servers-clean.json";

console.log("Processing MCP server configuration...");

try {
    // Read the original configuration
    console.log(`Reading configuration from: ${CONFIG_FILE}`);
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    console.log("Configuration loaded successfully");

    // Process each server's custom fields
    for (const [serverName, serverConfig] of Object.entries(
        config.mcpServers
    )) {
        console.log(`\nProcessing server: ${serverName}`);

        // Check requirements
        if (serverConfig.requirements) {
            console.log(
                `  Requirements found: ${JSON.stringify(
                    serverConfig.requirements
                )}`
            );

            for (const req of serverConfig.requirements) {
                console.log(
                    `  Checking requirement: ${req.name} ${req.version || ""}`
                );

                try {
                    if (req.name === "node") {
                        const nodeVersion = execSync("node --version", {
                            encoding: "utf8",
                        }).trim();
                        console.log(`    Node version: ${nodeVersion} ✓`);
                    }
                    // Add more requirement checks as needed
                } catch (error) {
                    console.error(
                        `    Failed to check ${req.name}: ${error.message}`
                    );
                    process.exit(1);
                }
            }
        }

        // Execute pre:run commands
        if (serverConfig["pre:run"]) {
            console.log(
                `  Pre-run commands found: ${JSON.stringify(
                    serverConfig["pre:run"]
                )}`
            );

            for (const preRunCmd of serverConfig["pre:run"]) {
                const { command, args = [], cwd = "/app" } = preRunCmd;
                const fullCommand = `${command} ${args.join(" ")}`;

                console.log(`    Executing: ${fullCommand} (in ${cwd})`);

                try {
                    // Change to the specified directory if needed
                    const originalCwd = process.cwd();
                    if (cwd !== originalCwd) {
                        process.chdir(cwd);
                    }

                    const output = execSync(fullCommand, {
                        encoding: "utf8",
                        stdio: "inherit",
                    });

                    // Change back to original directory
                    if (cwd !== originalCwd) {
                        process.chdir(originalCwd);
                    }

                    console.log(`    Pre-run command completed ✓`);
                } catch (error) {
                    console.error(
                        `    Pre-run command failed: ${error.message}`
                    );
                    process.exit(1);
                }
            }
        }
    }

    // Create clean configuration without custom fields
    console.log("\nCreating clean configuration...");
    const cleanConfig = JSON.parse(JSON.stringify(config));

    for (const serverConfig of Object.values(cleanConfig.mcpServers)) {
        delete serverConfig.requirements;
        delete serverConfig["pre:run"];
    }

    // Write the clean configuration
    fs.writeFileSync(CLEAN_CONFIG_FILE, JSON.stringify(cleanConfig, null, 4));

    console.log("\n✓ Configuration processing completed");
    console.log(`✓ Clean configuration written to ${CLEAN_CONFIG_FILE}`);
    console.log("✓ Ready for mcp-proxy");

    //read /app/servers-clean.json in a string format
    const cleanConfigData = fs.readFileSync(CLEAN_CONFIG_FILE, "utf8");
    //using regex find and replace all strings that are of typ ${VARIABLE_NAME} with process.env.VARIABLE_NAME
    const updatedConfigData = cleanConfigData.replace(
        /\$\{([a-zA-Z0-9_]+)\}/g,
        (match, variableName) => {
            return process.env[variableName] || match; // Fallback to original if not found
        }
    );
    //write the updated config to /app/servers-clean.json
    fs.writeFileSync(CLEAN_CONFIG_FILE, updatedConfigData);

    console.log(`✓ Updated configuration written to ${CLEAN_CONFIG_FILE}`);
    console.log("✓ All MCP servers processed successfully");
} catch (error) {
    console.error("Error processing configuration:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
}
