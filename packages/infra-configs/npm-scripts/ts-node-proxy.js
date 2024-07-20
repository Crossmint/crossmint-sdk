#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

const tsNodePath = require.resolve("ts-node/dist/bin");

const scriptPath = "./src/index.ts";

const args = process.argv.slice(2);

const subprocess = spawn("node", [tsNodePath, path.join(__dirname, scriptPath), ...args], {
    stdio: "inherit",
    shell: true,
});

subprocess.on("exit", (code) => {
    process.exit(code);
});
