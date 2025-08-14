import type { Page } from "@playwright/test";
import { handleSignerConfirmation } from "./auth";

export async function getWalletAddress(page: Page): Promise<string> {
    const addressElement = page.locator('[data-testid^="wallet-address:"]').first();
    const dataTestId = await addressElement.getAttribute("data-testid");
    const walletAddress = dataTestId?.split(":")[1] || "";
    console.log(`📋 Wallet address from data-testid: ${walletAddress}`);
    return walletAddress;
}

export async function getWalletBalance(page: Page): Promise<string> {
    try {
        const balanceRes = await page.waitForResponse(
            (response) => {
                const url = response.url();
                return /\/api\/2025-06-09\/wallets\/[^/]+\/balances/.test(url);
            },
            { timeout: 10000 }
        );
        if (balanceRes.status() >= 400) {
            console.log("❌ Failed to get wallet balance, going to ignore request and check ui instead.");
        }
    } catch (_) {
        console.log("✅ Failed to get wallet balance, retrying...");
    }

    const balanceElement = page.locator('[data-testid="usdc-balance"]').first();
    const balanceText = await balanceElement.textContent();
    return balanceText?.replace(/[^0-9.]/g, "").trim() || "0";
}

export async function transferFunds(page: Page, recipientAddress: string, amount = "0.001"): Promise<void> {
    try {
        await page.locator('label:has-text("USDC") input[type="radio"]').click();
        const amountInput = page.locator('input[data-testid="amount"]').first();
        await amountInput.waitFor({ timeout: 10000 });
        await amountInput.fill(amount);

        const recipientInput = page.locator('input[data-testid="recipient-wallet-address"]').first();
        await recipientInput.waitFor({ timeout: 10000 });
        await recipientInput.fill(recipientAddress);

        const transferButton = page.locator('button:has-text("Transfer")').first();
        await transferButton.waitFor({ timeout: 10000 });
        await transferButton.click();

        await handleSignerConfirmation(page);

        const txnResponse = await page.waitForRequest(
            (request) =>
                request
                    .url()
                    .startsWith("https://staging.crossmint.com/api/2025-06-09/wallets/me:evm:smart/transactions/"),
            { timeout: 60000 }
        );

        let txnResponseJson: any = null;
        try {
            txnResponseJson = await txnResponse.response().then((res) => res?.json());
        } catch (e) {
            console.warn("⚠️ Could not parse transaction response JSON:", e);
        }
        if (txnResponseJson?.error?.message != null) {
            console.error("❌ Transaction failed with error:", txnResponseJson.error);
            throw new Error(
                `Transaction failed: ${txnResponseJson.error.message || JSON.stringify(txnResponseJson.error)}`
            );
        }

        await page.locator('a[data-testid="successful-tx-link"]').waitFor({ timeout: 60000 });

        console.log(`✅ Transfer of ${amount} completed successfully`);
    } catch (error) {
        console.error("❌ Transfer failed:", error);
        throw error;
    }
}
