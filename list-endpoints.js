#!/usr/bin/env node

const fs = require("fs");

try {
    // Read servers.json
    const configData = fs.readFileSync("./servers.json", "utf8");
    const config = JSON.parse(configData);

    // Extract server names and generate display names
    const serverNames = Object.keys(config.mcpServers);

    console.log("Available servers:");
    serverNames.forEach((name) => {
        // Convert kebab-case to Title Case for display
        const displayName = name
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        const url = `http://localhost:5700/servers/${name}/sse`;
        console.log(`- ${displayName}: ${url}`);
    });
} catch (error) {
    console.error("Error:", error.message);
    // Fallback to hardcoded list
    console.log("Available servers:");
    console.log(
        "- Sequential Thinking: http://localhost:5700/servers/sequential-thinking/sse"
    );
    console.log("- Exa: http://localhost:5700/servers/exa/sse");
    console.log("- Weather: http://localhost:5700/servers/weather/sse");
    console.log("- Cashfree: http://localhost:5700/servers/cashfree/sse");
}
