import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
    testDir: "./e2e/smoke-tests",
    testMatch: "smoke.spec.ts",
    fullyParallel: false, 
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0, 
    workers: 1,
    maxFailures: 1,
    reporter: process.env.CI 
        ? [["json", { outputFile: "test-results/smoke-results.json" }], ["list"]]
        : "html",
    timeout: 300000, 
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        actionTimeout: 10000,
        navigationTimeout: 30000,
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: {
        command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || "pnpm dev",
        url: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        stdout: "pipe",
        stderr: "pipe",
    },
});

