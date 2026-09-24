import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test as base, expect } from "@playwright/test";
import type { Page, BrowserContext } from "@playwright/test";
import { getEmailForSigner, buildTestUrl, validateUITestConfig } from "../constants/globalConstants";
import type { SignerType, TestConfiguration } from "../constants/globalConstants";
import { attachPageDiagnostics, performEmailOTPLogin, waitForWalletReady } from "../utils";

validateUITestConfig();
// Cache for authenticated pages per configuration to prevent multiple authentications
const authenticatedPageCache = new Map<string, { page: Page; context: BrowserContext }>();

// On disk, not in memory: Playwright starts a fresh worker after every failed test.
// Its parent is the output directory, which Playwright empties when a run starts.
function failureMarkerPath(cacheKey: string, outputDir: string, retry: number): string {
    return join(dirname(outputDir), ".auth-failures", `${cacheKey}-attempt${retry}.txt`);
}

function readAuthenticationFailure(path: string): string | null {
    try {
        return readFileSync(path, "utf8");
    } catch (_) {
        return null;
    }
}

function recordAuthenticationFailure(path: string, error: unknown): void {
    try {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, error instanceof Error ? error.stack ?? error.message : String(error));
    } catch (_) {
        // A marker that cannot be written only costs time.
    }
}

type AuthFixtures = {
    testConfig: TestConfiguration;
    authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
    testConfig: [
        { provider: "crossmint", chain: "evm", signer: "email", chainId: "base-sepolia" } as TestConfiguration,
        { option: true },
    ],

    authenticatedPage: async ({ browser, testConfig }, use, testInfo) => {
        const cacheKey = `${testConfig.provider}-${testConfig.chain}-${testConfig.signer}-${testConfig.chainId}`;

        const cached = authenticatedPageCache.get(cacheKey);
        if (cached) {
            console.log(`♻️  Reusing authenticated session for ${cacheKey}`);
            await use(cached.page);
            return;
        }

        const markerPath = failureMarkerPath(cacheKey, testInfo.outputDir, testInfo.retry);
        const previousFailure = readAuthenticationFailure(markerPath);
        if (previousFailure != null) {
            console.log(`⛔ Authentication already failed for ${cacheKey}, reporting the first error`);
            throw new Error(previousFailure);
        }

        console.log(`🚀 Creating NEW authenticated session for ${cacheKey}`);

        const context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
        });

        const page = await context.newPage();
        attachPageDiagnostics(page);

        try {
            const url = buildTestUrl(testConfig);
            console.log(`🌐 Navigating to: ${url}`);
            await page.goto(url);

            await page.waitForTimeout(4000);

            const loginButtonIsVisible = await page.locator('button:has-text("Connect wallet")').first().isVisible();
            if (!loginButtonIsVisible) {
                console.log("✅ Already logged in, skipping login");
            } else {
                const email = getEmailForSigner(testConfig.signer as SignerType);
                await performEmailOTPLogin(page, email);
            }

            await waitForWalletReady(page);
        } catch (error) {
            recordAuthenticationFailure(markerPath, error);
            await context.close().catch(() => undefined);
            throw error;
        }

        // Cache this authenticated session for reuse
        authenticatedPageCache.set(cacheKey, { page, context });
        console.log(`✅ Authenticated session cached for ${cacheKey} - will be reused across all tests`);

        await use(page);
    },
});

export const expectAuth = expect;

// Cleanup function to close all cached pages/contexts
process.on("exit", async () => {
    for (const [configKey, { page, context }] of authenticatedPageCache.entries()) {
        console.log(`🧹 Cleaning up cached session for ${configKey}`);
        try {
            await page.close();
            await context.close();
        } catch (error) {
            console.warn(`Warning: Failed to cleanup ${configKey} session:`, error);
        }
    }
    authenticatedPageCache.clear();
});

export { TEST_CONFIGURATIONS } from "../constants/globalConstants";
export type { TestConfiguration, SignerType } from "../constants/globalConstants";
