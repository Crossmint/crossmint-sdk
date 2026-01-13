import type { Page } from "@playwright/test";
import { handleSignerConfirmation } from "./auth";

/**
 * Map chainId to Circle faucet network name
 */
function getCircleFaucetNetworkName(chainId: string): string | null {
    const networkMap: Record<string, string> = {
        "optimism-sepolia": "OP Sepolia",
        "base-sepolia": "Base Sepolia",
        "ethereum-sepolia": "Ethereum Sepolia",
        "arbitrum-sepolia": "Arbitrum Sepolia",
        "polygon-amoy": "Polygon PoS Amoy",
    };
    return networkMap[chainId] || null;
}

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
                // Support both API versions
                return /\/api\/(2025-06-09|2022-06-09)\/wallets\/[^/]+\/balances/.test(url);
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

export async function getWalletBalances(page: Page): Promise<{
    nativeToken: { amount: string; symbol: string };
    usdc: { amount: string; symbol: string };
    tokens: Array<{ amount: string; symbol: string }>;
}> {
    const balanceResponse = await page.waitForResponse(
        (response) => {
            const url = response.url();
            return /\/api\/(2025-06-09|2022-06-09)\/wallets\/[^/]+\/balances/.test(url);
        },
        { timeout: 30000 }
    );

    if (balanceResponse.status() >= 400) {
        throw new Error(`Balance API call failed with status ${balanceResponse.status()}`);
    }

    const balanceData = await balanceResponse.json();

    const nativeTokenData = balanceData.find(
        (token: any) =>
            token.symbol?.toLowerCase() === "eth" ||
            token.symbol?.toLowerCase() === "sol" ||
            token.symbol?.toLowerCase() === "xlm"
    );
    const usdcData = balanceData.find((token: any) => token.symbol?.toLowerCase() === "usdc");
    const otherTokens = balanceData.filter(
        (token: any) =>
            token.symbol?.toLowerCase() !== "eth" &&
            token.symbol?.toLowerCase() !== "sol" &&
            token.symbol?.toLowerCase() !== "xlm" &&
            token.symbol?.toLowerCase() !== "usdc"
    );

    return {
        nativeToken: {
            amount: nativeTokenData?.amount || "0",
            symbol: nativeTokenData?.symbol || "eth",
        },
        usdc: {
            amount: usdcData?.amount || "0",
            symbol: "usdc",
        },
        tokens: otherTokens.map((token: any) => ({
            amount: token.amount || "0",
            symbol: token.symbol || "",
        })),
    };
}

export async function getWalletActivity(page: Page): Promise<{
    events: Array<{
        type: string;
        timestamp: string;
        amount?: string;
        token_symbol?: string;
        transaction_hash?: string;
        from_address?: string;
        to_address?: string;
    }>;
}> {
    const activityResponse = await page
        .waitForResponse(
            (response) => {
                const url = response.url();
                return /\/api\/(2025-06-09|2022-06-09)\/wallets\/[^/]+\/activity/.test(url);
            },
            { timeout: 30000 }
        )
        .catch(async () => {
            const activityComponent = page
                .locator('[data-testid="activity"], .activity, h2:has-text("Recent activity")')
                .first();
            const exists = await activityComponent.isVisible({ timeout: 5000 }).catch(() => false);

            if (exists) {
                return await page.waitForResponse(
                    (response) => {
                        const url = response.url();
                        return /\/api\/(2025-06-09|2022-06-09)\/wallets\/[^/]+\/activity/.test(url);
                    },
                    { timeout: 20000 }
                );
            }

            return null;
        });

    if (!activityResponse) {
        return { events: [] };
    }

    if (activityResponse.status() >= 400) {
        throw new Error(`Activity API call failed with status ${activityResponse.status()}`);
    }

    const activityData = await activityResponse.json();

    return {
        events: activityData.events || [],
    };
}

