import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1 /* Disable parallel tests to prevent multiple operations on the same wallet simultaneously. */,
    reporter: "html" /* Disable parallel tests to prevent multiple operations on the same wallet simultaneously. */,

    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: "on-first-retry",
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: process.env.REACT_APP_BASE_URL,
        userAgent: "playwright user agent",
    },

    /* Configure projects for major browsers */
    projects: [
        { name: "setup", testMatch: /.*\.setup\.ts/ },
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
            dependencies: ["setup"],
        },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: "pnpm run dev",
        url: process.env.REACT_APP_BASE_URL,
        reuseExistingServer: !process.env.CI,
    },
});
