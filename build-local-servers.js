#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("Building local MCP servers dynamically...");

try {
    // Read the build info generated during Docker build
    const buildInfoPath = "/tmp/docker-build-info.json";

    if (!fs.existsSync(buildInfoPath)) {
        console.log("No build info found, skipping local server builds");
        process.exit(0);
    }

    const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));

    console.log(
        `Found ${buildInfo.localServers.length} local server(s) to process`
    );

    for (const server of buildInfo.localServers) {
        const serverPath = "/app/" + server.path;
        console.log(`\nProcessing server: ${server.name} at ${serverPath}`);

        try {
            // Check if package.json exists
            const packageJsonPath = path.join(serverPath, "package.json");
            if (fs.existsSync(packageJsonPath)) {
                console.log(`Installing dependencies for ${server.name}...`);
                execSync("npm ci", {
                    cwd: serverPath,
                    stdio: "inherit",
                });

                // Check if build script exists
                const packageJson = JSON.parse(
                    fs.readFileSync(packageJsonPath, "utf8")
                );
                if (packageJson.scripts && packageJson.scripts.build) {
                    console.log(`Building ${server.name}...`);
                    execSync("npm run build", {
                        cwd: serverPath,
                        stdio: "inherit",
                    });

                    // Verify build output
                    const buildDir = path.join(serverPath, "build");
                    if (fs.existsSync(buildDir)) {
                        console.log(`Build successful for ${server.name}`);
                        execSync(`ls -la ${buildDir}/`, { stdio: "inherit" });
                    } else {
                        console.log(
                            `No build directory found for ${server.name}`
                        );
                    }
                } else {
                    console.log(
                        `No build script found for ${server.name}, skipping build`
                    );
                }
            } else {
                console.log(
                    `No package.json found for ${server.name}, skipping`
                );
            }
        } catch (error) {
            console.error(`Error processing ${server.name}:`, error.message);
            process.exit(1);
        }
    }

    console.log("\n✅ All local MCP servers processed successfully");
} catch (error) {
    console.error("Error in build script:", error.message);
    process.exit(1);
}
