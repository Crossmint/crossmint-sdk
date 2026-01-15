import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    maxFailures: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? [["json", { outputFile: "test-results/smoke-results.json" }], ["list"]] : "html",
    timeout: 60000,
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        actionTimeout: 10000,
        navigationTimeout: 60000,
    },
    projects: [
        // Smoke tests - fast, single browser, serial execution
        {
            name: "smoke",
            testDir: "./e2e/smoke-tests",
            testMatch: "smoke.spec.ts",
            fullyParallel: false,
            retries: process.env.CI ? 1 : 0,
            timeout: 300000, // 5 minutes for smoke tests
            use: {
                ...devices["Desktop Chrome"],
                navigationTimeout: 30000,
            },
        },
        // Full e2e tests - multiple browsers, parallel execution
        {
            name: "chromium",
            testMatch: /^(?!.*smoke).*\.spec\.ts$/, // Exclude smoke tests
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "firefox",
            testMatch: /^(?!.*smoke).*\.spec\.ts$/, // Exclude smoke tests
            use: { ...devices["Desktop Firefox"] },
        },
        {
            name: "webkit",
            testMatch: /^(?!.*smoke).*\.spec\.ts$/, // Exclude smoke tests
            use: { ...devices["Desktop Safari"] },
        },
    ],
    webServer: {
        command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || "pnpm dev",
        url: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: process.env.CI ? 180000 : 60000,
        stdout: "pipe",
        stderr: "pipe",
    },
});
