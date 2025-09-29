import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ? Number(process.env.PORT) : 5177;

export default defineConfig({
    testDir: "./tests",
    timeout: 120000,
    use: {
        baseURL: `http://localhost:${PORT}`,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },
    webServer: {
        command: "pnpm --filter @crossmint/wallets-sdk run e2e:serve",
        port: PORT,
        reuseExistingServer: !process.env.CI,
        timeout: 60000,
    },
    reporter: [["list"], ["html", { outputFolder: "playwright-report" }]],
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