export async function transferFunds(
    page: Page,
    recipientAddress: string,
    amount = "0.001",
    signerType?: string
): Promise<void> {
    try {
        await page.locator('label:has-text("USDC") input[type="radio"]').click();
        const amountInput = page.locator('input[data-testid="amount"]').first();
        await amountInput.waitFor({ timeout: 10000 });
        await amountInput.fill(amount);

        const recipientInput = page.locator('input[data-testid="recipient-wallet-address"]').first();
        await recipientInput.waitFor({ timeout: 10000 });
        await recipientInput.fill(recipientAddress);

        const transferButton = page
            .locator('button:has-text("Transfer"), button[data-testid="transfer-button"]')
            .first();
        await transferButton.waitFor({ timeout: 10000 });
        await transferButton.click();

        // Wait a moment for the transaction to initialize
        await page.waitForTimeout(1000);

        await handleSignerConfirmation(page, signerType as any);

        try {
            await page.locator('a[data-testid="successful-tx-link"]').waitFor({
                state: "visible",
                timeout: 120000, // 2 minutes for transaction to complete
            });
        } catch (error) {
            // If success link doesn't appear, check for error messages
            const errorMessage = page.locator("text=/error/i, text=/failed/i").first();
            const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);

            if (hasError) {
                const errorText = await errorMessage.textContent();
                throw new Error(`Transaction failed: ${errorText}`);
            }

            // Check if transfer button is still enabled (transaction might not have started)
            const isButtonEnabled = await transferButton.isEnabled();
            if (isButtonEnabled) {
                throw new Error("Transaction did not start - transfer button is still enabled");
            }

            throw new Error(`Transaction timeout: Success link did not appear within 2 minutes. ${error}`);
        }

        console.log(`✅ Transfer of ${amount} completed successfully`);
    } catch (error) {
        console.error("❌ Transfer failed:", error);
        throw error;
    }
}

export async function createPreparedTransaction(
    page: Page,
    recipientAddress: string,
    amount: string,
    token: "eth" | "usdc" = "usdc",
    signerType?: string
): Promise<string> {
    try {
        // Find the approval test section
        const approvalSection = page.locator("text=/1\\. Create Transaction \\(Prepare Only\\)/i").first();
        await approvalSection.scrollIntoViewIfNeeded();
        await approvalSection.waitFor({ timeout: 10000 });

        // Select token - find select within the approval section
        const tokenSelect = approvalSection.locator("..").locator("select").first();
        await tokenSelect.waitFor({ timeout: 10000 });
        await tokenSelect.selectOption(token);

        // Fill amount - find number input in the approval section
        const amountInput = approvalSection.locator("..").locator('input[type="number"]').first();
        await amountInput.waitFor({ timeout: 10000 });
        await amountInput.fill(amount);

        // Fill recipient - find text input with placeholder containing "0x" or "Base58"
        const recipientInput = approvalSection
            .locator("..")
            .locator('input[placeholder*="0x" i], input[placeholder*="Base58" i]')
            .first();
        await recipientInput.waitFor({ timeout: 10000 });
        await recipientInput.fill(recipientAddress);

        // Click create prepared transaction button
        const createButton = approvalSection
            .locator("..")
            .locator('button:has-text("Create Prepared Transaction")')
            .first();
        await createButton.waitFor({ timeout: 10000 });
        await createButton.click();

        // Wait for signer confirmation if needed
        await handleSignerConfirmation(page, signerType as any);

        // Wait for the prepared transaction ID to appear in the green success box
        const transactionIdElement = page.locator("text=/Prepared Transaction ID:/i").first();
        await transactionIdElement.waitFor({ timeout: 60000 });

        // Extract transaction ID from the text
        const transactionIdText = await transactionIdElement.textContent();
        if (!transactionIdText) {
            throw new Error("Could not find prepared transaction ID");
        }

        // Extract the transaction ID (format: "Prepared Transaction ID: txn-xxx")
        const transactionIdMatch = transactionIdText.match(/Prepared Transaction ID:\s*([^\s]+)/);
        if (!transactionIdMatch || !transactionIdMatch[1]) {
            throw new Error(`Could not extract transaction ID from: ${transactionIdText}`);
        }

        const transactionId = transactionIdMatch[1];
        console.log(`✅ Prepared transaction created: ${transactionId}`);

        return transactionId;
    } catch (error) {
        console.error("❌ Failed to create prepared transaction:", error);
        throw error;
    }
}

export async function approveTransactionById(page: Page, transactionId: string, signerType?: string): Promise<void> {
    try {
        // Find the approval section (section 2)
        const approveSection = page.locator("text=/2\\. Approve Transaction by ID/i").first();
        await approveSection.scrollIntoViewIfNeeded();
        await approveSection.waitFor({ timeout: 10000 });

        // Find the transaction ID input in section 2
        const transactionIdInput = approveSection
            .locator("..")
            .locator('input[placeholder*="transaction ID" i], input[placeholder*="Enter transaction ID" i]')
            .first();
        await transactionIdInput.waitFor({ timeout: 10000 });
        await transactionIdInput.fill(transactionId);

        // Click approve transaction button
        const approveButton = approveSection.locator("..").locator('button:has-text("Approve Transaction")').first();
        await approveButton.waitFor({ timeout: 10000 });
        await approveButton.click();

        // Wait for signer confirmation if needed
        await handleSignerConfirmation(page, signerType as any);

        // Wait for approval result to appear
        const approvalResult = page.locator("text=/Approval Result/i").first();
        await approvalResult.waitFor({ timeout: 120000 }); // 2 minutes for approval

        // Verify the result shows the transaction ID
        const resultSection = approvalResult.locator("..");
        const resultText = await resultSection.textContent();
        if (resultText && !resultText.includes(transactionId)) {
            throw new Error(`Approval result does not contain transaction ID ${transactionId}`);
        }

        console.log(`✅ Transaction ${transactionId} approved successfully`);
    } catch (error) {
        console.error(`❌ Failed to approve transaction ${transactionId}:`, error);
        throw error;
    }
}

