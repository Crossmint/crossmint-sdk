import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
    testDir: "./e2e",
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    maxFailures: undefined, // Don't stop after a certain number of failures - run all tests
    reporter: process.env.CI ? [["json", { outputFile: "test-results/playwright-results.json" }], ["list"]] : "html",
    timeout: 120000, // 2 minutes for tests that may take longer (e.g., wallet address retrieval, funding)
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
            retries: 0, // No retries to avoid re-running passed tests in serial mode
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
            testIgnore: /sdk\//, // Exclude SDK-only tests (run by the "sdk" project)
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "firefox",
            testMatch: /^(?!.*smoke).*\.spec\.ts$/, // Exclude smoke tests
            testIgnore: /sdk\//, // Exclude SDK-only tests (run by the "sdk" project)
            use: { ...devices["Desktop Firefox"] },
        },
        {
            name: "webkit",
            testMatch: /^(?!.*smoke).*\.spec\.ts$/, // Exclude smoke tests
            testIgnore: /sdk\//, // Exclude SDK-only tests (run by the "sdk" project)
            use: { ...devices["Desktop Safari"] },
        },
        // SDK integration tests — no browser, tests SDK classes directly
        {
            name: "sdk",
            testDir: "./e2e/sdk",
            testMatch: "**/*.spec.ts",
            fullyParallel: false,
            retries: 1,
            timeout: 300_000,
            use: {},
        },
    ],
    webServer: process.env.SKIP_WEB_SERVER
        ? undefined
        : {
              command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || "pnpm dev",
              url: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
              reuseExistingServer: !process.env.CI,
              timeout: process.env.CI ? 180000 : 300000,
              stdout: "pipe",
              stderr: "pipe",
          },
});
