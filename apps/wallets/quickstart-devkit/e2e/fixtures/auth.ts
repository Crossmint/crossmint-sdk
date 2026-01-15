import { test as base, expect } from "@playwright/test";
import type { Page, BrowserContext } from "@playwright/test";
import { getEmailForSigner, buildTestUrl } from "../config/constants";
import type { SignerType, TestConfiguration } from "../config/constants";
import { performEmailOTPLogin, waitForWalletReady } from "../helpers";

// Cache for authenticated pages per configuration to prevent multiple authentications
const authenticatedPageCache = new Map<string, { page: Page; context: BrowserContext }>();

type AuthFixtures = {
    testConfig: TestConfiguration;
    authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
    testConfig: [
        { provider: "crossmint", chain: "evm", signer: "email", chainId: "optimism-sepolia" } as TestConfiguration,
        { option: true },
    ],

    authenticatedPage: async ({ browser, testConfig }, use) => {
        const cacheKey = `${testConfig.provider}-${testConfig.chain}-${testConfig.signer}-${testConfig.chainId}`;

        const cached = authenticatedPageCache.get(cacheKey);
        if (cached) {
            // Check if the cached page/context is still valid (not closed)
            try {
                const cachedBrowser = cached.context.browser();
                
                if (cachedBrowser !== null && cachedBrowser.isConnected()) {
                    const expectedUrl = buildTestUrl(testConfig);
                    const currentUrl = cached.page.url();
                    
                    // Always navigate to ensure fresh API calls are triggered
                    // This is important because API calls might not be retriggered on an already-loaded page
                    if (!currentUrl.includes(expectedUrl.split('?')[0])) {
                        console.log(`🔄 Cached page is on wrong URL (${currentUrl}), navigating to ${expectedUrl}`);
                        await cached.page.goto(expectedUrl);
                        await cached.page.waitForTimeout(2000);
                        await waitForWalletReady(cached.page);
                    } else {
                        // Even if on correct URL, reload to trigger fresh API calls
                        console.log(`🔄 Reloading page to trigger fresh API calls`);
                        await cached.page.reload();
                        await cached.page.waitForTimeout(2000);
                        await waitForWalletReady(cached.page);
                    }
                    
                    console.log(`♻️  Reusing authenticated session for ${cacheKey}`);
                    await use(cached.page);
                    return;
                } else {
                    console.log(`⚠️  Cached session for ${cacheKey} is closed, creating new one`);
                    authenticatedPageCache.delete(cacheKey);
                }
            } catch (error) {
                console.log(`⚠️  Cached session for ${cacheKey} is invalid, creating new one:`, error);
                authenticatedPageCache.delete(cacheKey);
            }
        }

        console.log(`🚀 Creating NEW authenticated session for ${cacheKey}`);

        const context = await browser.newContext({
            viewport: { width: 1280, height: 720 },
        });

        const page = await context.newPage();

        const url = buildTestUrl(testConfig);
        console.log(`🌐 Navigating to: ${url}`);
        await page.goto(url);

        await page.waitForTimeout(4000);

        const loginButtonIsVisible = await page.locator('button:has-text("Connect wallet")').first().isVisible();
        if (!loginButtonIsVisible) {
            console.log("✅ Already logged in, skipping login");
        } else {
            // Perform email OTP login - this will only happen ONCE per configuration
            const email = getEmailForSigner(testConfig.signer as SignerType);
            await performEmailOTPLogin(page, email);
        }

        // Wait for wallet to be created and ready
        await waitForWalletReady(page);

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

export { TEST_CONFIGURATIONS } from "../config/constants";
export type { TestConfiguration, SignerType } from "../config/constants";
