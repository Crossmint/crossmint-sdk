import { test, expect } from "@playwright/test";

test("getOrCreateWallet succeeds and returns an address", async ({ page }) => {
    const apiKey = process.env.CROSSMINT_STAGING_API_KEY;
    expect(apiKey).toBeTruthy();

    const chain = process.env.E2E_CHAIN || "base-sepolia";
    const signerType = process.env.E2E_SIGNER_TYPE || "evm-api-key";

    const url = `/index.html?apiKey=${encodeURIComponent(apiKey!)}&chain=${encodeURIComponent(chain)}&signerType=${encodeURIComponent(signerType)}`;

    await page.goto(url);
    await page.waitForFunction(() => (window as any).__E2E_RESULT__ !== undefined);

    const res = await page.evaluate(() => (window as any).__E2E_RESULT__);
    if (!res.success) {
        throw new Error(`getOrCreateWallet failed: ${res.error ?? "unknown error"}`);
    }
    expect(res.address).toBeTruthy();
});
