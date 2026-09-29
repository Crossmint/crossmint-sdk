import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test as base, expect } from "@playwright/test";
import type { Browser, Page, BrowserContext } from "@playwright/test";
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

// Also on disk: a retry gets a fresh worker even when the failure it's retrying has
// nothing to do with auth, and an OTP mailbox has its own rate limit to protect.
function storageStatePath(cacheKey: string, outputDir: string): string {
    return join(dirname(outputDir), ".auth-state", `${cacheKey}.json`);
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

// Restores a session saved by an earlier worker in this run instead of sending another OTP.
// Only a stale/invalid session (still on the login screen) falls back to a fresh login: any
// other failure here is the real result for this attempt and must propagate as-is, not be
// swallowed into another OTP send.
async function restoreStoredSession(
    browser: Browser,
    testConfig: TestConfiguration,
    statePath: string
): Promise<{ page: Page; context: BrowserContext } | null> {
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        storageState: statePath,
    });
    const page = await context.newPage();
    attachPageDiagnostics(page);

    await page.goto(buildTestUrl(testConfig));
    await page.waitForTimeout(4000);

    const loginButtonIsVisible = await page.locator('button:has-text("Connect wallet")').first().isVisible();
    if (loginButtonIsVisible) {
        await context.close().catch(() => undefined);
        return null;
    }

    await waitForWalletReady(page);
    return { page, context };
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

        const statePath = storageStatePath(cacheKey, testInfo.outputDir);
        if (existsSync(statePath)) {
            const restored = await restoreStoredSession(browser, testConfig, statePath);
            if (restored != null) {
                console.log(`♻️  Restored the session for ${cacheKey} from earlier in this run — no OTP sent`);
                authenticatedPageCache.set(cacheKey, restored);
                await use(restored.page);
                return;
            }
            console.log(`⚠️  Stored session for ${cacheKey} is no longer valid, logging in again`);
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

            // Persist the session as soon as login succeeds, before the wallet-readiness check
            // below. A later worker can then reuse it even if that check is what fails — the
            // OTP mailbox has already paid its cost and shouldn't pay it again for the same run.
            try {
                mkdirSync(dirname(statePath), { recursive: true });
                await context.storageState({ path: statePath });
            } catch (_) {
                // A session that can't be saved just costs the next retry an OTP.
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
