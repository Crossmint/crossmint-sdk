import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: path.join(__dirname, "playwright"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  outputDir: path.join(__dirname, "src", "playwright", "test-results"),
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    video: "on",
    screenshot: "on",
    headless: false,

  },
    /* Configure projects for major browsers */
  projects: 
  [
      {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
      },

      {
          name: "firefox",
          use: { ...devices["Desktop Firefox"] },
      },

      {
          name: "webkit",
          use: { ...devices["Desktop Safari"] },
      },
  ],
});
