import { test, expectAuth, TEST_CONFIGURATIONS } from "./fixtures/auth";
import {
    approveTransactionById,
    createPreparedTransaction,
    fundWalletWithCrossmintFaucet,
    getWalletAddress,
    getWalletBalance,
    getWalletBalances,
    transferFunds,
} from "./helpers";
import { TEST_RECIPIENT_WALLET_ADDRESSES } from "./config/constants";

test.describe("Crossmint Wallet E2E Tests", () => {
    for (const config of TEST_CONFIGURATIONS) {
        test.describe(`${config.provider} - ${config.chain} - ${config.signer}`, () => {
            test.describe.configure({ mode: "serial" });
            test.use({ testConfig: config });

            test("should authenticate and fetch wallet", async ({ authenticatedPage, testConfig }, testInfo) => {
                console.log(`🔐 Testing ${testConfig.provider}/${testConfig.chain}/${testConfig.signer}`);

                await testInfo.attach("authenticated-page", {
                    body: await authenticatedPage.screenshot(),
                    contentType: "image/png",
                });

                await expectAuth(authenticatedPage.locator("h1")).toContainText("Wallets Quickstart");

                const walletAddress = await getWalletAddress(authenticatedPage);
                expectAuth(walletAddress).toBeTruthy();
                expectAuth(walletAddress.length).toBeGreaterThan(10);

                if (testConfig.chain === "evm") {
                    expectAuth(walletAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
                    expectAuth(walletAddress.length).toBe(42);
                } else if (testConfig.chain === "solana") {
                    expectAuth(walletAddress.length).toBeGreaterThanOrEqual(32);
                    expectAuth(walletAddress.length).toBeLessThanOrEqual(44);
                } else if (testConfig.chain === "stellar") {
                    expectAuth(walletAddress).toMatch(/^[GC][A-Z0-9]{55}$/);
                    expectAuth(walletAddress.length).toBe(56);
                }

                const addressElement = authenticatedPage
                    .locator(`[data-testid^="wallet-address:${walletAddress}"]`)
                    .first();
                await expectAuth(addressElement).toBeVisible();

                console.log(`✅ ${testConfig.chain}:${testConfig.signer}:${walletAddress} retrieved`);
            });

            test("should transfer funds", async ({ authenticatedPage, testConfig }) => {
                const walletAddress = await getWalletAddress(authenticatedPage);

                // Fund wallet before transfer test
                await fundWalletWithCrossmintFaucet(walletAddress, testConfig.chainId);
                // Wait a moment for the funding to complete
                await authenticatedPage.waitForTimeout(2000);

                const initialBalance = await getWalletBalance(authenticatedPage);
                const initialBalanceNum = parseFloat(initialBalance);

                // Log warning if balance is low but continue with test
                if (initialBalanceNum < 0.0001) {
                    console.log(
                        `⚠️ ${testConfig.chain}:${testConfig.signer}:${walletAddress} wallet balance is low (${initialBalanceNum}). Test may fail if insufficient funds.`
                    );
                    console.log(`💡 Please fund wallet: ${walletAddress} with some stablecoin for successful transfer`);
                }

                let recipientAddress: string;
                if (testConfig.chain === "evm" || walletAddress.startsWith("0x")) {
                    recipientAddress = TEST_RECIPIENT_WALLET_ADDRESSES.evm;
                } else if (testConfig.chain === "solana") {
                    recipientAddress = TEST_RECIPIENT_WALLET_ADDRESSES.solana;
                } else {
                    recipientAddress = walletAddress.startsWith("0x")
                        ? TEST_RECIPIENT_WALLET_ADDRESSES.evm
                        : TEST_RECIPIENT_WALLET_ADDRESSES.solana;
                }

                await transferFunds(authenticatedPage, recipientAddress, "10", testConfig.signer);

                console.log(
                    `✅ ${testConfig.provider}/${testConfig.chain}/${testConfig.signer} transfer completed successfully!`
                );
            });

            test("should create and approve a prepared transaction", async ({ authenticatedPage, testConfig }) => {
                let recipientAddress: string;
                if (testConfig.chain === "evm") {
                    recipientAddress = TEST_RECIPIENT_WALLET_ADDRESSES.evm;
                    expectAuth(recipientAddress).toBeTruthy();
                    expectAuth(recipientAddress.startsWith("0x")).toBe(true);
                    expectAuth(recipientAddress.length).toBe(42);
                    expectAuth(/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)).toBe(true);
                } else if (testConfig.chain === "solana") {
                    recipientAddress = TEST_RECIPIENT_WALLET_ADDRESSES.solana;
                    expectAuth(recipientAddress).toBeTruthy();
                    expectAuth(recipientAddress.length).toBeGreaterThanOrEqual(32);
                    expectAuth(recipientAddress.length).toBeLessThanOrEqual(44);
                } else if (testConfig.chain === "stellar") {
                    recipientAddress = TEST_RECIPIENT_WALLET_ADDRESSES.stellar;
                    expectAuth(recipientAddress).toBeTruthy();
                    expectAuth(recipientAddress).toMatch(/^[GC][A-Z0-9]{55}$/);
                    expectAuth(recipientAddress.length).toBe(56);
                } else {
                    recipientAddress = TEST_RECIPIENT_WALLET_ADDRESSES.evm;
                }

                const transferAmount = "10";
                const walletAddress = await getWalletAddress(authenticatedPage);

                // Fund wallet before prepared transaction test with the same amount we'll transfer
                await fundWalletWithCrossmintFaucet(walletAddress, testConfig.chainId, 10);
                // Wait a moment for the funding to complete
                await authenticatedPage.waitForTimeout(2000);

                // Check wallet balance and log warning if 0
                const initialBalance = await getWalletBalance(authenticatedPage);
                const initialBalanceNum = parseFloat(initialBalance);

                if (initialBalanceNum === 0) {
                    console.log(`⚠️ Wallet ${walletAddress} has 0 balance. Test may fail if insufficient funds.`);
                    console.log(`💡 Please fund wallet: ${walletAddress} with some USDXM for successful transaction`);
                }

                const approvalTestHeading = authenticatedPage.locator("text=/Approval Method Test/i").first();
                await approvalTestHeading.scrollIntoViewIfNeeded();
                await expectAuth(approvalTestHeading).toBeVisible();

                const token = "usdxm";
                const transactionId = await createPreparedTransaction(
                    authenticatedPage,
                    recipientAddress,
                    transferAmount,
                    token,
                    testConfig.signer
                );

                expectAuth(transactionId).toBeTruthy();
                expectAuth(typeof transactionId).toBe("string");
                expectAuth(transactionId.length).toBeGreaterThan(0);
                expectAuth(transactionId.startsWith("txn-") || transactionId.length > 10).toBe(true);

                const transactionIdDisplay = authenticatedPage.locator(`text=/Prepared Transaction ID:/i`).first();
                await expectAuth(transactionIdDisplay).toBeVisible();

                await approveTransactionById(authenticatedPage, transactionId, testConfig.signer);

                const approvalResult = authenticatedPage.locator("text=/Approval Result/i").first();
                await expectAuth(approvalResult).toBeVisible();

                const resultSection = approvalResult.locator("..");
                const resultText = await resultSection.textContent();
                expectAuth(resultText).toBeTruthy();
                expectAuth(resultText?.toLowerCase()).toContain("transaction");
            });

            test("should display wallet balances correctly", async ({ authenticatedPage, testConfig }) => {
                const nativeTokenBalance = authenticatedPage.locator('[data-testid="native-token-balance"]').first();
                await nativeTokenBalance.waitFor({ state: "visible", timeout: 30000 });
                await expectAuth(nativeTokenBalance).toBeVisible();

                const balances = await getWalletBalances(authenticatedPage);

                expectAuth(balances.nativeToken).toBeDefined();
                expectAuth(balances.nativeToken.amount).toBeDefined();
                expectAuth(balances.nativeToken.symbol).toBeDefined();
                expectAuth(parseFloat(balances.nativeToken.amount)).toBeGreaterThanOrEqual(0);

                if (testConfig.chain === "evm") {
                    expectAuth(balances.nativeToken.symbol.toLowerCase()).toBe("eth");
                } else if (testConfig.chain === "solana") {
                    expectAuth(balances.nativeToken.symbol.toLowerCase()).toBe("sol");
                } else if (testConfig.chain === "stellar") {
                    expectAuth(balances.nativeToken.symbol.toLowerCase()).toBe("xlm");
                }

                const usdxmBalance = authenticatedPage.locator('[data-testid="usdxm-balance"]').first();
                await expectAuth(usdxmBalance).toBeVisible();

                expectAuth(balances.usdxm).toBeDefined();
                expectAuth(balances.usdxm.amount).toBeDefined();
                expectAuth(balances.usdxm.symbol.toLowerCase()).toBe("usdxm");
                expectAuth(parseFloat(balances.usdxm.amount)).toBeGreaterThanOrEqual(0);

                expectAuth(balances.nativeToken.amount).toMatch(/^\d+(\.\d{1,2})?$/);

                console.log(
                    `✅ Balances displayed correctly - ${balances.nativeToken.amount} ${balances.nativeToken.symbol.toUpperCase()}, ${balances.usdxm.amount} USDXM`
                );
            });
        });
    }
});