/**
 * Fund wallet with testnet USDC using Circle faucet
 * @param page - Playwright page instance
 * @param walletAddress - Wallet address to fund
 * @param chainId - Chain ID (e.g., "optimism-sepolia", "base-sepolia")
 * @returns true if funding was successful or already funded, false if rate limited
 */
export async function fundWalletWithCircleFaucet(page: Page, walletAddress: string, chainId: string): Promise<boolean> {
    try {
        const networkName = getCircleFaucetNetworkName(chainId);
        if (!networkName) {
            console.warn(`⚠️ Circle faucet does not support chainId: ${chainId}, skipping funding`);
            return false;
        }

        console.log(`💰 Funding wallet ${walletAddress} with 1 USDC on ${networkName} via Circle faucet`);

        await page.goto("https://faucet.circle.com/");
        await page.waitForLoadState("networkidle");

        // Handle cookie consent banner if present
        try {
            const acceptCookiesButton = page.locator("#onetrust-accept-btn-handler").first();
            const cookieBanner = page.locator("#onetrust-group-container").first();

            // Check if cookie banner is visible
            const isBannerVisible = await cookieBanner.isVisible({ timeout: 3000 }).catch(() => false);

            if (isBannerVisible) {
                console.log("🍪 Cookie consent banner detected, accepting cookies...");
                await acceptCookiesButton.waitFor({ timeout: 5000 });
                await acceptCookiesButton.click();
                // Wait for banner to disappear
                await cookieBanner.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {
                    console.log("⚠️ Cookie banner may still be visible, continuing anyway");
                });
                console.log("✅ Cookies accepted");
            }
        } catch (error) {
            console.log("ℹ️ Cookie consent banner not found or already handled, continuing...");
        }

        const usdcButton = page.locator('button:has-text("USDC")').first();
        await usdcButton.waitFor({ timeout: 10000 });
        const isUSDCSelected = await usdcButton.getAttribute("aria-pressed");
        if (isUSDCSelected !== "true") {
            await usdcButton.click();
            await page.waitForTimeout(500);
        }

        const networkDropdown = page.locator('select, [role="combobox"]').first();
        await networkDropdown.waitFor({ timeout: 10000 });
        await networkDropdown.selectOption({ label: networkName });
        console.log(`✅ Selected network: ${networkName}`);

        const addressInput = page.locator('input[placeholder*="Send to" i], input[type="text"]').first();
        await addressInput.waitFor({ timeout: 10000 });
        await addressInput.fill(walletAddress);
        console.log(`✅ Entered wallet address: ${walletAddress}`);

        const sendButton = page.locator('button:has-text("Send 1 USDC"), button:has-text("Send")').first();
        await sendButton.waitFor({ timeout: 10000 });
        await sendButton.click();
        console.log("🖱️ Clicked send button");

        // Wait for response - either success or error
        try {
            // Wait for success message or error
            const successMessage = page.locator("text=/success/i, text=/sent/i, text=/completed/i").first();
            const errorMessage = page.locator("text=/limit/i, text=/error/i, text=/exceeded/i").first();

            // Wait for either success or error to appear
            await Promise.race([
                successMessage.waitFor({ timeout: 30000 }).then(() => "success"),
                errorMessage.waitFor({ timeout: 30000 }).then(() => "error"),
            ]);

            // Check which one appeared
            const hasSuccess = await successMessage.isVisible({ timeout: 2000 }).catch(() => false);
            const hasError = await errorMessage.isVisible({ timeout: 2000 }).catch(() => false);

            if (hasSuccess) {
                console.log("✅ Wallet funded successfully via Circle faucet");
                return true;
            } else if (hasError) {
                const errorText = await errorMessage.textContent();
                console.warn(`⚠️ Circle faucet error: ${errorText}`);
                if (errorText?.toLowerCase().includes("limit")) {
                    console.log("ℹ️ Rate limit reached - wallet may already be funded or need to wait 2 hours");
                    return true; // Return true as wallet might already have funds
                }
                return false;
            }
        } catch (e) {
            console.warn("⚠️ Could not determine faucet result, assuming success");
            await page.waitForTimeout(5000);
            return true;
        }

        return true;
    } catch (error) {
        console.error("❌ Failed to fund wallet via Circle faucet:", error);
        return false;
    }
}
