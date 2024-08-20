import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

export const authSessionFile = "playwright/.auth/user-session.json";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: "./tests",
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Disable parallel tests to prevent multiple operations on the same wallet simultaneously. */
    workers: 1,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: "html",

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
            use: { ...devices["Desktop Chrome"], storageState: authSessionFile },
            dependencies: ["setup"],
        },

        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"], storageState: authSessionFile },
            dependencies: ["setup"],
        },
        // *uncomment the following to test on Safari.
        // {
        //     name: "webkit",
        //     use: { ...devices["Desktop Safari"], storageState: authSessionFile },
        //     dependencies: ["setup"],
        // },

        /* Test against mobile viewports. */
        // {
        //   name: 'Mobile Chrome',
        //   use: { ...devices['Pixel 5'] },
        // },
        // {
        //   name: 'Mobile Safari',
        //   use: { ...devices['iPhone 12'] },
        // },

        /* Test against branded browsers. */
        // {
        //   name: 'Microsoft Edge',
        //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
        // },
        // {
        //   name: 'Google Chrome',
        //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
        // },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: "pnpm run dev",
        url: process.env.REACT_APP_BASE_URL,
        reuseExistingServer: !process.env.CI,
    },
});
